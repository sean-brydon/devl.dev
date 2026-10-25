"use client";

import { CalendarIcon, PackageIcon, PlusIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type BillingRepeat = "monthly" | "quarterly" | "annually" | "upfront";
export type BillingTiming = "advance" | "arrears";

export interface BillingProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
  oneTime?: boolean;
}

export interface BillingLine {
  productId: string;
  quantity: number;
  repeat: BillingRepeat;
  timing: BillingTiming;
}

export interface BillingPhase {
  name: string;
  start: Date;
  months: number;
  lines: BillingLine[];
  discount: { enabled: boolean; percent: number };
  minimum: { enabled: boolean; amount: number };
}

export interface BillingTotals {
  subtotal: number;
  discount: number;
  trueUp: number;
  total: number;
  invoices: number[];
}

export interface PhaseBuilderProps {
  catalog: BillingProduct[];
  defaultPhase: BillingPhase;
  currency?: string;
  locale?: string;
  onChange?: (phase: BillingPhase, totals: BillingTotals) => void;
  className?: string;
}

const repeatLabels: Record<BillingRepeat, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
  upfront: "Upfront",
};
const repeatMonths: Record<BillingRepeat, number> = { monthly: 1, quarterly: 3, annually: 12, upfront: Infinity };
const timingLabels: Record<BillingTiming, string> = { advance: "In advance", arrears: "In arrears" };

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}

function computeTotals(phase: BillingPhase, catalog: BillingProduct[]): BillingTotals & { trueUpMonth: number } {
  const n = Math.max(1, phase.months);
  const invoices = Array.from({ length: n }, () => 0);
  let subtotal = 0;
  let discount = 0;
  const pct = phase.discount.enabled ? phase.discount.percent : 0;

  for (const line of phase.lines) {
    const p = catalog.find((c) => c.id === line.productId);
    if (!p) continue;
    if (p.oneTime) {
      const amt = p.price * line.quantity;
      const month = line.timing === "advance" ? 0 : n - 1;
      invoices[month] += amt;
      subtotal += amt;
      continue;
    }
    const period = Math.min(repeatMonths[line.repeat], n);
    for (let start = 0; start < n; start += period) {
      const len = Math.min(period, n - start);
      const gross = p.price * line.quantity * len;
      const off = gross * pct;
      const month = line.timing === "advance" ? start : start + len - 1;
      invoices[month] += gross - off;
      subtotal += gross;
      discount += off;
    }
  }

  const net = subtotal - discount;
  const trueUp = phase.minimum.enabled ? Math.max(0, phase.minimum.amount - net) : 0;
  if (trueUp) invoices[n - 1] += trueUp;
  return { subtotal, discount, trueUp, total: net + trueUp, invoices, trueUpMonth: n - 1 };
}

