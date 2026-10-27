"use client";

import { ArrowRight, CirclePlay, RotateCcw } from "lucide-react";
import { animate, motion, useInView, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import {
  Fragment,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

const headlineType =
  "font-heading font-semibold text-[42px] leading-[0.98] tracking-[-0.045em] sm:text-6xl sm:leading-[0.98] lg:text-[88px] lg:leading-[0.95]";

const gravity = 3400;
const wordGap = 0.085;
const swell = 0.14;
const neck = 0.36;
const formFor = 0.84;
const fall = [0.11, 0, 0.5, 0] as const;
const settle = [0.2, 0.8, 0.4, 1] as const;
const stretch = [0.45, 0, 0.55, 1] as const;
const pressSpring = { stiffness: 650, damping: 22, mass: 1 };

type Phase = "waiting" | "clearing" | "pouring" | "settled";
type WordState = "wet" | "set";

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Action {
  label: string;
  href: string;
}

function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function offsetWithin(element: HTMLElement, root: HTMLElement): Box {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = element;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, width: element.offsetWidth, height: element.offsetHeight };
}

function gooMatrix(slope: number, offset: number) {
  return `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${slope} ${offset}`;
}

function at(start: number, total: number, time: number) {
  return Math.min(Math.max((time - start) / total, 0), 1);
}

function Drip({
  x,
  start,
  land,
  landY,
  radius,
  bead,
}: {
  x: number;
  start: number;
  land: number;
  landY: number;
  radius: number;
  bead: number;
}) {
  const hang = bead * 0.15;
  const neckY = hang + bead + radius * 1.4;
  const total = land + 0.24 - start;
  const times = [0, at(start, total, start + swell), at(start, total, start + neck), at(start, total, land), at(start, total, land + 0.08), 1];
  const tailTotal = land + 0.14 - start;
  const tailTimes = [0, at(start, tailTotal, start + swell), at(start, tailTotal, start + neck + 0.02), at(start, tailTotal, land + 0.05), 1];
  const tail = radius * 0.5;
  return (
    <>
      <motion.span
        animate={{ y: [-bead * 1.05, hang, hang, hang + bead * 0.12, -bead * 1.1], scaleY: [1, 1, 1.14, 0.84, 1] }}
        className="absolute rounded-full bg-(--liquid)"
        initial={{ y: -bead * 1.05, scaleY: 1 }}
        style={{ left: x - bead, top: -bead, width: bead * 2, height: bead * 2, originY: 0 }}
        transition={{ delay: start, duration: 0.8, times: [0, 0.2, 0.48, 0.56, 1], ease: ["easeOut", stretch, "easeIn", settle] }}
      />
      <motion.span
        animate={{
          y: [hang, hang, neckY, landY, landY + radius * 0.4, landY + radius * 0.4],
          scaleX: [0.9, 0.9, 0.86, 0.84, 1.6, 0.4],
          scaleY: [1, 1, 1.28, 1.3, 0.5, 0.3],
          opacity: [0, 1, 1, 1, 1, 0],
        }}
        className="absolute rounded-full bg-(--liquid)"
        initial={{ y: hang, scaleX: 0.9, scaleY: 1, opacity: 0 }}
        style={{ left: x - radius, top: -radius, width: radius * 2, height: radius * 2 }}
        transition={{ delay: start, duration: total, times, ease: ["linear", stretch, fall, settle, "easeIn"] }}
      />
      <motion.span
        animate={{ y: [hang, hang, neckY - radius * 1.25, landY, landY], scale: [1, 1, 1, 1, 0.3], opacity: [0, 1, 1, 1, 0] }}
        className="absolute rounded-full bg-(--liquid)"
        initial={{ y: hang, scale: 1, opacity: 0 }}
        style={{ left: x - tail, top: -tail, width: tail * 2, height: tail * 2 }}
        transition={{ delay: start, duration: tailTotal, times: tailTimes, ease: ["linear", stretch, fall, "easeIn"] }}
      />
    </>
  );
}

function Splash({
  x,
  y,
  land,
  radius,
  reach,
  rise,
  floor,
}: {
  x: number;
  y: number;
  land: number;
  radius: number;
  reach: number[];
  rise: number;
  floor: number;
}) {
  const puddle = { width: radius * 3.4, height: radius * 1.5 };
  return (
    <>
      <motion.span
        animate={{ scaleX: [0.4, 0.45, 1.3, 1.6], scaleY: [1, 1, 0.7, 0.2], opacity: [0, 1, 1, 0] }}
        className="absolute rounded-full bg-(--liquid)"
        initial={{ scaleX: 0.4, scaleY: 1, opacity: 0 }}
        style={{ left: x - puddle.width / 2, top: y + radius * 0.4 - puddle.height / 2, ...puddle }}
        transition={{ delay: land - 0.01, duration: 0.42, times: [0, 0.03, 0.4, 1], ease: ["linear", "easeOut", "easeIn"] }}
      />
      {reach.map((to) => {
        const size = radius * 0.55;
        return (
          <motion.span
            animate={{
              x: [0, (to - x) * 0.55, to - x],
              y: [0, -rise, floor - y],
              scale: [0.6, 1, 0.35],
              opacity: [0, 1, 1, 0],
            }}
            className="absolute rounded-full bg-(--liquid)"
            initial={{ x: 0, y: 0, scale: 0.6, opacity: 0 }}
            key={to}
            style={{ left: x - size, top: y - size, width: size * 2, height: size * 2 }}
            transition={{
              delay: land + 0.01,
              duration: 0.46,
              times: [0, 0.42, 1],
              ease: [settle, fall],
              x: { delay: land + 0.01, duration: 0.46, ease: "linear" },
              opacity: { delay: land + 0.01, duration: 0.46, times: [0, 0.04, 0.8, 1], ease: "linear" },
            }}
          />
        );
      })}
    </>
  );
}

function PouringWord({
  word,
  box,
  em,
  delay,
  onFormed,
  typeClass,
}: {
  word: string;
  box: Box;
  em: number;
  delay: number;
  onFormed: () => void;
  typeClass: string;
}) {
  const filterId = `pour-word-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);
  const matrixRef = useRef<SVGFEColorMatrixElement>(null);
  const formed = useRef(onFormed);
  formed.current = onFormed;

  const radius = Math.max(em * 0.1, 4.5);
  const bead = radius * 1.35;
  const goo = radius * 0.6;
  const padX = Math.max(em * 0.6, radius * 6);
  const { x, y, width, height } = box;
  const landY = y + height * 0.58;
  const floor = y + height * 0.5;
  const spots = word.length > 5 ? [0.3, 0.72] : [0.5];
  const drops = spots.map((spot, index) => {
    const start = delay + index * 0.07;
    const from = bead * 1.15 + radius * 1.4;
    return {
      x: padX + width * spot,
      start,
      land: start + neck + Math.sqrt((2 * Math.max(landY - from, 1)) / gravity),
    };
  });
  const landed = drops[0].land;
  const clampX = (value: number) => Math.min(Math.max(value, padX + radius), padX + width - radius);

  useEffect(() => {
    const controls = animate(0, 1, {
      delay: landed + 0.12,
      duration: 0.7,
      ease: [0.5, 0, 0.2, 1],
      onUpdate: (progress) => {
        const fade = Math.max(0, (progress - 0.6) / 0.4);
        blurRef.current?.setAttribute("stdDeviation", String(goo * (1 - progress)));
        matrixRef.current?.setAttribute("values", gooMatrix(20 - 19 * fade, -9 * (1 - fade)));
      },
    });
    const timer = setTimeout(() => formed.current(), (landed + formFor) * 1000);
    return () => {
      controls.stop();
      clearTimeout(timer);
    };
  }, [goo, landed]);

  return (
    <span
      className="absolute block"
      style={{ left: x - padX, top: 0, width: width + padX * 2, height: y + height + em * 0.3, filter: `url(#${filterId})` }}
    >
      <svg className="absolute size-0">
        <filter colorInterpolationFilters="sRGB" height="100%" id={filterId} width="100%" x="0" y="0">
          <feGaussianBlur in="SourceGraphic" ref={blurRef} stdDeviation={goo} />
          <feColorMatrix ref={matrixRef} type="matrix" values={gooMatrix(20, -9)} />
        </filter>
      </svg>
      {drops.map((drop) => (
        <Drip bead={bead} key={drop.x} land={drop.land} landY={landY} radius={radius} start={drop.start} x={drop.x} />
      ))}
      <motion.span
        animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
        className={cn(typeClass, "absolute block whitespace-nowrap text-(--liquid)")}
        initial={{ opacity: 0, scaleX: 0.16, scaleY: 0.1 }}
        style={{ left: padX, top: y, originX: spots[0], originY: 0.78 }}
        transition={{
          opacity: { delay: landed - 0.02, duration: 0.12 },
          scaleX: { delay: landed, type: "spring", stiffness: 170, damping: 19 },
          scaleY: { delay: landed + 0.05, type: "spring", stiffness: 240, damping: 13 },
        }}
      >
        {word}
      </motion.span>
      {drops.map((drop) => (
        <Splash
          floor={floor}
          key={drop.x}
          land={drop.land}
          radius={radius}
          reach={[clampX(drop.x - em * 0.34), clampX(drop.x + em * 0.3)]}
          rise={em * 0.3}
          x={drop.x}
          y={landY}
        />
      ))}
    </span>
  );
}

interface Droplet {
  id: number;
  x: number;
}

function SplashDrop({
  from,
  to,
  rise,
  radius,
  duration,
  onLand,
}: {
  from: number;
  to: number;
  rise: number;
  radius: number;
  duration: number;
  onLand?: () => void;
}) {
  const sunk = radius + 2;
  return (
    <motion.span
      animate={{ x: [from, (from + to) / 2, to], y: [sunk, -rise, sunk], scaleY: [1.25, 1, 1.2] }}
      className="absolute top-0 left-0 rounded-full bg-(--liquid) transition-colors duration-150"
      initial={{ x: from, y: sunk, scaleY: 1.25 }}
      onAnimationComplete={onLand}
      style={{ width: radius * 2, height: radius * 2, marginLeft: -radius, marginTop: -radius }}
      transition={{
        duration,
        times: [0, 0.46, 1],
        ease: [settle, fall],
        x: { duration, ease: "linear" },
      }}
    />
  );
}

function PourButton({ href, children, reduce }: { href: string; children: ReactNode; reduce: boolean }) {
  const filterId = `pour-button-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const bodyRef = useRef<HTMLSpanElement>(null);
  const [pressed, setPressed] = useState(false);
  const [droplets, setDroplets] = useState<Droplet[]>([]);
  const nextId = useRef(0);
  const holding = useRef(false);
  const where = useRef(0.5);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scaleX = useSpring(1, pressSpring);
  const squash = useSpring(1, pressSpring);
  const ripple = useMotionValue(1);
  const scaleY = useTransform(() => squash.get() * ripple.get());
  const originX = useMotionValue(0.5);

  useEffect(() => () => clearTimeout(tapTimer.current), []);

  const squeeze = (fraction: number) => {
    setPressed(true);
    where.current = Math.min(Math.max(fraction, 0.22), 0.78);
    originX.set(where.current);
    if (reduce) return;
    scaleX.set(1.045);
    squash.set(0.84);
  };

  const letGo = (splash: boolean) => {
    setPressed(false);
    scaleX.set(1);
    squash.set(1);
    if (reduce || !splash) return;
    const width = bodyRef.current?.offsetWidth ?? 0;
    const id = nextId.current++;
    setDroplets((current) => [...current.slice(-2), { id, x: where.current * width }]);
  };

  const land = (id: number) => {
    setDroplets((current) => current.filter((droplet) => droplet.id !== id));
    animate(ripple, [1, 0.95, 1.015, 1], { duration: 0.32, ease: "easeOut" });
  };

  const fractionOf = (event: PointerEvent<HTMLAnchorElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return rect.width ? (event.clientX - rect.left) / rect.width : 0.5;
  };

  const room = { x: 30, top: 44, bottom: 10 };
  const width = bodyRef.current?.offsetWidth ?? 0;
  const edge = 22;
  const clamp = (value: number) => (width ? Math.min(Math.max(value, edge), width - edge) : value);

  return (
    <a
      className="group/pour relative isolate inline-flex h-12 shrink-0 cursor-pointer touch-manipulation select-none items-center justify-center rounded-full px-6 font-medium text-lime-950 text-sm outline-none [-webkit-tap-highlight-color:transparent] hover:[--liquid:var(--color-lime-400)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:hover:[--liquid:var(--color-lime-300)]"
      data-pressed={pressed ? "" : undefined}
      href={href}
      onBlur={() => {
        if (holding.current) {
          holding.current = false;
          letGo(false);
        }
      }}
      onKeyDown={(event: KeyboardEvent<HTMLAnchorElement>) => {
        if (event.key !== "Enter" || event.repeat) return;
        clearTimeout(tapTimer.current);
        squeeze(0.5);
        tapTimer.current = setTimeout(() => letGo(true), 80);
      }}
      onPointerCancel={() => {
        holding.current = false;
        letGo(false);
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        holding.current = true;
        squeeze(fractionOf(event));
      }}
      onPointerLeave={() => {
        if (!holding.current) return;
        holding.current = false;
        letGo(false);
      }}
      onPointerUp={() => {
        if (!holding.current) return;
        holding.current = false;
        letGo(true);
      }}
    >
      <svg aria-hidden className="absolute size-0">
        <filter colorInterpolationFilters="sRGB" height="100%" id={filterId} width="100%" x="0" y="0">
          <feGaussianBlur in="SourceGraphic" stdDeviation={4} />
          <feColorMatrix type="matrix" values={gooMatrix(22, -10)} />
        </filter>
      </svg>
      <span
        aria-hidden
        className="pointer-events-none absolute -z-10"
        style={{
          inset: `-${room.top}px -${room.x}px -${room.bottom}px`,
          filter: `${reduce ? "" : `url(#${filterId}) `}drop-shadow(0 1px 1px color-mix(in srgb, var(--color-black) 12%, transparent))`,
        }}
      >
        <span className="absolute" ref={bodyRef} style={{ inset: `${room.top}px ${room.x}px ${room.bottom}px` }}>
          <motion.span
            className="absolute inset-0 rounded-full bg-(--liquid) transition-colors duration-150"
            style={{ scaleX, scaleY, originX, originY: 1 }}
          />
          {droplets.map((droplet) => (
            <Fragment key={droplet.id}>
              <SplashDrop duration={0.3} from={droplet.x - 7} radius={4} rise={10} to={clamp(droplet.x - 24)} />
              <SplashDrop duration={0.3} from={droplet.x + 7} radius={4} rise={10} to={clamp(droplet.x + 24)} />
              <SplashDrop
                duration={0.4}
                from={droplet.x}
                onLand={() => land(droplet.id)}
                radius={6}
                rise={20}
                to={droplet.x + (width / 2 - droplet.x) * 0.06}
              />
            </Fragment>
          ))}
        </span>
      </span>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-full shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-white)_40%,transparent)]"
        style={{ scaleX, scaleY, originX, originY: 1 }}
      />
      <span
        className={cn(
          "relative inline-flex items-center gap-2 transition-transform duration-100 ease-out",
          !reduce && "group-data-pressed/pour:scale-[0.97]",
        )}
      >
        {children}
        <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover/pour:translate-x-0.5" />
      </span>
    </a>
  );
}

const headroom = 128;

function GooCursor({ lines, typeClass, x, y, active }: { lines: string[][]; typeClass: string; x: ReturnType<typeof useMotionValue<number>>; y: ReturnType<typeof useMotionValue<number>>; active: boolean }) {
  const filterId = `pour-cursor-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const blobX = useSpring(x, { stiffness: 380, damping: 28 });
  const blobY = useSpring(y, { stiffness: 380, damping: 28 });
  const tailX = useSpring(x, { stiffness: 120, damping: 18 });
  const tailY = useSpring(y, { stiffness: 120, damping: 18 });
  const lagX = useSpring(x, { stiffness: 60, damping: 14 });
  const lagY = useSpring(y, { stiffness: 60, damping: 14 });
  const mask = useMotionTemplate`radial-gradient(circle 8rem at ${blobX}px ${blobY}px, #000 58%, transparent 74%)`;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 transition-opacity duration-300"
      style={{ opacity: active ? 1 : 0, maskImage: mask, WebkitMaskImage: mask }}
    >
      <svg className="absolute size-0">
        <filter colorInterpolationFilters="sRGB" height="140%" id={filterId} width="140%" x="-20%" y="-20%">
          <feGaussianBlur stdDeviation="4.5" />
          <feColorMatrix type="matrix" values={gooMatrix(20, -9)} />
        </filter>
      </svg>
      <div className="absolute inset-0" style={{ filter: `url(#${filterId})` }}>
        <div className={cn(typeClass, "text-(--liquid)")}>
          {lines.map((line, index) => (
            <span className="block" key={`${index}-${line.join(" ")}`}>
              {line.join(" ")}
            </span>
          ))}
        </div>
        <motion.span className="absolute top-0 left-0 size-14 rounded-full bg-(--liquid)" style={{ x: blobX, y: blobY, translateX: "-50%", translateY: "-50%" }} />
        <motion.span className="absolute top-0 left-0 size-7 rounded-full bg-(--liquid)" style={{ x: tailX, y: tailY, translateX: "-50%", translateY: "-50%" }} />
        <motion.span className="absolute top-0 left-0 size-4 rounded-full bg-(--liquid)" style={{ x: lagX, y: lagY, translateX: "-50%", translateY: "-50%" }} />
      </div>
    </motion.div>
  );
}

