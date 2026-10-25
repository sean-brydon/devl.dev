"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ServerRackHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";

const hues: Record<ServerRackHue, string> = {
  sky: "[--hue:var(--color-sky-500)]",
  emerald: "[--hue:var(--color-emerald-500)]",
  amber: "[--hue:var(--color-amber-500)]",
  violet: "[--hue:var(--color-violet-500)]",
  rose: "[--hue:var(--color-rose-500)]",
  orange: "[--hue:var(--color-orange-500)]",
  indigo: "[--hue:var(--color-indigo-500)]",
  teal: "[--hue:var(--color-teal-500)]",
};

export interface ServerRackUnit {
  name: string;
  kind?: "switch" | "server" | "storage";
  drives?: number;
  detail?: string;
  temp?: number;
  status?: "healthy" | "degraded";
  failing?: number;
}

export interface ServerRackProps {
  units?: ServerRackUnit[];
  label?: string;
  hue?: ServerRackHue;
  autoPeek?: boolean;
  className?: string;
}

const defaultUnits: ServerRackUnit[] = [
  { name: "edge-sw-01", kind: "switch" },
  { name: "app-01", kind: "server", drives: 4, detail: "4 × 1.9 TB NVMe", temp: 34 },
  { name: "app-02", kind: "server", drives: 4, detail: "4 × 1.9 TB NVMe", temp: 36 },
  { name: "vault-01", kind: "storage", drives: 12, detail: "12 × 16 TB", temp: 39 },
  { name: "vault-02", kind: "storage", drives: 12, detail: "12 × 16 TB", temp: 41, status: "degraded", failing: 6 },
];

const pull = { type: "spring", stiffness: 380, damping: 32 } as const;

function blink(seed: number) {
  const d = 1.1 + ((seed * 37) % 17) / 10;
  return {
    animate: { opacity: [1, 0.25, 1, 1, 0.35, 1] },
    transition: {
      duration: d,
      delay: ((seed * 53) % 11) / 10,
      ease: "linear" as const,
      repeat: Number.POSITIVE_INFINITY,
      times: [0, 0.12, 0.24, 0.6, 0.7, 0.8],
    },
  };
}

function Led({ className, seed, still }: { className: string; seed?: number; still?: boolean }) {
  const anim = seed === undefined || still ? null : blink(seed);
  return (
    <motion.span
      aria-hidden
      className={cn("size-1.5 shrink-0 rounded-full shadow-[0_0_6px_currentColor]", className)}
      {...(anim ?? {})}
    />
  );
}

function Drives({ count, failing, seed, still }: { count: number; failing?: number; seed: number; still: boolean }) {
  const cols = 4;
  const rows = Math.ceil(count / cols);
  return (
    <div
      className="grid size-full gap-[3px] p-[3px]"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          className="flex min-h-0 items-center gap-1 rounded-[3px] border border-foreground/10 bg-(--bay) px-1 shadow-[inset_0_1px_0_--theme(--color-white/6%)]"
          key={i}
        >
          <Led
            className={i === failing ? "bg-warning text-warning" : "bg-(--hue) text-(--hue)"}
            seed={i === failing ? undefined : seed * 13 + i}
            still={still}
          />
          <span className="h-[3px] flex-1 rounded-full bg-foreground/12" />
          <span className="h-full max-h-2.5 w-[3px] rounded-full bg-foreground/15" />
        </div>
      ))}
    </div>
  );
}

