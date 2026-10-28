"use client";

import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { Gauge } from "@/components/charts/gauge";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

export interface ServiceBudget {
  id: string;
  name: string;
  slo: number;
  remaining: number;
  burnRate: number;
  incidents: number;
}

export interface ErrorBudgetGaugeCardProps {
  title?: string;
  window?: string;
  services: ServiceBudget[];
  defaultService?: string;
  className?: string;
}

function health(remaining: number) {
  if (remaining >= 50) return { label: "Healthy", fill: "var(--color-emerald-500)", text: "text-success-foreground" };
  if (remaining >= 20) return { label: "Burning", fill: "var(--color-amber-500)", text: "text-warning-foreground" };
  return { label: "At risk", fill: "var(--color-rose-500)", text: "text-destructive-foreground" };
}

function RollingPercent({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const spring = useSpring(value, { stiffness: 260, damping: 32 });
  const text = useTransform(spring, (v) => `${Math.round(v)}%`);
  useEffect(() => {
    if (reduceMotion) spring.jump(value);
    else spring.set(value);
  }, [value, reduceMotion, spring]);
  return <motion.span>{text}</motion.span>;
}

export function ErrorBudgetGaugeCard({
  title = "Error budget",
  window = "30-day window",
  services,
  defaultService,
  className,
}: ErrorBudgetGaugeCardProps) {
  const [serviceId, setServiceId] = useState(defaultService ?? services[0]?.id);
  const service = services.find((s) => s.id === serviceId) ?? services[0];
  const state = health(service.remaining);

  return (
    <div className={cn("w-[380px] max-w-full rounded-2xl border bg-card p-5 shadow-xs/5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="mt-0.5 text-muted-foreground text-xs">{window}</p>
        </div>
        <SegmentedControl aria-label="Service" role="radiogroup" size="sm">
          {services.map((s) => (
            <SegmentedControlItem
              aria-checked={s.id === service.id}
              className="px-2 text-muted-foreground text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-xs"
              data-checked={s.id === service.id ? "" : undefined}
              key={s.id}
              onClick={() => setServiceId(s.id)}
              role="radio"
            >
              {s.name}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
      <div className="relative mx-auto mt-2 w-full max-w-[260px]">
        <Gauge
          activeFill={state.fill}
          minWidth={0}
          notchCornerRadius={2}
          spacing={28}
          totalNotches={36}
          value={service.remaining}
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-2 leading-none">
          <span className="font-semibold text-3xl tabular-nums tracking-tight">
            <RollingPercent value={service.remaining} />
          </span>
          <span className={cn("mt-1.5 font-medium text-xs", state.text)}>{state.label}</span>
        </div>
      </div>
      <dl className="-mt-2 grid grid-cols-3 divide-x rounded-xl border text-center">
        <div className="px-2 py-2.5">
          <dt className="text-muted-foreground text-xs">SLO</dt>
          <dd className="mt-0.5 font-medium text-sm tabular-nums">{service.slo}%</dd>
        </div>
        <div className="px-2 py-2.5">
          <dt className="text-muted-foreground text-xs">Burn rate</dt>
          <dd className="mt-0.5 font-medium text-sm tabular-nums">{service.burnRate.toFixed(1)}×</dd>
        </div>
        <div className="px-2 py-2.5">
          <dt className="text-muted-foreground text-xs">Incidents</dt>
          <dd className="mt-0.5 font-medium text-sm tabular-nums">{service.incidents}</dd>
        </div>
      </dl>
    </div>
  );
}
