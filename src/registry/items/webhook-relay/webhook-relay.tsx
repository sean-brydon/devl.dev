"use client";

import { type LucideIcon, MailIcon, ServerIcon, TruckIcon, WalletIcon, WebhookIcon } from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  type MotionValue,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type WebhookRelayHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";

const hues: Record<WebhookRelayHue, string> = {
  sky: "[--hue-hi:var(--color-sky-400)] [--hue:var(--color-sky-500)] [--hue-deep:var(--color-sky-700)]",
  emerald: "[--hue-hi:var(--color-emerald-400)] [--hue:var(--color-emerald-500)] [--hue-deep:var(--color-emerald-700)]",
  amber: "[--hue-hi:var(--color-amber-400)] [--hue:var(--color-amber-500)] [--hue-deep:var(--color-amber-700)]",
  violet: "[--hue-hi:var(--color-violet-400)] [--hue:var(--color-violet-500)] [--hue-deep:var(--color-violet-700)]",
  rose: "[--hue-hi:var(--color-rose-400)] [--hue:var(--color-rose-500)] [--hue-deep:var(--color-rose-700)]",
  orange: "[--hue-hi:var(--color-orange-400)] [--hue:var(--color-orange-500)] [--hue-deep:var(--color-orange-700)]",
  indigo: "[--hue-hi:var(--color-indigo-400)] [--hue:var(--color-indigo-500)] [--hue-deep:var(--color-indigo-700)]",
  teal: "[--hue-hi:var(--color-teal-400)] [--hue:var(--color-teal-500)] [--hue-deep:var(--color-teal-700)]",
};

export interface WebhookEndpoint {
  name: string;
  path: string;
  icon?: LucideIcon;
}

export interface WebhookRelayProps {
  source?: string;
  event?: string;
  endpoints?: [WebhookEndpoint, WebhookEndpoint, WebhookEndpoint];
  failing?: 0 | 1 | 2;
  title?: string;
  description?: string;
  hue?: WebhookRelayHue;
  className?: string;
}

type Pt = [number, number];
type State = "idle" | "pending" | "ok" | "fail";

const W = 400;
const H = 200;
const MID = 100;
const SRC: Pt = [44, MID];
const RELAY: Pt = [150, MID];
const ENDS: Pt[] = [
  [326, 34],
  [326, MID],
  [326, 166],
];
const NODE = 40;
const HUB = 50;
const LOOP = 10.4;
const RESET = 9.7;
const SETTLED = 8.6;

const SEND = [1.2, 1.26, 1.32];
const TRAVEL = 0.8;
const BOUNCE = 0.42;
const BACKOFF = [1, 2];

const defaults: [WebhookEndpoint, WebhookEndpoint, WebhookEndpoint] = [
  { name: "Fulfilment", path: "POST /hooks/orders", icon: TruckIcon },
  { name: "Ledger", path: "POST /v2/events", icon: WalletIcon },
  { name: "Email worker", path: "POST /notify", icon: MailIcon },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeInOut = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2);
const easeOut = (v: number) => 1 - (1 - v) ** 3;

function wire(i: number): [Pt, Pt, Pt, Pt] {
  const end = ENDS[i];
  const from: Pt = [RELAY[0] + HUB / 2, MID];
  const to: Pt = [end[0] - NODE / 2, end[1]];
  return [from, [from[0] + 70, MID], [to[0] - 70, end[1]], to];
}

function bezier([a, b, c, d]: [Pt, Pt, Pt, Pt], t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  ];
}

function retryTimeline() {
  const arrive1 = SEND[1] + TRAVEL;
  const wait1 = arrive1 + BOUNCE;
  const send2 = wait1 + BACKOFF[0];
  const arrive2 = send2 + TRAVEL;
  const wait2 = arrive2 + BOUNCE;
  const send3 = wait2 + BACKOFF[1];
  const arrive3 = send3 + TRAVEL;
  return { arrive1, wait1, send2, arrive2, wait2, send3, arrive3 };
}

const T = retryTimeline();

function failingProgress(t: number, start: number) {
  const shift = start - SEND[1];
  const s = t - shift;
  if (s < SEND[1]) return { p: 0, show: 0 };
  if (s < T.arrive1) return { p: easeInOut(seg(s, SEND[1], T.arrive1)), show: 1 };
  if (s < T.wait1) return { p: 1 - easeOut(seg(s, T.arrive1, T.wait1)), show: 1 - seg(s, T.wait1 - 0.08, T.wait1) };
  if (s < T.send2) return { p: 0, show: 0 };
  if (s < T.arrive2) return { p: easeInOut(seg(s, T.send2, T.arrive2)), show: 1 };
  if (s < T.wait2) return { p: 1 - easeOut(seg(s, T.arrive2, T.wait2)), show: 1 - seg(s, T.wait2 - 0.08, T.wait2) };
  if (s < T.send3) return { p: 0, show: 0 };
  if (s < T.arrive3) return { p: easeInOut(seg(s, T.send3, T.arrive3)), show: 1 };
  return { p: 1, show: 1 - seg(s, T.arrive3, T.arrive3 + 0.18) };
}

