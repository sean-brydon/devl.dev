"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  LockIcon,
  MinusIcon,
  NfcIcon,
  PackageIcon,
  PlusIcon,
  RabbitIcon,
  TagIcon,
  TruckIcon,
  Undo2Icon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CheckoutArt = "mug" | "tote" | "candle" | "notebook";

export interface CheckoutItem {
  id: string;
  name: string;
  variant: string;
  price: number;
  qty: number;
  art: CheckoutArt;
}

export interface CheckoutShipping {
  id: string;
  label: string;
  eta: string;
  price: number;
  icon: "standard" | "express" | "next";
}

export interface CheckoutProps {
  className?: string;
  storeName?: string;
  items?: CheckoutItem[];
  shippingOptions?: CheckoutShipping[];
  taxRate?: number;
  promoCodes?: Record<string, number>;
  testCard?: string;
  onTrackOrder?: (orderNo: string) => void;
}

type Step = 0 | 1 | 2 | 3;
type Values = {
  email: string;
  news: boolean;
  first: string;
  last: string;
  line1: string;
  line2: string;
  city: string;
  country: string;
  region: string;
  postcode: string;
  shipping: string;
  card: string;
  expiry: string;
  cvc: string;
  holder: string;
  sameBilling: boolean;
};
type Errors = Partial<Record<keyof Values, string>>;

const easeOut = [0.23, 1, 0.32, 1] as const;
const press = "transition-[color,background-color,box-shadow,scale,opacity] duration-150 ease-out active:scale-[0.97]";

const defaultItems: CheckoutItem[] = [
  { id: "i1", name: "Speckled stoneware mug", variant: "Oat · 350 ml", price: 28, qty: 2, art: "mug" },
  { id: "i2", name: "Waxed canvas tote", variant: "Moss", price: 64, qty: 1, art: "tote" },
  { id: "i3", name: "Cedar & smoke candle", variant: "220 g", price: 32, qty: 1, art: "candle" },
];

const defaultShipping: CheckoutShipping[] = [
  { id: "standard", label: "Standard", eta: "Thu 29 – Mon 2 Nov", price: 0, icon: "standard" },
  { id: "express", label: "Express", eta: "Tue 27 Oct", price: 9, icon: "express" },
  { id: "next", label: "Next day", eta: "Mon 26 Oct, order in 3h", price: 18, icon: "next" },
];

const countries: { value: string; label: string; regions?: string[]; regionLabel?: string; post: RegExp; postLabel: string; postHint: string }[] = [
  {
    value: "US",
    label: "United States",
    regions: ["California", "Colorado", "Illinois", "Massachusetts", "New York", "Oregon", "Texas", "Washington"],
    regionLabel: "State",
    post: /^\d{5}(-\d{4})?$/,
    postLabel: "ZIP code",
    postHint: "5 digits, like 97205",
  },
  {
    value: "CA",
    label: "Canada",
    regions: ["Alberta", "British Columbia", "Manitoba", "Nova Scotia", "Ontario", "Quebec"],
    regionLabel: "Province",
    post: /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/,
    postLabel: "Postal code",
    postHint: "Like K1A 0B1",
  },
  {
    value: "GB",
    label: "United Kingdom",
    post: /^[A-Za-z]{1,2}\d[A-Za-z\d]? ?\d[A-Za-z]{2}$/,
    postLabel: "Postcode",
    postHint: "Like SW1A 1AA",
  },
  {
    value: "AU",
    label: "Australia",
    regions: ["New South Wales", "Queensland", "South Australia", "Tasmania", "Victoria", "Western Australia"],
    regionLabel: "State",
    post: /^\d{4}$/,
    postLabel: "Postcode",
    postHint: "4 digits",
  },
];

const steps = ["Contact", "Shipping address", "Delivery", "Payment"] as const;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const money = (n: number) => usd.format(n);

const digits = (s: string) => s.replace(/\D/g, "");
const formatCard = (s: string) => digits(s).slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
const formatExpiry = (s: string, prev: string) => {
  const d = digits(s).slice(0, 4);
  if (s.length < prev.length && prev.endsWith(" / ") && d.length <= 2) return d.slice(0, 1);
  if (d.length >= 3) return `${d.slice(0, 2)} / ${d.slice(2)}`;
  if (d.length === 2) return `${d} / `;
  return d;
};
function luhn(num: string) {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = Number(num[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return num.length >= 13 && sum % 10 === 0;
}

function validate(step: Step, v: Values): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (!v.email.trim()) e.email = "Enter your email so we can send the receipt.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = "That email looks incomplete.";
  }
  if (step === 1) {
    const c = countries.find((x) => x.value === v.country);
    if (!v.first.trim()) e.first = "Required";
    if (!v.last.trim()) e.last = "Required";
    if (!v.line1.trim()) e.line1 = "Enter a street address.";
    if (!v.city.trim()) e.city = "Required";
    if (c?.regions && !v.region) e.region = `Pick a ${c.regionLabel?.toLowerCase()}.`;
    if (!v.postcode.trim()) e.postcode = "Required";
    else if (c && !c.post.test(v.postcode.trim())) e.postcode = c.postHint;
  }
  if (step === 3) {
    const d = digits(v.card);
    if (!d) e.card = "Enter a card number.";
    else if (!luhn(d)) e.card = "That number doesn’t look right.";
    const [mm, yy] = v.expiry.split(" / ").map(Number);
    if (!v.expiry) e.expiry = "Required";
    else if (!mm || mm > 12 || !yy || v.expiry.length < 7) e.expiry = "Use MM / YY";
    else if (2000 + yy < 2026 || (2000 + yy === 2026 && mm < 10)) e.expiry = "This card has expired.";
    if (!/^\d{3,4}$/.test(v.cvc)) e.cvc = "3 or 4 digits";
    if (!v.holder.trim()) e.holder = "Required";
  }
  return e;
}