function Faceplate({ unit, index, still }: { unit: ServerRackUnit; index: number; still: boolean }) {
  if (unit.kind === "switch") {
    return (
      <div className="flex h-full items-center gap-2 px-2.5">
        <span className="w-16 shrink-0 truncate font-mono text-[9px] text-muted-foreground">{unit.name}</span>
        <div className="grid flex-1 grid-cols-12 gap-[3px]">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              className="relative flex h-3 items-start justify-center rounded-[2px] bg-(--bay) ring-1 ring-foreground/10 ring-inset"
              key={i}
            >
              {i % 5 !== 3 && (
                <Led className="mt-[2px] size-[3px] bg-(--hue) text-(--hue) shadow-none" seed={index * 20 + i} still={still} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full items-center gap-2 px-2.5">
      <span className="w-16 shrink-0 truncate font-mono text-[9px] text-muted-foreground">{unit.name}</span>
      <div
        className="h-[calc(100%-10px)] flex-1 rounded-[3px] bg-[repeating-linear-gradient(90deg,var(--slit)_0_1.5px,transparent_1.5px_4.5px)] opacity-80"
      />
      <div className="flex shrink-0 items-center gap-1">
        <Led className="bg-success text-success" />
        <Led className="bg-(--hue) text-(--hue)" seed={index * 7} still={still} />
        <Led
          className={unit.status === "degraded" ? "bg-warning text-warning" : "bg-foreground/15 text-transparent shadow-none"}
        />
      </div>
    </div>
  );
}

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export function ServerRack({
  units = defaultUnits,
  label = "rack-a3",
  hue = "sky",
  autoPeek = true,
  className,
}: ServerRackProps) {
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const [hovered, setHovered] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [peek, setPeek] = useState<number | null>(null);
  const [inside, setInside] = useState(false);

  const openable = units.map((u, i) => (u.kind === "switch" ? -1 : i)).filter((i) => i >= 0);
  const interacting = inside || hovered !== null || pinned !== null;

  useEffect(() => {
    if (!autoPeek || !inView || interacting || openable.length === 0) {
      setPeek(null);
      return;
    }
    let step = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = (open: boolean) => {
      if (open) {
        setPeek(openable[(openable.length - 1 + step) % openable.length]);
        step += 2;
        timer = setTimeout(() => tick(false), 2600);
      } else {
        setPeek(null);
        timer = setTimeout(() => tick(true), 2200);
      }
    };
    timer = setTimeout(() => tick(true), 1400);
    return () => clearTimeout(timer);
  }, [autoPeek, inView, interacting, openable.length]);

  const open = hovered ?? pinned ?? peek;
  const active = open === null ? null : units[open];
  const totalDrives = units.reduce((n, u) => n + (u.kind === "switch" ? 0 : (u.drives ?? 0)), 0);
  const degraded = units.filter((u) => u.status === "degraded").length;

  return (
    <div
      ref={root}
      className={cn(
        "relative w-full max-w-[440px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6",
        "[--bay:color-mix(in_oklab,var(--color-foreground)_9%,var(--color-card))] [--plate:color-mix(in_oklab,var(--color-foreground)_3%,var(--color-card))] [--rack:color-mix(in_oklab,var(--color-foreground)_7%,var(--color-card))] [--slit:color-mix(in_oklab,var(--color-foreground)_16%,transparent)]",
        hues[hue],
        className,
      )}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />

      <div className="relative mx-auto w-full max-w-[280px]">
        <div
          className="relative rounded-xl border bg-(--rack) px-5 py-3 shadow-[inset_0_1px_0_--theme(--color-white/8%)]"
          onPointerEnter={(e) => e.pointerType === "mouse" && setInside(true)}
          onPointerLeave={() => {
            setInside(false);
            setHovered(null);
          }}
        >
          {["left-1.5", "right-1.5"].map((side) => (
            <div
              aria-hidden
              className={cn(
                "absolute inset-y-2 w-2 rounded-[3px] bg-(--plate) bg-[radial-gradient(circle,var(--slit)_1.2px,transparent_1.6px)] bg-size-[8px_9px] bg-center ring-1 ring-foreground/8",
                side,
              )}
              key={side}
            />
          ))}
          <ul aria-label={`${label} units`} className="relative flex flex-col gap-1">
            {units.map((unit, i) => {
              const canOpen = unit.kind !== "switch";
              const isOpen = open === i;
              const tall = unit.kind === "storage";
              const still = !!reduce || !inView;
              const body = (
                <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
                  <div aria-hidden className="absolute inset-0 rounded-[inherit] bg-(--rack)">
                    {canOpen && (
                      <Drives count={unit.drives ?? 4} failing={unit.failing} seed={i} still={still || !isOpen} />
                    )}
                  </div>
                  <motion.div
                    animate={isOpen ? (reduce ? { opacity: 0 } : { opacity: 1, x: "101%" }) : { opacity: 1, x: 0 }}
                    aria-hidden
                    className="absolute inset-0 rounded-[inherit] border border-foreground/10 bg-(--plate) shadow-[inset_0_1px_0_--theme(--color-white/10%)]"
                    initial={false}
                    transition={reduce ? { duration: 0.15 } : pull}
                  >
                    <Faceplate index={i} still={still} unit={unit} />
                  </motion.div>
                </div>
              );
              return (
                <motion.li
                  animate={
                    isOpen && !reduce
                      ? { scale: 1.035, y: -1, boxShadow: "0 8px 18px -8px rgb(0 0 0 / 0.4)" }
                      : { scale: 1, y: 0, boxShadow: "0 0 0 0 rgb(0 0 0 / 0)" }
                  }
                  className={cn("relative rounded-[5px]", tall ? "h-14" : "h-[26px]", isOpen ? "z-10" : "z-0")}
                  initial={false}
                  key={unit.name}
                  transition={pull}
                >
                  {canOpen ? (
                    <button
                      aria-expanded={isOpen}
                      aria-label={`${unit.name}${unit.detail ? `, ${unit.detail}` : ""}: ${isOpen ? "hide" : "show"} drives`}
                      className="absolute inset-0 cursor-pointer rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-(--rack)"
                      onBlur={() => setPinned((p) => (p === i ? null : p))}
                      onClick={() => setPinned((p) => (p === i ? null : i))}
                      onFocus={(e) => e.currentTarget.matches(":focus-visible") && setPinned(i)}
                      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(i)}
                      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered((h) => (h === i ? null : h))}
                      type="button"
                    >
                      {body}
                    </button>
                  ) : (
                    <div className="absolute inset-0 rounded-[inherit]">{body}</div>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </div>
        <div aria-hidden className="flex justify-between px-4">
          <span className="h-1.5 w-6 rounded-b-[3px] bg-foreground/15" />
          <span className="h-1.5 w-6 rounded-b-[3px] bg-foreground/15" />
        </div>

        <div className="relative mt-3 h-5 overflow-hidden" aria-live="polite">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              className="absolute inset-0 flex items-center justify-between gap-3 text-xs"
              exit={{ opacity: 0, y: reduce ? 0 : -8, filter: reduce ? "blur(0px)" : "blur(2px)" }}
              initial={{ opacity: 0, y: reduce ? 0 : 8, filter: reduce ? "blur(0px)" : "blur(2px)" }}
              key={active?.name ?? "summary"}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="shrink-0 whitespace-nowrap font-medium font-mono text-foreground">{active?.name ?? label}</span>
                <span className="truncate text-muted-foreground tabular-nums">
                  {active
                    ? [active.detail, active.temp !== undefined ? `${active.temp} °C` : null].filter(Boolean).join(" · ")
                    : `${units.length} units · ${totalDrives} drives`}
                </span>
              </span>
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1.5 font-medium",
                  (active ? active.status === "degraded" : degraded > 0) ? "text-warning-foreground" : "text-success-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    (active ? active.status === "degraded" : degraded > 0) ? "bg-warning" : "bg-success",
                  )}
                />
                {active
                  ? active.status === "degraded"
                    ? active.failing !== undefined
                      ? "Rebuilding"
                      : "Degraded"
                    : "Healthy"
                  : degraded > 0
                    ? `${degraded} degraded`
                    : "All healthy"}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
