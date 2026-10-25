"use client";

import { CheckIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UnpluggedHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";
export type UnpluggedStatus = "offline" | "connecting" | "online";

const hues: Record<UnpluggedHue, string> = {
  sky: "[--hue-hi:var(--color-sky-300)] [--hue:var(--color-sky-500)] [--hue-deep:var(--color-sky-700)]",
  emerald: "[--hue-hi:var(--color-emerald-300)] [--hue:var(--color-emerald-500)] [--hue-deep:var(--color-emerald-700)]",
  amber: "[--hue-hi:var(--color-amber-300)] [--hue:var(--color-amber-500)] [--hue-deep:var(--color-amber-700)]",
  violet: "[--hue-hi:var(--color-violet-300)] [--hue:var(--color-violet-500)] [--hue-deep:var(--color-violet-700)]",
  rose: "[--hue-hi:var(--color-rose-300)] [--hue:var(--color-rose-500)] [--hue-deep:var(--color-rose-700)]",
  orange: "[--hue-hi:var(--color-orange-300)] [--hue:var(--color-orange-500)] [--hue-deep:var(--color-orange-700)]",
  indigo: "[--hue-hi:var(--color-indigo-300)] [--hue:var(--color-indigo-500)] [--hue-deep:var(--color-indigo-700)]",
  teal: "[--hue-hi:var(--color-teal-300)] [--hue:var(--color-teal-500)] [--hue-deep:var(--color-teal-700)]",
};

export interface UnpluggedProps {
  status?: UnpluggedStatus;
  onReconnect?: () => void;
  title?: string;
  description?: string;
  onlineTitle?: string;
  onlineDescription?: string;
  actionLabel?: string;
  hue?: UnpluggedHue;
  className?: string;
}

const W = 400;
const H = 170;
const CY = 80;
const FACE = 250;
const REACH = 72;

const poses = {
  offline: { x: 130, y: CY + 8, r: 9 },
  connecting: { x: FACE - REACH - 14, y: CY + 2, r: 2 },
  online: { x: FACE - REACH, y: CY, r: 0 },
};

const pill: Record<UnpluggedStatus, { label: string; dot: string }> = {
  offline: { label: "Offline", dot: "bg-destructive" },
  connecting: { label: "Reconnecting", dot: "bg-warning" },
  online: { label: "Connected", dot: "bg-success" },
};

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function Plug({ gradient }: { gradient: string }) {
  return (
    <g>
      <g className="fill-neutral-300 stroke-black/20 dark:fill-neutral-400" strokeWidth={1}>
        <rect height={6} rx={2.5} width={24} x={REACH - 6} y={-13} />
        <rect height={6} rx={2.5} width={24} x={REACH - 6} y={7} />
      </g>
      <g className="fill-white/60">
        <rect height={1.5} rx={0.75} width={16} x={REACH} y={-12} />
        <rect height={1.5} rx={0.75} width={16} x={REACH} y={8} />
      </g>
      <path className="fill-(--hue-deep)" d={`M2 -7 L24 -15 V15 L2 7 Z`} />
      <g className="stroke-black/15" strokeLinecap="round" strokeWidth={1.5}>
        <path d="M10 -8 V8" />
        <path d="M16 -10 V10" />
      </g>
      <rect fill={`url(#${gradient})`} height={42} rx={11} width={52} x={22} y={-21} />
      <rect className="fill-black/12" height={34} rx={2.5} width={6} x={REACH - 6} y={-17} />
      <rect className="fill-white/30" height={4} rx={2} width={30} x={30} y={-16} />
      <g className="stroke-white/30" strokeLinecap="round" strokeWidth={2}>
        <path d="M36 -7 V9" />
        <path d="M43 -7 V9" />
        <path d="M50 -7 V9" />
      </g>
    </g>
  );
}

export function Unplugged({
  status: statusProp,
  onReconnect,
  title = "You're offline",
  description = "Your edits are saved on this device and will sync once you're back.",
  onlineTitle = "You're back online",
  onlineDescription = "All 12 changes synced. Pick up right where you left off.",
  actionLabel = "Reconnect",
  hue = "sky",
  className,
}: UnpluggedProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const [own, setOwn] = useState<UnpluggedStatus>("offline");
  const status = statusProp ?? own;
  const [clicks, setClicks] = useState(0);
  const settled = useRef(false);

  useEffect(() => {
    if (statusProp !== undefined || own !== "connecting") return;
    const t = setTimeout(() => setOwn("online"), 1100);
    return () => clearTimeout(t);
  }, [statusProp, own]);

  const px = useMotionValue(poses.offline.x);
  const py = useMotionValue(poses.offline.y);
  const rot = useMotionValue(poses.offline.r);
  const sway = useMotionValue(0);
  const angle = useTransform(() => rot.get() + sway.get());
  const cable = useTransform(() => {
    const a = (angle.get() * Math.PI) / 180;
    const x = px.get();
    const y = py.get();
    return `M-80 ${CY + 74} C 20 ${CY + 76} ${x - 50 * Math.cos(a)} ${y - 50 * Math.sin(a)} ${x} ${y}`;
  });

  useEffect(() => {
    const pose = poses[status];
    if (reduce || !settled.current) {
      px.set(pose.x);
      py.set(pose.y);
      rot.set(pose.r);
      settled.current = true;
      return;
    }
    const spring =
      status === "online"
        ? { type: "spring" as const, stiffness: 520, damping: 34 }
        : status === "connecting"
          ? { type: "spring" as const, stiffness: 160, damping: 22 }
          : { type: "spring" as const, stiffness: 140, damping: 11, mass: 0.9 };
    const runs = [animate(px, pose.x, spring), animate(py, pose.y, spring), animate(rot, pose.r, spring)];
    if (status === "online") setClicks((c) => c + 1);
    return () => runs.forEach((r) => r.stop());
  }, [status, reduce, px, py, rot]);

  useEffect(() => {
    if (reduce || status !== "offline" || !inView) {
      const c = animate(sway, 0, { duration: 0.3, ease: "easeOut" });
      return () => c.stop();
    }
    const c = animate(sway, [0, -4, 0], { delay: 0.9, duration: 3.4, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY });
    return () => c.stop();
  }, [status, reduce, inView, sway]);

  const reconnect = () => {
    if (status !== "offline") return;
    if (statusProp === undefined) setOwn("connecting");
    onReconnect?.();
  };

  const sparking = status === "offline" && inView && !reduce;
  const online = status === "online";

  return (
    <div
      ref={root}
      className={cn(
        "relative w-full max-w-[440px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6",
        "[--cable:var(--color-neutral-700)] dark:[--cable:var(--color-neutral-500)]",
        hues[hue],
        className,
      )}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />

      <div className="relative mx-auto mb-2 flex w-fit items-center gap-1.5 rounded-full border bg-popover py-1 pr-2.5 pl-2 text-xs shadow-xs/5">
        <span className="relative flex size-2">
          {status === "connecting" && !reduce && (
            <span className="absolute inset-0 animate-ping rounded-full bg-warning opacity-60" />
          )}
          <span className={cn("relative size-2 rounded-full transition-colors duration-300", pill[status].dot)} />
        </span>
        <span aria-live="polite" className="font-medium text-foreground">
          {pill[status].label}
        </span>
      </div>

      <div
        aria-label={online ? "Cable plugged in, connected" : "Cable unplugged from its socket"}
        className="relative mx-auto aspect-[400/170] w-full max-w-[400px]"
        role="img"
      >
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id={`${uid}-plug`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--hue-hi)" />
              <stop offset="0.5" stopColor="var(--hue)" />
              <stop offset="1" stopColor="var(--hue-deep)" />
            </linearGradient>
            <radialGradient id={`${uid}-glow`}>
              <stop className="[stop-color:var(--color-emerald-400)]" offset="0" stopOpacity={0.7} />
              <stop className="[stop-color:var(--color-emerald-400)]" offset="1" stopOpacity={0} />
            </radialGradient>
          </defs>

          <path
            className="fill-none stroke-(--cable)"
            d={`M${FACE + 74} ${CY} C ${FACE + 104} ${CY} ${FACE + 108} ${CY + 60} ${FACE + 220} ${CY + 66}`}
            strokeLinecap="round"
            strokeWidth={9}
          />
          <motion.path className="fill-none stroke-(--cable)" d={cable} strokeLinecap="round" strokeWidth={9} />

          <motion.g style={{ originX: "0px", originY: "0px", rotate: angle, transformBox: "view-box", x: px, y: py }}>
            <Plug gradient={`${uid}-plug`} />
          </motion.g>

          <motion.g
            animate={clicks > 0 && !reduce ? { x: [0, 3, 0] } : { x: 0 }}
            key={`socket-${clicks}`}
            transition={{ duration: 0.22, ease: "easeOut", delay: 0.08 }}
          >
            <path className="fill-(--hue-deep)" d={`M${FACE + 52} ${CY - 15} L${FACE + 74} ${CY - 6} V${CY + 6} L${FACE + 52} ${CY + 15} Z`} />
            <g className="stroke-black/15" strokeLinecap="round" strokeWidth={1.5}>
              <path d={`M${FACE + 60} ${CY - 9} V${CY + 9}`} />
              <path d={`M${FACE + 66} ${CY - 7} V${CY + 7}`} />
            </g>
            <rect className="fill-(--hue-deep)" height={48} rx={12} width={58} x={FACE - 2} y={CY - 24} />
            <rect className="fill-white/15" height={4} rx={2} width={34} x={FACE + 10} y={CY - 19} />
            <rect className="fill-black/20" height={40} rx={3} width={7} x={FACE - 3} y={CY - 20} />
            <g className="fill-black/55">
              <rect height={8} rx={2} width={4} x={FACE - 2} y={CY - 14} />
              <rect height={8} rx={2} width={4} x={FACE - 2} y={CY + 6} />
            </g>
            <rect className="fill-black/30" height={10} rx={5} width={22} x={FACE + 18} y={CY - 5} />
            <motion.circle
              animate={{ opacity: online ? 1 : 0, scale: online ? 1 : 0.6 }}
              cx={FACE + 29}
              cy={CY}
              fill={`url(#${uid}-glow)`}
              initial={false}
              r={16}
              style={{ originX: "50%", originY: "50%" }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            />
            <circle
              className={cn(
                "transition-[fill] duration-300",
                status === "online" ? "fill-emerald-400" : status === "connecting" ? "fill-amber-400" : "fill-red-400",
              )}
              cx={FACE + 29}
              cy={CY}
              r={3}
            />
          </motion.g>

          {clicks > 0 && !reduce && (
            <motion.g
              animate={{ opacity: [0, 1, 0] }}
              className="fill-none stroke-(--hue)"
              key={`click-${clicks}`}
              strokeLinecap="round"
              strokeWidth={2.5}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.06 }}
            >
              {[-1, 1].map((side) => (
                <motion.g
                  animate={{ y: [0, side * 5] }}
                  key={side}
                  transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: 0.06 }}
                >
                  <path d={`M${FACE - 4} ${CY + side * 30} v${side * 7}`} />
                  <path d={`M${FACE - 14} ${CY + side * 27} l${-4} ${side * 6}`} />
                  <path d={`M${FACE + 6} ${CY + side * 27} l${4} ${side * 6}`} />
                </motion.g>
              ))}
            </motion.g>
          )}

          {sparking && (
            <g transform={`translate(${FACE - 16} ${CY + 6})`}>
              <motion.g
                animate={{ opacity: [0, 1, 0.2, 1, 0], scale: [0.5, 1.1, 0.8, 1, 0.6] }}
                style={{ originX: "0px", originY: "0px" }}
                transition={{ duration: 0.6, ease: "easeOut", repeat: Number.POSITIVE_INFINITY, repeatDelay: 2.2, delay: 1.2 }}
              >
                <path className="fill-amber-400" d="M0 -11 L2.4 -2.4 L11 0 L2.4 2.4 L0 11 L-2.4 2.4 L-11 0 L-2.4 -2.4 Z" />
                <circle className="fill-white" r={1.6} />
                <g className="stroke-amber-400" strokeLinecap="round" strokeWidth={1.5}>
                  <path d="M9 -10 l4 -4" />
                  <path d="M-10 -9 l-4 -4" />
                  <path d="M8 10 l4 4" />
                </g>
              </motion.g>
            </g>
          )}
        </svg>
      </div>

      <div className="relative mt-3 grid text-center [&>*]:col-start-1 [&>*]:row-start-1">
        {[
          { key: "offline", show: !online, t: title, d: description },
          { key: "online", show: online, t: onlineTitle, d: onlineDescription },
        ].map((copy) => (
          <motion.div
            animate={{ opacity: copy.show ? 1 : 0, y: copy.show || reduce ? 0 : copy.key === "online" ? 4 : -4 }}
            aria-hidden={!copy.show}
            initial={false}
            key={copy.key}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <p className="text-balance font-medium text-foreground text-sm">{copy.t}</p>
            <p className="mx-auto mt-1 max-w-[34ch] text-pretty text-muted-foreground text-xs">{copy.d}</p>
          </motion.div>
        ))}
      </div>

      <div className="relative mt-4 flex justify-center">
        <Button
          aria-disabled={status !== "offline"}
          className="min-w-32 transition-[box-shadow,transform,opacity] duration-150 ease-out active:scale-[0.97] aria-disabled:pointer-events-none aria-disabled:opacity-72"
          onClick={reconnect}
          size="sm"
          variant="outline"
        >
          {status === "online" ? (
            <CheckIcon aria-hidden className="text-success-foreground" />
          ) : status === "connecting" ? (
            <Loader2Icon aria-hidden className="animate-spin" />
          ) : (
            <RefreshCwIcon aria-hidden />
          )}
          {status === "online" ? "Connected" : status === "connecting" ? "Connecting" : actionLabel}
        </Button>
      </div>
    </div>
  );
}