function Tween({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, money);
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { type: "spring", stiffness: 200, damping: 30 });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

function ProductArt({ art, className }: { art: CheckoutArt; className?: string }) {
  const tile: Record<CheckoutArt, string> = {
    mug: "bg-amber-500/14 dark:bg-amber-400/12",
    tote: "bg-emerald-600/14 dark:bg-emerald-400/12",
    candle: "bg-rose-500/12 dark:bg-rose-400/12",
    notebook: "bg-sky-500/12 dark:bg-sky-400/12",
  };
  return (
    <span aria-hidden className={cn("flex items-center justify-center overflow-hidden rounded-xl", tile[art], className)}>
      <svg className="size-[80%]" viewBox="0 0 48 48">
        {art === "mug" && (
          <>
            <path
              className="fill-none stroke-amber-800/70 dark:stroke-amber-200/70"
              d="M33 20h3.5a4.5 4.5 0 0 1 0 9H33"
              strokeWidth="3"
            />
            <path
              className="fill-amber-50 stroke-amber-900/30 dark:fill-amber-100/90 dark:stroke-transparent"
              d="M12 15h22v19a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z"
              strokeWidth="1.25"
            />
            <path className="fill-amber-800/15" d="M12 15h22v4H12z" />
            {[
              [17, 24],
              [24, 29],
              [28, 22],
              [20, 34],
              [29, 34],
              [15, 30],
            ].map(([x, y]) => (
              <circle className="fill-amber-900/40" cx={x} cy={y} key={`${x}-${y}`} r="0.9" />
            ))}
          </>
        )}
        {art === "tote" && (
          <>
            <path
              className="fill-none stroke-emerald-900/60 dark:stroke-emerald-200/70"
              d="M18 18v-4a6 6 0 0 1 12 0v4"
              strokeWidth="2.5"
            />
            <path className="fill-emerald-700 dark:fill-emerald-500" d="M11 18h26l-2 22H13z" />
            <path className="fill-emerald-900/25" d="M11 18h26l-.3 3H11.3z" />
            <rect className="fill-amber-100/90" height="5" rx="1" width="9" x="19.5" y="27" />
          </>
        )}
        {art === "candle" && (
          <>
            <path className="fill-amber-400 dark:fill-amber-300" d="M24 8c2.5 3 3 5 0 8-3-3-2.5-5 0-8z" />
            <rect className="fill-rose-950/60 dark:fill-rose-100/70" height="4" rx="0.5" width="1.5" x="23.25" y="15" />
            <rect className="fill-rose-200 dark:fill-rose-200/90" height="22" rx="5" width="22" x="13" y="18" />
            <rect className="fill-rose-900/20" height="2" width="22" x="13" y="22" />
            <rect className="fill-white/80 dark:fill-white/70" height="8" rx="1" width="12" x="18" y="27" />
          </>
        )}
        {art === "notebook" && (
          <>
            <rect className="fill-sky-700 dark:fill-sky-400" height="30" rx="2" width="22" x="13" y="9" />
            <rect className="fill-sky-900/30" height="30" width="3" x="13" y="9" />
            <rect className="fill-white/80" height="5" rx="1" width="10" x="20" y="16" />
          </>
        )}
      </svg>
    </span>
  );
}

function TextField({
  id,
  label,
  error,
  hint,
  optional,
  mono,
  className,
  ...props
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  mono?: boolean;
  className?: string;
} & Omit<React.ComponentProps<typeof Input>, "id" | "className">) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-muted-foreground">Optional</span>}
      </Label>
      <Input
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        aria-invalid={error ? true : undefined}
        className={cn(mono && "font-mono tabular-nums")}
        id={id}
        {...props}
      />
      <FieldNote error={error} hint={hint} id={id} />
    </div>
  );
}

