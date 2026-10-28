"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import {
  ActivityIcon,
  BellRingIcon,
  CheckIcon,
  CircleAlertIcon,
  GitCommitHorizontalIcon,
  LayoutGridIcon,
  type LucideIcon,
  PhoneIcon,
  RocketIcon,
  RotateCcwIcon,
  SendHorizontalIcon,
  SirenIcon,
  XIcon,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ServiceHealth = "operational" | "degraded" | "down";
export type ConsoleTone = "blue" | "orange" | "teal" | "violet" | "rose" | "amber" | "emerald" | "sky";

export interface ConsoleService {
  id: string;
  name: string;
  health: ServiceHealth;
  p95: number;
  errorRate: number;
  uptime: number;
  region?: string;
}

export interface ConsolePerson {
  id: string;
  name: string;
  tone: ConsoleTone;
  role?: string;
}

export interface IncidentUpdate {
  id: string;
  time: string;
  state: "alert" | "investigating" | "identified" | "monitoring" | "resolved" | "note";
  text: string;
  by?: string;
}

export interface ConsoleDeploy {
  id: string;
  sha: string;
  message: string;
  service: string;
  author: string;
  time: string;
  status: "succeeded" | "rolling" | "failed" | "rolled-back";
  progress?: number;
}

export interface StatusConsoleProps {
  environment?: string;
  services?: ConsoleService[];
  people?: ConsolePerson[];
  onCall?: { primary: string; secondary: string; until: string };
  className?: string;
}

const avatarTone: Record<ConsoleTone, string> = {
  blue: "bg-blue-500/14 text-blue-700 dark:text-blue-300",
  orange: "bg-orange-500/14 text-orange-700 dark:text-orange-300",
  teal: "bg-teal-500/16 text-teal-700 dark:text-teal-300",
  violet: "bg-violet-500/16 text-violet-700 dark:text-violet-300",
  rose: "bg-rose-500/14 text-rose-700 dark:text-rose-300",
  amber: "bg-amber-500/18 text-amber-700 dark:text-amber-300",
  emerald: "bg-emerald-500/16 text-emerald-700 dark:text-emerald-300",
  sky: "bg-sky-500/16 text-sky-700 dark:text-sky-300",
};

const healthDot: Record<ServiceHealth, string> = {
  operational: "bg-success",
  degraded: "bg-warning",
  down: "bg-destructive",
};
const healthText: Record<ServiceHealth, string> = {
  operational: "text-success-foreground",
  degraded: "text-warning-foreground",
  down: "text-destructive-foreground",
};
const healthStroke: Record<ServiceHealth, string> = {
  operational: "stroke-success",
  degraded: "stroke-warning",
  down: "stroke-destructive",
};
const healthFill: Record<ServiceHealth, string> = {
  operational: "fill-transparent",
  degraded: "fill-warning/12",
  down: "fill-destructive/12",
};
const healthLabel: Record<ServiceHealth, string> = { operational: "Operational", degraded: "Degraded", down: "Down" };

const stateMeta: Record<IncidentUpdate["state"], { label: string; dot: string; text: string }> = {
  alert: { label: "Alert", dot: "bg-destructive", text: "text-destructive-foreground" },
  investigating: { label: "Investigating", dot: "bg-warning", text: "text-warning-foreground" },
  identified: { label: "Identified", dot: "bg-orange-500", text: "text-orange-700 dark:text-orange-300" },
  monitoring: { label: "Monitoring", dot: "bg-info", text: "text-info-foreground" },
  resolved: { label: "Resolved", dot: "bg-success", text: "text-success-foreground" },
  note: { label: "Note", dot: "bg-muted-foreground", text: "text-muted-foreground" },
};

const ease = [0.23, 1, 0.32, 1] as const;
const POINTS = 40;

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const defaultServices: ConsoleService[] = [
  { id: "api", name: "API gateway", health: "operational", p95: 84, errorRate: 0.02, uptime: 99.99, region: "eu-west" },
  { id: "webhooks", name: "Webhook delivery", health: "degraded", p95: 4100, errorRate: 2.4, uptime: 99.71, region: "eu-west" },
  { id: "ingest", name: "Event ingest", health: "operational", p95: 41, errorRate: 0.01, uptime: 99.99, region: "eu-west" },
  { id: "queue", name: "Queue", health: "operational", p95: 12, errorRate: 0, uptime: 100, region: "eu-west" },
  { id: "db", name: "Postgres primary", health: "operational", p95: 6, errorRate: 0, uptime: 99.98, region: "eu-west" },
  { id: "auth", name: "Auth", health: "operational", p95: 63, errorRate: 0.03, uptime: 99.99, region: "global" },
  { id: "dashboard", name: "Dashboard", health: "operational", p95: 210, errorRate: 0.05, uptime: 99.97, region: "global" },
  { id: "search", name: "Search", health: "operational", p95: 118, errorRate: 0.04, uptime: 99.95, region: "eu-west" },
  { id: "billing", name: "Billing", health: "operational", p95: 152, errorRate: 0.01, uptime: 99.99, region: "us-east" },
];

