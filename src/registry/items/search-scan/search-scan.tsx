"use client";

import { SearchIcon } from "lucide-react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SearchScanHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";

const hues: Record<SearchScanHue, string> = {
  sky: "[--hue:var(--color-sky-500)] [--hue-deep:var(--color-sky-700)]",
  emerald: "[--hue:var(--color-emerald-500)] [--hue-deep:var(--color-emerald-700)]",
  amber: "[--hue:var(--color-amber-500)] [--hue-deep:var(--color-amber-700)]",
  violet: "[--hue:var(--color-violet-500)] [--hue-deep:var(--color-violet-700)]",
  rose: "[--hue:var(--color-rose-500)] [--hue-deep:var(--color-rose-700)]",
  orange: "[--hue:var(--color-orange-500)] [--hue-deep:var(--color-orange-700)]",
  indigo: "[--hue:var(--color-indigo-500)] [--hue-deep:var(--color-indigo-700)]",
  teal: "[--hue:var(--color-teal-500)] [--hue-deep:var(--color-teal-700)]",
};

export interface SearchScanProps {
  query?: string;
  title?: string;
  description?: string;
  hue?: SearchScanHue;
  className?: string;
}

const W = 400;
const H = 250;
const PAGE = { x: 116, y: 22, w: 168, h: 212 };
const LENS_R = 32;
const ZOOM = 1.65;

const rows = [
  [34, 22, 40, 28, 18],
  [26, 44, 20, 36, 16],
  [40, 18, 30, 24, 32],
  [22, 36, 28, 42],
  [30, 20, 38, 26, 22],
  [44, 24, 18, 34],
  [20, 32, 26, 30, 24],
  [36, 28, 40],
];
const ROW_Y0 = PAGE.y + 56;
const ROW_GAP = 17;
const LEFT = PAGE.x + 16;
const GAP = 5;

const matches: [number, number][] = [
  [4, 2],
  [6, 3],
];

function wordBox(row: number, word: number) {
  const x = LEFT + rows[row].slice(0, word).reduce((n, w) => n + w + GAP, 0);
  return { x, y: ROW_Y0 + row * ROW_GAP - 3, w: rows[row][word], h: 6 };
}