function snapshot(t: number, failing: number) {
  if (t >= RESET || t < 0.15) return { signed: false, ends: ["idle", "idle", "idle"] as State[], retry: 0, delivered: 0 };
  const ends = [0, 1, 2].map((i): State => {
    const arrive = SEND[i] + TRAVEL;
    if (i !== failing) return t >= arrive ? "ok" : t >= SEND[i] ? "pending" : "idle";
    const s = t - (SEND[i] - SEND[1]);
    if (s >= T.arrive3) return "ok";
    if (s >= T.send3) return "pending";
    if (s >= T.arrive2) return "fail";
    if (s >= T.send2) return "pending";
    if (s >= T.arrive1) return "fail";
    if (s >= SEND[1]) return "pending";
    return "idle";
  });
  const s = t - (SEND[failing] - SEND[1]);
  const retry = s >= T.wait1 && s < T.send2 ? 1 : s >= T.wait2 && s < T.send3 ? 2 : 0;
  return { signed: t >= 0.95, ends, retry, delivered: ends.filter((e) => e === "ok").length };
}

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function Packet({ x, y, opacity, signed }: { x: MotionValue<number>; y: MotionValue<number>; opacity: MotionValue<number>; signed: boolean }) {
  return (
    <motion.g style={{ opacity, x, y }}>
      <rect className={signed ? "fill-(--hue)" : "fill-foreground/45"} height={11} rx={3} width={15} x={-7.5} y={-5.5} />
      <path className="fill-none stroke-white/80" d="M-5 -3 L0 0.8 L5 -3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} />
      {signed && <circle className="fill-amber-300 stroke-card" cx={6.5} cy={4.5} r={2.6} strokeWidth={1} />}
    </motion.g>
  );
}

function useTravel(clock: MotionValue<number>, path: (t: number) => { p: number; show: number }, curve: [Pt, Pt, Pt, Pt]) {
  const x = useTransform(clock, (t) => bezier(curve, path(t).p)[0]);
  const y = useTransform(clock, (t) => bezier(curve, path(t).p)[1]);
  const opacity = useTransform(clock, (t) => path(t).show);
  return { x, y, opacity };
}

