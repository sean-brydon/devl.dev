"use client";

import { HouseIcon } from "lucide-react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { type Crumb, OverflowBreadcrumb } from "@/registry/items/overflow-breadcrumb/overflow-breadcrumb";

const PATH: Crumb[] = [
  { id: "home", label: "Halden", icon: <HouseIcon /> },
  { id: "roadmaps", label: "Roadmaps" },
  { id: "q4", label: "Q4" },
  { id: "launch", label: "Pricing launch" },
  { id: "plan", label: "Launch plan" },
];

const MIN = 220;
const MAX = 560;

export default function OverflowBreadcrumbDemo() {
  const reduce = useReducedMotion();
  const [segments, setSegments] = useState(PATH);
  const width = useMotionValue(MAX);
  const [shown, setShown] = useState(MAX);
  const touched = useRef(false);
  const drag = useRef<{ x: number; w: number } | null>(null);

  useEffect(() => width.on("change", (v) => setShown(Math.round(v))), [width]);

  useEffect(() => {
    if (reduce) return;
    let controls: ReturnType<typeof animate> | undefined;
    const t = window.setTimeout(async () => {
      if (touched.current) return;
      controls = animate(width, 250, { duration: 1.4, ease: [0.65, 0, 0.35, 1] });
      await controls;
      if (touched.current) return;
      controls = animate(width, 400, { duration: 1.2, ease: [0.65, 0, 0.35, 1], delay: 0.6 });
    }, 1400);
    return () => {
      clearTimeout(t);
      controls?.stop();
    };
  }, [reduce, width]);

  const take = () => {
    touched.current = true;
    width.stop();
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    take();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, w: width.get() };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    width.set(Math.max(MIN, Math.min(MAX, drag.current.w + e.clientX - drag.current.x)));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 40 : 10;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      take();
      width.set(Math.max(MIN, Math.min(MAX, width.get() + (e.key === "ArrowRight" ? step : -step))));
    }
  };

  return (
    <div className="flex w-[576px] max-w-full flex-col items-start gap-3">
      <motion.div className="relative max-w-[calc(100%-16px)] rounded-2xl border bg-card shadow-xs/5" style={{ width }}>
        <div className="border-b px-3 py-2.5">
          <OverflowBreadcrumb
            onNavigate={(_, i) => setSegments((s) => (i < s.length - 1 ? s.slice(0, i + 1) : s))}
            onRename={(label) => setSegments((s) => s.map((c, i) => (i === s.length - 1 ? { ...c, label } : c)))}
            segments={segments}
          />
        </div>
        <div className="space-y-2 p-4">
          <div className="h-2 w-3/4 rounded-full bg-muted" />
          <div className="h-2 w-1/2 rounded-full bg-muted" />
          <div className="h-2 w-2/3 rounded-full bg-muted" />
        </div>
        <div
          aria-label="Panel width"
          aria-orientation="horizontal"
          aria-valuemax={MAX}
          aria-valuemin={MIN}
          aria-valuenow={shown}
          className="group/handle absolute top-1/2 -right-4 flex h-16 w-4 before:absolute before:inset-y-0 before:-inset-x-2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onKeyDown={onKey}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={() => {
            drag.current = null;
          }}
          role="slider"
          tabIndex={0}
        >
          <span className="h-8 w-1 rounded-full bg-border transition-[scale,background-color] duration-150 group-hover/handle:scale-y-125 group-hover/handle:bg-muted-foreground/50 group-active/handle:bg-muted-foreground/70" />
        </div>
      </motion.div>
      <p className="text-muted-foreground text-xs">
        Drag the handle to resize · click the last crumb to rename{segments.length < PATH.length && (
          <>
            {" · "}
            <button className="cursor-pointer underline underline-offset-2 hover:text-foreground" onClick={() => setSegments(PATH)} type="button">
              reset path
            </button>
          </>
        )}
      </p>
    </div>
  );
}
