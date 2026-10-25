"use client";

import { RotateCcwIcon, SendIcon } from "lucide-react";
import {
  type AnimationPlaybackControls,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CarrierBirdHue = "sky" | "teal" | "emerald" | "violet" | "indigo" | "rose" | "amber" | "orange";

const hues: Record<CarrierBirdHue, string> = {
  sky: "[--hue:var(--color-sky-400)] [--hue-deep:var(--color-sky-600)] [--soft:var(--color-sky-100)] [--ink:var(--color-sky-950)]",
  teal: "[--hue:var(--color-teal-400)] [--hue-deep:var(--color-teal-600)] [--soft:var(--color-teal-100)] [--ink:var(--color-teal-950)]",
  emerald:
    "[--hue:var(--color-emerald-400)] [--hue-deep:var(--color-emerald-600)] [--soft:var(--color-emerald-100)] [--ink:var(--color-emerald-950)]",
  violet:
    "[--hue:var(--color-violet-400)] [--hue-deep:var(--color-violet-600)] [--soft:var(--color-violet-100)] [--ink:var(--color-violet-950)]",
  indigo:
    "[--hue:var(--color-indigo-400)] [--hue-deep:var(--color-indigo-600)] [--soft:var(--color-indigo-100)] [--ink:var(--color-indigo-950)]",
  rose: "[--hue:var(--color-rose-400)] [--hue-deep:var(--color-rose-600)] [--soft:var(--color-rose-100)] [--ink:var(--color-rose-950)]",
  amber:
    "[--hue:var(--color-amber-400)] [--hue-deep:var(--color-amber-600)] [--soft:var(--color-amber-100)] [--ink:var(--color-amber-950)]",
  orange:
    "[--hue:var(--color-orange-400)] [--hue-deep:var(--color-orange-600)] [--soft:var(--color-orange-100)] [--ink:var(--color-orange-950)]",
};

export interface CarrierBirdProps {
  recipient?: string;
  hue?: CarrierBirdHue;
  onSend?: () => void;
  className?: string;
}

type Phase = "idle" | "sending" | "sent" | "returning";

const VB = { x: 80, y: 100, w: 240, h: 116 };
const GROUND = 206;
const REACH = 40;
const ENV = { x: 220, y: 168, w: 56, h: 38 };
const TRAIL = "M188 158 C 236 146 300 96 392 4";
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function Envelope({ dx = 0 }: { dx?: number }) {
  const x = ENV.x - dx;
  return (
    <g>
      <rect className="fill-card stroke-foreground/30" height={ENV.h} rx={4} strokeWidth={1.5} width={ENV.w} x={x} y={ENV.y} />
      <path
        className="fill-none stroke-foreground/30"
        d={`M${x + 2} ${ENV.y + 2} L${x + ENV.w / 2} ${ENV.y + 22} L${x + ENV.w - 2} ${ENV.y + 2}`}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <circle className="fill-rose-400" cx={x + ENV.w / 2} cy={ENV.y + 22} r={5} />
      <circle className="fill-white/60" cx={x + ENV.w / 2 - 1.6} cy={ENV.y + 20.4} r={1.4} />
    </g>
  );
}

export function CarrierBird({ recipient = "Mira", hue = "sky", onSend, className }: CarrierBirdProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const live = inView && !reduce;
  const [phase, setPhase] = useState<Phase>("idle");
  const [carrying, setCarrying] = useState(false);
  const [flapping, setFlapping] = useState(false);

  const birdX = useMotionValue(0);
  const birdY = useMotionValue(0);
  const birdRotate = useMotionValue(0);
  const facing = useMotionValue(1);
  const squash = useMotionValue(1);
  const stretch = useTransform(squash, (s) => 1 + (1 - s) * 0.6);
  const birdOpacity = useMotionValue(1);
  const carryRotate = useMotionValue(0);
  const envY = useMotionValue(0);
  const envOpacity = useMotionValue(1);
  const trail = useMotionValue(0);
  const trailOpacity = useMotionValue(0);
  const tuck = useMotionValue(0);
  const legScale = useTransform(tuck, (t) => 1 - t);
  const shadowScale = useTransform(birdY, (y) => Math.max(0, 1 + y / 90));
  const lid = useMotionValue(1);

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

  const hop = async (toX: number, height: number, ok: () => boolean, track = run) => {
    track(animate(squash, [1, 0.86, 1], { duration: 0.14, ease: "easeOut" }));
    await wait(90);
    if (!ok()) return;
    track(animate(birdX, toX, { duration: 0.34, ease: "easeInOut" }));
    await track(animate(birdY, [0, -height, 0], { duration: 0.34, ease: ["easeOut", "easeIn"], times: [0, 0.45, 1] }));
    if (!ok()) return;
    await track(animate(squash, [1, 0.84, 1], { duration: 0.22, ease: EASE_OUT }));
  };

  useEffect(() => {
    if (!live || phase !== "idle") return;
    let alive = true;
    const own: AnimationPlaybackControls[] = [];
    const track = (c: AnimationPlaybackControls) => {
      own.push(c);
      return c;
    };
    const loop = async () => {
      await wait(700);
      while (alive) {
        const roll = Math.random();
        if (roll < 0.35) {
          await hop(birdX.get(), 14, () => alive, track);
        } else if (roll < 0.55) {
          await hop(birdX.get() > 6 ? 0 : 12, 10, () => alive, track);
          if (!alive) return;
          await hop(birdX.get(), 12, () => alive, track);
        } else if (roll < 0.72) {
          await track(animate(birdRotate, 16, { duration: 0.16, ease: "easeOut" }));
          await track(animate(birdRotate, [16, 10, 16, 0], { duration: 0.42, ease: "easeInOut" }));
        } else if (roll < 0.86) {
          await track(animate(facing, -1, { duration: 0.16, ease: "easeInOut" }));
          await wait(700 + Math.random() * 500);
          if (!alive) return;
          await track(animate(facing, 1, { duration: 0.16, ease: "easeInOut" }));
        } else {
          await track(animate(lid, [1, 0.1, 1], { duration: 0.2, times: [0, 0.4, 1] }));
        }
        if (!alive) return;
        await wait(700 + Math.random() * 1500);
      }
    };
    loop();
    return () => {
      alive = false;
      for (const c of own) c.stop();
    };
  }, [live, phase]);

  useEffect(() => {
    if (!live || phase === "sending" || phase === "returning") return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          animate(lid, [1, 0.1, 1], { duration: 0.2, times: [0, 0.4, 1] });
          schedule();
        },
        2400 + Math.random() * 3200,
      );
    };
    schedule();
    return () => clearTimeout(timer);
  }, [live, phase, lid]);

  const send = async () => {
    if (phase !== "idle") return;
    const id = ++runId.current;
    const alive = () => runId.current === id;
    for (const c of running.current) c.stop();
    running.current = [];
    setPhase("sending");
    onSend?.();

    if (reduce) {
      birdRotate.set(0);
      facing.set(1);
      run(animate(envOpacity, 0, { duration: 0.3 }));
      await run(animate(birdOpacity, 0, { duration: 0.3 }));
      if (!alive()) return;
      setPhase("sent");
      return;
    }

    run(animate(birdRotate, 0, { duration: 0.12 }));
    run(animate(facing, 1, { duration: 0.12 }));
    run(animate(birdY, 0, { duration: 0.12 }));
    await hop(REACH, 14, alive);
    if (!alive()) return;
    await run(animate(birdRotate, 16, { duration: 0.16, ease: "easeOut" }));
    if (!alive()) return;
    envOpacity.set(0);
    setCarrying(true);
    setFlapping(true);
    run(animate(tuck, 1, { duration: 0.25, ease: "easeOut" }));
    run(animate(carryRotate, 12, { duration: 0.5, ease: EASE_OUT }));
    run(animate(birdRotate, -8, { duration: 0.35, ease: "easeOut" }));
    await run(animate(birdY, -26, { duration: 0.34, ease: EASE_OUT }));
    if (!alive()) return;
    trail.set(0);
    trailOpacity.set(1);
    run(animate(trail, 1, { duration: 0.85, ease: "easeIn" }));
    run(animate(birdRotate, -18, { duration: 0.75, ease: "easeIn" }));
    run(animate(birdY, [-26, -64, -130, -240], { duration: 0.85, ease: "easeIn" }));
    await run(animate(birdX, [REACH, 110, 200, 330], { duration: 0.85, ease: "easeIn" }));
    if (!alive()) return;
    setFlapping(false);
    setPhase("sent");
    await run(animate(trailOpacity, 0, { duration: 0.8, ease: "easeOut" }));
  };

  const again = async () => {
    if (phase !== "sent") return;
    const id = ++runId.current;
    const alive = () => runId.current === id;
    for (const c of running.current) c.stop();
    running.current = [];
    setPhase("returning");
    setCarrying(false);
    trailOpacity.set(0);
    carryRotate.set(0);

    if (reduce) {
      birdX.set(0);
      birdY.set(0);
      birdRotate.set(0);
      tuck.set(0);
      envY.set(0);
      run(animate(envOpacity, 1, { duration: 0.3 }));
      await run(animate(birdOpacity, 1, { duration: 0.3 }));
      if (alive()) setPhase("idle");
      return;
    }

    envY.set(-22);
    run(animate(envOpacity, 1, { duration: 0.2 }));
    run(animate(envY, 0, { type: "spring", stiffness: 520, damping: 18 }));
    await wait(160);
    if (!alive()) return;
    setFlapping(true);
    birdRotate.set(12);
    run(animate(birdRotate, [12, 6, 0], { duration: 0.8, ease: "easeOut" }));
    run(animate(birdY, [-150, -40, -6, 0], { duration: 0.8, ease: "easeOut", times: [0, 0.55, 0.85, 1] }));
    await run(animate(birdX, [-230, -70, -8, 0], { duration: 0.8, ease: "easeOut", times: [0, 0.55, 0.85, 1] }));
    if (!alive()) return;
    setFlapping(false);
    run(animate(tuck, 0, { duration: 0.15 }));
    await run(animate(squash, [1, 0.82, 1], { duration: 0.3, ease: EASE_OUT }));
    if (alive()) setPhase("idle");
  };

  const sent = phase === "sent";

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
      <div className="relative mx-auto aspect-[60/29] w-full max-w-[380px]">
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}>
          <defs>
            <mask id={`${uid}-trail`} maskUnits="userSpaceOnUse">
              <motion.path d={TRAIL} fill="none" stroke="white" strokeWidth={8} style={{ pathLength: trail }} />
            </mask>
          </defs>

          <line className="stroke-foreground/10" strokeLinecap="round" strokeWidth={1.5} x1={92} x2={308} y1={GROUND} y2={GROUND} />

          <motion.g style={{ opacity: trailOpacity }}>
            <path
              className="fill-none stroke-(--hue)"
              d={TRAIL}
              mask={`url(#${uid}-trail)`}
              strokeDasharray="0.5 8"
              strokeLinecap="round"
              strokeWidth={3}
            />
          </motion.g>

          <motion.ellipse
            className="fill-foreground/8"
            cx={152}
            cy={GROUND + 0.5}
            rx={20}
            ry={3.5}
            style={{ opacity: birdOpacity, originX: "152px", originY: `${GROUND}px`, scale: shadowScale, transformBox: "view-box", x: birdX }}
          />
          <motion.g style={{ opacity: envOpacity }}>
            <ellipse className="fill-foreground/8" cx={ENV.x + ENV.w / 2} cy={GROUND + 0.5} rx={30} ry={3} />
            <motion.g style={{ y: envY }}>
              <Envelope />
            </motion.g>
          </motion.g>

          <motion.g
            animate={sent ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            initial={false}
            style={{ originX: "200px", originY: "150px", transformBox: "view-box" }}
            transition={{ duration: reduce ? 0.2 : 0.35, ease: EASE_OUT, delay: sent && !reduce ? 0.1 : 0 }}
          >
            <circle className="fill-success/15" cx={200} cy={150} r={38} />
            <circle className="fill-success" cx={200} cy={150} r={26} />
            <motion.path
              animate={{ pathLength: sent ? 1 : 0 }}
              className="fill-none stroke-white"
              d="M189 151 l7.5 7.5 l14 -15"
              initial={false}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={4.5}
              transition={{ duration: reduce ? 0 : 0.35, ease: "easeOut", delay: sent && !reduce ? 0.3 : 0 }}
            />
          </motion.g>

          <motion.g style={{ opacity: birdOpacity, rotate: birdRotate, x: birdX, y: birdY, originX: "152px", originY: "200px", transformBox: "view-box" }}>
            <motion.g style={{ originX: "152px", originY: `${GROUND}px`, scaleX: stretch, scaleY: squash, transformBox: "view-box" }}>
              <motion.g style={{ originX: "152px", originY: "180px", scaleX: facing, transformBox: "view-box" }}>
                <motion.g
                  className="stroke-amber-500"
                  strokeLinecap="round"
                  strokeWidth={2.5}
                  style={{ originX: "152px", originY: "196px", scaleY: legScale, transformBox: "view-box" }}
                >
                  <path className="fill-none" d="M146 196 L144 206 M140.5 206 H148" />
                  <path className="fill-none" d="M158 196 L160 206 M156 206 H163.5" />
                </motion.g>
                <path
                  className="fill-(--hue-deep) stroke-(--hue-deep)"
                  d="M134 167 L113 157 Q108 159 111 164 L120 170 L110 173 Q108 178 113 179 L134 181 Z"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                />
                <path className="fill-none stroke-(--hue-deep)" d="M151 157 q-2 -8 6 -10" strokeLinecap="round" strokeWidth={4} />
                <circle className="fill-(--hue)" cx={152} cy={178} r={23} />
                <ellipse className="fill-(--soft)" cx={159} cy={186} rx={13} ry={11.5} />
                <path className="fill-none stroke-white/40" d="M137 168 q5 -9 15 -10" strokeLinecap="round" strokeWidth={3.5} />
                <ellipse className="fill-rose-400/50" cx={166} cy={180} rx={4.2} ry={2.6} />
                <motion.g style={{ originX: "162px", originY: "171px", scaleY: lid, transformBox: "view-box" }}>
                  <ellipse className="fill-(--ink)" cx={162} cy={171} rx={3.9} ry={4.9} />
                  <circle className="fill-white" cx={160.7} cy={169.1} r={1.5} />
                </motion.g>
                <path className="fill-amber-400 stroke-amber-400" d="M173 173.5 L183 177 L173 180.5 Z" strokeLinejoin="round" strokeWidth={2} />

                {carrying && (
                  <motion.g style={{ originX: `${ENV.x - REACH + 2}px`, originY: `${ENV.y + 2}px`, rotate: carryRotate, transformBox: "view-box" }}>
                    <Envelope dx={REACH} />
                  </motion.g>
                )}

                <motion.g
                  animate={flapping && !reduce ? { rotate: [0, 70, -10, 0] } : { rotate: 0 }}
                  style={{ originX: "148px", originY: "176px", transformBox: "view-box" }}
                  transition={flapping && !reduce ? { duration: 0.22, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY } : { duration: 0.2 }}
                >
                  <path
                    className="fill-(--hue-deep)"
                    d="M148 173 C 137 172 128 182 131 193 C 137 198 151 191 153 181 C 154 176 152 173 148 173 Z"
                  />
                </motion.g>
              </motion.g>
            </motion.g>
          </motion.g>
        </svg>
      </div>

      <div className="relative mt-3 flex flex-col items-center gap-3 text-center">
        <div aria-live="polite">
          <p className="text-balance font-medium text-foreground text-sm">
            {sent ? `Sent to ${recipient}` : phase === "sending" ? "Sending…" : `Note to ${recipient}`}
          </p>
          <p className="mx-auto mt-1 min-h-8 max-w-[34ch] text-pretty text-muted-foreground text-xs">
            {sent ? "It's on its way. We'll let you know when they reply." : "Sealed and ready. The bird will take it from here."}
          </p>
        </div>
        {sent ? (
          <Button className="min-w-32 active:scale-[0.97]" onClick={again} size="sm" variant="outline">
            <RotateCcwIcon />
            Send another
          </Button>
        ) : (
          <Button className="min-w-32 active:scale-[0.97]" disabled={phase !== "idle"} onClick={send} size="sm">
            <SendIcon />
            Send
          </Button>
        )}
      </div>
    </div>
  );
}
