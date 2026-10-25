"use client";

import { ArrowUpRightIcon, CheckIcon, DownloadIcon, PlusIcon, RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface BillingPlan {
  name: string;
  price: number;
  interval: "month" | "year";
  billed: string;
  renewsOn: string;
  seatsUsed: number;
  seats: number;
  includes?: string[];
}

export interface BillingLine {
  label: string;
  amount: number;
}

export interface BillingInvoicePreview {
  dueOn: string;
  lines: BillingLine[];
  cycleDay: number;
  cycleLength: number;
}

export interface BillingCard {
  holder: string;
  last4: string;
  expires: string;
  kind?: string;
}

export interface BillingUsage {
  label: string;
  used: number;
  limit: number;
  unit?: string;
  format?: (n: number) => string;
}

export type InvoiceStatus = "paid" | "failed" | "refunded" | "open";

export interface BillingInvoice {
  id: string;
  date: string;
  amount: number;
  status: InvoiceStatus;
}

export interface BillingOverviewProps {
  title?: string;
  subtitle?: string;
  plan: BillingPlan;
  next: BillingInvoicePreview;
  card: BillingCard;
  billingEmail?: string;
  usage: BillingUsage[];
  invoices: BillingInvoice[];
  currency?: string;
  onChangePlan?: () => void;
  onUpdateCard?: () => void;
  onAddSeats?: () => void;
  onExport?: () => void;
  onDownload?: (invoice: BillingInvoice) => void;
  onRetry?: (invoice: BillingInvoice) => Promise<boolean>;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;
const press = "transition-[box-shadow,scale,background-color] duration-150 active:scale-[0.97]";

const STATUS: Record<InvoiceStatus, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-success/10 text-success-foreground" },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive-foreground" },
  refunded: { label: "Refunded", className: "bg-muted text-muted-foreground" },
  open: { label: "Open", className: "bg-info/10 text-info-foreground" },
};

