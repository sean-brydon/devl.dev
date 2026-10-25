"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type CardStackHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";

const hues: Record<CardStackHue, string> = {
  sky: "from-sky-400 via-sky-500 to-blue-700",
  emerald: "from-emerald-400 via-emerald-500 to-teal-700",
  amber: "from-amber-300 via-amber-500 to-orange-600",
  violet: "from-violet-400 via-violet-500 to-indigo-700",
  rose: "from-rose-400 via-rose-500 to-pink-700",
  orange: "from-orange-400 via-orange-500 to-red-600",
  indigo: "from-indigo-400 via-indigo-600 to-violet-900",
  teal: "from-teal-300 via-teal-500 to-cyan-700",
};

export interface PaymentCard {
  issuer: string;
  type?: string;
  last4: string;
  holder: string;
  expires: string;
  hue?: CardStackHue;
  cvc?: string;
}

export interface CardStackProps {
  cards: PaymentCard[];
  autoPlay?: boolean;
  className?: string;
}

const spring = { type: "spring", stiffness: 260, damping: 26 } as const;
const flipSpring = { type: "spring", stiffness: 180, damping: 22 } as const;

function Contactless({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M8.5 8.5a5 5 0 0 1 0 7" />
      <path d="M12 6a8.5 8.5 0 0 1 0 12" />
      <path d="M15.5 3.5a12 12 0 0 1 0 17" />
    </svg>
  );
}

function NetworkMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 40 24">
      <rect fill="white" fillOpacity={0.9} height={14} rx={3.5} transform="rotate(45 13 12)" width={14} x={6} y={5} />
      <rect fill="white" fillOpacity={0.55} height={14} rx={3.5} transform="rotate(45 27 12)" width={14} x={20} y={5} />
    </svg>
  );
}

function Chip() {
  return (
    <div className="relative h-[15cqw] w-[19cqw] overflow-hidden rounded-[2.6cqw] bg-linear-to-br from-amber-100 via-amber-300 to-amber-500 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]">
      <div className="absolute inset-y-0 left-1/3 w-px bg-black/20" />
      <div className="absolute inset-y-0 right-1/3 w-px bg-black/20" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-black/20" />
      <div className="absolute top-1/2 left-1/2 h-[45%] w-[30%] -translate-1/2 rounded-[1cqw] border border-black/20" />
    </div>
  );
}

function Front({ card }: { card: PaymentCard }) {
  return (
    <div className="flex size-full flex-col justify-between p-[6.5cqw] text-white">
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-[2cqw]">
          <span className="font-semibold text-[6.4cqw] tracking-tight">{card.issuer}</span>
          {card.type && <span className="text-[4.2cqw] text-white/70">{card.type}</span>}
        </div>
        <Contactless className="size-[8cqw] text-white/80" />
      </div>
      <Chip />
      <div className="flex flex-col gap-[2.5cqw]">
        <div className="font-mono text-[5.6cqw] tracking-[0.08em] text-white/95 tabular-nums">
          <span className="text-white/60">•••• •••• ••••</span> {card.last4}
        </div>
        <div className="flex items-end justify-between">
          <div className="flex gap-[6cqw] text-[3.8cqw]">
            <span className="flex flex-col">
              <span className="text-[2.8cqw] text-white/60 uppercase tracking-wider">Card holder</span>
              <span className="font-medium">{card.holder}</span>
            </span>
            <span className="flex flex-col">
              <span className="text-[2.8cqw] text-white/60 uppercase tracking-wider">Expires</span>
              <span className="font-medium tabular-nums">{card.expires}</span>
            </span>
          </div>
          <NetworkMark className="h-[7.5cqw] w-[12.5cqw]" />
        </div>
      </div>
    </div>
  );
}

function Back({ card }: { card: PaymentCard }) {
  return (
    <div className="flex size-full flex-col text-white">
      <div className="mt-[8cqw] h-[13cqw] bg-black/75" />
      <div className="flex items-center gap-[3cqw] px-[6.5cqw] pt-[5cqw]">
        <div className="h-[10cqw] flex-1 rounded-[1.5cqw] bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.95)_0_3px,rgb(255_255_255/0.8)_3px_6px)]" />
        <div className="flex h-[10cqw] items-center rounded-[1.5cqw] bg-white px-[2.5cqw] font-mono text-[4.4cqw] text-black/80 italic tabular-nums">
          {card.cvc ?? "000"}
        </div>
      </div>
      <div className="mt-auto flex items-end justify-between gap-[4cqw] px-[6.5cqw] pb-[6cqw]">
        <p className="text-[3.4cqw] text-white/65">Issued by {card.issuer}</p>
        <div className="size-[11cqw] rounded-[2cqw] bg-linear-to-br from-sky-200 via-violet-200 to-amber-100 opacity-80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.4)]" />
      </div>
    </div>
  );
}

function Surface({ hue, children }: { hue: CardStackHue; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden rounded-[5.5cqw] bg-linear-to-br shadow-[inset_0_1px_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.08)] [backface-visibility:hidden]",
        hues[hue],
      )}
    >
      <div aria-hidden className="absolute -top-1/2 -right-1/4 size-[90cqw] rounded-full bg-white/10" />
      <div aria-hidden className="absolute -bottom-3/4 -left-1/3 size-[90cqw] rounded-full bg-black/10" />
      <div className="relative size-full">{children}</div>
    </div>
  );
}

