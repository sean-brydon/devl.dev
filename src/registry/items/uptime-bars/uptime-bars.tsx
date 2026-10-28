"use client";

import { AlertTriangleIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type PointerEvent, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface UptimeIncident {
  daysAgo: number;
  title: string;
  minutes: number;
}

export interface UptimeService {
  id: string;
  name: string;
  detail?: string;
  incidents?: UptimeIncident[];
  missingDays?: number;
  current?: "operational" | "degraded" | "outage";
}

export interface UptimeBarsProps {
  services?: UptimeService[];
  days?: number;
  endDate?: string;
  locale?: string;
  className?: string;
}

type Level = "up" | "minor" | "major" | "none";

const LEVEL: Record<Level, { bar: string; label: string }> = {
  up: { bar: "bg-success", label: "Operational" },
  minor: { bar: "bg-warning", label: "Degraded" },
  major: { bar: "bg-destructive", label: "Outage" },
  none: { bar: "bg-muted-foreground/20", label: "No data" },
};
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const COMPACT_DAYS = 45;

const defaultServices: UptimeService[] = [
  {
    id: "api",
    name: "API",
    detail: "REST and GraphQL",
    incidents: [
      { daysAgo: 71, title: "Elevated 5xx on writes", minutes: 22 },
      { daysAgo: 38, title: "Slow responses in eu-west", minutes: 9 },
      { daysAgo: 12, title: "Partial outage after deploy", minutes: 47 },
      { daysAgo: 12, title: "Rate limiter misconfigured", minutes: 6 },
    ],
  },
  {
    id: "dashboard",
    name: "Dashboard",
    detail: "app.fernway.dev",
    incidents: [{ daysAgo: 54, title: "Login page not loading", minutes: 18 }],
  },
  {
    id: "webhooks",
    name: "Webhooks",
    detail: "Event delivery",
    incidents: [
      { daysAgo: 63, title: "Delivery backlog", minutes: 95 },
      { daysAgo: 20, title: "Retries delayed", minutes: 11 },
      { daysAgo: 0, title: "Delayed deliveries to us-east", minutes: 8 },
    ],
    current: "degraded",
  },
  {
    id: "auth",
    name: "Auth & SSO",
    detail: "SAML, OIDC, sessions",
    incidents: [{ daysAgo: 29, title: "IdP metadata timeouts", minutes: 13 }],
  },
  {
    id: "edge",
    name: "Edge cache",
    detail: "Assets and images",
    missingDays: 24,
    incidents: [{ daysAgo: 44, title: "Purge requests failing", minutes: 4 }],
  },
];

function RollingNumber({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  let d = 0;
  let o = 0;
  const glyphs = [...text]
    .reverse()
    .map((ch) => {
      const isDigit = ch >= "0" && ch <= "9";
      return { ch, key: isDigit ? `d${d++}` : `s${o++}${ch}`, digit: isDigit ? Number(ch) : null };
    })
    .reverse();
  return (
    <span className={cn("relative inline-flex whitespace-nowrap tabular-nums leading-none", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex [--row:1.15em]">
        {glyphs.map((g) =>
          g.digit === null ? (
            <span className="inline-block h-(--row) leading-(--row)" key={g.key}>
              {g.ch}
            </span>
          ) : (
            <span
              className="relative inline-block h-(--row) overflow-hidden"
              key={g.key}
              style={{ maskImage: "linear-gradient(transparent, black 18%, black 82%, transparent)" }}
            >
              <span className="invisible block leading-(--row)">0</span>
              <motion.span
                animate={{ y: `${-g.digit * 10}%` }}
                className="absolute inset-x-0 top-0 flex flex-col items-center"
                initial={false}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
              >
                {DIGITS.map((n) => (
                  <span className="block h-(--row) leading-(--row)" key={n}>
                    {n}
                  </span>
                ))}
              </motion.span>
            </span>
          ),
        )}
      </span>
    </span>
  );
}

const toUtc = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

function ServiceRow({
  service,
  days,
  endT,
  locale,
}: {
  service: UptimeService;
  days: number;
  endT: number;
  locale: string;
}) {
  const reduce = useReducedMotion();
  const barsRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [anchor, setAnchor] = useState({ x: 0, ratio: 0.5 });

  const daily = useMemo(
    () =>
      Array.from({ length: days }, (_, i) => {
        const daysAgo = days - 1 - i;
        if (i < (service.missingDays ?? 0)) return { daysAgo, level: "none" as Level, uptime: null, incidents: [] };
        const incidents = (service.incidents ?? []).filter((x) => x.daysAgo === daysAgo);
        const down = incidents.reduce((s, x) => s + x.minutes, 0);
        const uptime = Math.max(0, 1 - down / 1440);
        const level: Level = uptime >= 0.999 && !incidents.length ? "up" : uptime >= 0.98 ? "minor" : "major";
        return { daysAgo, level, uptime, incidents };
      }),
    [service, days],
  );
  const counted = daily.filter((d) => d.uptime !== null);
  const uptime = counted.reduce((s, d) => s + (d.uptime ?? 0), 0) / (counted.length || 1);
  const todays = daily[days - 1];
  const current = service.current ?? (todays.level === "major" ? "outage" : todays.level === "minor" ? "degraded" : "operational");
  const date = (daysAgo: number) =>
    new Date(endT - daysAgo * 86400000).toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

  const bars = () => Array.from(barsRef.current?.children ?? []) as HTMLElement[];
  const firstShown = () => Math.max(0, bars().findIndex((b) => b.offsetWidth > 0));

  function select(i: number) {
    const el = bars()[i];
    const wrap = barsRef.current;
    if (!el || !wrap) return;
    const x = el.offsetLeft + el.offsetWidth / 2;
    setActive(i);
    setAnchor({ x, ratio: x / (wrap.clientWidth || 1) });
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const list = bars();
    const start = firstShown();
    let best = start;
    for (let i = start; i < list.length; i++) {
      const r = list[i].getBoundingClientRect();
      if (e.clientX >= r.left - 1) best = i;
      else break;
    }
    if (best !== active) select(best);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const cur = active ?? days - 1;
    const lo = firstShown();
    const next = e.key === "ArrowLeft" ? cur - 1 : e.key === "ArrowRight" ? cur + 1 : e.key === "Home" ? lo : e.key === "End" ? days - 1 : null;
    if (e.key === "Escape") return setActive(null);
    if (next === null) return;
    e.preventDefault();
    select(Math.max(lo, Math.min(days - 1, next)));
  }

  const day = active === null ? null : daily[active];
  const align = anchor.ratio < 0.22 ? "start" : anchor.ratio > 0.78 ? "end" : "center";

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate font-medium text-sm">{service.name}</span>
          {service.detail ? <span className="hidden truncate text-muted-foreground text-xs @min-[26rem]:inline">{service.detail}</span> : null}
        </div>
        <div className="flex shrink-0 items-baseline gap-2 text-xs">
          <span
            className={cn(
              "font-medium",
              current === "operational" && "text-success-foreground",
              current === "degraded" && "text-warning-foreground",
              current === "outage" && "text-destructive-foreground",
            )}
          >
            {current === "operational" ? "Operational" : current === "degraded" ? "Degraded" : "Outage"}
          </span>
          <span className="text-muted-foreground tabular-nums">{uptime >= 0.99995 ? "100" : (uptime * 100).toFixed(2)}%</span>
        </div>
      </div>

      <div className="relative">
        <div
          aria-label={`${service.name}, ${days} days, ${(uptime * 100).toFixed(2)}% uptime. Arrow keys to inspect days.`}
          className="flex h-8 cursor-default touch-pan-y gap-[2px] rounded-sm outline-none ring-offset-2 ring-offset-card focus-visible:ring-2 focus-visible:ring-ring"
          onBlur={() => setActive(null)}
          onFocus={(e) => e.currentTarget.matches(":focus-visible") && select(days - 1)}
          onKeyDown={onKeyDown}
          onPointerCancel={() => setActive(null)}
          onPointerDown={onPointerMove}
          onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
          onPointerMove={onPointerMove}
          ref={barsRef}
          role="application"
          tabIndex={0}
        >
          {daily.map((d, i) => (
            <motion.span
              animate={{ scaleY: 1 }}
              className={cn(
                "relative h-full min-w-0 flex-1 rounded-[calc(var(--radius)*0.2)]",
                LEVEL[d.level].bar,
                active !== null && active !== i && "opacity-45",
                i < days - COMPACT_DAYS && "@max-[26rem]:hidden",
              )}
              initial={{ scaleY: 0.3 }}
              key={d.daysAgo}
              style={{ originY: 1 }}
              transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : Math.min(0.4, i * 0.004), ease: [0.23, 1, 0.32, 1] }}
            />
          ))}
        </div>

        <AnimatePresence>
          {day ? (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "pointer-events-none absolute bottom-full z-20 mb-2 w-56 rounded-xl border bg-popover p-2.5 text-popover-foreground text-xs shadow-lg/5",
                align === "center" && "-translate-x-1/2",
                align === "end" && "-translate-x-full",
              )}
              exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.1 } }}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
              style={{
                left: anchor.x + (align === "start" ? -6 : align === "end" ? 6 : 0),
                originX: align === "start" ? 0 : align === "end" ? 1 : 0.5,
                originY: 1,
              }}
              transition={{ duration: reduce ? 0 : 0.14, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{day.daysAgo === 0 ? "Today" : date(day.daysAgo)}</span>
                <span className="text-muted-foreground tabular-nums">
                  {day.uptime === null ? "No data" : `${(day.uptime * 100).toFixed(2)}%`}
                </span>
              </div>
              {day.incidents.length ? (
                <ul className="mt-2 flex flex-col gap-1.5 border-t pt-2">
                  {day.incidents.map((x) => (
                    <li className="flex items-start gap-2" key={x.title}>
                      <span
                        className={cn(
                          "mt-1 size-1.5 shrink-0 rounded-full",
                          x.minutes >= 30 ? "bg-destructive" : "bg-warning",
                        )}
                      />
                      <span className="min-w-0 flex-1 text-pretty">{x.title}</span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {x.minutes >= 60 ? `${Math.floor(x.minutes / 60)}h ${x.minutes % 60}m` : `${x.minutes}m`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-muted-foreground">
                  {day.uptime === null ? "Monitoring started later" : "No incidents reported"}
                </p>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </li>
  );
}

export function UptimeBars({ services = defaultServices, days = 90, endDate = "2026-10-24", locale = "en-US", className }: UptimeBarsProps) {
  const endT = toUtc(endDate);
  const states = services.map((s) => {
    if (s.current) return s.current;
    const today = (s.incidents ?? []).filter((x) => x.daysAgo === 0).reduce((m, x) => m + x.minutes, 0);
    return today === 0 ? "operational" : today >= 30 ? "outage" : "degraded";
  });
  const worst = states.includes("outage") ? "outage" : states.includes("degraded") ? "degraded" : "operational";
  const overall = useMemo(() => {
    let sum = 0;
    let count = 0;
    for (const s of services) {
      for (let i = s.missingDays ?? 0; i < days; i++) {
        const daysAgo = days - 1 - i;
        const down = (s.incidents ?? []).filter((x) => x.daysAgo === daysAgo).reduce((m, x) => m + x.minutes, 0);
        sum += Math.max(0, 1 - down / 1440);
        count += 1;
      }
    }
    return count ? sum / count : 1;
  }, [services, days]);
  const affected = services.filter((_, i) => states[i] !== "operational");
  const totalIncidents = services.reduce((s, x) => s + (x.incidents?.length ?? 0), 0);

  return (
    <section
      aria-label="Service status"
      className={cn("@container w-full max-w-[540px] rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex items-start justify-between gap-3 border-b p-5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center [&_svg]:size-5",
              worst === "operational" && "text-success",
              worst === "degraded" && "text-warning",
              worst === "outage" && "text-destructive",
            )}
          >
            {worst === "operational" ? <CheckCircle2Icon /> : worst === "degraded" ? <AlertTriangleIcon /> : <XCircleIcon />}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-balance font-medium text-sm">
              {worst === "operational"
                ? "All systems operational"
                : `${worst === "outage" ? "Outage" : "Degraded performance"} on ${affected.map((s) => s.name).join(", ")}`}
            </h3>
            <p className="text-muted-foreground text-xs tabular-nums">
              {totalIncidents} incidents · last {days} days
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <RollingNumber className="font-semibold text-lg tracking-tight" text={`${(overall * 100).toFixed(2)}%`} />
          <span className="text-muted-foreground text-xs">{days}-day uptime</span>
        </div>
      </header>

      <ul className="flex flex-col divide-y px-5 pt-4 pb-3">
        {services.map((s) => (
          <ServiceRow days={days} endT={endT} key={s.id} locale={locale} service={s} />
        ))}
      </ul>

      <footer className="flex items-center justify-between gap-3 px-5 pb-4 text-muted-foreground text-xs">
        <span className="@max-[26rem]:hidden">{days} days ago</span>
        <span className="@min-[26rem]:hidden">{Math.min(days, COMPACT_DAYS)} days ago</span>
        <div className="hidden items-center gap-3 @min-[26rem]:flex">
          {(["up", "minor", "major"] as Level[]).map((l) => (
            <span className="inline-flex items-center gap-1.5" key={l}>
              <span className={cn("h-2.5 w-1 rounded-full", LEVEL[l].bar)} />
              {LEVEL[l].label}
            </span>
          ))}
        </div>
        <span>Today</span>
      </footer>
    </section>
  );
}