function money(n: number, currency: string) {
  return `${currency}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CardLabel({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-2">
      <h3 className="font-medium text-muted-foreground text-sm">{children}</h3>
      {action}
    </div>
  );
}

function PaymentCard({ card }: { card: BillingCard }) {
  return (
    <div className="relative isolate aspect-[1.586] w-full max-w-[300px] overflow-hidden rounded-xl bg-linear-135 from-indigo-500 via-violet-600 to-fuchsia-600 p-4 text-white shadow-sm/10 ring-1 ring-black/5 ring-inset">
      <svg aria-hidden className="absolute inset-0 -z-10 size-full opacity-30" preserveAspectRatio="none" viewBox="0 0 300 190">
        <path d="M-20 150 C 60 90, 140 200, 320 80" fill="none" stroke="white" strokeOpacity=".35" strokeWidth="1" />
        <path d="M-20 170 C 80 110, 160 220, 320 100" fill="none" stroke="white" strokeOpacity=".25" strokeWidth="1" />
        <circle cx="260" cy="20" fill="white" fillOpacity=".12" r="70" />
      </svg>
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <svg aria-hidden className="h-7 w-9" viewBox="0 0 36 28">
            <rect fill="white" fillOpacity=".85" height="26" rx="5" width="34" x="1" y="1" />
            <path d="M1 10h11m12 0h11M1 18h11m12 0h11M12 1v26m12-26v26" stroke="rgb(0 0 0 / .18)" strokeWidth="1" />
          </svg>
          <span className="font-medium text-[0.6875rem] text-white/80 uppercase tracking-[0.14em]">{card.kind ?? "Business debit"}</span>
        </div>
        <div>
          <p className="font-mono text-base tracking-[0.18em] sm:text-lg">
            <span className="text-white/70">•••• •••• ••••</span> {card.last4}
          </p>
          <div className="mt-2 flex items-end justify-between text-[0.6875rem] uppercase tracking-wider">
            <span className="truncate">{card.holder}</span>
            <span className="tabular-nums">{card.expires}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageRow({ item, index }: { item: BillingUsage; index: number }) {
  const reduce = useReducedMotion();
  const pct = Math.min(1, item.used / item.limit);
  const tone = pct >= 0.9 ? "warning" : "default";
  const fmt = item.format ?? ((n: number) => n.toLocaleString("en-US"));
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium">
          {item.label}
          {tone === "warning" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-1.5 py-px font-medium text-[0.6875rem] text-warning-foreground">
              <TriangleAlertIcon className="size-3" />
              Near limit
            </span>
          )}
        </span>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
          <span className="text-foreground">{fmt(item.used)}</span> / {fmt(item.limit)}
          {item.unit ? ` ${item.unit}` : ""}
        </span>
      </div>
      <div
        aria-label={`${item.label}: ${Math.round(pct * 100)}% used`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(pct * 100)}
        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
        role="meter"
      >
        <motion.div
          animate={{ scaleX: pct }}
          className={cn("h-full origin-left rounded-full", tone === "warning" ? "bg-warning" : "bg-foreground/80")}
          initial={{ scaleX: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.7, ease, delay: 0.15 + index * 0.05 }}
        />
      </div>
    </li>
  );
}

function InvoiceRow({
  invoice,
  currency,
  onDownload,
  onRetry,
  onPaid,
}: {
  invoice: BillingInvoice;
  currency: string;
  onDownload?: (invoice: BillingInvoice) => void;
  onRetry?: (invoice: BillingInvoice) => Promise<boolean>;
  onPaid?: (invoice: BillingInvoice) => void;
}) {
  const [status, setStatus] = useState(invoice.status);
  const [retrying, setRetrying] = useState(false);
  const s = STATUS[status];
  const retry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    const ok = await onRetry(invoice);
    setRetrying(false);
    if (ok) {
      setStatus("paid");
      onPaid?.(invoice);
    }
  };
  return (
    <li className="grid grid-cols-[1fr_auto_76px] items-center gap-3 px-5 py-3 text-sm transition-colors duration-150 hover:bg-accent/40 sm:grid-cols-[1.1fr_1fr_88px_92px_28px]">
      <div className="min-w-0">
        <p className="font-medium">{invoice.date}</p>
        <p className="truncate font-mono text-muted-foreground text-xs sm:hidden">{invoice.id}</p>
      </div>
      <p className="hidden truncate font-mono text-muted-foreground text-xs sm:block">{invoice.id}</p>
      <p className="text-end tabular-nums">{money(invoice.amount, currency)}</p>
      <div className="flex justify-end">
        <AnimatePresence initial={false} mode="popLayout">
          {status === "failed" && onRetry ? (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.9 }}
              key="retry"
              transition={{ duration: 0.16, ease }}
            >
              <Button className={cn("text-destructive-foreground", press)} disabled={retrying} onClick={retry} size="xs" variant="outline">
                {retrying ? <Spinner /> : <RotateCwIcon />}
                Retry
              </Button>
            </motion.span>
          ) : (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs", s.className)}
              exit={{ opacity: 0, scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.9 }}
              key={status}
              transition={{ duration: 0.16, ease }}
            >
              {status === "paid" && invoice.status === "failed" && <CheckIcon className="size-3" strokeWidth={3} />}
              {s.label}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <Button
        aria-label={`Download invoice ${invoice.id}`}
        className={cn("hidden text-muted-foreground sm:inline-flex", press)}
        onClick={() => onDownload?.(invoice)}
        size="icon-sm"
        variant="ghost"
      >
        <DownloadIcon />
      </Button>
    </li>
  );
}

export function BillingOverview({
  title = "Billing",
  subtitle = "Your plan, what you’ve used this cycle, and every invoice.",
  plan,
  next,
  card,
  billingEmail,
  usage,
  invoices,
  currency = "$",
  onChangePlan,
  onUpdateCard,
  onAddSeats,
  onExport,
  onDownload,
  onRetry,
  className,
}: BillingOverviewProps) {
  const reduce = useReducedMotion();
  const total = next.lines.reduce((sum, l) => sum + l.amount, 0);
  const cycle = next.cycleDay / next.cycleLength;
  const [recovered, setRecovered] = useState<string[]>([]);
  const failed = invoices.find((i) => i.status === "failed" && !recovered.includes(i.id));

  return (
    <section className={cn("mx-auto w-full max-w-[1100px] space-y-4", className)}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-balance font-semibold text-xl tracking-tight">{title}</h2>
          <p className="mt-0.5 text-pretty text-muted-foreground text-sm">{subtitle}</p>
        </div>
        <Button className={press} onClick={onChangePlan} variant="outline">
          Compare plans
          <ArrowUpRightIcon />
        </Button>
      </header>

      <AnimatePresence initial={false}>
        {failed && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="-mb-4 overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            key={failed.id}
            transition={reduce ? { duration: 0 } : { duration: 0.24, ease }}
          >
            <div className="pb-4">
        <div role="alert" className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/6 p-4 text-sm dark:bg-destructive/10">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive-foreground sm:mt-2" />
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-pretty">
              <span className="font-medium">Your {failed.date} payment didn’t go through.</span>{" "}
              <span className="text-muted-foreground">We’ll try again in 3 days, or retry it from the list below.</span>
            </p>
            <Button className={cn("self-start sm:self-auto", press)} onClick={onUpdateCard} size="sm" variant="outline">
              Update card
            </Button>
          </div>
        </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <article className="flex flex-col rounded-2xl border bg-card p-5 shadow-xs/5">
          <CardLabel>Current plan</CardLabel>
          <div className="mt-2 flex items-center gap-2">
            <p className="font-semibold text-2xl tracking-tight">{plan.name}</p>
            <span className="rounded-full border px-2 py-0.5 font-medium text-muted-foreground text-xs">{plan.billed}</span>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">
            <span className="font-medium text-foreground tabular-nums">{money(plan.price, currency)}</span> per {plan.interval} · renews{" "}
            {plan.renewsOn}
          </p>
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Seats</span>
              <span className="tabular-nums">
                {plan.seatsUsed} of {plan.seats} used
              </span>
            </div>
            <div aria-hidden className="mt-2 flex gap-1">
              {Array.from({ length: plan.seats }, (_, i) => (
                <motion.span
                  animate={{ opacity: 1, scaleY: 1 }}
                  className={cn("h-5 flex-1 origin-bottom rounded-[4px]", i < plan.seatsUsed ? "bg-foreground/80" : "bg-muted")}
                  initial={{ opacity: 0, scaleY: 0.4 }}
                  key={i}
                  transition={reduce ? { duration: 0 } : { duration: 0.3, ease, delay: 0.1 + i * 0.025 }}
                />
              ))}
            </div>
          </div>
          {plan.includes && plan.includes.length > 0 && (
            <ul className="mt-4 space-y-1.5 text-sm">
              {plan.includes.map((f) => (
                <li className="flex items-center gap-2" key={f}>
                  <CheckIcon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2.5} />
                  <span className="truncate">{f}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto flex gap-2 pt-5">
            <Button className={cn("flex-1", press)} onClick={onChangePlan}>
              Change plan
            </Button>
            <Button className={cn("flex-1", press)} onClick={onAddSeats} variant="outline">
              <PlusIcon />
              Add seats
            </Button>
          </div>
        </article>

        <article className="flex flex-col rounded-2xl border bg-card p-5 shadow-xs/5">
          <CardLabel>Next invoice</CardLabel>
          <p className="mt-2 font-semibold text-2xl tabular-nums tracking-tight">{money(total, currency)}</p>
          <p className="mt-1 text-muted-foreground text-sm">Estimated · charged {next.dueOn}</p>
          <dl className="mt-4 space-y-1.5 text-sm">
            {next.lines.map((l) => (
              <div className="flex justify-between gap-3" key={l.label}>
                <dt className="truncate text-muted-foreground">{l.label}</dt>
                <dd className="tabular-nums">{money(l.amount, currency)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto pt-5">
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Billing cycle</span>
              <span className="tabular-nums">
                Day {next.cycleDay} of {next.cycleLength}
              </span>
            </div>
            <div className="relative mt-2 h-2 rounded-full bg-muted">
              <motion.div
                animate={{ scaleX: cycle }}
                className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-info"
                initial={{ scaleX: 0 }}
                transition={reduce ? { duration: 0 } : { duration: 0.8, ease, delay: 0.2 }}
              />
            </div>
          </div>
        </article>

        <article className="flex flex-col rounded-2xl border bg-card p-5 shadow-xs/5 md:col-span-2 lg:col-span-1">
          <CardLabel
            action={
              <Button className={cn("-me-2 text-muted-foreground", press)} onClick={onUpdateCard} size="sm" variant="ghost">
                Update
              </Button>
            }
          >
            Payment method
          </CardLabel>
          <div className="mt-3 flex flex-1 flex-col gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
            <PaymentCard card={card} />
            <div className="space-y-1.5 text-sm">
              <p className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Default</span>
                <span className="font-mono text-xs">•••• {card.last4}</span>
              </p>
              {billingEmail && (
                <p className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Billing email</span>
                  <span className="truncate">{billingEmail}</span>
                </p>
              )}
            </div>
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
        <article className="rounded-2xl border bg-card p-5 shadow-xs/5">
          <CardLabel>Usage this cycle</CardLabel>
          <ul className="mt-4 space-y-5">
            {usage.map((u, i) => (
              <UsageRow index={i} item={u} key={u.label} />
            ))}
          </ul>
          <p className="mt-5 text-pretty text-muted-foreground text-xs">
            Overage is billed at the end of the cycle. Usage resets {plan.renewsOn.split(",")[0]}.
          </p>
        </article>

        <article className="overflow-hidden rounded-2xl border bg-card shadow-xs/5">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="font-medium text-muted-foreground text-sm">Invoices</h3>
            <Button className={cn("-me-2 text-muted-foreground", press)} onClick={onExport} size="sm" variant="ghost">
              <DownloadIcon />
              Export CSV
            </Button>
          </div>
          <div className="hidden grid-cols-[1.1fr_1fr_88px_92px_28px] gap-3 border-y bg-muted/40 px-5 py-2 text-muted-foreground text-xs sm:grid">
            <span>Date</span>
            <span>Invoice</span>
            <span className="text-end">Amount</span>
            <span className="text-end">Status</span>
            <span />
          </div>
          <ul className="divide-y border-t sm:border-t-0">
            {invoices.map((inv) => (
              <InvoiceRow
                currency={currency}
                invoice={inv}
                key={inv.id}
                onDownload={onDownload}
                onPaid={(i) => setRecovered((ids) => [...ids, i.id])}
                onRetry={onRetry}
              />
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
