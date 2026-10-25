"use client";

import { ChevronRightIcon, FlameIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

export type FrameKind = "agent" | "llm" | "tool";
export type FlameLens = "time" | "tokens" | "cost";

export interface FlameFrame {
  id: string;
  name: string;
  kind: FrameKind;
  ms: number;
  tokens?: number;
  cost?: number;
  detail?: string;
  children?: FlameFrame[];
}

export interface FlameProfileProps {
  root: FlameFrame;
  title?: string;
  defaultLens?: FlameLens;
  currency?: string;
  className?: string;
}

interface Placed {
  frame: FlameFrame;
  depth: number;
  x0: number;
  x1: number;
  path: FlameFrame[];
}

const ROW = 28;
const GAP = 2;
const spring = { type: "spring", stiffness: 300, damping: 34, mass: 0.9 } as const;

const kinds: Record<FrameKind, { label: string; frame: string; dot: string }> = {
  agent: {
    label: "Agent",
    frame: "bg-emerald-500/14 text-emerald-900 hover:bg-emerald-500/24 dark:bg-emerald-400/14 dark:text-emerald-100 dark:hover:bg-emerald-400/24",
    dot: "bg-emerald-500 dark:bg-emerald-400",
  },
  llm: {
    label: "Model call",
    frame: "bg-violet-500/16 text-violet-900 hover:bg-violet-500/26 dark:bg-violet-400/18 dark:text-violet-100 dark:hover:bg-violet-400/28",
    dot: "bg-violet-500 dark:bg-violet-400",
  },
  tool: {
    label: "Tool",
    frame: "bg-sky-500/14 text-sky-900 hover:bg-sky-500/24 dark:bg-sky-400/14 dark:text-sky-100 dark:hover:bg-sky-400/24",
    dot: "bg-sky-500 dark:bg-sky-400",
  },
};

const lenses: { id: FlameLens; label: string }[] = [
  { id: "time", label: "Time" },
  { id: "tokens", label: "Tokens" },
  { id: "cost", label: "Cost" },
];

function totals(f: FlameFrame, memo: Map<string, { tokens: number; cost: number }>) {
  let tokens = f.tokens ?? 0;
  let cost = f.cost ?? 0;
  for (const c of f.children ?? []) {
    const t = totals(c, memo);
    tokens += t.tokens;
    cost += t.cost;
  }
  const out = { tokens, cost };
  memo.set(f.id, out);
  return out;
}

const fmtMs = (ms: number) => (ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`);
const fmtTokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : `${Math.round(n)}`);
const fmtCost = (n: number, cur: string) => `${cur}${n < 0.1 ? n.toFixed(3) : n.toFixed(2)}`;

export function FlameProfile({ root, title = "Agent run", defaultLens = "time", currency = "$", className }: FlameProfileProps) {
  const reduce = useReducedMotion();
  const [lens, setLens] = useState<FlameLens>(defaultLens);
  const [zoomId, setZoomId] = useState(root.id);
  const [hover, setHover] = useState<string | null>(null);
  const [tipOn, setTipOn] = useState(false);
  const [width, setWidth] = useState(520);
  const box = useRef<HTMLDivElement>(null);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warm = useRef(0);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  useEffect(() => () => clearTimeout(tipTimer.current), []);

  const sums = useMemo(() => {
    const memo = new Map<string, { tokens: number; cost: number }>();
    totals(root, memo);
    return memo;
  }, [root]);

  const metric = (f: FlameFrame, l: FlameLens = lens) =>
    l === "time" ? f.ms : l === "tokens" ? (sums.get(f.id)?.tokens ?? 0) : (sums.get(f.id)?.cost ?? 0);

  const placed = useMemo(() => {
    const out: Placed[] = [];
    const place = (f: FlameFrame, depth: number, x0: number, x1: number, path: FlameFrame[]) => {
      out.push({ frame: f, depth, x0, x1, path });
      const kids = f.children ?? [];
      const sum = kids.reduce((s, c) => s + metric(c), 0);
      const scale = Math.max(metric(f), sum) || 1;
      let x = x0;
      for (const c of kids) {
        const w = ((x1 - x0) * metric(c)) / scale;
        place(c, depth + 1, x, x + w, [...path, f]);
        x += w;
      }
    };
    place(root, 0, 0, 1, []);
    return out;
  }, [root, lens, sums]);

  const zoom = placed.find((p) => p.frame.id === zoomId) ?? placed[0];
  const span = zoom.x1 - zoom.x0 || 1;
  const view = (p: Placed) => {
    const a = Math.min(Math.max((p.x0 - zoom.x0) / span, 0), 1);
    const b = Math.min(Math.max((p.x1 - zoom.x0) / span, 0), 1);
    const inside = p.depth >= zoom.depth && (p.frame.id === zoom.frame.id || p.path.some((f) => f.id === zoom.frame.id));
    return { a, b, d: p.depth - zoom.depth, visible: inside && b - a > 0.0005 };
  };
  const rows = Math.max(...placed.filter((p) => view(p).visible).map((p) => p.depth - zoom.depth)) + 1;
  const maxRows = Math.max(...placed.map((p) => p.depth)) + 1;

  const leaves = placed.filter((p) => !p.frame.children?.length && view(p).visible);
  const hottest = leaves.reduce<Placed | null>((best, p) => (!best || metric(p.frame) > metric(best.frame) ? p : best), null);
  const hotShare = hottest ? metric(hottest.frame) / (metric(zoom.frame) || 1) : 0;

  const fmt = (n: number, l: FlameLens = lens) => (l === "time" ? fmtMs(n) : l === "tokens" ? fmtTokens(n) : fmtCost(n, currency));
  const zoomTotal = metric(zoom.frame);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  const showTip = (id: string) => {
    clearTimeout(tipTimer.current);
    setHover(id);
    if (tipOn || performance.now() - warm.current < 500) setTipOn(true);
    else tipTimer.current = setTimeout(() => setTipOn(true), 260);
  };
  const hideTip = () => {
    clearTimeout(tipTimer.current);
    if (tipOn) warm.current = performance.now();
    setTipOn(false);
    setHover(null);
  };

  const zoomTo = (id: string) => {
    setZoomId(id);
    hideTip();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && zoom.path.length) {
      e.preventDefault();
      zoomTo(zoom.path[zoom.path.length - 1].id);
    }
  };

  const hovered = hover ? placed.find((p) => p.frame.id === hover) : undefined;
  const hv = hovered ? view(hovered) : null;
  const tipX = hv ? Math.min(Math.max(((hv.a + hv.b) / 2) * width, 112), width - 112) : 0;

  return (
    <div
      className={cn("flex w-[560px] max-w-full flex-col gap-4 rounded-2xl border bg-card p-4 text-card-foreground shadow-xs/5", className)}
      onKeyDown={onKeyDown}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-medium text-sm">{title}</span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {fmtMs(root.ms)} · {fmtTokens(sums.get(root.id)?.tokens ?? 0)} tokens · {fmtCost(sums.get(root.id)?.cost ?? 0, currency)}
          </span>
        </div>
        <SegmentedControl aria-label="Size frames by" size="sm">
          {lenses.map((l) => (
            <SegmentedControlItem
              aria-pressed={lens === l.id}
              data-pressed={lens === l.id ? "" : undefined}
              key={l.id}
              onClick={() => setLens(l.id)}
            >
              {l.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>

      <nav aria-label="Zoomed frame" className="-my-1 flex h-7 min-w-0 items-center gap-0.5 text-xs">
        {[...zoom.path, zoom.frame].map((f, i, all) => {
          const last = i === all.length - 1;
          return (
            <span className={cn("flex items-center gap-0.5", last ? "min-w-0" : "shrink-0")} key={f.id}>
              {i > 0 && <ChevronRightIcon aria-hidden className="size-3 shrink-0 text-muted-foreground/60" />}
              {last ? (
                <span aria-current="location" className="truncate px-1.5 font-medium">
                  {f.name}
                </span>
              ) : (
                <button
                  className="max-w-28 truncate rounded-md px-1.5 py-1 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => zoomTo(f.id)}
                  type="button"
                >
                  {f.name}
                </button>
              )}
            </span>
          );
        })}
        <span className="ml-auto shrink-0 pl-2 text-muted-foreground tabular-nums">
          {zoom.path.length ? "Esc to zoom out" : "Click a frame to zoom"}
        </span>
      </nav>

      <div className="relative" onPointerLeave={hideTip} ref={box}>
        <motion.div
          animate={{ height: rows * (ROW + GAP) - GAP }}
          className="relative overflow-hidden"
          initial={false}
          style={{ minHeight: ROW }}
          transition={reduce ? { duration: 0 } : spring}
        >
          {placed.map((p) => {
            const v = view(p);
            const px = (v.b - v.a) * width;
            const hot = hottest?.frame.id === p.frame.id;
            const isZoom = p.frame.id === zoom.frame.id && zoom.path.length > 0;
            return (
              <motion.button
                animate={{
                  left: `${v.a * 100}%`,
                  width: `${(v.b - v.a) * 100}%`,
                  y: Math.max(v.d, 0) * (ROW + GAP),
                  opacity: v.visible ? 1 : 0,
                }}
                aria-label={`${p.frame.name}, ${fmtMs(p.frame.ms)}, ${fmtTokens(metric(p.frame, "tokens"))} tokens, ${fmtCost(metric(p.frame, "cost"), currency)}`}
                className="group absolute top-0 left-0 px-px outline-none"
                initial={false}
                key={p.frame.id}
                onBlur={hideTip}
                onClick={() => zoomTo(isZoom ? (zoom.path[zoom.path.length - 1]?.id ?? root.id) : p.frame.id)}
                onFocus={() => showTip(p.frame.id)}
                onPointerEnter={() => showTip(p.frame.id)}
                style={{ height: ROW, pointerEvents: v.visible ? "auto" : "none" }}
                tabIndex={v.visible ? 0 : -1}
                transition={reduce ? { duration: 0 } : spring}
                type="button"
              >
                <span
                  className={cn(
                    "flex h-full items-center gap-1 overflow-hidden rounded-md px-2 text-left font-medium text-xs transition-[background-color,box-shadow] duration-150 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-inset",
                    kinds[p.frame.kind].frame,
                    hot && "ring-1 ring-orange-500/70 ring-inset dark:ring-orange-400/70",
                    hover && hover !== p.frame.id && "opacity-80",
                  )}
                >
                  {hot && px > 28 && <FlameIcon aria-hidden className="size-3 shrink-0 text-orange-600 dark:text-orange-400" />}
                  {px > 52 && <span className="truncate">{p.frame.name}</span>}
                  {px > 150 && (
                    <span className="ml-auto shrink-0 pl-2 font-normal tabular-nums opacity-60">{fmt(metric(p.frame))}</span>
                  )}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        <div aria-hidden className="relative mt-2 h-4 border-t text-[11px] text-muted-foreground tabular-nums">
          {ticks.map((t) => (
            <span
              className={cn(
                "absolute top-1",
                t === 0 ? "left-0" : t === 1 ? "right-0" : "-translate-x-1/2",
                "before:absolute before:-top-1 before:h-1 before:w-px before:bg-border",
                t === 0 ? "before:left-0" : t === 1 ? "before:right-0" : "before:left-1/2",
              )}
              key={t}
              style={t > 0 && t < 1 ? { left: `${t * 100}%` } : undefined}
            >
              {fmt(zoomTotal * t)}
            </span>
          ))}
        </div>

        <AnimatePresence>
          {tipOn && hovered && hv?.visible && (
            <motion.div
              animate={{ opacity: 1 }}
              className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 -translate-y-full rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg/5"
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              initial={{ opacity: 0 }}
              role="tooltip"
              style={{ left: tipX, top: hv.d * (ROW + GAP) - 6 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn("size-2 shrink-0 rounded-full", kinds[hovered.frame.kind].dot)} />
                <span className="truncate font-medium text-sm">{hovered.frame.name}</span>
              </div>
              <div className="mt-0.5 truncate text-muted-foreground text-xs">
                {kinds[hovered.frame.kind].label}
                {hovered.frame.detail ? ` · ${hovered.frame.detail}` : ""}
              </div>
              <dl className="mt-2.5 grid grid-cols-3 gap-2 border-t pt-2.5 text-xs">
                {lenses.map((l) => (
                  <div className="flex flex-col gap-0.5" key={l.id}>
                    <dt className={cn("text-muted-foreground", l.id === lens && "text-foreground")}>{l.label}</dt>
                    <dd className="font-medium tabular-nums">{fmt(metric(hovered.frame, l.id), l.id)}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-2 text-muted-foreground text-xs tabular-nums">
                {Math.round((metric(hovered.frame) / (metric(root) || 1)) * 100)}% of the run’s {lens === "time" ? "time" : lens}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-3 text-xs">
        <ul className="flex items-center gap-3 text-muted-foreground">
          {(Object.keys(kinds) as FrameKind[]).map((k) => (
            <li className="flex items-center gap-1.5" key={k}>
              <span className={cn("size-2 rounded-[3px]", kinds[k].dot)} />
              {kinds[k].label}
            </li>
          ))}
        </ul>
        {hottest && (
          <button
            className="-mx-1.5 flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => zoomTo(hottest.path[hottest.path.length - 1]?.id ?? hottest.frame.id)}
            type="button"
          >
            <FlameIcon aria-hidden className="size-3.5 shrink-0 text-orange-600 dark:text-orange-400" />
            <span className="text-muted-foreground">{lens === "time" ? "Slowest" : lens === "tokens" ? "Hungriest" : "Priciest"}</span>
            <span className="truncate font-medium">{hottest.frame.name}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {fmt(metric(hottest.frame))} · {Math.round(hotShare * 100)}%
            </span>
          </button>
        )}
      </div>
      <span className="sr-only" aria-live="polite">
        {`Sized by ${lens}. Showing ${zoom.frame.name}, ${fmt(zoomTotal)}. ${maxRows} levels deep.`}
      </span>
    </div>
  );
}
