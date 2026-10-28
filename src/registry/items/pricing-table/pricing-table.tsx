"use client";

import { CheckIcon, ChevronDownIcon, MinusIcon, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type Billing = "monthly" | "yearly";

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthly: number;
  yearly: number;
  cta: string;
  icon?: LucideIcon;
  highlights: string[];
  featured?: boolean;
  badge?: string;
}

export interface PricingFeatureGroup {
  name: string;
  rows: { label: string; values: Record<string, boolean | string> }[];
}

export interface PricingTableProps {
  plans: PricingPlan[];
  features?: PricingFeatureGroup[];
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  currency?: string;
  yearlyBadge?: string;
  defaultBilling?: Billing;
  onSelect?: (plan: PricingPlan, billing: Billing) => void;
  className?: string;
}

const springy = { type: "spring", stiffness: 420, damping: 40 } as const;
const glide = { type: "spring", stiffness: 520, damping: 44 } as const;
const press =
  "transition-[box-shadow,background-color,transform] duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100";

function RollingDigit({ digit }: { digit: number }) {
  const reduce = useReducedMotion();
  return (
    <span aria-hidden className="relative inline-block h-[1.1em] w-[1ch] overflow-hidden">
      <motion.span
        animate={{ y: `${-digit * 1.1}em` }}
        className="absolute inset-x-0 top-0 flex flex-col"
        initial={false}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 34 }}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span className="block h-[1.1em] leading-[1.1em]" key={n}>
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function RollingNumber({ value, className }: { value: number; className?: string }) {
  const text = value.toLocaleString("en-US");
  const chars = text.split("");
  return (
    <span className={cn("inline-flex tabular-nums leading-[1.1em]", className)}>
      <span className="sr-only">{text}</span>
      {chars.map((char, i) => {
        const key = chars.length - i;
        return /\d/.test(char) ? (
          <RollingDigit digit={Number(char)} key={`d${key}`} />
        ) : (
          <span aria-hidden key={`s${key}`}>
            {char}
          </span>
        );
      })}
    </span>
  );
}