function placement(rank: number, count: number, fanned: boolean, lifted: boolean) {
  if (rank === 0 && lifted) return { x: "0%", y: "-74%", rotate: 0, scale: 1 };
  if (!fanned) return { x: "0%", y: `${-rank * 23}%`, rotate: 0, scale: 1 - rank * 0.03 };
  if (rank === 0) return { x: "0%", y: "-46%", rotate: 0, scale: 1 };
  const side = count === 2 ? 1 : rank === 1 ? -1 : 1;
  return { x: `${side * 30}%`, y: "-38%", rotate: side * 10, scale: 0.94 };
}

function Wallet() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-[17%] bottom-[5%] z-10 h-[41%] rounded-[18px] bg-linear-to-b from-stone-600 to-stone-800 shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_18px_30px_-14px_rgb(0_0_0/0.5)] ring-1 ring-black/10 [mask-image:radial-gradient(circle_at_50%_0,transparent_22px,black_22.5px)] dark:ring-white/10"
    >
      <div className="absolute inset-2.5 rounded-[11px] border border-white/25 border-dashed [mask-image:radial-gradient(circle_at_50%_-10px,transparent_29px,black_29.5px)]" />
      <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-[18px] bg-linear-to-b from-white/10 to-transparent" />
    </div>
  );
}

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export function CardStack({ cards, autoPlay = true, className }: CardStackProps) {
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const list = cards.slice(0, 3);
  const [order, setOrder] = useState(() => list.map((_, i) => i));
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [auto, setAuto] = useState({ fan: false, flip: false });
  const [touched, setTouched] = useState(false);

  const user = hovered || focused || pinned || touched;
  const fanned = user ? hovered || focused || pinned : auto.fan;
  const showBack = user ? flipped : auto.flip;

  useEffect(() => {
    if (!autoPlay || user || reduce || !inView) {
      setAuto({ fan: false, flip: false });
      return;
    }
    const steps: [number, { fan: boolean; flip: boolean }][] = [
      [1600, { fan: true, flip: false }],
      [1100, { fan: true, flip: true }],
      [2600, { fan: true, flip: false }],
      [1000, { fan: false, flip: false }],
    ];
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      const [ms, state] = steps[i % steps.length];
      t = setTimeout(() => {
        setAuto(state);
        i++;
        next();
      }, i % steps.length === 0 && i > 0 ? ms + 2400 : ms);
    };
    next();
    return () => clearTimeout(t);
  }, [autoPlay, user, reduce, inView]);

  return (
    <div
      ref={root}
      className={cn(
        "relative w-full max-w-[460px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6",
        className,
      )}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />
      <div
        aria-label="Payment cards"
        className="relative mx-auto aspect-[4/3] w-full max-w-[400px]"
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
        onFocus={(e) => e.target.matches(":focus-visible") && setFocused(true)}
        onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
        onPointerLeave={(e) => {
          if (e.pointerType !== "mouse") return;
          setHovered(false);
          setFlipped(false);
        }}
        role="group"
      >
        <motion.div
          animate={{ scaleX: fanned ? 1.5 : 1, opacity: fanned ? 0.7 : 1 }}
          aria-hidden
          className="absolute bottom-[3%] left-1/2 h-6 w-1/2 -translate-x-1/2 rounded-[50%] bg-foreground/10 blur-xl"
          initial={false}
          transition={spring}
        />
        {list.map((card, i) => {
          const rank = order.indexOf(i);
          const isFront = rank === 0;
          const place = placement(rank, list.length, fanned, isFront && showBack);
          const hue = card.hue ?? (["violet", "emerald", "orange"] as const)[i];
          return (
            <motion.div
              animate={place}
              className="absolute top-[38%] left-1/2 -ml-[27%] aspect-[1.586] w-[54%] [perspective:1000px]"
              initial={false}
              key={card.last4}
              style={{ zIndex: list.length - rank, originY: 1 }}
              transition={reduce ? { duration: 0 } : spring}
            >
              <motion.button
                animate={{ rotateY: isFront && showBack ? 180 : 0 }}
                aria-label={
                  isFront
                    ? `${card.issuer} card ending ${card.last4}: show ${showBack ? "front" : "back"}`
                    : `Bring ${card.issuer} card ending ${card.last4} to the front`
                }
                className="@container relative size-full cursor-pointer rounded-[5.5cqw] text-left shadow-[0_14px_30px_-12px_rgb(0_0_0/0.45),0_2px_6px_-2px_rgb(0_0_0/0.2)] outline-none [transform-style:preserve-3d] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                initial={false}
                onClick={() => {
                  setTouched(true);
                  if (!fanned && !hovered) {
                    setPinned(true);
                    return;
                  }
                  if (isFront) setFlipped((f) => !f);
                  else {
                    setFlipped(false);
                    setOrder((o) => [i, ...o.filter((x) => x !== i)]);
                  }
                }}
                transition={reduce ? { duration: 0 } : flipSpring}
                type="button"
                whileTap={{ scale: 0.98 }}
              >
                <Surface hue={hue}>
                  <Front card={card} />
                </Surface>
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <Surface hue={hue}>
                    <Back card={card} />
                  </Surface>
                </div>
              </motion.button>
            </motion.div>
          );
        })}
        <Wallet />
      </div>
    </div>
  );
}