const defaultPeople: ConsolePerson[] = [
  { id: "sam", name: "Sam Whitfield", tone: "amber", role: "Platform" },
  { id: "leo", name: "Leo Marchetti", tone: "rose", role: "Platform" },
  { id: "maya", name: "Maya Okafor", tone: "teal", role: "Product" },
  { id: "jonas", name: "Jonas Weber", tone: "blue", role: "Growth" },
  { id: "bot", name: "Kestrel Monitor", tone: "violet" },
];

const initialUpdates: IncidentUpdate[] = [
  { id: "u1", time: "13:58", state: "alert", text: "webhooks.lag above 2 minutes for 5 minutes in eu-west.", by: "bot" },
  {
    id: "u2",
    time: "14:02",
    state: "investigating",
    text: "Deliveries are delayed for some endpoints. p95 delivery time is about 4 minutes. Looking into it.",
    by: "sam",
  },
];

const script: { at: number; update?: IncidentUpdate; deploy?: "start" | "finish"; heal?: number }[] = [
  {
    at: 5000,
    update: {
      id: "u3",
      time: "14:09",
      state: "identified",
      text: "One malformed payload is blocking the consumer for partition 7. Rolling out a fix that parks it in the dead-letter queue.",
      by: "sam",
    },
    deploy: "start",
  },
  { at: 12000, deploy: "finish", heal: 0.5 },
  {
    at: 13000,
    update: { id: "u4", time: "14:14", state: "monitoring", text: "Fix is live. Backlog draining: 42,180 → 6,904 queued.", by: "leo" },
  },
  {
    at: 21000,
    update: { id: "u5", time: "14:21", state: "resolved", text: "Deliveries are back to normal. 312 events were dead-lettered and replayed.", by: "sam" },
    heal: 1,
  },
];

const initialDeploys: ConsoleDeploy[] = [
  { id: "d1", sha: "7c2e91a", message: "Raise ingest batch size to 500", service: "ingest", author: "leo", time: "1h", status: "succeeded" },
  { id: "d2", sha: "e04b6d2", message: "Starter pricing copy", service: "dashboard", author: "jonas", time: "3h", status: "succeeded" },
  { id: "d3", sha: "51fa0c7", message: "Search: rebuild index on deploy", service: "search", author: "leo", time: "5h", status: "rolled-back" },
  { id: "d4", sha: "9ad3e18", message: "Rotate JWT signing keys", service: "auth", author: "sam", time: "Yesterday", status: "succeeded" },
];

