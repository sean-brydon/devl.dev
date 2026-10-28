"use client";

import {
  CalendarClockIcon,
  CheckIcon,
  LandmarkIcon,
  LockIcon,
  type LucideIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  TagIcon,
  TruckIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CheckoutItem {
  id: string;
  name: string;
  variant?: string;
  price: number;
  quantity: number;
  icon: LucideIcon;
  tone?: string;
}

export interface CheckoutShipping {
  id: string;
  label: string;
  eta: string;
  price: number;
}

export interface CheckoutPromo {
  code: string;
  percent: number;
}

export interface CheckoutExpress {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface CheckoutSummaryProps {
  items: CheckoutItem[];
  shipping: CheckoutShipping[];
  express?: CheckoutExpress[];
  taxRate?: number;
  currency?: string;
  email?: string;
  validatePromo?: (code: string) => Promise<CheckoutPromo | null>;
  onPay?: (total: number) => Promise<void>;
  onExpress?: (method: CheckoutExpress) => void;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;
const press = "transition-[box-shadow,scale,background-color] duration-150 active:scale-[0.97]";
const DEFAULT_EXPRESS: CheckoutExpress[] = [
  { id: "wallet", label: "Wallet", icon: WalletIcon },
  { id: "later", label: "Pay later", icon: CalendarClockIcon },
  { id: "bank", label: "Bank", icon: LandmarkIcon },
];

function Digit({ value }: { value: number }) {
  const reduce = useReducedMotion();
  return (
    <span aria-hidden className="relative inline-block h-[1.2em] w-[0.6em] overflow-hidden">
      <motion.span
        animate={{ y: `${-value * 1.2}em` }}
        className="absolute inset-x-0 top-0 flex flex-col items-center"
        initial={false}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span className="block h-[1.2em] leading-[1.2em]" key={n}>
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function Money({ value, currency, className, decimals = 2 }: { value: number; currency: string; className?: string; decimals?: number }) {
  const text = `${currency}${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  const chars = text.split("");
  return (
    <span className={cn("inline-flex items-start tabular-nums", className)}>
      <span className="sr-only">{text}</span>
      {chars.map((ch, i) => {
        const key = chars.length - i;
        return /\d/.test(ch) ? (
          <Digit key={`d${key}`} value={Number(ch)} />
        ) : (
          <span aria-hidden className="inline-block h-[1.2em] leading-[1.2em]" key={`s${key}`}>
            {ch}
          </span>
        );
      })}
    </span>
  );
}

function plain(n: number, currency: string) {
  return `${currency}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CheckoutSummary({
  items: initialItems,
  shipping,
  express = DEFAULT_EXPRESS,
  taxRate = 0.0825,
  currency = "$",
  email = "",
  validatePromo = async () => null,
  onPay = async () => {},
  onExpress,
  className,
}: CheckoutSummaryProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const shipLayout = useId();
  const [items, setItems] = useState(initialItems);
  const [method, setMethod] = useState(shipping[0]?.id);
  const [promoOpen, setPromoOpen] = useState(false);
  const [code, setCode] = useState("");
  const [promo, setPromo] = useState<CheckoutPromo | null>(null);
  const [promoError, setPromoError] = useState<string>();
  const [checking, setChecking] = useState(false);
  const [contact, setContact] = useState(email);
  const [phase, setPhase] = useState<"idle" | "paying" | "done">("idle");

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = promo ? Math.round(subtotal * promo.percent * 100) / 100 : 0;
  const ship = shipping.find((s) => s.id === method)?.price ?? 0;
  const tax = Math.round((subtotal - discount) * taxRate * 100) / 100;
  const total = Math.max(0, subtotal - discount + ship + tax);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  const setQty = (id: string, q: number) =>
    setItems((list) => list.flatMap((i) => (i.id === id ? (q <= 0 ? [] : [{ ...i, quantity: Math.min(9, q) }]) : [i])));

  const apply = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    const found = await validatePromo(code.trim().toUpperCase());
    setChecking(false);
    if (found) {
      setPromo(found);
      setPromoOpen(false);
      setCode("");
      setPromoError(undefined);
    } else {
      setPromoError("That code isn’t valid or has expired.");
    }
  };

  const pay = async () => {
    setPhase("paying");
    await onPay(total);
    setPhase("done");
  };

  return (
    <section className={cn("mx-auto grid w-full max-w-[1000px] items-start gap-5 md:grid-cols-[1fr_400px] md:gap-6", className)}>
      <div className="order-2 space-y-5 rounded-2xl border bg-card p-5 shadow-xs/5 sm:p-6 md:order-1">
        <div>
          <h2 className="font-semibold text-base tracking-tight">Express checkout</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {express.map((m) => (
              <Button className={cn("h-11 sm:h-10", press)} key={m.id} onClick={() => onExpress?.(m)} variant="outline">
                <m.icon />
                {m.label}
              </Button>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3 text-muted-foreground text-xs">
            <span className="h-px flex-1 bg-border" />
            or check out below
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>

        <div>
          <label className="font-medium text-sm" htmlFor={`${uid}-email`}>
            Email for receipts
          </label>
          <Input
            autoComplete="email"
            className="mt-2"
            id={`${uid}-email`}
            onChange={(e) => setContact(e.target.value)}
            placeholder="you@example.com"
            type="email"
            value={contact}
          />
        </div>

        <fieldset>
          <legend className="font-medium text-sm">Delivery</legend>
          <div className="mt-2 space-y-2" role="radiogroup">
            {shipping.map((s) => {
              const on = s.id === method;
              return (
                <label
                  className={cn(
                    "relative flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-ring",
                    on ? "border-transparent" : "hover:bg-accent/40",
                  )}
                  key={s.id}
                >
                  {on && (
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-xl border-2 border-foreground/80 bg-accent/40"
                      layoutId={shipLayout}
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <input checked={on} className="sr-only" name={`${uid}-ship`} onChange={() => setMethod(s.id)} type="radio" value={s.id} />
                  <span
                    className={cn(
                      "relative flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
                      on ? "border-primary bg-primary" : "border-input",
                    )}
                  >
                    <motion.span
                      animate={{ scale: on ? 1 : 0 }}
                      className="size-1.5 rounded-full bg-primary-foreground"
                      initial={false}
                      transition={{ duration: 0.15, ease }}
                    />
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block font-medium text-sm">{s.label}</span>
                    <span className="block text-muted-foreground text-xs">{s.eta}</span>
                  </span>
                  <span className="relative font-medium text-sm tabular-nums">{s.price === 0 ? "Free" : plain(s.price, currency)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      <aside className="order-1 overflow-hidden rounded-2xl border bg-card shadow-xs/5 md:order-2">
        <div className="flex items-baseline justify-between px-5 pt-5 sm:px-6">
          <h2 className="font-semibold text-base tracking-tight">Order summary</h2>
          <span className="text-muted-foreground text-xs tabular-nums">
            {count} {count === 1 ? "item" : "items"}
          </span>
        </div>

        <ul className="mt-3 px-5 sm:px-6">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.li
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
                exit={{ opacity: 0, height: 0 }}
                initial={false}
                key={item.id}
                transition={{ duration: reduce ? 0 : 0.22, ease }}
              >
                <div className="flex gap-3 border-b py-3">
                  <span
                    className={cn(
                      "relative flex size-14 shrink-0 items-center justify-center rounded-xl",
                      item.tone ?? "bg-muted text-foreground",
                    )}
                  >
                    <item.icon className="size-6" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-sm">{item.name}</p>
                        {item.variant && <p className="truncate text-muted-foreground text-xs">{item.variant}</p>}
                      </div>
                      <button
                        aria-label={`Remove ${item.name}`}
                        className="-me-1.5 -mt-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setQty(item.id, 0)}
                        type="button"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border">
                        <button
                          aria-label={`One fewer ${item.name}`}
                          className="flex size-7 cursor-pointer items-center justify-center rounded-s-lg text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-90"
                          onClick={() => setQty(item.id, item.quantity - 1)}
                          type="button"
                        >
                          <MinusIcon className="size-3" />
                        </button>
                        <span aria-live="polite" className="w-6 text-center text-sm">
                          <Money className="justify-center" currency="" decimals={0} value={item.quantity} />
                        </span>
                        <button
                          aria-label={`One more ${item.name}`}
                          className="flex size-7 cursor-pointer items-center justify-center rounded-e-lg text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-90 disabled:opacity-40"
                          disabled={item.quantity >= 9}
                          onClick={() => setQty(item.id, item.quantity + 1)}
                          type="button"
                        >
                          <PlusIcon className="size-3" />
                        </button>
                      </div>
                      <Money className="font-medium text-sm" currency={currency} value={item.price * item.quantity} />
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {items.length === 0 && <p className="px-6 py-8 text-center text-muted-foreground text-sm">Your bag is empty.</p>}

        <div className="px-5 py-4 sm:px-6">
          <AnimatePresence initial={false} mode="popLayout">
            {promo ? (
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between gap-2"
                initial={{ opacity: 0, scale: 0.96 }}
                key="applied"
                transition={{ duration: 0.18, ease }}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 py-1 ps-2 pe-1 font-medium font-mono text-success-foreground text-xs">
                  <TagIcon className="size-3" />
                  {promo.code}
                  <button
                    aria-label={`Remove code ${promo.code}`}
                    className="flex size-5 cursor-pointer items-center justify-center rounded-full outline-none hover:bg-success/15 focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setPromo(null)}
                    type="button"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
                <span className="text-muted-foreground text-xs">{Math.round(promo.percent * 100)}% off your order</span>
              </motion.div>
            ) : promoOpen ? (
              <motion.form
                animate={{ opacity: 1 }}
                initial={{ opacity: 0 }}
                key="form"
                noValidate
                onSubmit={apply}
                transition={{ duration: 0.16 }}
              >
                <label className="sr-only" htmlFor={`${uid}-promo`}>
                  Promo code
                </label>
                <div className="flex gap-2">
                  <Input
                    aria-describedby={promoError ? `${uid}-promo-err` : undefined}
                    aria-invalid={promoError ? true : undefined}
                    autoFocus
                    className="flex-1 font-mono"
                    id={`${uid}-promo`}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setPromoError(undefined);
                    }}
                    placeholder="Promo code"
                    value={code}
                  />
                  <Button className={press} disabled={!code.trim()} loading={checking} type="submit" variant="outline">
                    Apply
                  </Button>
                </div>
                <AnimatePresence initial={false}>
                  {promoError && (
                    <motion.p
                      animate={{ height: "auto", opacity: 1 }}
                      className="overflow-hidden text-destructive-foreground text-xs"
                      exit={{ height: 0, opacity: 0 }}
                      id={`${uid}-promo-err`}
                      initial={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease }}
                    >
                      <span className="block pt-1.5">{promoError}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.form>
            ) : (
              <motion.button
                animate={{ opacity: 1 }}
                className="flex cursor-pointer items-center gap-1.5 rounded text-muted-foreground text-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                initial={{ opacity: 0 }}
                key="link"
                onClick={() => setPromoOpen(true)}
                type="button"
              >
                <TagIcon className="size-3.5" />
                Add a promo code
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <dl className="space-y-2 border-t bg-muted/30 px-5 py-4 text-sm sm:px-6">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>
              <Money currency={currency} value={subtotal} />
            </dd>
          </div>
          <AnimatePresence initial={false}>
            {promo && (
              <motion.div
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden"
                exit={{ height: 0, opacity: 0 }}
                initial={{ height: 0, opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.2, ease }}
              >
                <div className="flex justify-between text-success-foreground">
                  <dt>Discount</dt>
                  <dd>
                    <Money currency={`−${currency}`} value={discount} />
                  </dd>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd>{ship === 0 ? <span className="font-medium text-success-foreground">Free</span> : <Money currency={currency} value={ship} />}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Estimated tax</dt>
            <dd>
              <Money currency={currency} value={tax} />
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t pt-3">
            <dt className="font-medium">Total</dt>
            <dd className="font-semibold text-xl tracking-tight">
              <Money currency={currency} value={total} />
            </dd>
          </div>
        </dl>

        <div className="px-5 pt-1 pb-5 sm:px-6">
          <Button
            className={cn("w-full", press, phase === "done" && "disabled:opacity-100")}
            disabled={!items.length || phase !== "idle"}
            loading={phase === "paying"}
            onClick={pay}
            size="lg"
          >
            {phase === "done" ? (
              <>
                <CheckIcon />
                Order placed
              </>
            ) : (
              <>
                <LockIcon />
                Pay {plain(total, currency)}
              </>
            )}
          </Button>
          <ul className="mt-4 grid grid-cols-3 gap-2 text-center text-[0.6875rem] text-muted-foreground">
            {[
              { icon: ShieldCheckIcon, label: "Encrypted checkout" },
              { icon: RotateCcwIcon, label: "30-day returns" },
              { icon: TruckIcon, label: "Tracked delivery" },
            ].map(({ icon: Icon, label }) => (
              <li className="flex flex-col items-center gap-1" key={label}>
                <Icon className="size-4" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </section>
  );
}
