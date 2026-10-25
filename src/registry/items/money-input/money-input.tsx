"use client";

import { ChevronDownIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ChangeEvent, type ReactNode, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Menu, MenuGroup, MenuGroupLabel, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "@/components/ui/menu";
import { cn } from "@/lib/utils";

export interface Currency {
  code: string;
  locale: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", locale: "en-US", name: "US dollar" },
  { code: "EUR", locale: "de-DE", name: "Euro" },
  { code: "GBP", locale: "en-GB", name: "British pound" },
  { code: "JPY", locale: "ja-JP", name: "Japanese yen" },
  { code: "INR", locale: "en-IN", name: "Indian rupee" },
];

const TYPED_DECIMAL_MARK = "\u0000";

function describe(currency: Currency) {
  const nf = new Intl.NumberFormat(currency.locale, { style: "currency", currency: currency.code });
  const parts = nf.formatToParts(1234567.89);
  return {
    symbol: parts.find((p) => p.type === "currency")?.value ?? currency.code,
    group: parts.find((p) => p.type === "group")?.value ?? ",",
    decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
    fraction: nf.resolvedOptions().maximumFractionDigits ?? 2,
    symbolAfter: parts.findIndex((p) => p.type === "currency") > parts.findIndex((p) => p.type === "integer"),
  };
}

function display(raw: string, currency: Currency, d: ReturnType<typeof describe>) {
  if (!raw) return "";
  const [int, frac] = raw.split(".");
  const grouped = new Intl.NumberFormat(currency.locale, { maximumFractionDigits: 0 }).format(BigInt(int || "0"));
  return frac === undefined ? grouped : `${grouped}${d.decimal}${frac}`;
}

export function formatMoney(value: number, currency: Currency) {
  return new Intl.NumberFormat(currency.locale, { style: "currency", currency: currency.code }).format(value);
}

export interface MoneyInputProps {
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  currency?: string;
  defaultCurrency?: string;
  onCurrencyChange?: (code: string) => void;
  currencies?: Currency[];
  min?: number;
  max?: number;
  label?: ReactNode;
  hintAction?: ReactNode;
  className?: string;
}

const toRaw = (value: number | null | undefined, fraction: number) =>
  value === null || value === undefined ? "" : value.toFixed(fraction);

export function MoneyInput({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  currency: currencyProp,
  defaultCurrency = "USD",
  onCurrencyChange,
  currencies = CURRENCIES,
  min,
  max,
  label = "Amount",
  hintAction,
  className,
}: MoneyInputProps) {
  const [innerCode, setInnerCode] = useState(defaultCurrency);
  const code = currencyProp ?? innerCode;
  const currency = currencies.find((c) => c.code === code) ?? currencies[0];
  const d = useMemo(() => describe(currency), [currency]);
  const [raw, setRaw] = useState(() => toRaw(valueProp ?? defaultValue, d.fraction));
  const inputRef = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  const [focused, setFocused] = useState(false);
  const reduce = useReducedMotion();
  const id = useId();

  const rawNumber = raw ? Number(raw) : null;
  if (valueProp !== undefined) {
    const expected = toRaw(valueProp, d.fraction);
    if ((expected === "" ? null : Number(expected)) !== rawNumber) setRaw(expected);
  }

  const shown = display(raw, currency, d);

  useLayoutEffect(() => {
    if (caret.current === null || !inputRef.current) return;
    inputRef.current.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  });

  const commit = (next: string) => {
    setRaw(next);
    onValueChange?.(next === "" ? null : Number(next));
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const el = event.target;
    let text = el.value;
    let at = el.selectionStart ?? text.length;
    const native = event.nativeEvent as InputEvent;
    const typed = native.data;
    const insertedAt = typed && typed.length === 1 ? at - 1 : -1;
    const typedAnyDecimalKey = typed === "." || typed === ",";
    if (typedAnyDecimalKey && d.fraction > 0 && !raw.includes(".")) {
      text = `${text.slice(0, at - 1)}${TYPED_DECIMAL_MARK}${text.slice(at)}`;
    }
    let int = "";
    let frac: string | null = null;
    let before = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const isDecimal = ch === TYPED_DECIMAL_MARK || (ch === d.decimal && i !== insertedAt);
      if (/\d/.test(ch)) {
        if (frac === null) int += ch;
        else if (frac.length < d.fraction) frac += ch;
        else {
          if (i < at) at -= 1;
          continue;
        }
        if (i < at) before++;
      } else if (isDecimal && frac === null && d.fraction > 0) {
        frac = "";
        if (i < at) before++;
      }
    }
    const trimmed = int.replace(/^0+(?=\d)/, "");
    if (trimmed.length < int.length) before = Math.max(0, before - (int.length - trimmed.length));
    int = trimmed;
    if (int.length > 13) return;
    let next = frac === null ? int : `${int || "0"}.${frac}`;
    const amountUnchanged = next === raw;
    if (amountUnchanged && native.inputType === "deleteContentBackward" && before > 0) {
      next = next.slice(0, before - 1) + next.slice(before);
      before -= 1;
    } else if (amountUnchanged && native.inputType === "deleteContentForward") {
      next = next.slice(0, before) + next.slice(before + 1);
    }
    next = next.replace(/^0+(?=\d)/, "").replace(/^\./, "0.");
    const formatted = display(next, currency, d);
    let pos = 0;
    let seen = 0;
    while (pos < formatted.length && seen < before) {
      if (/\d/.test(formatted[pos]) || formatted[pos] === d.decimal) seen++;
      pos++;
    }
    caret.current = pos;
    commit(next);
  };

  const switchCurrency = (next: string) => {
    const target = currencies.find((c) => c.code === next);
    if (!target) return;
    const fraction = describe(target).fraction;
    if (raw.includes(".") && fraction === 0) commit(raw.split(".")[0]);
    else if (raw.includes(".")) commit(`${raw.split(".")[0]}.${raw.split(".")[1].slice(0, fraction)}`);
    if (currencyProp === undefined) setInnerCode(next);
    onCurrencyChange?.(next);
  };

  const amount = raw ? Number(raw) : null;
  const over = amount !== null && max !== undefined && amount > max;
  const under = !focused && amount !== null && amount > 0 && min !== undefined && amount < min;
  const hint = over
    ? `That's over the ${formatMoney(max, currency)} limit`
    : under
      ? `The minimum is ${formatMoney(min, currency)}`
      : [min !== undefined && `Min ${formatMoney(min, currency)}`, max !== undefined && `Max ${formatMoney(max, currency)}`]
          .filter(Boolean)
          .join(" · ");

  const symbol = (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        aria-hidden
        className="shrink-0 text-muted-foreground"
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(2px)" }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(2px)" }}
        key={d.symbol}
        transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
      >
        {d.symbol}
      </motion.span>
    </AnimatePresence>
  );

  return (
    <div className={cn("grid w-full gap-2", className)}>
      <label className="font-medium text-sm" htmlFor={id}>
        {label}
      </label>
      <div
        className={cn(
          "flex h-14 items-center gap-1 rounded-xl border border-input bg-background not-dark:bg-clip-padding pr-1.5 pl-3.5 shadow-xs/5 ring-ring/24 transition-shadow has-focus-visible:border-ring has-focus-visible:ring-[3px] dark:bg-input/32",
          (over || under) && "border-destructive/40 has-focus-visible:border-destructive/64 has-focus-visible:ring-destructive/16",
        )}
      >
        <div className="flex min-w-0 flex-1 items-baseline gap-1 font-semibold text-2xl tabular-nums tracking-tight">
          {!d.symbolAfter && symbol}
          <input
            aria-describedby={`${id}-hint`}
            aria-invalid={over || under || undefined}
            autoComplete="transaction-amount"
            className={cn("min-w-0 bg-transparent outline-none placeholder:text-muted-foreground/40", d.symbolAfter ? "max-w-full [field-sizing:content]" : "w-0 flex-1")}
            id={id}
            inputMode={d.fraction ? "decimal" : "numeric"}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              if (!raw.includes(".")) return;
              const [int, frac] = raw.split(".");
              const tidy = frac ? `${int}.${frac.padEnd(d.fraction, "0")}` : int;
              if (tidy !== raw) setRaw(tidy);
            }}
            onChange={onChange}
            placeholder={d.fraction ? `0${d.decimal}${"0".repeat(d.fraction)}` : "0"}
            ref={inputRef}
            value={shown}
          />
          {d.symbolAfter && symbol}
        </div>
        <Menu>
          <MenuTrigger
            aria-label={`Currency: ${currency.name}`}
            className="flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2.5 font-medium font-mono text-muted-foreground text-xs outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent data-popup-open:text-foreground"
          >
            {currency.code}
            <ChevronDownIcon className="size-3.5" />
          </MenuTrigger>
          <MenuPopup align="end" className="min-w-52">
            <MenuGroup>
            <MenuGroupLabel>Currency</MenuGroupLabel>
            <MenuRadioGroup onValueChange={(v) => switchCurrency(String(v))} value={currency.code}>
              {currencies.map((c) => (
                <MenuRadioItem closeOnClick key={c.code} value={c.code}>
                  <span className="flex w-full items-center justify-between gap-4">
                    <span>{c.name}</span>
                    <span className="font-mono text-muted-foreground text-xs">{c.code}</span>
                  </span>
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
            </MenuGroup>
          </MenuPopup>
        </Menu>
      </div>
      <div className="flex min-h-6 items-center justify-between gap-3">
        <p
          aria-live="polite"
          className={cn("truncate text-xs tabular-nums transition-colors", over || under ? "text-destructive-foreground" : "text-muted-foreground")}
          id={`${id}-hint`}
        >
          {hint}
        </p>
        {hintAction}
      </div>
    </div>
  );
}