function Sparkline({ values, health, max }: { values: number[]; health: ServiceHealth; max: number }) {
  const w = 120;
  const h = 24;
  const top = Math.max(max, ...values) * 1.2;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - (v / top) * (h - 4) - 2] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const calm = health === "operational";
  return (
    <svg aria-hidden className="h-6 w-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${w} ${h}`}>
      <path className={cn("stroke-none transition-[fill] duration-500", calm ? "fill-transparent" : healthFill[health])} d={area} />
      <path
        className={cn("fill-none transition-[stroke] duration-500", calm ? "stroke-muted-foreground/60" : healthStroke[health])}
        d={line}
        strokeLinejoin="round"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function fmtMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function PersonAvatar({ person, size = "size-6" }: { person?: ConsolePerson; size?: string }) {
  if (!person) return null;
  return (
    <Avatar className={size}>
      <AvatarFallback className={cn("font-medium text-[10px]", avatarTone[person.tone])}>
        {person.id === "bot" ? <ActivityIcon className="size-3" /> : initials(person.name)}
      </AvatarFallback>
    </Avatar>
  );
}

type RailId = "overview" | "incidents" | "deploys" | "oncall";

const rail: { id: RailId; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Services", icon: LayoutGridIcon },
  { id: "incidents", label: "Incident", icon: SirenIcon },
  { id: "deploys", label: "Deploys", icon: RocketIcon },
  { id: "oncall", label: "On call", icon: PhoneIcon },
];

export function StatusConsole({
  environment = "Production",
  services: initialServices = defaultServices,
  people = defaultPeople,
  onCall = { primary: "sam", secondary: "leo", until: "Mon 09:00" },
  className,
}: StatusConsoleProps) {
  const reduce = useReducedMotion();
  const [env, setEnv] = useState(environment);
  const [services, setServices] = useState(initialServices);
  const [series, setSeries] = useState<Record<string, number[]>>(() => {
    const rnd = seeded(7);
    return Object.fromEntries(
      initialServices.map((s) => [
        s.id,
        Array.from({ length: POINTS }, (_, i) => {
          const base = s.health === "degraded" ? s.p95 * (0.25 + (i / POINTS) * 0.85) : s.p95;
          return base * (0.92 + rnd() * 0.16);
        }),
      ]),
    );
  });
  const [updates, setUpdates] = useState(initialUpdates);
  const [deploys, setDeploys] = useState(initialDeploys);
  const [heal, setHeal] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const [paged, setPaged] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [railOn, setRailOn] = useState<RailId>("overview");
  const jump = (id: RailId) => {
    setRailOn(id);
    if (env !== "Production") setEnv("Production");
    requestAnimationFrame(() => {
      const box = scrollRef.current;
      const el = box?.querySelector<HTMLElement>(`[data-rail="${id}"]`);
      if (!box || !el) return;
      const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 12;
      box.scrollTo({ top: id === "overview" ? 0 : top, behavior: reduce ? "auto" : "smooth" });
    });
  };
  const timelineRef = useRef<HTMLOListElement>(null);

  const person = (id?: string) => people.find((p) => p.id === id);
  const incidentState = updates.filter((u) => u.state !== "note" && u.state !== "alert").at(-1)?.state ?? "investigating";
  const resolved = incidentState === "resolved";

  useEffect(() => {
    const timers = script.map((step) =>
      window.setTimeout(() => {
        if (step.update) setUpdates((u) => [...u, step.update as IncidentUpdate]);
        if (step.deploy === "start")
          setDeploys((d) => [
            { id: "fix", sha: "a1f9c3e", message: "Park poison messages after 3 attempts", service: "webhooks", author: "sam", time: "now", status: "rolling", progress: 0 },
            ...d,
          ]);
        if (step.deploy === "finish") setDeploys((d) => d.map((x) => (x.id === "fix" ? { ...x, status: "succeeded", progress: 100 } : x)));
        if (step.heal !== undefined) setHeal(step.heal);
      }, step.at),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const rolling = deploys.some((d) => d.status === "rolling");
  useEffect(() => {
    if (!rolling) return;
    const id = window.setInterval(() => {
      setDeploys((d) => d.map((x) => (x.status === "rolling" ? { ...x, progress: Math.min(96, (x.progress ?? 0) + 7 + Math.random() * 6) } : x)));
    }, 500);
    return () => window.clearInterval(id);
  }, [rolling]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds(0);
      setSeries((all) => {
        const next: Record<string, number[]> = {};
        for (const s of initialServices) {
          const prev = all[s.id] ?? [];
          const target = s.id === "webhooks" ? s.p95 * (1 - heal) + 180 * heal : s.p95;
          const last = prev[prev.length - 1] ?? target;
          const v = last + (target - last) * 0.35 + target * (Math.random() - 0.5) * 0.12;
          next[s.id] = [...prev.slice(1), Math.max(1, v)];
        }
        return next;
      });
    }, 2000);
    const tick = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      window.clearInterval(id);
      window.clearInterval(tick);
    };
  }, [heal, initialServices]);

  useEffect(() => {
    setServices((all) =>
      all.map((s) =>
        s.id === "webhooks"
          ? { ...s, health: heal >= 1 ? "operational" : "degraded", errorRate: heal >= 1 ? 0.04 : heal > 0 ? 0.6 : 2.4 }
          : s,
      ),
    );
  }, [heal]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const el = timelineRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [updates.length, reduce]);

  const degraded = services.filter((s) => s.health !== "operational");
  const overall: ServiceHealth = degraded.some((s) => s.health === "down") ? "down" : degraded.length ? "degraded" : "operational";
  const visibleDeploys = selected ? deploys.filter((d) => d.service === selected) : deploys;

  const page = (who: string) => {
    setPaged(who);
    const p = person(who);
    setUpdates((u) => [...u, { id: `n${Date.now()}`, time: "now", state: "note", text: `Paged ${p?.name}. Acknowledged in 40s.`, by: "maya" }]);
    setToast({ key: Date.now(), text: `Paged ${p?.name.split(" ")[0]}` });
  };

  const postNote = () => {
    if (!note.trim()) return;
    setUpdates((u) => [...u, { id: `n${Date.now()}`, time: "now", state: "note", text: note.trim(), by: "maya" }]);
    setNote("");
  };

  const rollback = (d: ConsoleDeploy) => {
    setDeploys((all) => all.map((x) => (x.id === d.id ? { ...x, status: "rolled-back" } : x)));
    setToast({ key: Date.now(), text: `Rolled back ${d.sha} on ${services.find((s) => s.id === d.service)?.name}` });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") setSelected(null);
    else if (e.key.toLowerCase() === "p") page(onCall.primary);
    else if (/^[1-9]$/.test(e.key)) {
      const s = services[Number(e.key) - 1];
      if (s) {
        setSelected((cur) => (cur === s.id ? null : s.id));
        setFocusIdx(Number(e.key) - 1);
        cardRefs.current[Number(e.key) - 1]?.focus({ preventScroll: true });
      }
    }
  };

  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, j: 1, k: -1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(services.length - 1, focusIdx + moves[e.key]));
    setFocusIdx(next);
    cardRefs.current[next]?.focus();
  };

  const uptimeBars = useMemo(() => {
    const rnd = seeded(23);
    return Array.from({ length: 60 }, (_, i) => (i === 59 ? 2 : rnd() > 0.95 ? 1 : 0));
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delay={300}>
        <div
          className={cn("@container relative isolate flex h-[760px] w-full overflow-hidden bg-sidebar text-foreground text-sm outline-none", className)}
          onKeyDown={onKeyDown}
          tabIndex={-1}
        >
          <nav aria-label="Console" className="hidden w-14 shrink-0 flex-col items-center gap-1 py-3 @3xl:flex">
            <span className="mb-3 flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ActivityIcon className="size-4" />
            </span>
            {rail.map((r) => (
              <Tooltip key={r.id}>
                <TooltipTrigger
                  render={
                    <button
                      aria-current={r.id === railOn ? "location" : undefined}
                      aria-label={r.label}
                      className={cn(
                        "relative flex size-9 cursor-pointer items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        r.id === railOn ? "bg-background text-foreground shadow-xs/5 ring-1 ring-border dark:bg-accent dark:ring-0" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                      onClick={() => jump(r.id)}
                      type="button"
                    />
                  }
                >
                  <r.icon className="size-4" />
                  {r.id === "incidents" && !resolved && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive" />}
                </TooltipTrigger>
                <TooltipPopup side="right">{r.label}</TooltipPopup>
              </Tooltip>
            ))}
          </nav>

          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background @3xl:my-2 @3xl:me-2 @3xl:rounded-2xl @3xl:border @3xl:shadow-xs/5">
            <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3 @lg:px-4">
              <div className="min-w-0">
                <h1 className="truncate font-semibold">Status</h1>
              </div>
              <LayoutGroup id="console-env">
                <div aria-label="Environment" className="flex rounded-lg bg-muted p-0.5" role="group">
                  {["Production", "Staging"].map((e) => (
                    <button
                      aria-pressed={env === e}
                      className={cn(
                        "relative h-6 cursor-pointer rounded-md px-2 font-medium text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        env === e ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                      key={e}
                      onClick={() => setEnv(e)}
                      type="button"
                    >
                      {env === e && <motion.span className="absolute inset-0 rounded-md bg-background shadow-xs/5 dark:bg-accent" layoutId="env-pill" transition={{ type: "spring", stiffness: 520, damping: 42 }} />}
                      <span className="relative">{e === "Production" ? "Prod" : "Staging"}</span>
                    </button>
                  ))}
                </div>
              </LayoutGroup>
              <div className="ms-auto flex items-center gap-3">
                <span className="hidden items-center gap-1.5 text-muted-foreground text-xs tabular-nums @lg:flex">
                  <span className="relative flex size-2">
                    <span className="absolute inset-0 rounded-full bg-success opacity-60 motion-safe:animate-ping motion-reduce:hidden [animation-duration:2s]" />
                    <span className="relative size-2 rounded-full bg-success" />
                  </span>
                  Live · {seconds}s ago
                </span>
                <span
                  className={cn(
                    "flex h-7 items-center gap-1.5 rounded-full border px-2.5 font-medium text-xs transition-colors duration-500",
                    overall === "operational" ? "border-success/30 bg-success/8 text-success-foreground" : "border-warning/40 bg-warning/10 text-warning-foreground",
                  )}
                >
                  {overall === "operational" ? <CheckIcon className="size-3.5" /> : <CircleAlertIcon className="size-3.5" />}
                  <motion.span animate={{ opacity: 1, y: 0 }} initial={false} key={overall} transition={{ duration: 0.2, ease }}>
                    {overall === "operational" ? (
                      <>
                        <span className="@lg:hidden">All clear</span>
                        <span className="hidden @lg:inline">All systems operational</span>
                      </>
                    ) : (
                      `${degraded.length} degraded`
                    )}
                  </motion.span>
                </span>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]" ref={scrollRef}>
              {env === "Staging" ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-success shadow-xs/5">
                    <CheckIcon className="size-5" />
                  </span>
                  <p className="mt-3 font-medium">Staging is quiet</p>
                  <p className="mt-1 max-w-xs text-pretty text-muted-foreground text-xs">9 services healthy, no open incidents, last deploy 22 minutes ago.</p>
                  <Button className="mt-4" onClick={() => setEnv("Production")} size="sm" variant="outline">
                    Back to production
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 p-3 @lg:p-4 @5xl:grid-cols-[minmax(0,1fr)_340px] @5xl:grid-rows-[auto_1fr]">
                  <div className="flex min-w-0 flex-col gap-4 self-start @5xl:col-start-1 @5xl:row-span-2 @5xl:row-start-1">
                    <section aria-label="Services" className="overflow-hidden rounded-xl border bg-card" data-rail="overview">
                      <div className="flex h-11 items-center justify-between gap-3 border-b px-3">
                        <h2 className="font-medium">Services</h2>
                        <span className="truncate text-muted-foreground text-xs">
                          {selected ? (
                            <button className="cursor-pointer rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSelected(null)} type="button">
                              Clear filter <Kbd className="ms-1">Esc</Kbd>
                            </button>
                          ) : (
                            <>
                              <span className="hidden @lg:inline">Press </span>
                              <Kbd>1</Kbd>–<Kbd>9</Kbd> to filter
                            </>
                          )}
                        </span>
                      </div>
                      <div
                        aria-hidden
                        className="hidden h-8 items-center gap-4 border-b bg-muted/40 px-3 text-[11px] text-muted-foreground @xl:flex"
                      >
                        <span className="min-w-0 flex-1">Service</span>
                        <span className="w-32 @4xl:w-40">p95 · last 80s</span>
                        <span className="w-14 text-right">p95</span>
                        <span className="w-14 text-right">Errors</span>
                        <span className="w-16 text-right">30d</span>
                      </div>
                      <div aria-label="Services" className="flex flex-col divide-y" onKeyDown={onGridKey} role="listbox">
                        {services.map((s, i) => {
                          const values = series[s.id] ?? [];
                          const now = values[values.length - 1] ?? s.p95;
                          const on = selected === s.id;
                          const calm = s.health === "operational";
                          return (
                            <button
                              aria-label={`${s.name}, ${healthLabel[s.health]}, p95 ${fmtMs(now)}`}
                              aria-selected={on}
                              className={cn(
                                "group/row relative flex h-11 min-w-0 cursor-pointer items-center gap-4 px-3 text-left outline-none transition-[background-color,opacity] duration-150 ease-out focus-visible:bg-accent/60",
                                on ? "bg-accent/70" : "hover:bg-accent/40",
                                selected && !on && "opacity-50",
                              )}
                              key={s.id}
                              onClick={() => setSelected((cur) => (cur === s.id ? null : s.id))}
                              onFocus={() => setFocusIdx(i)}
                              ref={(el) => {
                                cardRefs.current[i] = el;
                              }}
                              role="option"
                              tabIndex={i === focusIdx ? 0 : -1}
                              type="button"
                            >
                              {on && <motion.span className="absolute inset-y-0 left-0 w-0.5 bg-foreground" layoutId="service-rail" transition={{ type: "spring", stiffness: 520, damping: 42 }} />}
                              <span className="flex min-w-0 flex-1 items-center gap-2.5">
                                <span className="relative flex size-2 shrink-0">
                                  {!calm && <span className={cn("absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping motion-reduce:hidden", healthDot[s.health])} />}
                                  <span className={cn("relative size-2 rounded-full transition-colors duration-500", healthDot[s.health])} />
                                </span>
                                <span className="truncate font-medium">{s.name}</span>
                                {!calm && <span className={cn("shrink-0 text-xs transition-colors duration-500", healthText[s.health])}>{healthLabel[s.health]}</span>}
                                <span className="ms-auto hidden shrink-0 font-mono text-[11px] text-muted-foreground @md:inline @xl:hidden @3xl:inline">{s.region}</span>
                              </span>
                              <span className="hidden w-32 shrink-0 @xl:block @4xl:w-40">
                                <Sparkline health={s.health} max={s.p95} values={values} />
                              </span>
                              <span className={cn("w-14 shrink-0 text-right font-medium tabular-nums transition-colors duration-500", calm ? "text-foreground" : healthText[s.health])}>{fmtMs(now)}</span>
                              <span className="hidden w-14 shrink-0 text-right text-muted-foreground tabular-nums @md:block">{s.errorRate.toFixed(2)}%</span>
                              <span className="hidden w-16 shrink-0 text-right text-muted-foreground tabular-nums @xl:block">{s.uptime.toFixed(2)}%</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section aria-label="Uptime" className="rounded-xl border bg-card px-3 pt-3 pb-2.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <h2 className="truncate font-medium">{selected ? services.find((s) => s.id === selected)?.name : "Platform"} uptime</h2>
                        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                          <span className="font-medium text-foreground">99.94%</span> · 60 days
                        </span>
                      </div>
                      <div className="mt-3 flex h-6 gap-[3px]">
                        {uptimeBars.map((b, i) => (
                          <Tooltip key={i}>
                            <TooltipTrigger
                              render={
                                <span
                                  className={cn(
                                    "h-full min-w-0 flex-1 rounded-[calc(var(--radius)*0.2)] transition-[background-color,opacity] duration-500 hover:opacity-70",
                                    b === 0 ? "bg-success/60" : b === 1 ? "bg-warning" : resolved ? "bg-warning" : "bg-destructive",
                                  )}
                                />
                              }
                            />
                            <TooltipPopup>
                              {i === 59 ? (resolved ? "Today · 23 min degraded" : "Today · ongoing incident") : b ? `${60 - i} days ago · 12 min degraded` : `${60 - i} days ago · no incidents`}
                            </TooltipPopup>
                          </Tooltip>
                        ))}
                      </div>
                      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                        <span>60 days ago</span>
                        <span>Today</span>
                      </div>
                    </section>

                  </div>

                  <div className="order-first flex min-w-0 flex-col gap-4 @5xl:order-none @5xl:col-start-2 @5xl:row-start-1">
                    <section aria-label="Incident" data-rail="incidents" className="flex flex-col overflow-hidden rounded-xl border bg-card">
                      <div className="flex flex-col gap-1.5 px-3 pt-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <span
                            className={cn(
                              "flex h-5 items-center gap-1 rounded-full px-1.5 font-medium transition-colors duration-500",
                              resolved ? "bg-success/10 text-success-foreground" : "bg-warning/12 text-warning-foreground",
                            )}
                          >
                            {resolved ? <CheckIcon className="size-3" /> : <SirenIcon className="size-3" />}
                            {resolved ? "Resolved" : "Ongoing"}
                          </span>
                          <span className="font-mono text-[11px]">INC-318</span>
                          <span aria-hidden>·</span>
                          <span>SEV-2</span>
                          <span className="ms-auto tabular-nums">13:58</span>
                        </div>
                        <h2 className="text-pretty font-medium leading-snug">Webhook deliveries delayed in eu-west</h2>
                      </div>
                      <div className="mt-3 flex gap-1 px-3">
                        {(["investigating", "identified", "monitoring", "resolved"] as const).map((st) => {
                          const order = ["investigating", "identified", "monitoring", "resolved"];
                          const done = order.indexOf(st) <= order.indexOf(incidentState);
                          return (
                            <div className="flex min-w-0 flex-1 flex-col gap-1" key={st}>
                              <span className="h-1 overflow-hidden rounded-full bg-muted">
                                <motion.span
                                  animate={{ scaleX: done ? 1 : 0 }}
                                  className={cn("block h-full origin-left rounded-full", stateMeta[st].dot)}
                                  initial={false}
                                  transition={{ duration: 0.4, ease }}
                                />
                              </span>
                              <span className={cn("truncate text-[11px] transition-colors", done ? "text-foreground" : "text-muted-foreground")}>{stateMeta[st].label}</span>
                            </div>
                          );
                        })}
                      </div>
                      <ol
                        aria-live="polite"
                        className="relative mt-1 flex max-h-72 flex-col gap-3 overflow-y-auto px-3 pt-2 pb-3 [mask-image:linear-gradient(to_bottom,transparent,black_12px)] [scrollbar-width:thin]"
                        ref={timelineRef}
                      >
                        <AnimatePresence initial={false}>
                          {updates.map((u, i) => {
                            const p = person(u.by);
                            const meta = stateMeta[u.state];
                            return (
                              <motion.li
                                animate={{ opacity: 1, y: 0 }}
                                className="relative flex gap-2.5"
                                initial={{ opacity: 0, y: 8 }}
                                key={u.id}
                                transition={{ duration: 0.3, ease }}
                              >
                                {i < updates.length - 1 && <span className="absolute top-6 bottom-[-12px] left-[11px] w-px bg-border" />}
                                <span className="relative">
                                  <PersonAvatar person={p} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className={cn("size-1.5 rounded-full", meta.dot)} />
                                    <span className={cn("font-medium", meta.text)}>{meta.label}</span>
                                    <span className="text-muted-foreground">· {u.by === "maya" ? "You" : p?.name.split(" ")[0]}</span>
                                    <span className="ms-auto text-muted-foreground tabular-nums">{u.time}</span>
                                  </div>
                                  <p className="mt-0.5 text-pretty text-[13px] text-foreground/90 leading-5">{u.text}</p>
                                </div>
                              </motion.li>
                            );
                          })}
                        </AnimatePresence>
                      </ol>
                      <div className="border-t p-2">
                        <div className="flex items-center gap-1.5 rounded-lg border bg-background ps-2.5 pe-1 transition-shadow focus-within:border-ring/60 focus-within:ring-3 focus-within:ring-ring/16 dark:bg-input/32">
                          <input
                            aria-label="Post an update"
                            className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                            onChange={(e) => setNote(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") postNote();
                              if (e.key === "Escape") (e.target as HTMLInputElement).blur();
                            }}
                            placeholder="Post an update…"
                            value={note}
                          />
                          <Button aria-label="Post update" disabled={!note.trim()} onClick={postNote} size="icon-xs" variant={note.trim() ? "default" : "ghost"}>
                            <SendHorizontalIcon />
                          </Button>
                        </div>
                      </div>
                    </section>

                    <section aria-label="On-call" className="rounded-xl border bg-card p-3" data-rail="oncall">
                      <div className="flex items-center justify-between">
                        <h2 className="font-medium">On call</h2>
                        <span className="text-muted-foreground text-xs">Platform · until {onCall.until}</span>
                      </div>
                      <ul className="mt-3 flex flex-col gap-2.5">
                        {[
                          { id: onCall.primary, label: "Primary", local: "14:06 London" },
                          { id: onCall.secondary, label: "Secondary", local: "15:06 Lisbon" },
                        ].map((o) => {
                          const p = person(o.id);
                          const wasPaged = paged === o.id;
                          return (
                            <li className="flex items-center gap-2.5" key={o.id}>
                              <span className="relative">
                                <PersonAvatar person={p} size="size-8" />
                                <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-success ring-2 ring-card" />
                              </span>
                              <div className="min-w-0 flex-1 leading-tight">
                                <div className="truncate font-medium">{p?.name}</div>
                                <div className="truncate text-muted-foreground text-xs">
                                  {o.label} · {o.local}
                                </div>
                              </div>
                              <Button
                                className="transition-[box-shadow,scale] duration-150 ease-out active:scale-[0.97]"
                                disabled={wasPaged}
                                onClick={() => page(o.id)}
                                size="xs"
                                variant={o.label === "Primary" ? "outline" : "ghost"}
                              >
                                {wasPaged ? <CheckIcon /> : <BellRingIcon />}
                                {wasPaged ? "Paged" : "Page"}
                                {o.label === "Primary" && !wasPaged && <Kbd className="ms-0.5 h-4 min-w-4 text-[10px]">P</Kbd>}
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  </div>
                  <section aria-label="Recent deploys" className="min-w-0 scroll-mt-3 self-start overflow-hidden rounded-xl border bg-card @5xl:col-start-2 @5xl:row-start-2" data-rail="deploys">
                    <div className="flex h-11 items-center justify-between gap-3 border-b px-3">
                      <h2 className="font-medium">Recent deploys</h2>
                      {selected && <span className="truncate text-muted-foreground text-xs">{services.find((s) => s.id === selected)?.name}</span>}
                    </div>
                    {visibleDeploys.length === 0 ? (
                      <p className="px-3 py-6 text-center text-muted-foreground text-xs">No deploys to this service in the last 7 days.</p>
                    ) : (
                      <ul className="flex flex-col">
                        <AnimatePresence initial={false}>
                          {visibleDeploys.map((d) => {
                            return (
                              <motion.li
                                animate={{ opacity: 1, height: "auto" }}
                                className="group/li overflow-hidden"
                                exit={{ opacity: 0, height: 0 }}
                                initial={{ opacity: 0, height: 0 }}
                                key={d.id}
                                transition={{ duration: 0.25, ease }}
                              >
                                <div className="group/dep flex items-center gap-3 border-b px-3 py-2.5 transition-colors group-last/li:border-b-0 hover:bg-accent/40">
                                  <span
                                    className={cn(
                                      "flex size-6 shrink-0 items-center justify-center rounded-full border",
                                      d.status === "succeeded" && "border-success/30 text-success-foreground",
                                      d.status === "rolling" && "border-info/40 text-info-foreground",
                                      d.status === "failed" && "border-destructive/40 text-destructive-foreground",
                                      d.status === "rolled-back" && "text-muted-foreground",
                                    )}
                                  >
                                    {d.status === "rolled-back" ? <RotateCcwIcon className="size-3" /> : <GitCommitHorizontalIcon className="size-3.5" />}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className={cn("block truncate", d.status === "rolled-back" && "text-muted-foreground line-through decoration-muted-foreground/40")}>{d.message}</span>
                                    <span className="mt-0.5 flex items-center gap-1.5 text-muted-foreground text-xs">
                                      <span className="font-mono text-[11px]">{d.sha}</span>
                                      <span aria-hidden>·</span>
                                      <span className="truncate">{services.find((s) => s.id === d.service)?.name}</span>
                                      {d.status === "rolled-back" && <span className="shrink-0">· rolled back</span>}
                                      {d.status === "rolling" && <span className="shrink-0 text-info-foreground">· rolling out</span>}
                                    </span>
                                    {d.status === "rolling" && (
                                      <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted">
                                        <motion.span
                                          animate={{ scaleX: (d.progress ?? 0) / 100 }}
                                          className="block h-full origin-left rounded-full bg-info"
                                          initial={{ scaleX: 0 }}
                                          transition={{ duration: 0.45, ease: "easeOut" }}
                                        />
                                      </span>
                                    )}
                                  </span>
                                  <span className="w-12 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
                                    {d.status === "rolling" ? `${Math.round(d.progress ?? 0)}%` : d.time}
                                  </span>
                                  {d.status === "succeeded" ? (
                                    <Tooltip>
                                      <TooltipTrigger
                                        render={
                                          <Button aria-label={`Roll back ${d.sha}`} className="text-muted-foreground hover:text-foreground" onClick={() => rollback(d)} size="icon-xs" variant="ghost" />
                                        }
                                      >
                                        <RotateCcwIcon />
                                      </TooltipTrigger>
                                      <TooltipPopup>Roll back</TooltipPopup>
                                    </Tooltip>
                                  ) : (
                                    <span aria-hidden className="size-7 shrink-0 sm:size-6" />
                                  )}
                                </div>
                              </motion.li>
                            );
                          })}
                        </AnimatePresence>
                      </ul>
                    )}
                  </section>
                </div>
              )}
            </div>

            <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4">
              <AnimatePresence mode="popLayout">
                {toast && (
                  <motion.div
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="pointer-events-auto flex h-9 items-center gap-2 rounded-full border bg-popover ps-4 pe-1.5 text-sm shadow-lg/10"
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    key={toast.key}
                    transition={{ duration: 0.2, ease }}
                  >
                    {toast.text}
                    <Button aria-label="Dismiss" className="rounded-full" onClick={() => setToast(null)} size="icon-xs" variant="ghost">
                      <XIcon />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}
