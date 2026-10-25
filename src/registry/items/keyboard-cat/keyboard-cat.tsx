"use client";

import {
  type AnimationPlaybackControls,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type KeyboardCatHue = "orange" | "amber" | "rose" | "violet" | "sky" | "teal" | "emerald" | "indigo";

const hues: Record<KeyboardCatHue, string> = {
  orange:
    "[--hue-hi:var(--color-orange-300)] [--hue:var(--color-orange-400)] [--hue-deep:var(--color-orange-600)] [--soft:var(--color-orange-100)] [--ink:var(--color-orange-950)]",
  amber:
    "[--hue-hi:var(--color-amber-300)] [--hue:var(--color-amber-400)] [--hue-deep:var(--color-amber-600)] [--soft:var(--color-amber-100)] [--ink:var(--color-amber-950)]",
  rose: "[--hue-hi:var(--color-rose-300)] [--hue:var(--color-rose-400)] [--hue-deep:var(--color-rose-600)] [--soft:var(--color-rose-100)] [--ink:var(--color-rose-950)]",
  violet:
    "[--hue-hi:var(--color-violet-300)] [--hue:var(--color-violet-400)] [--hue-deep:var(--color-violet-600)] [--soft:var(--color-violet-100)] [--ink:var(--color-violet-950)]",
  sky: "[--hue-hi:var(--color-sky-300)] [--hue:var(--color-sky-400)] [--hue-deep:var(--color-sky-600)] [--soft:var(--color-sky-100)] [--ink:var(--color-sky-950)]",
  teal: "[--hue-hi:var(--color-teal-300)] [--hue:var(--color-teal-400)] [--hue-deep:var(--color-teal-600)] [--soft:var(--color-teal-100)] [--ink:var(--color-teal-950)]",
  emerald:
    "[--hue-hi:var(--color-emerald-300)] [--hue:var(--color-emerald-400)] [--hue-deep:var(--color-emerald-600)] [--soft:var(--color-emerald-100)] [--ink:var(--color-emerald-950)]",
  indigo:
    "[--hue-hi:var(--color-indigo-300)] [--hue:var(--color-indigo-400)] [--hue-deep:var(--color-indigo-600)] [--soft:var(--color-indigo-100)] [--ink:var(--color-indigo-950)]",
};

export interface KeyboardCatProps {
  name?: string;
  hue?: KeyboardCatHue;
  progress?: number;
  label?: string;
  doneLabel?: string;
  doneDescription?: string;
  onDone?: () => void;
  className?: string;
}

type Phase = "working" | "waking" | "gone" | "returning";
type Key = { x: number; y: number; w: number; h: number };

const VB = { x: 40, y: 14, w: 320, h: 214 };
const GAP = 3;

function deckEdges(y: number) {
  const t = (y - 150) / 56;
  return { left: 110 - 32 * t + 8, right: 290 + 32 * t - 8 };
}

function row(y: number, h: number, n: number): Key[] {
  const { left, right } = deckEdges(y + h / 2);
  const w = (right - left - GAP * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({ x: left + i * (w + GAP), y, w, h }));
}

function spaceRow(y: number, h: number): Key[] {
  const { left, right } = deckEdges(y + h / 2);
  const bar = (right - left) * 0.4;
  const side = (right - left - bar - GAP * 2) / 2;
  const w = (side - GAP * 2) / 3;
  const keys: Key[] = [];
  for (let i = 0; i < 3; i++) keys.push({ x: left + i * (w + GAP), y, w, h });
  keys.push({ x: left + side + GAP, y, w: bar, h });
  for (let i = 0; i < 3; i++) keys.push({ x: left + side + bar + GAP * 2 + i * (w + GAP), y, w, h });
  return keys;
}

const KEYS: Key[] = [...row(155, 9, 12), ...row(167, 9, 12), ...row(179, 9, 11), ...spaceRow(191, 8)];

function nearest(x: number, y: number) {
  let best = 0;
  let dist = Number.POSITIVE_INFINITY;
  KEYS.forEach((k, i) => {
    const d = Math.hypot(k.x + k.w / 2 - x, k.y + k.h / 2 - y);
    if (d < dist) {
      dist = d;
      best = i;
    }
  });
  return best;
}

const PAWS = [
  { x: 166, y: 194 },
  { x: 192, y: 195 },
];
const PAW_KEYS = PAWS.map((p) => nearest(p.x, p.y));
const OPEN_KEYS = KEYS.map((k, i) => ({ k, i }))
  .filter(({ k }) => k.x + k.w < 146 || k.x > 306)
  .map(({ i }) => i);

const LINES = [
  { w: 72, kw: 20 },
  { w: 104, kw: 26 },
  { w: 58, kw: 16 },
  { w: 92, kw: 22 },
  { w: 44, kw: 14 },
];

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export function KeyboardCat({
  name = "Mochi",
  hue = "orange",
  progress,
  label = "Installing dependencies",
  doneLabel = "All installed",
  doneDescription = "1,284 packages, no warnings.",
  onDone,
  className,
}: KeyboardCatProps) {
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const live = inView && !reduce;
  const simulated = progress === undefined;
  const [simPct, setSimPct] = useState(0);
  const pct = Math.round(Math.min(100, Math.max(0, simulated ? simPct : progress)));
  const done = pct >= 100;
  const [phase, setPhase] = useState<Phase>("working");
  const [tick, setTick] = useState({ beat: 0, lit: [] as number[] });
  const [peek, setPeek] = useState<0 | 1 | null>(null);
  const [twitch, setTwitch] = useState({ ear: 0, n: 0 });

  const bar = useMotionValue(0);
  const barSmooth = useSpring(bar, { stiffness: 140, damping: 24 });
  const barWidth = useTransform(barSmooth, (v) => Math.max(0, v) * 132);

  const catX = useMotionValue(0);
  const catY = useMotionValue(0);
  const catRotate = useMotionValue(0);
  const catOpacity = useMotionValue(1);
  const stretchX = useMotionValue(1);
  const stretchY = useMotionValue(1);

  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const lastPct = useRef(pct);
  useEffect(() => {
    if (pct < lastPct.current) barSmooth.jump(pct / 100);
    bar.set(pct / 100);
    lastPct.current = pct;
  }, [pct, bar, barSmooth]);

  useEffect(() => {
    if (!simulated || done || phase !== "working" || !inView) return;
    const timer = setInterval(() => {
      setSimPct((p) => {
        if (Math.random() < 0.12) return p;
        return Math.min(100, p + 0.6 + Math.random() * 2.6);
      });
    }, 140);
    return () => clearInterval(timer);
  }, [simulated, done, phase, inView]);

  useEffect(() => {
    if (phase !== "working" || !inView || done) {
      setTick((t) => (t.lit.length ? { beat: t.beat, lit: [] } : t));
      return;
    }
    const timer = setInterval(() => {
      setTick((t) => {
        const beat = t.beat + 1;
        const lit = [PAW_KEYS[beat % 2]];
        if (Math.random() < 0.55) lit.push(OPEN_KEYS[Math.floor(Math.random() * OPEN_KEYS.length)]);
        return { beat, lit };
      });
    }, 320);
    return () => clearInterval(timer);
  }, [phase, inView, done]);

  useEffect(() => {
    if (!live || phase !== "working") return;
    let timer: ReturnType<typeof setTimeout>;
    let peekTimer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          if (Math.random() < 0.3) {
            setPeek(Math.random() < 0.5 ? 0 : 1);
            peekTimer = setTimeout(() => setPeek(null), 1100);
          } else {
            setTwitch((t) => ({ ear: Math.random() < 0.5 ? 0 : 1, n: t.n + 1 }));
          }
          schedule();
        },
        1800 + Math.random() * 2600,
      );
    };
    schedule();
    return () => {
      clearTimeout(timer);
      clearTimeout(peekTimer);
      setPeek(null);
    };
  }, [live, phase]);

  const phaseRef = useRef<Phase>("working");
  const doneRef = useRef(done);
  const runId = useRef(0);
  const running = useRef<AnimationPlaybackControls[]>([]);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      runId.current++;
      for (const t of pending) clearTimeout(t);
      for (const c of running.current) c.stop();
    };
  }, []);

  const stage = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        timers.current.delete(t);
        resolve();
      }, ms);
      timers.current.add(t);
    });

  const run = (c: AnimationPlaybackControls) => {
    running.current.push(c);
    return c;
  };

  const leave = async () => {
    const id = ++runId.current;
    const alive = () => runId.current === id;
    running.current = [];
    stage("waking");
    await wait(reduce ? 200 : 420);
    if (!alive()) return;
    if (reduce) {
      await run(animate(catOpacity, 0, { duration: 0.4 }));
    } else {
      run(animate(catRotate, -5, { duration: 0.45, ease: [0.65, 0, 0.35, 1] }));
      run(animate(stretchX, 1.14, { duration: 0.45, ease: [0.65, 0, 0.35, 1] }));
      await run(animate(stretchY, 0.86, { duration: 0.45, ease: [0.65, 0, 0.35, 1] }));
      if (!alive()) return;
      await wait(260);
      if (!alive()) return;
      run(animate(catRotate, 0, { duration: 0.28, ease: [0.23, 1, 0.32, 1] }));
      run(animate(stretchX, 1, { duration: 0.28, ease: [0.23, 1, 0.32, 1] }));
      await run(animate(stretchY, 1, { duration: 0.28, ease: [0.23, 1, 0.32, 1] }));
      if (!alive()) return;
      run(animate(catRotate, [0, -10, 4], { duration: 0.6, ease: "easeInOut" }));
      run(animate(catY, [0, -48, -30, 40], { duration: 0.6, ease: "easeIn", times: [0, 0.4, 0.62, 1] }));
      await run(animate(catX, [0, 90, 170, 290], { duration: 0.6, ease: "linear" }));
    }
    if (!alive()) return;
    stage("gone");
    onDoneRef.current?.();
    if (!doneRef.current) comeBack();
  };

  const comeBack = async () => {
    const id = ++runId.current;
    const alive = () => runId.current === id;
    running.current = [];
    stage("returning");
    if (reduce) {
      catX.set(0);
      catY.set(0);
      catRotate.set(0);
      await run(animate(catOpacity, 1, { duration: 0.4 }));
    } else {
      catOpacity.set(1);
      run(animate(catRotate, [6, -6, 0], { duration: 0.6, ease: "easeOut" }));
      run(animate(catY, [40, -46, 0], { duration: 0.6, ease: "easeOut", times: [0, 0.5, 1] }));
      await run(animate(catX, [290, 120, 0], { duration: 0.6, ease: [0.23, 1, 0.32, 1] }));
      if (!alive()) return;
      run(animate(stretchY, [1, 0.9, 1], { duration: 0.32, ease: [0.23, 1, 0.32, 1] }));
      await run(animate(stretchX, [1, 1.06, 1], { duration: 0.32, ease: [0.23, 1, 0.32, 1] }));
      if (!alive()) return;
      await wait(450);
    }
    if (!alive()) return;
    stage("working");
    if (doneRef.current) leave();
  };

  useEffect(() => {
    doneRef.current = done;
    if (done && phaseRef.current === "working") leave();
    if (!done && phaseRef.current === "gone") comeBack();
  }, [done]);

  useEffect(() => {
    if (!simulated || phase !== "gone" || !inView) return;
    const timer = setTimeout(() => setSimPct(0), 2600);
    return () => clearTimeout(timer);
  }, [simulated, phase, inView]);

  const replay = () => {
    if (phase === "gone" && simulated) {
      setSimPct(0);
      return;
    }
    if (phase === "working") setTwitch((t) => ({ ear: t.n % 2 === 0 ? 0 : 1, n: t.n + 1 }));
  };

  const awake = phase !== "working";
  const kneading = live && phase === "working" && !done;
  const revealed = (i: number) => Math.min(1, Math.max(0, (pct / 100) * (LINES.length + 0.6) - i));
  const caretLine = Math.min(LINES.length - 1, Math.floor((pct / 100) * (LINES.length + 0.6)));
  const caretX = 134 + LINES[caretLine].w * revealed(caretLine) + 2;
  const finished = phase === "gone" || (phase === "waking" && done);

  return (
    <div
      ref={root}
      className={cn(
        "relative w-full max-w-[420px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6",
        hues[hue],
        className,
      )}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />
      <button
        aria-label={finished && simulated ? "Run it again" : `${name} is curled up on the keyboard. Give ${name} a scratch`}
        className="relative mx-auto block aspect-[160/107] w-full max-w-[380px] cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={replay}
        type="button"
      >
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}>
          <motion.ellipse
            className="fill-foreground/8"
            cx={200}
            cy={219}
            rx={130}
            ry={4}
          />
          <rect className="fill-card stroke-foreground/25" height={122} rx={10} strokeWidth={1.5} width={168} x={116} y={22} />
          <rect className="fill-foreground/[0.05]" height={104} rx={5} width={152} x={124} y={30} />
          <g className="fill-foreground/15">
            <circle cx={133} cy={38} r={2} />
            <circle cx={140} cy={38} r={2} />
            <circle cx={147} cy={38} r={2} />
          </g>

          <motion.g animate={{ opacity: finished ? 0 : 1 }} initial={false} transition={{ duration: 0.25 }}>
            {LINES.map((line, i) => {
              const f = revealed(i);
              const w = line.w * f;
              return (
                <g key={line.w}>
                  <rect className="fill-foreground/[0.07]" height={5} rx={2.5} width={line.w} x={134} y={50 + i * 11} />
                  {w > 0 && <rect className="fill-foreground/25" height={5} rx={2.5} width={Math.max(5, w)} x={134} y={50 + i * 11} />}
                  {w > 0 && (
                    <rect className="fill-(--hue)" height={5} rx={2.5} width={Math.max(5, Math.min(w, line.kw))} x={134} y={50 + i * 11} />
                  )}
                </g>
              );
            })}
            <motion.rect
              animate={live ? { opacity: [1, 1, 0, 0] } : { opacity: 1 }}
              className="fill-(--hue-deep) dark:fill-(--hue-hi)"
              height={8}
              rx={1}
              transition={live ? { duration: 1, ease: "linear", repeat: Number.POSITIVE_INFINITY, times: [0, 0.5, 0.5, 1] } : { duration: 0 }}
              width={2}
              x={caretX}
              y={48.5 + caretLine * 11}
            />
            <rect className="fill-foreground/10" height={4} rx={2} width={132} x={134} y={110} />
            <motion.rect className="fill-(--hue)" height={4} rx={2} style={{ width: barWidth }} x={134} y={110} />
          </motion.g>

          <motion.g
            animate={finished ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
            initial={false}
            style={{ originX: "200px", originY: "70px", transformBox: "view-box" }}
            transition={{ duration: reduce ? 0.2 : 0.3, ease: [0.23, 1, 0.32, 1], delay: finished ? 0.1 : 0 }}
          >
            <circle className="fill-success" cx={200} cy={70} r={17} />
            <motion.path
              animate={{ pathLength: finished ? 1 : 0 }}
              className="fill-none stroke-white"
              d="M192 70.5 l5.5 5.5 l10 -11"
              initial={false}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3.5}
              transition={{ duration: reduce ? 0 : 0.35, ease: "easeOut", delay: finished ? 0.25 : 0 }}
            />
            <rect className="fill-foreground/15" height={5} rx={2.5} width={64} x={168} y={100} />
          </motion.g>

          <rect className="fill-foreground/15" height={6} rx={3} width={180} x={110} y={144} />
          <path className="fill-card stroke-foreground/25" d="M110 150 H290 L322 206 H78 Z" strokeLinejoin="round" strokeWidth={1.5} />
          <path
            className="fill-card stroke-foreground/25"
            d="M78 206 H322 v4 a4 4 0 0 1 -4 4 H82 a4 4 0 0 1 -4 -4 Z"
            strokeLinejoin="round"
            strokeWidth={1.5}
          />

          {KEYS.map((k, i) => {
            const on = tick.lit.includes(i);
            return (
              <g key={`${k.x.toFixed(1)}-${k.y}`}>
                <rect className="fill-foreground/[0.07]" height={k.h} rx={2} width={k.w} x={k.x} y={k.y} />
                <motion.rect
                  animate={{ opacity: on ? 1 : 0 }}
                  className="fill-(--hue-hi)"
                  height={k.h + 4}
                  initial={false}
                  rx={3.5}
                  transition={{ duration: on ? 0.06 : 0.5, ease: "easeOut" }}
                  width={k.w + 4}
                  x={k.x - 2}
                  y={k.y - 2}
                />
              </g>
            );
          })}

          <motion.g style={{ opacity: catOpacity, rotate: catRotate, x: catX, y: catY, originX: "236px", originY: "196px", transformBox: "view-box" }}>
            <motion.g style={{ originX: "292px", originY: "198px", scaleX: stretchX, scaleY: stretchY, transformBox: "view-box" }}>
              <motion.g
                animate={live && !awake ? { rotate: [0, 5, -3, 0] } : { rotate: 0 }}
                style={{ originX: "282px", originY: "184px", transformBox: "view-box" }}
                transition={live && !awake ? { duration: 3.2, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY } : { duration: 0.3 }}
              >
                <path className="fill-none stroke-(--hue)" d="M280 184 C 306 192 302 212 270 211 C 256 210.5 246 208 238 205" strokeLinecap="round" strokeWidth={12} />
                <motion.path
                  animate={live && !awake ? { rotate: [0, -10, 4, 0] } : { rotate: 0 }}
                  className="fill-none stroke-(--soft)"
                  d="M250 208.5 C 245 207.5 241 206 238 205"
                  strokeLinecap="round"
                  strokeWidth={12}
                  style={{ originX: "252px", originY: "209px", transformBox: "view-box" }}
                  transition={live && !awake ? { duration: 1.6, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY, repeatDelay: 0.8 } : { duration: 0.3 }}
                />
              </motion.g>

              <motion.g
                animate={live && !awake ? { scaleY: [1, 1.035, 1] } : { scaleY: 1 }}
                style={{ originX: "232px", originY: "198px", transformBox: "view-box" }}
                transition={live && !awake ? { duration: 3, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY } : { duration: 0.3 }}
              >
                <ellipse className="fill-(--hue)" cx={236} cy={174} rx={56} ry={26} />
                <ellipse className="fill-(--hue)" cx={268} cy={182} rx={24} ry={18} />
                <path className="fill-none stroke-white/30" d="M214 154 q16 -8 34 -6" strokeLinecap="round" strokeWidth={4} />
                <g className="fill-none stroke-(--hue-deep)" strokeLinecap="round" strokeWidth={4}>
                  <path d="M232 149 q3 7 0 13" />
                  <path d="M247 150 q3 7 0 12" />
                  <path d="M262 154 q2.5 6 0 11" />
                </g>
              </motion.g>

              <motion.g
                animate={awake ? { y: -6, rotate: -4 } : { y: 0, rotate: 0 }}
                style={{ originX: "180px", originY: "184px", transformBox: "view-box" }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 22 }}
              >
                {[0, 1].map((ear) => (
                  <motion.g
                    animate={
                      awake
                        ? { rotate: 0, scaleY: 1.08 }
                        : twitch.n > 0 && twitch.ear === ear && !reduce
                          ? { rotate: [0, ear ? 16 : -16, 0, ear ? 9 : -9, 0], scaleY: 1 }
                          : { rotate: 0, scaleY: 1 }
                    }
                    key={`${ear}-${twitch.ear === ear ? twitch.n : 0}`}
                    style={{
                      originX: ear ? "194px" : "166px",
                      originY: "150px",
                      transformBox: "view-box",
                    }}
                    transition={{ duration: 0.42, ease: "easeOut" }}
                  >
                    <path
                      className="fill-(--hue) stroke-(--hue)"
                      d={ear ? "M184 146 L202 124 L206 152 Z" : "M154 152 L158 124 L176 146 Z"}
                      strokeLinejoin="round"
                      strokeWidth={5}
                    />
                    <path className="fill-rose-300" d={ear ? "M190 145 L200 132 L202 148 Z" : "M159 148 L161 132 L171 145 Z"} />
                  </motion.g>
                ))}
                <ellipse className="fill-(--hue)" cx={180} cy={164} rx={31} ry={25} />
                <ellipse className="fill-(--soft)" cx={180} cy={176} rx={14} ry={9} />
                <g className="fill-rose-400/45">
                  <ellipse cx={162} cy={172} rx={5} ry={3} />
                  <ellipse cx={198} cy={172} rx={5} ry={3} />
                </g>
                {[0, 1].map((eye) => {
                  const cx = eye ? 190 : 170;
                  const open = awake || peek === eye;
                  return (
                    <g key={eye}>
                      <motion.g animate={{ opacity: open ? 0 : 1 }} initial={false} transition={{ duration: 0.12 }}>
                        <path className="fill-none stroke-(--ink)" d={`M${cx - 6} 163 q6 5 12 0`} strokeLinecap="round" strokeWidth={2.6} />
                      </motion.g>
                      <motion.g
                        animate={{ opacity: open ? 1 : 0, scaleY: open ? 1 : 0.3 }}
                        initial={false}
                        style={{ originX: `${cx}px`, originY: "164px", transformBox: "view-box" }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                      >
                        <ellipse className="fill-(--ink)" cx={cx} cy={164} rx={3.8} ry={4.8} />
                        <circle className="fill-white" cx={cx - 1.3} cy={162.2} r={1.4} />
                      </motion.g>
                    </g>
                  );
                })}
                <path className="fill-rose-400" d="M177.5 172 h5 l-2.5 3 Z" strokeLinejoin="round" />
                <path className="fill-none stroke-(--ink)" d="M180 175 q-2 3.2 -5 1.6 M180 175 q2 3.2 5 1.6" strokeLinecap="round" strokeWidth={1.3} />
                <g className="stroke-(--ink)/30" strokeLinecap="round" strokeWidth={1.1}>
                  <line x1={166} x2={146} y1={176} y2={173} />
                  <line x1={166} x2={147} y1={179} y2={181} />
                  <line x1={194} x2={214} y1={176} y2={173} />
                  <line x1={194} x2={213} y1={179} y2={181} />
                </g>
              </motion.g>

              {PAWS.map((paw, i) => (
                <motion.g
                  animate={{ y: kneading && tick.beat % 2 === i ? 2.5 : 0 }}
                  initial={false}
                  key={paw.x}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <ellipse className="fill-(--soft)" cx={paw.x} cy={paw.y} rx={9} ry={5.5} />
                  <path className="fill-none stroke-(--hue)/70" d={`M${paw.x - 3} ${paw.y + 1} v3 M${paw.x + 3} ${paw.y + 1} v3`} strokeLinecap="round" strokeWidth={1.4} />
                </motion.g>
              ))}
            </motion.g>
          </motion.g>
        </svg>
      </button>

      <div className="relative mt-3 text-center" aria-live="polite">
        <p className="text-balance font-medium text-foreground text-sm">{finished ? doneLabel : label}</p>
        <p className="mx-auto mt-1 max-w-[34ch] text-pretty text-muted-foreground text-xs">
          {finished ? (
            doneDescription
          ) : (
            <>
              <span className="font-medium text-foreground tabular-nums">{pct}%</span> · {name} is keeping the keys warm
            </>
          )}
        </p>
      </div>
    </div>
  );
}
