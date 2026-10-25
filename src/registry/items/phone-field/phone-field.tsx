"use client";

import { Popover } from "@base-ui/react/popover";
import { CheckIcon, ChevronDownIcon, CircleCheckIcon, SearchIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ChangeEvent, type ClipboardEvent, type KeyboardEvent, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface Country {
  iso: string;
  name: string;
  dial: string;
  format: string;
  lengths: number[];
  trunk?: boolean;
  example: string;
}

export const COUNTRIES: Country[] = [
  { iso: "US", name: "United States", dial: "1", format: "(###) ###-####", lengths: [10], example: "4155550132" },
  { iso: "GB", name: "United Kingdom", dial: "44", format: "#### ######", lengths: [10], trunk: true, example: "7700900123" },
  { iso: "CA", name: "Canada", dial: "1", format: "(###) ###-####", lengths: [10], example: "6045550199" },
  { iso: "DE", name: "Germany", dial: "49", format: "### ########", lengths: [10, 11], trunk: true, example: "15123456789" },
  { iso: "FR", name: "France", dial: "33", format: "# ## ## ## ##", lengths: [9], trunk: true, example: "612345678" },
  { iso: "ES", name: "Spain", dial: "34", format: "### ### ###", lengths: [9], example: "612345678" },
  { iso: "IT", name: "Italy", dial: "39", format: "### ### ####", lengths: [9, 10], example: "3123456789" },
  { iso: "NL", name: "Netherlands", dial: "31", format: "# ## ## ## ##", lengths: [9], trunk: true, example: "612345678" },
  { iso: "SE", name: "Sweden", dial: "46", format: "## ### ## ##", lengths: [9], trunk: true, example: "701234567" },
  { iso: "IE", name: "Ireland", dial: "353", format: "## ### ####", lengths: [9], trunk: true, example: "851234567" },
  { iso: "PT", name: "Portugal", dial: "351", format: "### ### ###", lengths: [9], example: "912345678" },
  { iso: "CH", name: "Switzerland", dial: "41", format: "## ### ## ##", lengths: [9], trunk: true, example: "781234567" },
  { iso: "IN", name: "India", dial: "91", format: "##### #####", lengths: [10], trunk: true, example: "9812345678" },
  { iso: "JP", name: "Japan", dial: "81", format: "##-####-####", lengths: [10], trunk: true, example: "9012345678" },
  { iso: "KR", name: "South Korea", dial: "82", format: "##-####-####", lengths: [9, 10], trunk: true, example: "1012345678" },
  { iso: "CN", name: "China", dial: "86", format: "### #### ####", lengths: [11], example: "13812345678" },
  { iso: "SG", name: "Singapore", dial: "65", format: "#### ####", lengths: [8], example: "81234567" },
  { iso: "AU", name: "Australia", dial: "61", format: "### ### ###", lengths: [9], trunk: true, example: "412345678" },
  { iso: "NZ", name: "New Zealand", dial: "64", format: "## ### ####", lengths: [8, 9], trunk: true, example: "211234567" },
  { iso: "BR", name: "Brazil", dial: "55", format: "(##) #####-####", lengths: [10, 11], example: "11912345678" },
  { iso: "MX", name: "Mexico", dial: "52", format: "## #### ####", lengths: [10], example: "5512345678" },
  { iso: "ZA", name: "South Africa", dial: "27", format: "## ### ####", lengths: [9], trunk: true, example: "711234567" },
  { iso: "NG", name: "Nigeria", dial: "234", format: "### ### ####", lengths: [10], trunk: true, example: "8021234567" },
  { iso: "AE", name: "United Arab Emirates", dial: "971", format: "## ### ####", lengths: [9], trunk: true, example: "501234567" },
];

const THE = new Set(["US", "GB", "NL", "AE"]);

const flag = (iso: string) => String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

function format(digits: string, pattern: string) {
  let out = "";
  let i = 0;
  for (const ch of pattern) {
    if (i >= digits.length) break;
    if (ch === "#") out += digits[i++];
    else out += ch;
  }
  return out + digits.slice(i);
}

export interface PhoneValue {
  country: string;
  national: string;
  e164: string | null;
}

export interface PhoneFieldProps {
  defaultCountry?: string;
  onValueChange?: (value: PhoneValue) => void;
  countries?: Country[];
  label?: string;
  className?: string;
}

export function PhoneField({ defaultCountry = "GB", onValueChange, countries = COUNTRIES, label = "Phone number", className }: PhoneFieldProps) {
  const [iso, setIso] = useState(defaultCountry);
  const [digits, setDigits] = useState("");
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const caret = useRef<number | null>(null);
  const reduce = useReducedMotion();
  const id = useId();
  const country = countries.find((c) => c.iso === iso) ?? countries[0];
  const valid = country.lengths.includes(digits.length);
  const short = digits.length > 0 && digits.length < Math.min(...country.lengths);
  const showError = touched && short;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, "");
    if (!q) return countries;
    return countries
      .filter((c) => c.name.toLowerCase().includes(q) || c.iso.toLowerCase() === q || c.dial.startsWith(q))
      .sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)));
  }, [countries, query]);

  useLayoutEffect(() => {
    if (caret.current === null || !inputRef.current) return;
    inputRef.current.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  });

  const emit = (nextIso: string, nextDigits: string) => {
    const c = countries.find((x) => x.iso === nextIso) ?? country;
    onValueChange?.({ country: nextIso, national: nextDigits, e164: c.lengths.includes(nextDigits.length) ? `+${c.dial}${nextDigits}` : null });
  };

  const setNumber = (next: string, nextIso = iso) => {
    const c = countries.find((x) => x.iso === nextIso) ?? country;
    const clean = (c.trunk ? next.replace(/^0/, "") : next).slice(0, Math.max(...c.lengths));
    setDigits(clean);
    emit(nextIso, clean);
    return clean;
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const el = event.target;
    const at = el.selectionStart ?? el.value.length;
    let before = el.value.slice(0, at).replace(/\D/g, "").length;
    const raw = el.value.replace(/\D/g, "");
    if (country.trunk && raw.startsWith("0")) before = Math.max(0, before - 1);
    let next = raw;
    const native = event.nativeEvent as InputEvent;
    const plain = country.trunk ? raw.replace(/^0/, "") : raw;
    if (native.inputType === "deleteContentBackward" && plain === digits && before > 0) {
      next = plain.slice(0, before - 1) + plain.slice(before);
      before -= 1;
    }
    const clean = setNumber(next);
    const formatted = format(clean, country.format);
    let pos = 0;
    let seen = 0;
    while (pos < formatted.length && seen < Math.min(before, clean.length)) {
      if (/\d/.test(formatted[pos])) seen++;
      pos++;
    }
    caret.current = pos;
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text").trim();
    const intl = text.replace(/[^\d+]/g, "").replace(/^00/, "+");
    if (!intl.startsWith("+")) return;
    event.preventDefault();
    const num = intl.slice(1);
    const matches = countries.filter((c) => num.startsWith(c.dial)).sort((a, b) => b.dial.length - a.dial.length);
    const pick = matches.find((c) => c.iso === iso) ?? matches[0];
    if (!pick) return;
    setIso(pick.iso);
    setNumber(num.slice(pick.dial.length), pick.iso);
    setTouched(true);
  };

  const choose = (c: Country) => {
    setIso(c.iso);
    setOpen(false);
    setQuery("");
    setNumber(digits, c.iso);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = (active + (event.key === "ArrowDown" ? 1 : -1) + results.length) % Math.max(results.length, 1);
      setActive(next);
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      choose(results[active]);
    }
  };

  const missing = Math.min(...country.lengths) - digits.length;
  const place = THE.has(country.iso) ? `the ${country.name}` : country.name;
  const hint = showError
    ? `${missing} digit${missing === 1 ? "" : "s"} short for ${place}`
    : valid
      ? `+${country.dial} ${format(digits, country.format)}`
      : digits.length
        ? `${missing} more to go`
        : "We'll text a code to this number.";

  return (
    <div className={cn("grid w-full min-w-0 gap-2", className)}>
      <label className="font-medium text-sm" htmlFor={id}>
        {label}
      </label>
      <div
        className={cn(
          "flex h-9 items-stretch rounded-lg border border-input bg-background not-dark:bg-clip-padding shadow-xs/5 ring-ring/24 transition-shadow has-focus-visible:border-ring has-focus-visible:ring-[3px] dark:bg-input/32",
          showError && "border-destructive/40 has-focus-visible:border-destructive/64 has-focus-visible:ring-destructive/16",
        )}
      >
        <Popover.Root
          onOpenChange={(next) => {
            setOpen(next);
            if (next) setActive(Math.max(0, results.findIndex((c) => c.iso === iso)));
            else setQuery("");
          }}
          open={open}
        >
          <Popover.Trigger
            aria-label={`Country: ${country.name} (+${country.dial})`}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-l-[calc(var(--radius-lg)-1px)] border-r border-input pr-2 pl-2.5 text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent data-popup-open:bg-accent"
          >
            <span aria-hidden className="text-base leading-none">
              {flag(country.iso)}
            </span>
            <span className="text-muted-foreground tabular-nums">+{country.dial}</span>
            <ChevronDownIcon className="size-3.5 text-muted-foreground" />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner align="start" className="z-50" sideOffset={6}>
              <Popover.Popup
                className="w-72 origin-(--transform-origin) overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg/5 outline-none transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0"
                initialFocus={searchRef}
              >
                <div className="flex items-center gap-2 border-b px-3">
                  <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    aria-activedescendant={results[active] ? `${id}-c-${results[active].iso}` : undefined}
                    aria-controls={`${id}-list`}
                    aria-label="Search countries"
                    className="h-10 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/72 sm:text-sm"
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setActive(0);
                    }}
                    onKeyDown={onSearchKey}
                    placeholder="Country or code"
                    ref={searchRef}
                    role="combobox"
                    aria-expanded
                    value={query}
                  />
                </div>
                <div className="max-h-64 overflow-y-auto p-1" id={`${id}-list`} ref={listRef} role="listbox">
                  {results.length === 0 && <p className="px-2 py-6 text-center text-muted-foreground text-sm">No country matches “{query}”</p>}
                  {results.map((c, i) => (
                    <div
                      aria-selected={c.iso === iso}
                      className="flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-lg px-2 text-sm data-[active=true]:bg-accent"
                      data-active={i === active}
                      data-index={i}
                      id={`${id}-c-${c.iso}`}
                      key={c.iso}
                      onClick={() => choose(c)}
                      onMouseMove={() => setActive(i)}
                      role="option"
                    >
                      <span aria-hidden className="text-base leading-none">
                        {flag(c.iso)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="text-muted-foreground text-xs tabular-nums">+{c.dial}</span>
                      <CheckIcon className={cn("size-3.5 shrink-0", c.iso === iso ? "opacity-100" : "opacity-0")} />
                    </div>
                  ))}
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
        <input
          aria-describedby={`${id}-hint`}
          aria-invalid={showError || undefined}
          autoComplete="tel-national"
          className="w-0 min-w-0 flex-1 bg-transparent px-2.5 text-base tabular-nums outline-none placeholder:text-muted-foreground/60 sm:text-sm"
          id={id}
          inputMode="tel"
          maxLength={country.format.length + 4}
          onBlur={() => setTouched(true)}
          onChange={onChange}
          onFocus={() => setTouched(false)}
          onPaste={onPaste}
          placeholder={format(country.example, country.format)}
          ref={inputRef}
          type="tel"
          value={format(digits, country.format)}
        />
        <span className="flex w-9 shrink-0 items-center justify-center">
          <AnimatePresence initial={false}>
            {valid && (
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.1 } }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 600, damping: 30 }}
              >
                <CircleCheckIcon aria-hidden className="size-4 text-success-foreground" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </div>
      <p
        aria-live="polite"
        className={cn("text-xs tabular-nums", showError ? "text-destructive-foreground" : valid ? "text-success-foreground" : "text-muted-foreground")}
        id={`${id}-hint`}
      >
        {valid && <span className="sr-only">Valid number: </span>}
        {hint}
      </p>
    </div>
  );
}