function BillingSwitch({
  value,
  onChange,
  yearlyBadge,
}: {
  value: Billing;
  onChange: (value: Billing) => void;
  yearlyBadge?: string;
}) {
  const reduce = useReducedMotion();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const options: { value: Billing; label: string }[] = [
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];
  const index = options.findIndex((o) => o.value === value);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const next = index === 0 ? 1 : 0;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      aria-label="Billing period"
      className="relative isolate inline-grid grid-cols-2 rounded-full border bg-muted p-1"
      onKeyDown={onKeyDown}
      role="radiogroup"
    >
      <div aria-hidden className="absolute inset-1 -z-10">
        <motion.span
          animate={{ x: index === 0 ? "0%" : "100%" }}
          className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-primary shadow-xs/5"
          initial={false}
          transition={reduce ? { duration: 0 } : glide}
        />
      </div>
      {options.map((option, i) => {
        const checked = option.value === value;
        return (
          <button
            aria-checked={checked}
            className={cn(
              "relative inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full px-5 font-medium text-sm outline-none transition-[color,transform] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              checked ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              "active:scale-[0.97] motion-reduce:active:scale-100",
            )}
            key={option.value}
            onClick={() => onChange(option.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="radio"
            tabIndex={checked ? 0 : -1}
            type="button"
          >
            {option.label}
            {option.value === "yearly" && yearlyBadge && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px font-medium text-[0.6875rem] tabular-nums transition-colors duration-200",
                  checked ? "bg-primary-foreground/16 text-primary-foreground" : "bg-success/8 text-success-foreground",
                )}
              >
                {yearlyBadge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function PlanCard({
  plan,
  billing,
  currency,
  featured,
  onSelect,
}: {
  plan: PricingPlan;
  billing: Billing;
  currency: string;
  featured: boolean;
  onSelect?: (plan: PricingPlan, billing: Billing) => void;
}) {
  const reduce = useReducedMotion();
  const price = billing === "yearly" ? plan.yearly : plan.monthly;
  const saving = plan.monthly - plan.yearly;
  const Icon = plan.icon;

  return (
    <article
      className={cn(
        "relative isolate flex flex-col overflow-hidden rounded-2xl border p-6 shadow-xs/5",
        featured ? "border-primary bg-primary text-primary-foreground md:-my-3 md:py-9" : "bg-card text-card-foreground",
      )}
    >
      {featured && (
        <>
          <span
            aria-hidden
            className="absolute -top-28 -right-20 -z-10 size-72 rounded-full bg-primary-foreground/16 blur-3xl"
          />
          <span
            aria-hidden
            className="absolute -bottom-28 -left-20 -z-10 size-64 rounded-full bg-primary-foreground/10 blur-3xl"
          />
        </>
      )}
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              featured ? "bg-primary-foreground/12" : "bg-muted",
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
        <h3 className="font-medium text-base">{plan.name}</h3>
        {(plan.badge || featured) && (
          <span
            className={cn(
              "ms-auto rounded-full px-2 py-0.5 font-medium text-xs",
              featured ? "bg-primary-foreground text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {plan.badge ?? "Most popular"}
          </span>
        )}
      </div>
      <p className={cn("mt-2 text-sm md:min-h-10", featured ? "text-primary-foreground/70" : "text-muted-foreground")}>
        {plan.description}
      </p>

      <div className="mt-6 flex items-end gap-1.5">
        <span className="flex items-start font-semibold text-4xl tracking-tight">
          <span className="me-0.5 mt-1 text-xl">{currency}</span>
          <RollingNumber value={price} />
        </span>
        <span className={cn("mb-1 text-sm", featured ? "text-primary-foreground/70" : "text-muted-foreground")}>
          /mo
        </span>
        <AnimatePresence initial={false}>
          {billing === "yearly" && saving > 0 && (
            <motion.span
              animate={{ opacity: 1, scale: 1, x: 0 }}
              className={cn(
                "mb-1.5 ms-1 text-sm tabular-nums line-through",
                featured ? "text-primary-foreground/50" : "text-muted-foreground/70",
              )}
              exit={{ opacity: 0, scale: 0.95, x: -4 }}
              initial={{ opacity: 0, scale: 0.95, x: -4 }}
              transition={springy}
            >
              {currency}
              {plan.monthly}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div
        className={cn(
          "relative mt-1 h-4 overflow-hidden text-xs",
          featured ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.p
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reduce ? 0 : billing === "yearly" ? -14 : 14, opacity: 0 }}
            initial={{ y: reduce ? 0 : billing === "yearly" ? 14 : -14, opacity: 0 }}
            key={billing}
            transition={springy}
          >
            {billing === "yearly"
              ? `${currency}${(plan.yearly * 12).toLocaleString("en-US")} billed yearly`
              : "Billed monthly, cancel anytime"}
          </motion.p>
        </AnimatePresence>
      </div>

      <Button
        className={cn(
          "mt-6 w-full",
          press,
          featured &&
            "border-primary-foreground bg-primary-foreground text-primary shadow-none hover:bg-primary-foreground/90",
        )}
        onClick={() => onSelect?.(plan, billing)}
        size="lg"
        variant={featured ? "default" : "outline"}
      >
        {plan.cta}
      </Button>

      <ul className="mt-6 space-y-2.5 text-sm">
        {plan.highlights.map((item) => (
          <li className="flex gap-2.5" key={item}>
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                featured ? "bg-primary-foreground/16" : "bg-success/8 text-success-foreground",
              )}
            >
              <CheckIcon className="size-3" strokeWidth={3} />
            </span>
            <span className={featured ? "text-primary-foreground/90" : undefined}>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function FeatureValue({ value }: { value: boolean | string | undefined }) {
  if (value === true) {
    return (
      <span className="inline-flex size-5 items-center justify-center rounded-full bg-success/12 text-success-foreground">
        <CheckIcon aria-label="Included" className="size-3" strokeWidth={3} />
      </span>
    );
  }
  if (!value) return <MinusIcon aria-label="Not included" className="size-4 text-muted-foreground/50" />;
  return <span className="font-medium text-xs tabular-nums">{value}</span>;
}

export function PricingTable({
  plans,
  features,
  eyebrow = "Pricing",
  title = "Simple plans that grow with you",
  subtitle = "Start free for 14 days. Switch or cancel whenever you like.",
  currency = "$",
  yearlyBadge = "−20%",
  defaultBilling = "monthly",
  onSelect,
  className,
}: PricingTableProps) {
  const [billing, setBilling] = useState<Billing>(defaultBilling);
  const featuredIndex = plans.some((p) => p.featured)
    ? plans.findIndex((p) => p.featured)
    : Math.floor((plans.length - 1) / 2);

  return (
    <section className={cn("mx-auto w-full max-w-[1100px]", className)}>
      <header className="mx-auto flex max-w-xl flex-col items-center text-center">
        {eyebrow && <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">{eyebrow}</p>}
        <h2 className="mt-2 text-balance font-semibold text-3xl tracking-tight sm:text-4xl">{title}</h2>
        {subtitle && <p className="mt-3 text-balance text-muted-foreground text-sm sm:text-base">{subtitle}</p>}
        <div className="mt-7">
          <BillingSwitch onChange={setBilling} value={billing} yearlyBadge={yearlyBadge} />
        </div>
      </header>

      <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
        {plans.map((plan, i) => (
          <PlanCard
            billing={billing}
            currency={currency}
            featured={i === featuredIndex}
            key={plan.id}
            onSelect={onSelect}
            plan={plan}
          />
        ))}
      </div>

      {features && features.length > 0 && (
        <Collapsible className="mt-10">
          <div className="flex justify-center">
            <CollapsibleTrigger render={<Button className={cn("group rounded-full", press)} variant="outline" />}>
              Compare all features
              <ChevronDownIcon className="transition-transform duration-200 ease-out group-data-[panel-open]:rotate-180" />
            </CollapsibleTrigger>
          </div>
          <CollapsiblePanel className="duration-250 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full min-w-[340px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-3 text-start font-medium text-muted-foreground text-xs sm:px-4" scope="col">
                      Features
                    </th>
                    {plans.map((plan, i) => (
                      <th
                        className={cn(
                          "w-[4.5rem] px-1 py-3 text-center font-medium text-sm sm:w-36 sm:px-2",
                          i === featuredIndex && "bg-muted",
                        )}
                        key={plan.id}
                        scope="col"
                      >
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                {features.map((group) => (
                  <tbody key={group.name}>
                    <tr>
                      <th
                        className="border-t bg-muted/50 px-3 pt-4 sm:px-4 pb-2 text-start font-medium text-muted-foreground text-xs uppercase tracking-wider"
                        colSpan={plans.length + 1}
                        scope="colgroup"
                      >
                        {group.name}
                      </th>
                    </tr>
                    {group.rows.map((row) => (
                      <tr className="border-t" key={row.label}>
                        <th className="px-3 py-2.5 text-start font-normal sm:px-4" scope="row">
                          {row.label}
                        </th>
                        {plans.map((plan, i) => (
                          <td
                            className={cn("px-1 py-2.5 text-center sm:px-2", i === featuredIndex && "bg-muted")}
                            key={plan.id}
                          >
                            <span className="flex h-5 items-center justify-center">
                              <FeatureValue value={row.values[plan.id]} />
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </CollapsiblePanel>
        </Collapsible>
      )}
    </section>
  );
}
