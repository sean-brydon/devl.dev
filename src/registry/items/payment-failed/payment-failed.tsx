"use client";

import { ChevronDownIcon, ClockIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export type CardBrand = "visa" | "mastercard" | "amex" | "card";

export interface PaymentCard {
  id: string;
  brand: CardBrand;
  last4: string;
  expiry: string;
  note?: string;
}

export interface NewCardDetails {
  number: string;
  expiry: string;
  cvc: string;
}

export interface PaymentFailedProps {
  amount?: number;
  currency?: string;
  plan?: string;
  cards?: PaymentCard[];
  failedCardId?: string;
  declineReason?: string;
  declineCode?: string;
  declineExplanation?: string;
  declines?: Record<string, string>;
  graceUntil?: string;
  graceSeconds?: number;
  graceTotalSeconds?: number;
  billingEmail?: string;
  status?: "due" | "processing" | "paid";
  paidCardId?: string;
  reasons?: string[];
  onPay?: (cardId: string) => void;
  onAddCard?: (details: NewCardDetails) => void;
  className?: string;
}

const brandNames: Record<CardBrand, string> = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", card: "Card" };

const defaultCards: PaymentCard[] = [
  { id: "visa", brand: "visa", last4: "4242", expiry: "08/27" },
  { id: "mc", brand: "mastercard", last4: "8812", expiry: "03/28", note: "Backup" },
];

const defaultReasons = [
  "The card hit its spending limit, or was replaced or reported lost.",
  "The bank flagged a new or larger charge as unusual and held it.",
  "The card expired, or the billing address doesn't match the bank's.",
];

const ease = [0.23, 1, 0.32, 1] as const;
const roll = { type: "spring", stiffness: 320, damping: 32 } as const;
const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

// Stays false until mounted so the server render and the first client render match.
function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

const pad = (n: number) => String(n).padStart(2, "0");
const cardName = (card: PaymentCard) => `${brandNames[card.brand]} •••• ${card.last4}`;

function useCountdown(start: number, running: boolean) {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    setLeft(start);
    if (!running || start <= 0) return;
    const began = Date.now();
    const id = window.setInterval(() => setLeft(Math.max(0, start - Math.floor((Date.now() - began) / 1000))), 250);
    return () => window.clearInterval(id);
  }, [start, running]);
  return left;
}