function Rolling({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const reduce = useReducedMotion();
  const text = format(value);
  const chars = text.split("");
  return (
    <span className={cn("relative inline-flex tabular-nums leading-[1.2]", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex">
        {chars.map((ch, i) => {
          const key = chars.length - i;
          if (!/\d/.test(ch)) {
            return (
              <span className="inline-block" key={`s${key}${ch}`}>
                {ch}
              </span>
            );
          }
          const d = Number(ch);
          return (
            <span className="relative inline-block h-[1.2em] overflow-hidden" key={`d${key}`}>
              <span className="invisible">0</span>
              <motion.span
                animate={{ y: `${-d * 1.2}em` }}
                className="absolute inset-x-0 top-0 flex flex-col"
                initial={false}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 28 }}
              >
                {"0123456789".split("").map((n) => (
                  <span className="block h-[1.2em]" key={n}>
                    {n}
                  </span>
                ))}
              </motion.span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

const press = "transition-[scale,box-shadow,background-color] duration-150 ease-out active:scale-[0.97]";

const pillTrigger =
  "h-7 min-h-7 w-auto min-w-0 gap-1 rounded-md border-transparent bg-muted px-2 text-xs shadow-none before:hidden sm:h-6 sm:min-h-6 sm:text-xs dark:bg-input/48 [&_svg]:size-3!";

function Field({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex h-5 items-center justify-between gap-2">
        <span className="font-medium text-muted-foreground text-xs">{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

export function PhaseBuilder({
  catalog,
  defaultPhase,
  currency = "USD",
  locale = "en-US",
  onChange,
  className,
}: PhaseBuilderProps) {
  const reduce = useReducedMotion();
  const id = useId();
  const [phase, setPhase] = useState(defaultPhase);
  const [hover, setHover] = useState<number | null>(null);
  const [dateOpen, setDateOpen] = useState(false);

  const totals = useMemo(() => computeTotals(phase, catalog), [phase, catalog]);
  const update = (next: BillingPhase) => {
    setPhase(next);
    onChange?.(next, computeTotals(next, catalog));
  };
  const setLine = (i: number, patch: Partial<BillingLine>) =>
    update({ ...phase, lines: phase.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  const money = useMemo(() => {
    const whole = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 });
    const cents = new Intl.NumberFormat(locale, { style: "currency", currency });
    return { whole: (n: number) => whole.format(Math.round(n)), cents: (n: number) => cents.format(n) };
  }, [currency, locale]);
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }), [locale]);
  const monthFmt = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }), [locale]);
  const tickFmt = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short" }), [locale]);

  const end = addMonths(phase.start, phase.months);
  end.setDate(end.getDate() - 1);
  const max = Math.max(...totals.invoices, 1);
  const available = catalog.filter((c) => !phase.lines.some((l) => l.productId === c.id));
  const shown = hover ?? 0;
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 34 };

  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn("w-full max-w-[600px] rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-sm" id={`${id}-title`}>
            {phase.name}
          </h3>
          <p className="truncate text-muted-foreground text-xs tabular-nums">
            {dateFmt.format(phase.start)} → {dateFmt.format(end)}
          </p>
        </div>
        <Badge variant="outline">Draft</Badge>
      </header>

      <div className="grid grid-cols-2 gap-x-3 gap-y-3 px-4 pb-4 sm:grid-cols-[1.2fr_1.25fr_0.85fr_1fr]">
        <Field label="Start">
          <Popover onOpenChange={setDateOpen} open={dateOpen}>
            <PopoverTrigger
              render={
                <Button className="w-full justify-start px-2.5 font-normal text-sm tabular-nums" size="sm" variant="outline" />
              }
            >
              <CalendarIcon />
              <span className="truncate">{dateFmt.format(phase.start)}</span>
            </PopoverTrigger>
            <PopoverPopup align="start">
              <Calendar
                className="[--cell-size:--spacing(8)]"
                defaultMonth={phase.start}
                mode="single"
                onSelect={(d: Date | undefined) => {
                  if (d) update({ ...phase, start: d });
                  setDateOpen(false);
                }}
                selected={phase.start}
              />
            </PopoverPopup>
          </Popover>
        </Field>
        <Field label="Duration">
          <NumberField
            format={{ style: "unit", unit: "month", unitDisplay: "long" }}
            locale={locale}
            max={36}
            min={1}
            onValueChange={(v) => update({ ...phase, months: Math.min(36, Math.max(1, v ?? 1)) })}
            size="sm"
            value={phase.months}
          >
            <NumberFieldGroup className="[&>button]:px-2">
              <NumberFieldDecrement />
              <NumberFieldInput aria-label="Duration in months" className="px-0! text-sm" />
              <NumberFieldIncrement />
            </NumberFieldGroup>
          </NumberField>
        </Field>
        <Field
          action={
            <Switch
              aria-label="Apply discount"
              checked={phase.discount.enabled}
              onCheckedChange={(v) => update({ ...phase, discount: { ...phase.discount, enabled: v } })}
            />
          }
          label="Discount"
        >
          <NumberField
            disabled={!phase.discount.enabled}
            format={{ style: "percent" }}
            locale={locale}
            max={1}
            min={0}
            onValueChange={(v) => update({ ...phase, discount: { ...phase.discount, percent: v ?? 0 } })}
            size="sm"
            smallStep={0.01}
            step={0.01}
            value={phase.discount.percent}
          >
            <NumberFieldGroup>
              <NumberFieldInput aria-label="Discount percent" className="px-2.5! text-left text-sm" />
            </NumberFieldGroup>
          </NumberField>
        </Field>
        <Field
          action={
            <Switch
              aria-label="Minimum commitment"
              checked={phase.minimum.enabled}
              onCheckedChange={(v) => update({ ...phase, minimum: { ...phase.minimum, enabled: v } })}
            />
          }
          label="Minimum"
        >
          <NumberField
            disabled={!phase.minimum.enabled}
            format={{ style: "currency", currency, maximumFractionDigits: 0 }}
            locale={locale}
            min={0}
            onValueChange={(v) => update({ ...phase, minimum: { ...phase.minimum, amount: v ?? 0 } })}
            size="sm"
            step={1000}
            value={phase.minimum.amount}
          >
            <NumberFieldGroup>
              <NumberFieldInput aria-label="Minimum commitment amount" className="px-2.5! text-left text-sm" />
            </NumberFieldGroup>
          </NumberField>
        </Field>
      </div>

      <div className="border-t px-4 py-3">
        <div className="mb-1 flex h-7 items-center justify-between">
          <span className="font-medium text-sm">
            Products <span className="text-muted-foreground tabular-nums">{phase.lines.length}</span>
          </span>
          <Menu>
            <MenuTrigger
              disabled={available.length === 0}
              render={<Button className={cn("-me-1.5", press)} size="sm" variant="ghost" />}
            >
              <PlusIcon />
              Add product
            </MenuTrigger>
            <MenuPopup align="end">
              {available.map((p) => (
                <MenuItem
                  key={p.id}
                  onClick={() =>
                    update({
                      ...phase,
                      lines: [
                        ...phase.lines,
                        {
                          productId: p.id,
                          quantity: 1,
                          repeat: p.oneTime ? "upfront" : "monthly",
                          timing: "advance",
                        },
                      ],
                    })
                  }
                >
                  <PackageIcon />
                  <span className="flex-1">{p.name}</span>
                  <span className="ps-4 text-muted-foreground text-xs tabular-nums">
                    {money.whole(p.price)}
                    {p.oneTime ? "" : "/mo"}
                  </span>
                </MenuItem>
              ))}
            </MenuPopup>
          </Menu>
        </div>

        <motion.ul className="flex flex-col" layout transition={spring}>
          <AnimatePresence initial={false}>
            {phase.lines.map((line, i) => {
              const p = catalog.find((c) => c.id === line.productId);
              if (!p) return null;
              const lineTotal = computeTotals({ ...phase, lines: [line], minimum: { enabled: false, amount: 0 } }, catalog).total;
              return (
                <motion.li
                  animate={{ opacity: 1, height: "auto" }}
                  className="overflow-hidden"
                  exit={{ opacity: 0, height: 0 }}
                  initial={reduce ? false : { opacity: 0, height: 0 }}
                  key={line.productId}
                  layout="position"
                  transition={spring}
                >
                  <div className="flex flex-col gap-1.5 border-t py-2 in-[li:first-child]:border-t-0">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate font-medium text-sm">{p.name}</span>
                      <span className="hidden shrink-0 text-muted-foreground text-xs tabular-nums min-[400px]:inline">
                        {money.whole(p.price)}
                        {p.oneTime ? " flat" : ` / ${p.unit} / mo`}
                      </span>
                      <Rolling className="ms-auto shrink-0 font-medium text-sm" format={money.whole} value={lineTotal} />
                      <Button
                        aria-label={`Remove ${p.name}`}
                        className="-me-1 self-center text-muted-foreground transition-[scale,background-color] duration-150 ease-out after:absolute after:-inset-1 active:scale-[0.94]"
                        onClick={() => update({ ...phase, lines: phase.lines.filter((_, j) => j !== i) })}
                        size="icon-xs"
                        variant="ghost"
                      >
                        <XIcon />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <NumberField
                        className="me-1 w-24"
                        max={999}
                        min={1}
                        onValueChange={(v) => setLine(i, { quantity: Math.max(1, v ?? 1) })}
                        size="sm"
                        value={line.quantity}
                      >
                        <NumberFieldGroup className="h-7 sm:h-6 [&_button]:px-1.5">
                          <NumberFieldDecrement />
                          <NumberFieldInput aria-label={`${p.name} quantity`} className="h-full! px-0! text-xs leading-none!" />
                          <NumberFieldIncrement />
                        </NumberFieldGroup>
                      </NumberField>
                      {p.oneTime ? (
                        <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground text-xs sm:py-0.5 dark:bg-input/48">
                          One-time
                        </span>
                      ) : (
                        <Select
                          items={Object.entries(repeatLabels).map(([value, label]) => ({ value, label }))}
                          onValueChange={(v) => v && setLine(i, { repeat: v as BillingRepeat })}
                          value={line.repeat}
                        >
                          <SelectTrigger aria-label={`${p.name} repeat`} className={pillTrigger} size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectPopup>
                            {(Object.keys(repeatLabels) as BillingRepeat[]).map((r) => (
                              <SelectItem key={r} value={r}>
                                {repeatLabels[r]}
                              </SelectItem>
                            ))}
                          </SelectPopup>
                        </Select>
                      )}
                      <Select
                        items={Object.entries(timingLabels).map(([value, label]) => ({ value, label }))}
                        onValueChange={(v) => v && setLine(i, { timing: v as BillingTiming })}
                        value={line.timing}
                      >
                        <SelectTrigger aria-label={`${p.name} timing`} className={pillTrigger} size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectPopup>
                          {(Object.keys(timingLabels) as BillingTiming[]).map((t) => (
                            <SelectItem key={t} value={t}>
                              {timingLabels[t]}
                            </SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
        {phase.lines.length === 0 && (
          <p className="rounded-xl border border-dashed py-6 text-center text-muted-foreground text-xs">
            No products yet. Add one to see the schedule.
          </p>
        )}
      </div>

      <div className="rounded-b-2xl border-t bg-muted/40 p-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <p className="text-muted-foreground text-xs">Contract value</p>
            <Rolling className="font-medium text-2xl tracking-tight" format={money.whole} value={totals.total} />
          </div>
          <dl className="grid grid-cols-3 gap-x-5 text-xs sm:text-right">
            <dt className="text-muted-foreground">First invoice</dt>
            <dt className="text-muted-foreground">Per month</dt>
            <dt className="text-muted-foreground">Discount</dt>
            <dd className="font-medium">
              <Rolling format={money.whole} value={totals.invoices[0] ?? 0} />
            </dd>
            <dd className="font-medium">
              <Rolling format={money.whole} value={totals.total / phase.months} />
            </dd>
            <dd className="font-medium">
              <Rolling format={(n) => (n ? `−${money.whole(n)}` : money.whole(0))} value={totals.discount} />
            </dd>
          </dl>
        </div>

        <div className="mt-4 mb-1.5 flex h-4 items-center justify-between gap-3 text-xs">
          <span className="truncate text-muted-foreground">
            {totals.invoices.filter((v) => v > 0).length} invoices
          </span>
          <span className="shrink-0 tabular-nums">
            <span className="text-muted-foreground">{monthFmt.format(addMonths(phase.start, shown))} · </span>
            <span className="font-medium">{money.cents(totals.invoices[shown] ?? 0)}</span>
          </span>
        </div>
        <div
          aria-label="Amount invoiced per month"
          className="flex h-12 items-end gap-[3px]"
          onMouseLeave={() => setHover(null)}
          role="img"
        >
          {totals.invoices.map((v, i) => {
            const isTrueUp = totals.trueUp > 0 && i === totals.trueUpMonth;
            const trueUpShare = isTrueUp ? totals.trueUp / Math.max(v, 1) : 0;
            return (
              <div
                className="relative flex h-full min-w-0 flex-1 cursor-default items-end"
                key={i}
                onMouseEnter={() => setHover(i)}
              >
                <motion.div
                  animate={{ height: v > 0 ? `${Math.max(6, (v / max) * 100)}%` : "2px" }}
                  className={cn(
                    "relative w-full overflow-hidden rounded-[3px] transition-colors",
                    v > 0 ? "bg-foreground/40" : "bg-foreground/12",
                    (hover === null ? i === 0 : hover === i) && v > 0 && "bg-foreground",
                  )}
                  initial={false}
                  transition={spring}
                >
                  {isTrueUp && (
                    <motion.div
                      animate={{ height: `${trueUpShare * 100}%` }}
                      className="absolute inset-x-0 top-0 bg-warning"
                      initial={false}
                      transition={spring}
                    />
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>{tickFmt.format(phase.start)}</span>
          {phase.months > 2 && <span>{tickFmt.format(addMonths(phase.start, Math.floor(phase.months / 2)))}</span>}
          <span>{tickFmt.format(addMonths(phase.start, phase.months - 1))}</span>
        </div>

        <AnimatePresence initial={false}>
          {totals.trueUp > 0 && (
            <motion.p
              animate={{ opacity: 1, height: "auto", marginTop: 10 }}
              className="flex items-start gap-1.5 overflow-hidden text-warning-foreground text-xs"
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              initial={reduce ? false : { opacity: 0, height: 0, marginTop: 0 }}
              transition={spring}
            >
              <span className="mt-1 size-2 shrink-0 rounded-[2px] bg-warning" />
              <span>
                {money.whole(totals.trueUp)} short of the {money.whole(phase.minimum.amount)} minimum, billed as a
                true-up in {monthFmt.format(addMonths(phase.start, totals.trueUpMonth))}.
              </span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