export interface PourHeadlineProps {
  lines: string[];
  className?: string;
  replay?: number;
  playful?: boolean;
}

export function PourHeadline({ lines: headline, className, replay = 0, playful = false }: PourHeadlineProps) {
  const reduce = useSafeReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const inView = useInView(rootRef, { once: true, amount: 0.3 });
  const [phase, setPhase] = useState<Phase>("waiting");
  const [run, setRun] = useState(0);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [em, setEm] = useState(0);
  const [states, setStates] = useState<WordState[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const typeClass = cn(headlineType, className);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const [hovering, setHovering] = useState(false);
  const [finePointer, setFinePointer] = useState(false);
  useEffect(() => setFinePointer(window.matchMedia("(hover: hover) and (pointer: fine)").matches), []);
  const toy = playful && finePointer && !reduce;

  const lines = headline.map((line) => line.split(/\s+/).filter(Boolean));
  const words = lines.flat();
  const settledCount = states.filter((state) => state === "set").length;

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  }, []);

  const later = useCallback((callback: () => void, ms: number) => {
    timers.current.push(setTimeout(callback, ms));
  }, []);

  const pour = useCallback(() => {
    clearTimers();
    setStates([]);
    setBoxes([]);
    setRun((current) => current + 1);
    setPhase("pouring");
  }, [clearTimers]);

  const again = useRef(() => {});
  again.current = () => {
    clearTimers();
    if (phase === "settled") {
      setPhase("clearing");
      later(pour, 180);
    } else {
      pour();
    }
  };

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    if (replay > 0) again.current();
  }, [replay]);

  useEffect(() => {
    if (!reduce) return;
    clearTimers();
    setPhase("settled");
  }, [reduce, clearTimers]);

  useEffect(() => {
    if (inView && !reduce && phase === "waiting") pour();
  }, [inView, reduce, phase, pour]);

  useLayoutEffect(() => {
    if (phase !== "pouring" || run === 0) return;
    const root = rootRef.current;
    const first = wordRefs.current[0];
    if (!root || !first) return;
    setEm(Number.parseFloat(getComputedStyle(first).fontSize) || 64);
    setBoxes(
      wordRefs.current.slice(0, words.length).map((element) => {
        const box = element ? offsetWithin(element, root) : { x: 0, y: 0, width: 0, height: 0 };
        return { ...box, y: box.y + headroom };
      }),
    );
  }, [phase, run, words.length]);

  useEffect(() => {
    if (phase !== "pouring" || words.length === 0 || settledCount < words.length) return;
    const timer = setTimeout(() => setPhase("settled"), 650);
    return () => clearTimeout(timer);
  }, [phase, settledCount, words.length]);

  const mark = (index: number, state: WordState) =>
    setStates((current) => {
      const next = [...current];
      next[index] = state;
      return next;
    });

  const formWord = (index: number) => {
    mark(index, "wet");
    later(() => mark(index, "set"), 160);
  };

  const wordTone = (index: number) => {
    if (phase === "waiting") return "motion-safe:text-transparent";
    if (phase === "clearing") return undefined;
    const state = states[index];
    if (state === "set") return "text-foreground transition-colors duration-500 ease-out";
    if (state === "wet") return "text-(--liquid)";
    return "text-transparent";
  };

  let wordIndex = 0;

  return (
    <div
      className={cn("relative [--liquid:var(--color-lime-500)] dark:[--liquid:var(--color-lime-400)]", toy && phase === "settled" && "cursor-pointer")}
      onClick={toy && phase === "settled" ? () => again.current() : undefined}
      onPointerLeave={toy ? () => setHovering(false) : undefined}
      onPointerMove={
        toy
          ? (event: PointerEvent<HTMLDivElement>) => {
              const box = event.currentTarget.getBoundingClientRect();
              if (!hovering) {
                pointerX.jump(event.clientX - box.left);
                pointerY.jump(event.clientY - box.top);
              }
              pointerX.set(event.clientX - box.left);
              pointerY.set(event.clientY - box.top);
              setHovering(true);
            }
          : undefined
      }
      ref={rootRef}
    >
      <h1 className={cn(typeClass, "relative transition-opacity duration-150 ease-out", phase === "clearing" && "opacity-0")}>
        {lines.map((line, lineIndex) => (
          <span className="block" key={`${lineIndex}-${line.join(" ")}`}>
            {phase === "settled"
              ? line.join(" ")
              : line.map((word, position) => {
                  const index = wordIndex++;
                  return (
                    <Fragment key={`${index}-${word}`}>
                      {position > 0 && " "}
                      <span
                        className={cn("inline-block", wordTone(index))}
                        ref={(element) => {
                          wordRefs.current[index] = element;
                        }}
                      >
                        {word}
                      </span>
                    </Fragment>
                  );
                })}
          </span>
        ))}
      </h1>
      {toy && phase === "settled" && <GooCursor active={hovering} lines={lines} typeClass={typeClass} x={pointerX} y={pointerY} />}
      {phase === "pouring" && em > 0 && boxes.length === words.length && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0" key={run} style={{ top: -headroom }}>
          {boxes.map((box, index) =>
            states[index] ? null : (
              <PouringWord
                box={box}
                delay={index * wordGap + (((index * 37) % 7) - 3) * 0.008 + 0.03}
                em={em}
                key={`${index}-${words[index]}`}
                onFormed={() => formWord(index)}
                typeClass={typeClass}
                word={words[index]}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

export interface PourHeroProps {
  headline: string[];
  description: string;
  primaryAction: Action;
  secondaryAction?: Action;
  className?: string;
}

export function PourHero({ headline, description, primaryAction, secondaryAction, className }: PourHeroProps) {
  const reduce = useSafeReducedMotion();
  const [replays, setReplays] = useState(0);

  return (
    <section
      className={cn(
        "relative isolate w-full overflow-hidden bg-background text-foreground [--liquid:var(--color-lime-500)] dark:[--liquid:var(--color-lime-400)]",
        className,
      )}
    >
      <div className="mx-auto flex min-h-[600px] w-full max-w-[1100px] flex-col justify-center px-6 pt-32 pb-16 sm:min-h-[704px] sm:px-12 sm:pt-36 sm:pb-20">
        <PourHeadline className="max-w-[15ch] text-balance sm:max-w-none" lines={headline} replay={replays} />
        <p className="mt-6 max-w-[36rem] text-pretty text-base text-muted-foreground sm:mt-8 sm:text-lg">{description}</p>
        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-10">
          <PourButton href={primaryAction.href} reduce={reduce}>
            {primaryAction.label}
          </PourButton>
          {secondaryAction && (
            <a
              className="-mx-2 inline-flex h-10 items-center gap-2 rounded-md px-2 font-medium text-muted-foreground text-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              href={secondaryAction.href}
            >
              <CirclePlay className="size-4" />
              {secondaryAction.label}
            </a>
          )}
        </div>
      </div>
      {!reduce && (
        <button
          aria-label="Pour the headline again"
          className="absolute right-4 bottom-4 inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-medium text-muted-foreground text-xs outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:after:absolute pointer-coarse:after:-inset-1 sm:right-6 sm:bottom-6"
          onClick={() => setReplays((count) => count + 1)}
          type="button"
        >
          <RotateCcw className="size-3.5" />
          <span className="hidden sm:inline">Replay</span>
        </button>
      )}
    </section>
  );
}