export function WebhookRelay({
  source = "orders-api",
  event = "order.paid",
  endpoints = defaults,
  failing = 1,
  title = "Every event, delivered",
  description = "Signed at the relay, retried with backoff, and logged until each endpoint answers 200.",
  hue = "indigo",
  className,
}: WebhookRelayProps) {
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const [hovered, setHovered] = useState<number | null>(null);
  const running = inView && hovered === null && !reduce;
  const live = useRef(running);
  live.current = running;

  const clock = useMotionValue(0);
  useAnimationFrame((_, delta) => {
    if (!live.current) return;
    clock.set((clock.get() + Math.min(delta, 64) / 1000) % LOOP);
  });

  useEffect(() => {
    if (reduce) clock.set(SETTLED);
  }, [reduce, clock]);

  const [snap, setSnap] = useState(() => snapshot(0, failing));
  const key = useRef("");
  useMotionValueEvent(clock, "change", (t) => {
    const next = snapshot(t, failing);
    const k = JSON.stringify(next);
    if (k === key.current) return;
    key.current = k;
    setSnap(next);
  });

  const inbound = useTravel(
    clock,
    (t) => ({ p: easeInOut(seg(t, 0.2, 0.9)), show: t < 0.2 ? 0 : 1 - seg(t, 0.86, 0.96) }),
    [[SRC[0] + NODE / 2, MID], [SRC[0] + 50, MID], [RELAY[0] - 50, MID], [RELAY[0] - HUB / 2, MID]],
  );
  const fan = [0, 1, 2].map((i) =>
    i === failing
      ? (t: number) => failingProgress(t, SEND[i])
      : (t: number) => {
          const a = SEND[i];
          return { p: easeInOut(seg(t, a, a + TRAVEL)), show: t < a ? 0 : 1 - seg(t, a + TRAVEL, a + TRAVEL + 0.18) };
        },
  );
  const p0 = useTravel(clock, fan[0], wire(0));
  const p1 = useTravel(clock, fan[1], wire(1));
  const p2 = useTravel(clock, fan[2], wire(2));
  const outbound = [p0, p1, p2];

  const s = (t: number) => t - (SEND[failing] - SEND[1]);
  const ring = useTransform(clock, (t) => {
    const v = s(t);
    if (v >= T.wait1 && v < T.send2) return seg(v, T.wait1, T.send2);
    if (v >= T.wait2 && v < T.send3) return seg(v, T.wait2, T.send3);
    return 0;
  });

  const hubPulse = useMotionValue(1);
  useEffect(() => {
    if (!snap.signed || reduce) return;
    const c = animate(hubPulse, [1, 1.08, 1], { duration: 0.36, ease: [0.23, 1, 0.32, 1] });
    return () => c.stop();
  }, [snap.signed, reduce, hubPulse]);

  const retryWire = wire(failing);
  const retryAt = bezier(retryWire, 0.66);

  const labels = [
    { name: source, detail: `emits ${event}`, at: SRC, size: NODE, align: "start" as const },
    { name: "Relay", detail: `HMAC-signed · backoff ${BACKOFF.join("s, ")}s`, at: RELAY, size: HUB, align: "center" as const },
    ...endpoints.map((e, i) => ({
      name: e.name,
      detail: `${e.path} · ${snap.ends[i] === "ok" ? "200" : snap.ends[i] === "fail" ? "500" : snap.ends[i] === "pending" ? "sending" : "waiting"}`,
      at: ENDS[i],
      size: NODE,
      align: "end" as const,
    })),
  ];

  return (
    <div
      ref={root}
      className={cn("relative w-full max-w-[460px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6", hues[hue], className)}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />

      <div className="relative mx-auto mb-3 flex w-fit items-center gap-1.5 rounded-full border bg-popover py-1 pr-2.5 pl-2 text-xs shadow-xs/5">
        <WebhookIcon aria-hidden className="size-3.5 text-muted-foreground" />
        <span className="font-medium font-mono text-foreground">{event}</span>
        <span className="text-muted-foreground tabular-nums">· {snap.delivered}/3 delivered</span>
      </div>

      <div className="relative mx-auto aspect-[400/200] w-full max-w-[400px]">
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${W} ${H}`}>
          <g className="fill-none stroke-foreground/15" strokeLinecap="round" strokeWidth={2}>
            <path d={`M${SRC[0] + NODE / 2} ${MID} H${RELAY[0] - HUB / 2}`} />
            {[0, 1, 2].map((i) => {
              const [a, b, c, d] = wire(i);
              return (
                <path
                  className={cn(
                    "transition-[stroke] duration-300",
                    snap.ends[i] === "fail" && "stroke-red-500/45",
                    snap.ends[i] === "ok" && "stroke-emerald-500/45",
                  )}
                  d={`M${a[0]} ${a[1]} C${b[0]} ${b[1]} ${c[0]} ${c[1]} ${d[0]} ${d[1]}`}
                  key={i}
                />
              );
            })}
          </g>

          <Packet {...inbound} signed={false} />
          {outbound.map((p, i) => (
            <Packet key={i} {...p} signed />
          ))}

          <g transform={`translate(${SRC[0]} ${SRC[1]})`}>
            <rect className="fill-card stroke-foreground/15" height={NODE} rx={12} width={NODE} x={-NODE / 2} y={-NODE / 2} />
            <ServerIcon className="text-foreground/70" height={18} width={18} x={-9} y={-9} />
          </g>

          <motion.g style={{ originX: `${RELAY[0]}px`, originY: `${MID}px`, scale: hubPulse, transformBox: "view-box" }}>
            <rect className="fill-(--hue)" height={HUB} rx={15} width={HUB} x={RELAY[0] - HUB / 2} y={MID - HUB / 2} />
            <rect className="fill-white/20" height={3} rx={1.5} width={HUB - 24} x={RELAY[0] - HUB / 2 + 12} y={MID - HUB / 2 + 5} />
            <WebhookIcon className="text-white" height={22} width={22} x={RELAY[0] - 11} y={MID - 11} />
            <motion.g
              animate={{ opacity: snap.signed ? 1 : 0, scale: snap.signed || reduce ? 1 : 0.6 }}
              initial={false}
              style={{ originX: `${RELAY[0] + 19}px`, originY: `${MID - 19}px`, transformBox: "view-box" }}
              transition={reduce ? { duration: 0.15 } : snap.signed ? { type: "spring", stiffness: 520, damping: 24 } : { duration: 0.2 }}
            >
              <circle className="fill-amber-300 stroke-card" cx={RELAY[0] + 19} cy={MID - 19} r={7} strokeWidth={2} />
              <path
                className="fill-none stroke-amber-900"
                d={`M${RELAY[0] + 16} ${MID - 19} l2 2 l3.5 -3.8`}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.6}
              />
            </motion.g>
          </motion.g>

          {ENDS.map((at, i) => {
            const state = snap.ends[i];
            const Icon = endpoints[i].icon ?? ServerIcon;
            return (
              <g key={i}>
                <motion.g
                  animate={state === "fail" && !reduce ? { x: [0, -3, 3, -2, 0] } : { x: 0 }}
                  key={state === "fail" ? `shake-${i}-${snap.retry}` : `still-${i}`}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                >
                  <rect
                    className={cn(
                      "fill-card stroke-foreground/15 transition-[stroke,fill] duration-300",
                      state === "ok" && "fill-emerald-500/10 stroke-emerald-500",
                      state === "fail" && "fill-red-500/10 stroke-red-500",
                    )}
                    height={NODE}
                    rx={12}
                    strokeWidth={state === "ok" || state === "fail" ? 1.5 : 1}
                    width={NODE}
                    x={at[0] - NODE / 2}
                    y={at[1] - NODE / 2}
                  />
                  <Icon className="text-foreground/70" height={18} width={18} x={at[0] - 9} y={at[1] - 9} />
                </motion.g>
                <text
                  className={cn(
                    "font-medium font-mono tabular-nums transition-[fill,opacity] duration-300",
                    state === "ok" ? "fill-emerald-600 dark:fill-emerald-400" : "fill-red-600 dark:fill-red-400",
                    state === "ok" || state === "fail" ? "opacity-100" : "opacity-0",
                  )}
                  dominantBaseline="central"
                  fontSize={11}
                  x={at[0] + NODE / 2 + 6}
                  y={at[1]}
                >
                  {state === "ok" ? "200" : "500"}
                </text>
              </g>
            );
          })}

          <AnimatePresence>
            {snap.retry > 0 && (
              <motion.g
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reduce ? 1 : 0.95 }}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.95 }}
                key={snap.retry}
                style={{ originX: `${retryAt[0]}px`, originY: `${retryAt[1]}px`, transformBox: "view-box" }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              >
                <rect className="fill-popover stroke-foreground/15" height={22} rx={11} width={80} x={retryAt[0] - 40} y={retryAt[1] - 11} />
                <circle className="fill-none stroke-foreground/15" cx={retryAt[0] - 28} cy={retryAt[1]} r={5} strokeWidth={2} />
                <motion.circle
                  className="fill-none stroke-amber-500"
                  cx={retryAt[0] - 28}
                  cy={retryAt[1]}
                  r={5}
                  strokeLinecap="round"
                  strokeWidth={2}
                  style={{ pathLength: ring, rotate: -90, originX: "50%", originY: "50%" }}
                />
                <text className="fill-foreground font-medium tabular-nums" dominantBaseline="central" fontSize={10.5} x={retryAt[0] - 19} y={retryAt[1] + 0.5}>
                  retry in {BACKOFF[snap.retry - 1]}s
                </text>
              </motion.g>
            )}
          </AnimatePresence>
        </svg>

        {labels.map((l, i) => {
          const open = hovered === i;
          const below = i === 2;
          return (
            <button
              aria-label={`${l.name}: ${l.detail}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-default rounded-[30%] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              key={l.name}
              onBlur={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(i)}
              onPointerLeave={() => setHovered((h) => (h === i ? null : h))}
              style={{ height: `${(l.size / H) * 100}%`, left: `${(l.at[0] / W) * 100}%`, top: `${(l.at[1] / H) * 100}%`, width: `${(l.size / W) * 100}%` }}
              type="button"
            >
              <AnimatePresence>
                {open && (
                  <motion.span
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "pointer-events-none absolute z-10 flex flex-col items-start whitespace-nowrap rounded-lg border bg-popover px-2 py-1 text-left shadow-xs/5",
                      below ? "top-full mt-1.5" : "bottom-full mb-1.5",
                      l.align === "start" && "left-0 origin-bottom-left",
                      l.align === "center" && "left-1/2 -translate-x-1/2 origin-bottom",
                      l.align === "end" && (below ? "right-0 origin-top-right" : "right-0 origin-bottom-right"),
                    )}
                    exit={{ opacity: 0, scale: 0.97 }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <span className="font-medium text-foreground text-xs">{l.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{l.detail}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      <div className="relative mt-3 text-center">
        <p className="text-balance font-medium text-foreground text-sm">{title}</p>
        <p className="mx-auto mt-1 max-w-[36ch] text-pretty text-muted-foreground text-xs">{description}</p>
      </div>
    </div>
  );
}
