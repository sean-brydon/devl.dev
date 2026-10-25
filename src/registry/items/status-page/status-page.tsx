"use client";

import { BellIcon, CheckIcon, CircleCheckIcon, OctagonAlertIcon, TriangleAlertIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, type KeyboardEvent, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ServiceStatus = "operational" | "degraded" | "outage" | "maintenance";
export type DayStatus = "operational" | "degraded" | "outage" | "none";

export interface StatusComponent {
  id: string;
  name: string;
  description?: string;
  status: ServiceStatus;
  history: DayStatus[];
  notes?: Record<number, string>;
}

export type IncidentStage = "investigating" | "identified" | "monitoring" | "resolved";

export interface StatusIncident {
  id: string;
  title: string;
  impact: "minor" | "major";
  date: string;
  updates: { stage: IncidentStage; time: string; body: string }[];
}

export interface StatusPageProps {
  company?: string;
  today?: string;
  updatedAgo?: string;
  components: StatusComponent[];
  incidents?: StatusIncident[];
  onSubscribe?: (email: string) => Promise<void>;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;
const press = "transition-[box-shadow,scale,background-color] duration-150 active:scale-[0.97]";

const SERVICE: Record<ServiceStatus, { label: string; text: string; dot: string }> = {
  operational: { label: "Operational", text: "text-success-foreground", dot: "bg-success" },
  degraded: { label: "Degraded", text: "text-warning-foreground", dot: "bg-warning" },
  outage: { label: "Outage", text: "text-destructive-foreground", dot: "bg-destructive" },
  maintenance: { label: "Maintenance", text: "text-info-foreground", dot: "bg-info" },
};

const DAY: Record<DayStatus, { bar: string; label: string }> = {
  operational: { bar: "bg-success/75", label: "No incidents" },
  degraded: { bar: "bg-warning", label: "Degraded performance" },
  outage: { bar: "bg-destructive", label: "Outage" },
  none: { bar: "bg-muted", label: "No data" },
};

const STAGE: Record<IncidentStage, { label: string; dot: string }> = {
  investigating: { label: "Investigating", dot: "bg-destructive" },
  identified: { label: "Identified", dot: "bg-warning" },
  monitoring: { label: "Monitoring", dot: "bg-info" },
  resolved: { label: "Resolved", dot: "bg-success" },
};

function dayLabel(today: string, offset: number) {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function uptime(history: DayStatus[]) {
  const known = history.filter((d) => d !== "none");
  if (!known.length) return 100;
  const score = known.reduce((s, d) => s + (d === "operational" ? 1 : d === "degraded" ? 0.995 : 0.97), 0);
  return (score / known.length) * 100;
}

function UptimeBars({ component, today }: { component: StatusComponent; today: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ i: number; left: number } | null>(null);
  const n = component.history.length;
  const mobileFrom = Math.max(0, n - 30);

  const show = (i: number) => {
    const box = ref.current;
    const bar = box?.children[i] as HTMLElement | undefined;
    if (!box || !bar) return;
    const center = bar.offsetLeft + bar.offsetWidth / 2;
    const w = 224;
    setTip({ i, left: Math.min(Math.max(0, center - w / 2), box.offsetWidth - w) });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const first = (ref.current?.children[0] as HTMLElement | undefined)?.offsetParent ? 0 : mobileFrom;
    const cur = tip?.i ?? n - 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      show(Math.min(n - 1, Math.max(first, cur + (e.key === "ArrowRight" ? 1 : -1))));
    } else if (e.key === "Home") {
      e.preventDefault();
      show(first);
    } else if (e.key === "End") {
      e.preventDefault();
      show(n - 1);
    } else if (e.key === "Escape") {
      setTip(null);
    }
  };

  const day = tip ? component.history[tip.i] : null;

  return (
    <div className="relative">
      <div
        aria-label={`${component.name}, daily uptime. Use arrow keys to inspect a day.`}
        className="flex h-8 cursor-default items-stretch gap-[2px] rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        onBlur={() => setTip(null)}
        onFocus={() => show(n - 1)}
        onKeyDown={onKeyDown}
        onPointerLeave={() => setTip(null)}
        ref={ref}
        role="group"
        tabIndex={0}
      >
        {component.history.map((d, i) => (
          <span
            className={cn(
              "min-w-0 flex-1 rounded-[2px] transition-[opacity,scale] duration-150",
              DAY[d].bar,
              i < mobileFrom && "max-sm:hidden",
              tip && tip.i !== i && "opacity-50",
              tip?.i === i && "scale-y-110",
            )}
            key={i}
            onPointerEnter={() => show(i)}
          />
        ))}
      </div>
      <AnimatePresence>
        {day && tip && (
          <motion.div
            animate={{ opacity: 1, y: 0, left: tip.left }}
            className="pointer-events-none absolute bottom-full z-20 mb-2 w-56 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg/5"
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            initial={{ opacity: 0, y: reduce ? 0 : 4, left: tip.left }}
            role="tooltip"
            transition={{ duration: 0.14, ease, left: { duration: 0 } }}
          >
            <p className="font-medium text-xs">{dayLabel(today, n - 1 - tip.i)}</p>
            <p className="mt-1.5 flex items-center gap-2 text-xs">
              <span className={cn("size-2 shrink-0 rounded-full", DAY[day].bar)} />
              {DAY[day].label}
            </p>
            {component.notes?.[tip.i] && <p className="mt-1.5 text-pretty text-muted-foreground text-xs">{component.notes[tip.i]}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StatusPage({
  company = "Fernway",
  today = "2026-10-24",
  updatedAgo = "1 min ago",
  components,
  incidents = [],
  onSubscribe = async () => {},
  className,
}: StatusPageProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const [subscribing, setSubscribing] = useState(false);
  const [email, setEmail] = useState("");
  const [subState, setSubState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState(false);

  const overall = useMemo(() => {
    if (components.some((c) => c.status === "outage")) return "outage" as const;
    if (components.some((c) => c.status === "degraded")) return "degraded" as const;
    if (components.some((c) => c.status === "maintenance")) return "maintenance" as const;
    return "operational" as const;
  }, [components]);
  const affected = components.filter((c) => c.status !== "operational");
  const live = incidents.find((i) => i.updates[0]?.stage !== "resolved");

  const banner = {
    operational: {
      icon: CircleCheckIcon,
      title: "All systems operational",
      box: "border-success/25 bg-success/8 dark:bg-success/10",
      icon_: "text-success-foreground",
    },
    degraded: {
      icon: TriangleAlertIcon,
      title: `${affected.map((c) => c.name).join(", ")} ${affected.length > 1 ? "are" : "is"} running slow`,
      box: "border-warning/30 bg-warning/8 dark:bg-warning/10",
      icon_: "text-warning-foreground",
    },
    outage: {
      icon: OctagonAlertIcon,
      title: `Outage affecting ${affected.map((c) => c.name).join(", ")}`,
      box: "border-destructive/25 bg-destructive/8 dark:bg-destructive/12",
      icon_: "text-destructive-foreground",
    },
    maintenance: {
      icon: TriangleAlertIcon,
      title: "Scheduled maintenance in progress",
      box: "border-info/25 bg-info/8 dark:bg-info/10",
      icon_: "text-info-foreground",
    },
  }[overall];

  const subscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError(true);
      return;
    }
    setSubState("busy");
    await onSubscribe(email.trim());
    setSubState("done");
  };

  return (
    <section className={cn("mx-auto w-full max-w-[880px] space-y-5", className)}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg aria-hidden className="size-4.5" fill="currentColor" viewBox="0 0 18 18">
              <path d="M9 1.5c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6Z" />
            </svg>
          </span>
          <div>
            <p className="font-semibold text-sm tracking-tight">{company}</p>
            <p className="text-muted-foreground text-xs">System status</p>
          </div>
        </div>
        <Button
          aria-expanded={subscribing}
          className={press}
          onClick={() => setSubscribing((s) => !s)}
          variant={subscribing ? "secondary" : "outline"}
        >
          <BellIcon />
          Subscribe to updates
        </Button>
      </header>

      <AnimatePresence initial={false}>
        {subscribing && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="-mx-1 overflow-hidden px-1"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.24, ease }}
          >
            <div className="pb-1">
              {subState === "done" ? (
                <p className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-3.5 text-sm shadow-xs/5">
                  <CheckIcon className="size-4 shrink-0 text-success-foreground" strokeWidth={2.5} />
                  <span className="min-w-0 text-pretty">
                    You’ll get an email at <span className="font-medium">{email.trim()}</span> when anything changes.
                  </span>
                </p>
              ) : (
                <form
                  className="flex flex-col gap-2 rounded-2xl border bg-card p-3 shadow-xs/5 sm:flex-row sm:items-center sm:ps-4"
                  noValidate
                  onSubmit={subscribe}
                >
                  <label
                    className={cn(
                      "shrink-0 text-sm transition-colors duration-150",
                      error ? "text-destructive-foreground" : "text-muted-foreground",
                    )}
                    htmlFor={`${uid}-sub`}
                  >
                    {error ? "Enter a valid email address" : "Email me about incidents and maintenance"}
                  </label>
                  <Input
                    aria-invalid={error ? true : undefined}
                    className="sm:ms-auto sm:max-w-60"
                    id={`${uid}-sub`}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(false);
                    }}
                    placeholder="you@company.com"
                    type="email"
                    value={email}
                  />
                  <Button className={press} loading={subState === "busy"} type="submit">
                    Subscribe
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn("flex items-start gap-3 rounded-2xl border p-4 sm:items-center sm:p-5", banner.box)} role="status">
        <banner.icon className={cn("mt-0.5 size-5 shrink-0 sm:mt-0", banner.icon_)} />
        <div className="min-w-0 flex-1">
          <p className="text-balance font-medium">{banner.title}</p>
          {live && <p className="mt-0.5 text-pretty text-muted-foreground text-sm">{live.updates[0].body}</p>}
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 text-muted-foreground text-xs sm:flex">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-success/60 motion-reduce:hidden" />
            <span className="relative size-1.5 rounded-full bg-success" />
          </span>
          Updated {updatedAgo}
        </span>
      </div>

      <div className="rounded-2xl border bg-card shadow-xs/5">
        <ul className="divide-y">
          {components.map((c) => {
            const s = SERVICE[c.status];
            return (
              <li className="px-4 py-4 sm:px-5" key={c.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">{c.name}</p>
                    {c.description && <p className="truncate text-muted-foreground text-xs">{c.description}</p>}
                  </div>
                  <span className={cn("flex shrink-0 items-center gap-1.5 font-medium text-xs", s.text)}>
                    <span className={cn("size-1.5 rounded-full", s.dot)} />
                    {s.label}
                  </span>
                </div>
                <div className="mt-3">
                  <UptimeBars component={c} today={today} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-muted-foreground text-xs">
                  <span className="sm:hidden">30 days ago</span>
                  <span className="max-sm:hidden">{c.history.length} days ago</span>
                  <span className="h-px flex-1 bg-border" />
                  <span className="tabular-nums sm:hidden">{uptime(c.history.slice(-30)).toFixed(2)}% uptime</span>
                  <span className="tabular-nums max-sm:hidden">{uptime(c.history).toFixed(2)}% uptime</span>
                  <span className="h-px flex-1 bg-border" />
                  <span>Today</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {incidents.length > 0 && (
        <div>
          <h3 className="font-medium text-sm">Recent incidents</h3>
          <ol className="mt-3 space-y-3">
            {incidents.map((inc) => {
              const resolved = inc.updates[0]?.stage === "resolved";
              return (
                <li className="rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-5" key={inc.id}>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <p className="flex items-center gap-2 font-medium text-sm">
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          resolved ? "bg-muted-foreground/40" : inc.impact === "major" ? "bg-destructive" : "bg-warning",
                        )}
                      />
                      {inc.title}
                    </p>
                    <span className="text-muted-foreground text-xs">{inc.date}</span>
                  </div>
                  <ol className="relative mt-3 space-y-3 ps-5 before:absolute before:top-1.5 before:bottom-1.5 before:left-[3px] before:w-px before:bg-border">
                    {inc.updates.map((u, i) => (
                      <li className="relative" key={`${u.stage}-${u.time}`}>
                        <span
                          className={cn(
                            "absolute top-1.5 -left-5 size-[7px] rounded-full ring-2 ring-card",
                            i === 0 ? STAGE[u.stage].dot : "bg-muted-foreground/35",
                          )}
                        />
                        <p className="text-xs">
                          <span className="font-medium">{STAGE[u.stage].label}</span>
                          <span className="text-muted-foreground"> · {u.time}</span>
                        </p>
                        <p className="mt-0.5 text-pretty text-muted-foreground text-sm">{u.body}</p>
                      </li>
                    ))}
                  </ol>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