function Roll({ text, reduce }: { text: string; reduce: boolean }) {
  const chars = text.split("");
  return (
    <span aria-hidden className="tabular-nums leading-[1.2em]">
      {chars.map((char, i) => {
        const key = chars.length - i;
        if (!/\d/.test(char)) return <span key={`s${key}`}>{char}</span>;
        return (
          <span className="relative inline-block [clip-path:inset(0)]" key={`d${key}`}>
            <span className="invisible">{char}</span>
            <motion.span
              animate={{ y: `${-Number(char) * 1.2}em` }}
              className="absolute inset-x-0 top-0 flex flex-col"
              initial={false}
              transition={reduce ? { duration: 0 } : roll}
            >
              {Array.from({ length: 10 }, (_, n) => (
                <span className="block h-[1.2em] text-center" key={n}>
                  {n}
                </span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

function Collapse({ show, reduce, children }: { show: boolean; reduce: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden"
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.26, ease }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const ditherPixels = [
  [0, 0, 0.3], [3, 0, 0.5], [9, 1, 0.35], [11, 0, 0.5], [11, 4, 0.3], [0, 7, 0.35], [11, 11, 0.5], [1, 11, 0.3], [7, 11, 0.4],
] as const;

const cardPixels = (() => {
  const pixels: { x: number; y: number; o: number }[] = [];
  for (let y = 2; y <= 9; y++) {
    for (let x = 1; x <= 10; x++) {
      const corner = (x === 1 || x === 10) && (y === 2 || y === 9);
      if (corner) continue;
      const edge = x === 1 || x === 10 || y === 2 || y === 9;
      const stripe = y === 4;
      const digits = y === 7 && x >= 3 && x <= 5;
      if (edge || stripe || digits) pixels.push({ x, y, o: 1 });
      else if ((x + y) % 2 === 0) pixels.push({ x, y, o: 0.35 });
    }
  }
  return pixels;
})();

function CardGlyph({ paid }: { paid: boolean }) {
  return (
    <svg aria-hidden className="size-6" shapeRendering="crispEdges" viewBox="0 0 12 12">
      {cardPixels.map(({ x, y, o }) => (
        <rect fill="currentColor" height={1} key={`${x}-${y}`} opacity={o} width={1} x={x} y={y} />
      ))}
      {ditherPixels.map(([x, y, o]) => (
        <motion.rect
          animate={{ opacity: paid ? 0 : o }}
          fill="currentColor"
          height={1}
          initial={false}
          key={`d${x}-${y}`}
          transition={{ duration: 0.3 }}
          width={1}
          x={x}
          y={y}
        />
      ))}
    </svg>
  );
}

function BrandMark({ brand }: { brand: CardBrand }) {
  return (
    <span
      aria-hidden
      className="flex h-6 w-9 shrink-0 items-center justify-center rounded-sm border bg-background font-medium font-mono text-[9px] text-muted-foreground tracking-wide"
    >
      {{ visa: "VISA", mastercard: "MC", amex: "AMEX", card: "CARD" }[brand]}
    </span>
  );
}

function DrawnCheck({ reduce }: { reduce: boolean }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success/12 text-success-foreground">
      <svg aria-hidden className="size-3" fill="none" viewBox="0 0 16 16">
        <motion.path
          animate={{ pathLength: 1 }}
          d="M3.5 8.5l3 3 6-7"
          initial={reduce ? false : { pathLength: 0 }}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.2}
          transition={{ duration: 0.32, delay: 0.15, ease: [0.65, 0, 0.35, 1] }}
        />
      </svg>
    </span>
  );
}

export function PaymentFailed({
  amount = 96,
  currency = "USD",
  plan = "Team",
  cards = defaultCards,
  failedCardId = "visa",
  declineReason = "insufficient funds",
  declineCode = "insufficient_funds",
  declineExplanation,
  declines = { visa: "Declined Oct 28: insufficient funds" },
  graceUntil = "Nov 4",
  graceSeconds = 6 * 86400 + 9 * 3600 + 41 * 60 + 12,
  graceTotalSeconds = 7 * 86400,
  billingEmail = "billing@ridgeline.app",
  status = "due",
  paidCardId,
  reasons = defaultReasons,
  onPay,
  onAddCard,
  className,
}: PaymentFailedProps) {
  const reduce = useSafeReducedMotion();
  const paid = status === "paid";
  const processing = status === "processing";
  const left = useCountdown(graceSeconds, !paid);
  const [selected, setSelected] = useState(failedCardId);
  const [adding, setAdding] = useState(false);
  const known = useRef(cards.map((c) => c.id));

  useEffect(() => {
    const fresh = cards.find((c) => !known.current.includes(c.id));
    known.current = cards.map((c) => c.id);
    if (fresh) {
      setSelected(fresh.id);
      setAdding(false);
    }
  }, [cards]);

  const price = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  const failedCard = cards.find((c) => c.id === failedCardId);
  const selectedCard = cards.find((c) => c.id === selected) ?? cards[0];
  const chargedCard = cards.find((c) => c.id === paidCardId) ?? selectedCard;
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const graceLeft = graceTotalSeconds > 0 ? Math.min(1, left / graceTotalSeconds) : 0;

  return (
    <section
      aria-label="Billing status"
      className={cn("@container w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-xs/5", className)}
    >
      <div className="grid gap-5 p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl border bg-card shadow-xs/5 transition-colors duration-300",
              paid ? "text-success-foreground" : "text-destructive-foreground",
            )}
          >
            <CardGlyph paid={paid} />
          </span>
          <div className="grid min-w-0 flex-1 gap-1">
            <div className="flex items-start justify-between gap-3">
              <h3 aria-live="polite" className="text-balance font-semibold text-base">
                {paid ? "Payment received" : "Your payment didn't go through"}
              </h3>
              <Badge className="mt-0.5 transition-colors duration-300" variant={paid ? "success" : "warning"}>
                {paid ? "Paid" : "Past due"}
              </Badge>
            </div>
            <p className="text-pretty text-muted-foreground text-sm">
              {paid
                ? `${cardName(chargedCard)} was charged for the ${plan} plan.`
                : failedCard
                  ? `${cardName(failedCard)} was declined: ${declineReason}. ${plan} plan, ${price} a month.`
                  : `Your card was declined: ${declineReason}.`}
            </p>
            {!paid && (
              <Collapsible>
                <CollapsibleTrigger className="group/why -ml-1 mt-1 inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-1 font-medium text-muted-foreground text-xs outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                  Why was it declined?
                  <ChevronDownIcon aria-hidden className="size-3.5 transition-transform duration-200 group-data-panel-open/why:rotate-180" />
                </CollapsibleTrigger>
                <CollapsiblePanel>
                  <div className="grid gap-2 pt-1 pb-0.5 text-muted-foreground text-xs">
                    <p className="text-pretty text-foreground">
                      {declineExplanation ?? `The account didn't have ${price} free when we tried. A retry works once the money clears.`}
                    </p>
                    <p>Banks also decline when:</p>
                    <ul className="grid list-disc gap-1 pl-4">
                      {reasons.map((reason) => (
                        <li className="text-pretty" key={reason}>
                          {reason}
                        </li>
                      ))}
                    </ul>
                    <p>
                      Your bank can confirm which. Decline code <code className="rounded-xs bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">{declineCode}</code>
                    </p>
                  </div>
                </CollapsiblePanel>
              </Collapsible>
            )}
          </div>
        </div>

        <Collapse reduce={reduce} show={!paid}>
          <div className="grid gap-5">
            <div className="grid gap-2 rounded-xl border bg-muted/40 p-3">
              <p className="flex items-start gap-1.5 font-medium text-sm">
                <ClockIcon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warning-foreground" />
                <span className="text-balance">Your workspace stays fully active until {graceUntil}</span>
              </p>
              <div className="flex items-center gap-3">
                <div aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    animate={{ scaleX: graceLeft }}
                    className="h-full origin-left rounded-full bg-warning"
                    initial={false}
                    transition={reduce ? { duration: 0 } : { duration: 0.6, ease }}
                  />
                </div>
                <span className="shrink-0 text-muted-foreground text-xs">
                  <span className="sr-only">{`${d} days ${h} hours left`}</span>
                  <span aria-hidden className="inline-flex gap-1 font-medium text-foreground">
                    <span>
                      <Roll reduce={reduce} text={String(d)} />
                      <span className="text-muted-foreground">d</span>
                    </span>
                    <span>
                      <Roll reduce={reduce} text={pad(h)} />
                      <span className="text-muted-foreground">h</span>
                    </span>
                    <span>
                      <Roll reduce={reduce} text={pad(m)} />
                      <span className="text-muted-foreground">m</span>
                    </span>
                    <span>
                      <Roll reduce={reduce} text={pad(s)} />
                      <span className="text-muted-foreground">s</span>
                    </span>
                  </span>
                </span>
              </div>
              <p className="text-pretty text-muted-foreground text-xs">After {graceUntil} it turns read-only until it's paid. Nothing is deleted.</p>
            </div>

            <fieldset className="grid gap-2">
              <legend className="mb-2 font-medium text-muted-foreground text-xs">Pay with</legend>
              <RadioGroup className="gap-0 overflow-hidden rounded-xl border" onValueChange={(v) => setSelected(String(v))} value={selected}>
                <AnimatePresence initial={false}>
                  {cards.map((card) => (
                    <CardOption card={card} decline={declines[card.id]} disabled={processing} key={card.id} reduce={reduce} />
                  ))}
                </AnimatePresence>
              </RadioGroup>
              <AnimatePresence initial={false} mode="popLayout">
                {adding ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    key="form"
                    transition={{ duration: 0.2, ease }}
                  >
                    <NewCardForm onCancel={() => setAdding(false)} onSubmit={(details) => onAddCard?.(details)} />
                  </motion.div>
                ) : (
                  <motion.div animate={{ opacity: 1 }} exit={{ opacity: 0 }} initial={{ opacity: 0 }} key="add" transition={{ duration: 0.15 }}>
                    <Button className="-ml-1" disabled={processing} onClick={() => setAdding(true)} size="sm" variant="ghost">
                      <PlusIcon />
                      Add a new card
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </fieldset>
          </div>
        </Collapse>
      </div>

      <div className="flex min-h-15 flex-wrap items-center gap-x-3 gap-y-2 border-t bg-muted/40 px-5 py-3">
        <AnimatePresence initial={false} mode="popLayout">
          {paid ? (
            <motion.p
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-sm"
              initial={{ opacity: 0 }}
              key="paid"
              transition={{ duration: 0.2 }}
            >
              <DrawnCheck reduce={reduce} />
              <span className="text-pretty">
                Paid · <span className="tabular-nums">{price}</span> · receipt sent to <span className="font-medium">{billingEmail}</span>
              </span>
            </motion.p>
          ) : (
            <motion.div
              animate={{ opacity: 1 }}
              className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="due"
              transition={{ duration: 0.15 }}
            >
              <Button className="@max-sm:w-full" disabled={adding} loading={processing} onClick={() => onPay?.(selectedCard.id)}>
                {selectedCard.id === failedCardId ? `Retry ${cardName(selectedCard)}` : `Pay ${price} with ${cardName(selectedCard)}`}
              </Button>
              <span className="text-muted-foreground text-xs tabular-nums @max-sm:hidden">{price} due</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function CardOption({ card, decline, disabled, reduce }: { card: PaymentCard; decline?: string; disabled: boolean; reduce: boolean }) {
  const id = useId();
  return (
    <motion.label
      animate={{ opacity: 1, height: "auto" }}
      className="block cursor-pointer border-b transition-colors last:border-b-0 hover:bg-accent/40 has-data-checked:bg-accent/40"
      htmlFor={id}
      initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
      transition={spring}
    >
      <span className="flex items-center gap-3 px-3 py-2.5">
        <Radio aria-describedby={decline ? `${id}-decline` : undefined} disabled={disabled} id={id} value={card.id} />
        <BrandMark brand={card.brand} />
        <span className="grid min-w-0 flex-1">
          <span className="truncate font-medium text-sm">
            {brandNames[card.brand]} <span className="tabular-nums">•••• {card.last4}</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
            Expires {card.expiry}
            {card.note && (
              <Badge size="sm" variant="outline">
                {card.note}
              </Badge>
            )}
          </span>
        </span>
      </span>
      <AnimatePresence initial={false} mode="wait">
        {decline && (
          <motion.span
            animate={{ opacity: 1, height: "auto" }}
            className="block overflow-hidden"
            exit={{ opacity: 0, height: 0 }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            key={decline}
            transition={{ duration: 0.22, ease }}
          >
            <span className="flex items-start gap-1.5 px-3 pb-2.5 pl-10.5 text-destructive-foreground text-xs" id={`${id}-decline`}>
              <TriangleAlertIcon aria-hidden className="mt-px size-3.5 shrink-0" />
              <span className="text-pretty">{decline}</span>
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.label>
  );
}

function formatNumber(raw: string) {
  return raw
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
}

function NewCardForm({ onSubmit, onCancel }: { onSubmit: (details: NewCardDetails) => void; onCancel: () => void }) {
  const id = useId();
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const digits = number.replace(/\D/g, "");
  const month = Number(expiry.slice(0, 2));
  const valid = digits.length >= 15 && expiry.replace(/\D/g, "").length === 4 && month >= 1 && month <= 12 && cvc.length >= 3;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (valid) onSubmit({ number: digits, expiry: expiry.replace(/\s/g, ""), cvc });
  };

  return (
    <form className="grid gap-3 rounded-xl border p-3" onSubmit={submit}>
      <div className="grid gap-1.5">
        <label className="font-medium text-xs" htmlFor={`${id}-number`}>
          Card number
        </label>
        <Input
          autoComplete="cc-number"
          className="tabular-nums"
          id={`${id}-number`}
          inputMode="numeric"
          onChange={(e) => setNumber(formatNumber(e.target.value))}
          placeholder="1234 1234 1234 1234"
          value={number}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <label className="font-medium text-xs" htmlFor={`${id}-expiry`}>
            Expiry
          </label>
          <Input
            autoComplete="cc-exp"
            className="tabular-nums"
            id={`${id}-expiry`}
            inputMode="numeric"
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            placeholder="MM / YY"
            value={expiry}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="font-medium text-xs" htmlFor={`${id}-cvc`}>
            CVC
          </label>
          <Input
            autoComplete="cc-csc"
            className="tabular-nums"
            id={`${id}-cvc`}
            inputMode="numeric"
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="123"
            value={cvc}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} size="sm" variant="ghost">
          Cancel
        </Button>
        <Button disabled={!valid} size="sm" type="submit" variant="outline">
          Add card
        </Button>
      </div>
    </form>
  );
}