function FieldNote({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      {error ? (
        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="text-destructive-foreground text-xs"
          exit={{ opacity: 0 }}
          id={`${id}-err`}
          initial={{ opacity: 0, y: -2 }}
          key="err"
          transition={{ duration: 0.15, ease: easeOut }}
        >
          {error}
        </motion.p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs" id={`${id}-hint`} key="hint">
          {hint}
        </p>
      ) : null}
    </AnimatePresence>
  );
}

export function Checkout({
  className,
  storeName = "Hearth Goods",
  items: initialItems = defaultItems,
  shippingOptions = defaultShipping,
  taxRate = 0.0825,
  promoCodes = { HEARTH10: 0.1 },
  testCard = "4242 4242 4242 4242",
  onTrackOrder,
}: CheckoutProps) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [items, setItems] = useState(initialItems);
  const [open, setOpen] = useState<Step>(0);
  const [done, setDone] = useState<Step[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [submittedSteps, setSubmittedSteps] = useState<Step[]>([]);
  const [status, setStatus] = useState<"form" | "paying" | "placed">("form");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [flip, setFlip] = useState(false);
  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [v, setV] = useState<Values>({
    email: "",
    news: true,
    first: "",
    last: "",
    line1: "",
    line2: "",
    city: "",
    country: "US",
    region: "",
    postcode: "",
    shipping: shippingOptions[0]?.id ?? "",
    card: "",
    expiry: "",
    cvc: "",
    holder: "",
    sameBilling: true,
  });

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const set = <K extends keyof Values>(k: K, value: Values[K]) => {
    setV((cur) => {
      const next = { ...cur, [k]: value };
      if (submittedSteps.includes(open)) setErrors(validate(open, next));
      return next;
    });
  };

  const country = countries.find((c) => c.value === v.country) ?? countries[0];
  const ship = shippingOptions.find((s) => s.id === v.shipping);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = promoApplied ? subtotal * (promoCodes[promoApplied] ?? 0) : 0;
  const shippingCost = done.includes(2) || open >= 2 ? ship?.price ?? 0 : null;
  const tax = (subtotal - discount) * taxRate;
  const total = subtotal - discount + (shippingCost ?? 0) + tax;
  const count = items.reduce((s, i) => s + i.qty, 0);

  const focusFirstError = (errs: Errors) => {
    const first = Object.keys(errs)[0];
    if (!first) return;
    requestAnimationFrame(() => {
      const el = formRef.current?.querySelector<HTMLElement>(`[id="${uid}-${first}"]`);
      el?.focus();
    });
  };

  const submitStep = (step: Step) => (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(step, v);
    setSubmittedSteps((t) => (t.includes(step) ? t : [...t, step]));
    setErrors(errs);
    if (Object.keys(errs).length) {
      focusFirstError(errs);
      return;
    }
    setDone((d) => (d.includes(step) ? d : [...d, step]));
    if (step < 3) {
      const next = ([0, 1, 2, 3] as Step[]).find((s) => s > step && !done.includes(s)) ?? ((step + 1) as Step);
      setOpen(next);
      setErrors({});
      return;
    }
    setStatus("paying");
    timer.current = setTimeout(() => setStatus("placed"), 1400);
  };

  const applyPromo = () => {
    const code = promo.trim().toUpperCase();
    if (!code) return;
    if (promoCodes[code] !== undefined) {
      setPromoApplied(code);
      setPromoError(null);
      setPromo("");
    } else {
      setPromoError("That code isn’t valid. Check for typos.");
    }
  };

  const reset = () => {
    setStatus("form");
    setOpen(0);
    setDone([]);
    setSubmittedSteps([]);
    setErrors({});
    setV((cur) => ({ ...cur, card: "", expiry: "", cvc: "", holder: "" }));
  };

  const summaryLine = (step: Step): ReactNode => {
    if (step === 0) return v.email;
    if (step === 1)
      return `${v.first} ${v.last}, ${v.line1}${v.line2 ? `, ${v.line2}` : ""}, ${v.city}${v.region ? `, ${v.region}` : ""} ${v.postcode.toUpperCase()}`;
    if (step === 2) return ship ? `${ship.label} · ${ship.price ? money(ship.price) : "Free"} · ${ship.eta}` : "";
    return `Card ending ${digits(v.card).slice(-4)}`;
  };

  const sectionBody = (step: Step) => {
    if (step === 0)
      return (
        <form className="flex flex-col gap-4" noValidate onSubmit={submitStep(0)}>
          <TextField
            autoComplete="email"
            error={errors.email}
            id={`${uid}-email`}
            inputMode="email"
            label="Email"
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            type="email"
            value={v.email}
          />
          <Label className="font-normal">
            <Checkbox checked={v.news} onCheckedChange={(c) => set("news", Boolean(c))} />
            Send me the occasional note about new pieces
          </Label>
          <StepButton>Continue to shipping</StepButton>
        </form>
      );
    if (step === 1)
      return (
        <form className="grid grid-cols-2 gap-x-3 gap-y-4" noValidate onSubmit={submitStep(1)}>
          <div className="col-span-2 flex flex-col gap-1.5" data-field="country">
            <Label htmlFor={`${uid}-country`}>Country</Label>
            <Select
              items={countries.map((c) => ({ value: c.value, label: c.label }))}
              onValueChange={(val) => {
                if (!val) return;
                setV((cur) => ({ ...cur, country: val as string, region: "", postcode: "" }));
                setErrors((e) => ({ ...e, region: undefined, postcode: undefined }));
              }}
              value={v.country}
            >
              <SelectTrigger id={`${uid}-country`}>
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {countries.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
          <TextField
            autoComplete="given-name"
            error={errors.first}
            id={`${uid}-first`}
            label="First name"
            onChange={(e) => set("first", e.target.value)}
            value={v.first}
          />
          <TextField
            autoComplete="family-name"
            error={errors.last}
            id={`${uid}-last`}
            label="Last name"
            onChange={(e) => set("last", e.target.value)}
            value={v.last}
          />
          <TextField
            autoComplete="address-line1"
            className="col-span-2"
            error={errors.line1}
            id={`${uid}-line1`}
            label="Address"
            onChange={(e) => set("line1", e.target.value)}
            placeholder="Street and number"
            value={v.line1}
          />
          <TextField
            autoComplete="address-line2"
            className="col-span-2"
            id={`${uid}-line2`}
            label="Apartment, suite"
            onChange={(e) => set("line2", e.target.value)}
            optional
            value={v.line2}
          />
          <TextField
            autoComplete="address-level2"
            className={cn(country.regions ? "col-span-2 @md:col-span-1" : "col-span-1")}
            error={errors.city}
            id={`${uid}-city`}
            label="City"
            onChange={(e) => set("city", e.target.value)}
            value={v.city}
          />
          {country.regions && (
            <div className="flex min-w-0 flex-col gap-1.5" data-field="region">
              <Label htmlFor={`${uid}-region`}>{country.regionLabel}</Label>
              <Select
                items={country.regions.map((r) => ({ value: r, label: r }))}
                onValueChange={(val) => set("region", (val as string) ?? "")}
                value={v.region || null}
              >
                <SelectTrigger aria-invalid={errors.region ? true : undefined} className="min-w-0" id={`${uid}-region`}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectPopup>
                  {country.regions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <FieldNote error={errors.region} id={`${uid}-region`} />
            </div>
          )}
          <TextField
            autoComplete="postal-code"
            error={errors.postcode}
            id={`${uid}-postcode`}
            label={country.postLabel}
            onChange={(e) => set("postcode", e.target.value)}
            value={v.postcode}
          />
          <div className="col-span-2">
            <StepButton>Continue to delivery</StepButton>
          </div>
        </form>
      );
    if (step === 2)
      return (
        <form className="flex flex-col gap-4" noValidate onSubmit={submitStep(2)}>
          <RadioGroup
            aria-label="Delivery speed"
            className="gap-2"
            onValueChange={(val) => set("shipping", val as string)}
            value={v.shipping}
          >
            {shippingOptions.map((s) => {
              const Icon = s.icon === "next" ? ZapIcon : s.icon === "express" ? RabbitIcon : TruckIcon;
              const on = v.shipping === s.id;
              return (
                <Label
                  className={cn(
                    "relative flex cursor-pointer items-center gap-3 rounded-xl border p-3 font-normal transition-[border-color,background-color,box-shadow] duration-150",
                    on ? "border-foreground/40 bg-accent/40 ring-1 ring-foreground/10" : "hover:bg-accent/40",
                  )}
                  key={s.id}
                >
                  <Radio value={s.id} />
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-medium">{s.label}</span>
                    <span className="truncate text-muted-foreground text-xs">{s.eta}</span>
                  </span>
                  <span className={cn("font-medium tabular-nums", !s.price && "text-success-foreground")}>
                    {s.price ? money(s.price) : "Free"}
                  </span>
                </Label>
              );
            })}
          </RadioGroup>
          <StepButton>Continue to payment</StepButton>
        </form>
      );
    return (
      <form aria-busy={status === "paying"} noValidate onSubmit={submitStep(3)}>
        <fieldset className="flex min-w-0 flex-col gap-4" disabled={status !== "form"}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-warning/30 border-dashed bg-warning/6 px-3 py-2 text-xs dark:bg-warning/10">
          <span className="font-medium text-warning-foreground">Test mode</span>
          <span className="text-muted-foreground">No real charge. Use any future date and any CVC.</span>
          <button
            className={cn(
              "relative ms-auto cursor-pointer rounded-md font-medium underline-offset-2 outline-none after:absolute after:-inset-2 after:content-[''] hover:underline focus-visible:ring-2 focus-visible:ring-ring",
              press,
            )}
            onClick={() => {
              const next = { ...v, card: testCard, expiry: "08 / 29", cvc: "123", holder: v.holder || `${v.first} ${v.last}`.trim() || "Rowan Ellery" };
              setV(next);
              if (submittedSteps.includes(3)) setErrors(validate(3, next));
            }}
            type="button"
          >
            Fill test card
          </button>
        </div>

        <div className="grid gap-4 @lg:grid-cols-[minmax(0,1fr)_200px] @lg:items-start">
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <TextField
              autoComplete="cc-number"
              className="col-span-2"
              mono
              error={errors.card}
              id={`${uid}-card`}
              inputMode="numeric"
              label="Card number"
              onChange={(e) => set("card", formatCard(e.target.value))}
              placeholder="1234 1234 1234 1234"
              value={v.card}
            />
            <TextField
              autoComplete="cc-exp"
              mono
              error={errors.expiry}
              id={`${uid}-expiry`}
              inputMode="numeric"
              label="Expiry"
              onChange={(e) => set("expiry", formatExpiry(e.target.value, v.expiry))}
              placeholder="MM / YY"
              value={v.expiry}
            />
            <TextField
              autoComplete="cc-csc"
              mono
              error={errors.cvc}
              id={`${uid}-cvc`}
              inputMode="numeric"
              label="CVC"
              onBlur={() => setFlip(false)}
              onChange={(e) => set("cvc", digits(e.target.value).slice(0, 4))}
              onFocus={() => setFlip(true)}
              placeholder="123"
              value={v.cvc}
            />
            <TextField
              autoComplete="cc-name"
              className="col-span-2"
              error={errors.holder}
              id={`${uid}-holder`}
              label="Name on card"
              onChange={(e) => set("holder", e.target.value)}
              value={v.holder}
            />
          </div>
          <CardPreview cvc={v.cvc} expiry={v.expiry} flipped={flip} holder={v.holder} number={v.card} />
        </div>

        <Label className="font-normal">
          <Checkbox checked={v.sameBilling} onCheckedChange={(c) => set("sameBilling", Boolean(c))} />
          Billing address is the same as shipping
        </Label>
        <Button className={cn("h-10 w-full text-sm sm:h-10", press)} loading={status === "paying"} size="lg" type="submit">
          <LockIcon />
          Pay <Tween value={total} />
        </Button>
        </fieldset>
      </form>
    );
  };

  const summary = (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {items.map((i) => (
            <motion.li
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-3"
              exit={{ opacity: 0, height: 0 }}
              key={i.id}
              transition={{ duration: 0.2, ease: easeOut }}
            >
              <ProductArt art={i.art} className="size-16 shrink-0 border border-border/60" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-medium">{i.name}</span>
                <span className="truncate text-muted-foreground text-xs">{i.variant}</span>
                <div className="flex items-center gap-1">
                  <Button
                    aria-label={`One fewer ${i.name}`}
                    className={press}
                    disabled={i.qty <= 1 || status !== "form"}
                    onClick={() => setItems((all) => all.map((x) => (x.id === i.id ? { ...x, qty: x.qty - 1 } : x)))}
                    size="icon-xs"
                    variant="outline"
                  >
                    <MinusIcon />
                  </Button>
                  <span className="w-6 text-center text-xs tabular-nums">{i.qty}</span>
                  <Button
                    aria-label={`One more ${i.name}`}
                    className={press}
                    disabled={i.qty >= 9 || status !== "form"}
                    onClick={() => setItems((all) => all.map((x) => (x.id === i.id ? { ...x, qty: x.qty + 1 } : x)))}
                    size="icon-xs"
                    variant="outline"
                  >
                    <PlusIcon />
                  </Button>
                </div>
              </div>
              <span className="self-start font-medium tabular-nums">{money(i.price * i.qty)}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <div className="flex flex-col gap-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {promoApplied ? (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
              exit={{ opacity: 0, scale: 0.97 }}
              initial={{ opacity: 0, scale: 0.97 }}
              key="applied"
              transition={{ duration: 0.18, ease: easeOut }}
            >
              <span className="flex h-7 items-center gap-1.5 rounded-lg bg-success/10 ps-2 pe-1 font-medium font-mono text-success-foreground text-xs dark:bg-success/16">
                <TagIcon className="size-3.5" />
                {promoApplied}
                <button
                  aria-label={`Remove code ${promoApplied}`}
                  className="relative flex size-5 cursor-pointer items-center justify-center rounded-md outline-none after:absolute after:-inset-1.5 after:content-[''] hover:bg-success/16 focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={status !== "form"}
                  onClick={() => setPromoApplied(null)}
                  type="button"
                >
                  <XIcon className="size-3" />
                </button>
              </span>
              <span className="text-muted-foreground text-xs">{Math.round((promoCodes[promoApplied] ?? 0) * 100)}% off your order</span>
            </motion.div>
          ) : (
            <motion.form
              animate={{ opacity: 1 }}
              className="flex gap-2"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="field"
              onSubmit={(e) => {
                e.preventDefault();
                applyPromo();
              }}
              transition={{ duration: 0.15 }}
            >
              <Input
                aria-describedby={promoError ? `${uid}-promo-err` : undefined}
                aria-invalid={promoError ? true : undefined}
                aria-label="Discount code"
                className="flex-1 uppercase placeholder:normal-case"
                onChange={(e) => {
                  setPromo(e.target.value);
                  setPromoError(null);
                }}
                placeholder="Discount code"
                value={promo}
              />
              <Button className={press} disabled={!promo.trim()} type="submit" variant="outline">
                Apply
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
        {promoError && (
          <p className="text-destructive-foreground text-xs" id={`${uid}-promo-err`}>
            {promoError}
          </p>
        )}
      </div>

      <dl className="flex flex-col gap-2 border-t pt-4">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Subtotal · {count} items</dt>
          <dd className="tabular-nums">
            <Tween value={subtotal} />
          </dd>
        </div>
        <AnimatePresence initial={false}>
          {discount > 0 && (
            <motion.div
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden"
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.2, ease: easeOut }}
            >
              <div className="flex justify-between gap-3 text-success-foreground">
                <dt>Discount</dt>
                <dd className="tabular-nums">
                  −<Tween value={discount} />
                </dd>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd className={cn("tabular-nums", shippingCost === null && "text-muted-foreground")}>
            {shippingCost === null ? "Next step" : shippingCost === 0 ? "Free" : <Tween value={shippingCost} />}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Estimated tax</dt>
          <dd className="tabular-nums">
            <Tween value={tax} />
          </dd>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-3 border-t pt-4">
          <dt className="font-medium">Total</dt>
          <dd className="font-heading font-semibold text-xl tracking-tight">
            <span className="me-1.5 font-normal font-sans text-muted-foreground text-xs">USD</span>
            <Tween value={total} />
          </dd>
        </div>
      </dl>
      <p className="flex items-center gap-2 text-muted-foreground text-xs">
        <Undo2Icon className="size-3.5" /> Free returns within 30 days of delivery.
      </p>
    </div>
  );

  const orderNo = "HG-48213";

  return (
    <div
      className={cn(
        "@container relative isolate flex h-[760px] w-full flex-col overflow-hidden bg-background text-foreground text-sm",
        className,
      )}
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 @3xl:px-6">
        <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <svg className="size-4" fill="none" viewBox="0 0 16 16">
            <path d="M3 13V7.5L8 3l5 4.5V13" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
            <path d="M6.5 13v-2.5a1.5 1.5 0 0 1 3 0V13" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </span>
        <span className="font-heading font-semibold">{storeName}</span>
        <span className="ms-auto flex items-center gap-1.5 text-muted-foreground text-xs">
          <LockIcon className="size-3.5" /> Secure checkout
        </span>
      </header>

      <div className="shrink-0 border-b bg-muted/40 @4xl:hidden">
        <button
          aria-controls={`${uid}-summary`}
          aria-expanded={summaryOpen}
          className="flex h-12 w-full cursor-pointer items-center gap-2 px-4 text-left outline-none focus-visible:bg-accent"
          onClick={() => setSummaryOpen((o) => !o)}
          type="button"
        >
          <PackageIcon className="size-4 text-muted-foreground" />
          <span className="flex-1">{summaryOpen ? "Hide" : "Show"} order summary</span>
          <motion.span animate={{ rotate: summaryOpen ? 180 : 0 }} transition={{ duration: 0.2, ease: easeOut }}>
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          </motion.span>
          <span className="font-medium">
            <Tween value={total} />
          </span>
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <AnimatePresence initial={false}>
          {summaryOpen && (
            <>
              <motion.div
                animate={{ opacity: 1 }}
                aria-hidden
                className="absolute inset-0 z-20 bg-black/24 @4xl:hidden"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                onClick={() => setSummaryOpen(false)}
                transition={{ duration: 0.2 }}
              />
              <motion.div
                animate={{ clipPath: "inset(0 0 0% 0)" }}
                className="absolute inset-x-0 top-0 z-30 max-h-full overflow-y-auto border-b bg-background p-4 shadow-lg/5 @4xl:hidden"
                exit={{ clipPath: "inset(0 0 100% 0)" }}
                id={`${uid}-summary`}
                initial={{ clipPath: "inset(0 0 100% 0)" }}
                transition={reduce ? { duration: 0 } : { duration: 0.28, ease: easeOut }}
              >
                {summary}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="min-w-0 flex-1 overflow-y-auto" ref={formRef}>
          <div className="mx-auto flex max-w-[600px] flex-col gap-3 px-4 py-5 @3xl:px-8 @3xl:py-8">
            <AnimatePresence initial={false} mode="wait">
              {status === "placed" ? (
                <Placed
                  email={v.email}
                  eta={ship?.eta ?? ""}
                  key="placed"
                  onReset={reset}
                  onTrack={onTrackOrder ? () => onTrackOrder(orderNo) : undefined}
                  orderNo={orderNo}
                  address={summaryLine(1)}
                  paid={`${money(total)} · ${summaryLine(3)}`}
                />
              ) : (
                <motion.div
                  className="flex flex-col gap-3"
                  exit={{ opacity: 0, y: -8 }}
                  key="form"
                  transition={{ duration: 0.18, ease: easeOut }}
                >
                  <div className="mb-2 flex flex-col gap-1">
                    <h2 className="text-balance font-heading font-semibold text-xl tracking-tight">Checkout</h2>
                    <p className="text-muted-foreground">
                      Step {Math.min(open + 1, 4)} of 4 · {steps[open]}
                    </p>
                  </div>
                  {([0, 1, 2, 3] as Step[]).map((s) => {
                    const isOpen = open === s;
                    const isDone = done.includes(s) && !isOpen;
                    const reachable = s === 0 || done.includes((s - 1) as Step) || done.includes(s);
                    return (
                      <section
                        aria-labelledby={`${uid}-h${s}`}
                        className={cn(
                          "rounded-2xl border bg-card shadow-xs/5 transition-[opacity] duration-200",
                          !isOpen && !isDone && "opacity-60",
                        )}
                        key={s}
                      >
                        <div className="flex items-center gap-3 p-4">
                          <span
                            className={cn(
                              "flex size-6 shrink-0 items-center justify-center rounded-full font-medium text-xs tabular-nums transition-colors duration-200",
                              isDone ? "bg-success text-white" : isOpen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                            )}
                          >
                            <AnimatePresence initial={false} mode="popLayout">
                              {isDone ? (
                                <motion.span
                                  animate={{ opacity: 1, scale: 1 }}
                                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                                  key="check"
                                  transition={{ duration: 0.18, ease: easeOut }}
                                >
                                  <CheckIcon className="size-3.5" />
                                </motion.span>
                              ) : (
                                <motion.span animate={{ opacity: 1 }} initial={{ opacity: 0 }} key="n">
                                  {s + 1}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <h3 className="font-medium" id={`${uid}-h${s}`}>
                              {steps[s]}
                            </h3>
                            {isDone && <p className="truncate text-muted-foreground text-xs">{summaryLine(s)}</p>}
                          </div>
                          {isDone && reachable && status === "form" && (
                            <Button
                              className={press}
                              onClick={() => {
                                setOpen(s);
                                setErrors({});
                              }}
                              size="sm"
                              variant="ghost"
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              animate={{ height: "auto", opacity: 1 }}
                              className="overflow-hidden"
                              exit={{ height: 0, opacity: 0 }}
                              initial={{ height: 0, opacity: 0 }}
                              transition={reduce ? { duration: 0 } : { duration: 0.26, ease: easeOut }}
                            >
                              <div className="px-4 pt-0 pb-4">{sectionBody(s)}</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </section>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <aside
          aria-label="Order summary"
          className="hidden w-[380px] shrink-0 overflow-y-auto border-l bg-muted/40 px-6 py-8 @4xl:block"
        >
          <h2 className="mb-5 font-medium">Order summary</h2>
          {summary}
        </aside>
      </div>
    </div>
  );
}

function StepButton({ children }: { children: ReactNode }) {
  return (
    <Button className={cn("h-10 w-full text-sm sm:h-10", press)} size="lg" type="submit">
      {children}
    </Button>
  );
}

function CardPreview({
  number,
  holder,
  expiry,
  cvc,
  flipped,
}: {
  number: string;
  holder: string;
  expiry: string;
  cvc: string;
  flipped: boolean;
}) {
  const reduce = useReducedMotion();
  const d = digits(number).padEnd(16, "•");
  const groups = [d.slice(0, 4), d.slice(4, 8), d.slice(8, 12), d.slice(12, 16)];
  return (
    <div aria-hidden className="mx-auto w-full max-w-[260px] [perspective:900px] @lg:mt-6">
      <motion.div
        animate={{ rotateY: flipped && !reduce ? 180 : 0 }}
        className="relative aspect-[1.586] w-full"
        initial={false}
        style={{ transformStyle: "preserve-3d" }}
        transition={{ duration: 0.45, ease: [0.645, 0.045, 0.355, 1] }}
      >
        <div
          className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-700 p-4 text-white shadow-lg/20"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="pointer-events-none absolute -top-10 -right-8 size-36 rounded-full bg-white/10" />
          <span className="pointer-events-none absolute -bottom-16 -left-10 size-40 rounded-full bg-white/8" />
          <div className="relative flex items-center justify-between">
            <span className="h-6 w-8 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 ring-1 ring-black/10" />
            <NfcIcon className="size-5 opacity-80" />
          </div>
          <div className="relative flex justify-between font-mono text-[15px] tabular-nums tracking-wider">
            {groups.map((g, i) => (
              <span key={i}>{g}</span>
            ))}
          </div>
          <div className="relative flex items-end justify-between gap-3 text-[10px] uppercase tracking-wider">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="opacity-60">Card holder</span>
              <span className="truncate font-medium text-xs normal-case tracking-normal">{holder || "Your name"}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="opacity-60">Expires</span>
              <span className="font-medium font-mono text-xs tracking-normal">{expiry || "MM / YY"}</span>
            </span>
          </div>
        </div>
        <div
          className="absolute inset-0 flex flex-col overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 pt-5 text-white shadow-lg/20"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <span className="h-9 w-full bg-black/70" />
          <div className="mt-4 flex items-center gap-2 px-4">
            <span className="h-7 flex-1 rounded-sm bg-white/85" />
            <span className="flex h-7 w-12 items-center justify-center rounded-sm bg-white font-mono text-indigo-950 text-sm tabular-nums">
              {cvc || "•••"}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Placed({
  orderNo,
  email,
  eta,
  address,
  paid,
  onReset,
  onTrack,
}: {
  orderNo: string;
  email: string;
  eta: string;
  address: ReactNode;
  paid: string;
  onReset: () => void;
  onTrack?: () => void;
}) {
  const reduce = useReducedMotion();
  const rise = (i: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: easeOut, delay: 0.25 + i * 0.04 },
  });
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="flex flex-col items-start gap-5 pt-4 @3xl:pt-10"
      initial={{ opacity: 0 }}
      role="status"
      transition={{ duration: 0.2 }}
    >
      <motion.span
        animate={{ scale: 1, opacity: 1 }}
        className="flex size-14 items-center justify-center rounded-full bg-success text-white"
        initial={reduce ? { opacity: 0 } : { scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
      >
        <svg aria-hidden className="size-7" fill="none" viewBox="0 0 24 24">
          <motion.path
            animate={{ pathLength: 1 }}
            d="M5.5 12.5 10 17 18.5 7.5"
            initial={{ pathLength: reduce ? 1 : 0 }}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            transition={{ duration: 0.3, ease: easeOut, delay: 0.15 }}
          />
        </svg>
      </motion.span>
      <motion.div className="flex flex-col gap-1" {...rise(0)}>
        <p className="font-mono text-muted-foreground text-xs">Order {orderNo}</p>
        <h2 className="text-balance font-heading font-semibold text-2xl tracking-tight">Thank you, it’s on its way soon</h2>
        <p className="text-pretty text-muted-foreground">
          A receipt is heading to <span className="text-foreground">{email}</span>. We’ll send tracking as soon as your parcel leaves the workshop.
        </p>
      </motion.div>
      <motion.dl className="grid w-full gap-px overflow-hidden rounded-2xl border bg-border @md:grid-cols-2" {...rise(1)}>
        <div className="flex flex-col gap-1 bg-card p-4">
          <dt className="text-muted-foreground text-xs">Paid</dt>
          <dd className="font-medium tabular-nums">{paid}</dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1 bg-card p-4">
          <dt className="text-muted-foreground text-xs">Shipping to</dt>
          <dd className="text-pretty font-medium">{address}</dd>
        </div>
      </motion.dl>
      <motion.ol aria-label="What happens next" className="flex w-full flex-col" {...rise(2)}>
        {[
          { title: "Order placed", meta: "Just now", done: true },
          { title: "Packed at the workshop", meta: "Usually within a day" },
          { title: "Handed to the courier", meta: "Tracking link by email" },
          { title: "Delivered", meta: `Expected ${eta}` },
        ].map((step, i, all) => (
          <li className="relative flex gap-3 pb-4 last:pb-0" key={step.title}>
            {i < all.length - 1 && (
              <span aria-hidden className="absolute top-5 bottom-0 left-[7px] w-px bg-border" />
            )}
            <span
              aria-hidden
              className={cn(
                "relative mt-0.5 flex size-[15px] shrink-0 items-center justify-center rounded-full",
                step.done ? "bg-success text-white" : "border-2 border-border bg-background",
              )}
            >
              {step.done && <CheckIcon className="size-2.5" strokeWidth={3} />}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className={cn("font-medium", !step.done && "text-muted-foreground")}>{step.title}</span>
              <span className="text-muted-foreground text-xs">{step.meta}</span>
            </span>
          </li>
        ))}
      </motion.ol>
      <motion.div className="flex w-full flex-col gap-2 @md:flex-row" {...rise(3)}>
        {onTrack && (
          <Button className={cn("@md:flex-none", press)} onClick={onTrack} size="lg">
            <TruckIcon /> Track order
          </Button>
        )}
        <Button className={press} onClick={onReset} size="lg" variant={onTrack ? "outline" : "default"}>
          Start a new checkout
        </Button>
      </motion.div>
    </motion.div>
  );
}