function Page({ match, found, query }: { match: [number, number]; found: boolean; query: string }) {
  const box = wordBox(...match);
  const glow = Math.max(box.w, query.length * 3.9) + 8;
  const cx = box.x + box.w / 2;
  return (
    <g>
      <rect className="fill-card stroke-foreground/12" height={PAGE.h} rx={10} strokeWidth={1} width={PAGE.w} x={PAGE.x} y={PAGE.y} />
      <rect className="fill-foreground/70" height={8} rx={4} width={72} x={LEFT} y={PAGE.y + 18} />
      <rect className="fill-foreground/20" height={5} rx={2.5} width={46} x={LEFT} y={PAGE.y + 33} />
      {rows.map((words, r) =>
        words.map((w, i) => {
          const b = wordBox(r, i);
          const hit = r === match[0] && i === match[1];
          return (
            <rect
              className={cn("fill-foreground/15 transition-opacity duration-200", hit && found && "opacity-0")}
              height={b.h}
              key={`${r}-${i}`}
              rx={3}
              width={w}
              x={b.x}
              y={b.y}
            />
          );
        }),
      )}
      <motion.rect
        animate={{ opacity: found ? 1 : 0, scaleX: found ? 1 : 0.4 }}
        className="fill-amber-200 dark:fill-amber-300"
        height={14}
        initial={false}
        rx={4}
        style={{ originX: "50%" }}
        transition={{ duration: found ? 0.35 : 0.25, ease: [0.23, 1, 0.32, 1] }}
        width={glow}
        x={cx - glow / 2}
        y={box.y - 4}
      />
      <motion.text
        animate={{ opacity: found ? 1 : 0 }}
        className="fill-amber-900 font-semibold"
        dominantBaseline="central"
        fontSize={6.8}
        initial={false}
        textAnchor="middle"
        transition={{ duration: 0.2, delay: found ? 0.12 : 0 }}
        x={cx}
        y={box.y + 3}
      >
        {query}
      </motion.text>
    </g>
  );
}

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export function SearchScan({
  query = "roadmap",
  title = "Search across every doc",
  description = "Type a word and we'll find it in your notes, specs and files.",
  hue = "sky",
  className,
}: SearchScanProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const [round, setRound] = useState(0);
  const [found, setFound] = useState(false);
  const [typed, setTyped] = useState(0);
  const match = matches[round % matches.length];
  const target = wordBox(...match);

  const lx = useMotionValue(PAGE.x + 52);
  const ly = useMotionValue(ROW_Y0 + 10);
  const mx = useTransform(lx, (v) => v * (1 - ZOOM));
  const my = useTransform(ly, (v) => v * (1 - ZOOM));
  const lensScale = useMotionValue(1);

  useEffect(() => {
    if (reduce) {
      lx.set(target.x + target.w / 2);
      ly.set(target.y + 3);
      setTyped(query.length);
      setFound(true);
      return;
    }
    if (!inView) return;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stops: { stop: () => void }[] = [];
    const wait = (ms: number) => new Promise<void>((r) => timers.push(setTimeout(r, ms)));
    const glide = async (x: number, y: number, duration: number) => {
      const a = animate(lx, x, { duration, ease: [0.45, 0, 0.25, 1] });
      const b = animate(ly, y, { duration, ease: [0.45, 0, 0.25, 1] });
      stops.push(a, b);
      await Promise.all([a, b]);
    };

    (async () => {
      setFound(false);
      setTyped(0);
      for (let i = 1; i <= query.length; i++) {
        await wait(70);
        if (!alive) return;
        setTyped(i);
      }
      await wait(250);
      const right = PAGE.x + PAGE.w - 40;
      const left = PAGE.x + 44;
      const sweep = round % 2 === 0
        ? [[right, ROW_Y0 + 8], [right, ROW_Y0 + 42], [left, ROW_Y0 + 42], [left, ROW_Y0 + 74]]
        : [[right, ROW_Y0 + 10], [left, ROW_Y0 + 40], [right, ROW_Y0 + 76], [left, ROW_Y0 + 96]];
      for (const [x, y] of sweep) {
        await glide(x, y, 0.62);
        if (!alive) return;
      }
      await glide(target.x + target.w / 2, target.y + 3, 0.7);
      if (!alive) return;
      setFound(true);
      stops.push(animate(lensScale, [1, 1.08, 1], { duration: 0.42, ease: [0.23, 1, 0.32, 1] }));
      await wait(2400);
      if (!alive) return;
      setFound(false);
      await glide(PAGE.x + 52, ROW_Y0 + 10, 0.8);
      await wait(700);
      if (alive) setRound((r) => r + 1);
    })();

    return () => {
      alive = false;
      for (const t of timers) clearTimeout(t);
      for (const s of stops) s.stop();
    };
  }, [round, reduce, inView, query.length, lx, ly, lensScale, target.x, target.y, target.w]);

  return (
    <div
      ref={root}
      className={cn(
        "relative w-full max-w-[440px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6",
        hues[hue],
        className,
      )}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />
      <div className="relative mx-auto mb-1 flex w-fit items-center gap-1.5 rounded-full border bg-popover py-1 pr-2.5 pl-2 text-xs shadow-xs/5">
        <SearchIcon aria-hidden className="size-3.5 text-muted-foreground" />
        <span className="inline-block min-w-[7ch] font-medium text-foreground">
          {query.slice(0, typed)}
          {typed < query.length && <span className="ml-px inline-block h-3 w-px translate-y-0.5 animate-caret-blink bg-foreground" />}
        </span>
        <motion.span
          animate={{ opacity: found ? 1 : 0, filter: found ? "blur(0px)" : "blur(2px)" }}
          className="whitespace-nowrap text-muted-foreground tabular-nums"
          initial={false}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        >
          · 1 match
        </motion.span>
      </div>
      <div className="relative mx-auto aspect-[400/232] w-full max-w-[400px]">
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`0 12 ${W} ${H - 18}`}>
          <defs>
            <clipPath id={`${uid}-lens`}>
              <motion.circle cx={lx} cy={ly} r={LENS_R - 3} />
            </clipPath>
          </defs>

          <rect className="fill-card stroke-foreground/10" height={PAGE.h - 16} rx={10} transform={`rotate(-6 ${PAGE.x + 40} ${PAGE.y + PAGE.h})`} width={PAGE.w - 10} x={PAGE.x - 10} y={PAGE.y + 14} />
          <rect className="fill-card stroke-foreground/10" height={PAGE.h - 8} rx={10} transform={`rotate(4 ${PAGE.x + PAGE.w} ${PAGE.y + PAGE.h})`} width={PAGE.w - 6} x={PAGE.x + 16} y={PAGE.y + 8} />
          <Page found={found} match={match} query={query} />

          <g clipPath={`url(#${uid}-lens)`}>
            <motion.circle className="fill-card" cx={lx} cy={ly} r={LENS_R} />
            <motion.g style={{ x: mx, y: my }}>
              <g transform={`scale(${ZOOM})`}>
                <Page found={found} match={match} query={query} />
              </g>
            </motion.g>
            <motion.circle className="fill-(--hue)" cx={lx} cy={ly} opacity={0.06} r={LENS_R} />
          </g>

          <motion.g style={{ x: lx, y: ly }}>
            <motion.g style={{ scale: lensScale }}>
              <circle fill="none" r={64} />
              <rect className="fill-(--hue-deep)" height={11} rx={5.5} transform="rotate(45)" width={32} x={LENS_R - 1} y={-5.5} />
              <rect className="fill-white/20" height={3} rx={1.5} transform="rotate(45)" width={22} x={LENS_R + 5} y={-3.5} />
              <circle className="fill-none stroke-black/10" cx={0} cy={2} r={LENS_R} strokeWidth={6} />
              <circle className="fill-none stroke-(--hue)" cx={0} cy={0} r={LENS_R} strokeWidth={6} />
              <path className="fill-none stroke-white/45" d={`M${-LENS_R + 9} -6 A ${LENS_R - 9} ${LENS_R - 9} 0 0 1 -6 ${-LENS_R + 9}`} strokeLinecap="round" strokeWidth={3} />
            </motion.g>
          </motion.g>
        </svg>

      </div>

      <div className="relative mt-3 text-center">
        <p className="text-balance font-medium text-foreground text-sm">{title}</p>
        <p className="mx-auto mt-1 max-w-[30ch] text-pretty text-muted-foreground text-xs">{description}</p>
      </div>
    </div>
  );
}
