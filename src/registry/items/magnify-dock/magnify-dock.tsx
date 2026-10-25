"use client";

import {
  AnimatePresence,
  type MotionValue,
  motion,
  useAnimationControls,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DockApp {
  id: string;
  name: string;
  icon: ReactNode;
  tile?: string;
  running?: boolean;
  badge?: number;
}

export interface MagnifyDockProps {
  apps: DockApp[];
  trailing?: DockApp[];
  size?: number;
  magnification?: number;
  reach?: number;
  onOpen?: (app: DockApp) => void;
  className?: string;
}

const LAUNCH_MS = 1100;

export function MagnifyDock({
  apps,
  trailing = [],
  size = 40,
  magnification = 64,
  reach = 120,
  onOpen,
  className,
}: MagnifyDockProps) {
  const reduce = useReducedMotion();
  const pointerX = useMotionValue(Number.POSITIVE_INFINITY);
  const [running, setRunning] = useState(() => new Set([...apps, ...trailing].filter((a) => a.running).map((a) => a.id)));
  const [launching, setLaunching] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const warm = useRef(false);
  const labelTimer = useRef<number>(undefined);
  const launchTimer = useRef<number>(undefined);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(
    () => () => {
      clearTimeout(labelTimer.current);
      clearTimeout(launchTimer.current);
    },
    [],
  );

  const all = [...apps, ...trailing];

  const showLabel = (id: string) => {
    clearTimeout(labelTimer.current);
    if (warm.current) return setLabel(id);
    labelTimer.current = window.setTimeout(() => {
      warm.current = true;
      setLabel(id);
    }, 220);
  };
  const hideLabels = () => {
    clearTimeout(labelTimer.current);
    warm.current = false;
    setLabel(null);
  };

  const open = (app: DockApp) => {
    if (running.has(app.id) || reduce) {
      setRunning((s) => new Set(s).add(app.id));
      onOpen?.(app);
      return;
    }
    if (launching) return;
    setLaunching(app.id);
    clearTimeout(launchTimer.current);
    launchTimer.current = window.setTimeout(() => {
      setLaunching(null);
      setRunning((s) => new Set(s).add(app.id));
      onOpen?.(app);
    }, LAUNCH_MS);
  };

  const magnifyAround = (index: number) => {
    const el = refs.current[index];
    if (!el) return;
    const r = el.getBoundingClientRect();
    pointerX.set(r.left + r.width / 2);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const n = all.length;
    let next = -1;
    if (event.key === "ArrowRight") next = (focusIndex + 1) % n;
    else if (event.key === "ArrowLeft") next = (focusIndex - 1 + n) % n;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = n - 1;
    if (next < 0) return;
    event.preventDefault();
    setFocusIndex(next);
    refs.current[next]?.focus();
  };

  const tile = (app: DockApp, index: number) => (
    <DockTile
      app={app}
      focusable={index === focusIndex}
      key={app.id}
      label={label === app.id}
      labelAnimated={!warm.current}
      launching={launching === app.id}
      magnification={reduce ? size : magnification}
      onBlur={() => {
        pointerX.set(Number.POSITIVE_INFINITY);
        hideLabels();
      }}
      onFocus={(event) => {
        setFocusIndex(index);
        if (event.currentTarget.matches(":focus-visible")) {
          magnifyAround(index);
          warm.current = true;
          setLabel(app.id);
        }
      }}
      onHover={() => showLabel(app.id)}
      onOpen={() => open(app)}
      pointerX={pointerX}
      reach={reach}
      ref={(el) => {
        refs.current[index] = el;
      }}
      reduce={!!reduce}
      running={running.has(app.id)}
      size={size}
    />
  );

  return (
    <div
      aria-label="Dock"
      aria-orientation="horizontal"
      className={cn(
        "relative flex w-max max-w-full items-end gap-1 rounded-2xl border bg-background/70 px-1.5 pt-1.5 pb-2.5 shadow-lg/5 backdrop-blur-xl",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[inset_0_1px_--theme(--color-white/40%)] dark:before:shadow-[inset_0_1px_--theme(--color-white/8%)]",
        className,
      )}
      onKeyDown={onKeyDown}
      onPointerLeave={() => {
        pointerX.set(Number.POSITIVE_INFINITY);
        hideLabels();
      }}
      onPointerMove={(event) => {
        if (event.pointerType !== "touch") pointerX.set(event.clientX);
      }}
      role="toolbar"
      style={{ height: size + 18 }}
    >
      {apps.map((app, i) => tile(app, i))}
      {trailing.length > 0 && <div aria-hidden className="mx-1 w-px self-stretch bg-border" />}
      {trailing.map((app, i) => tile(app, apps.length + i))}
    </div>
  );
}

interface DockTileProps {
  app: DockApp;
  pointerX: MotionValue<number>;
  size: number;
  magnification: number;
  reach: number;
  running: boolean;
  launching: boolean;
  label: boolean;
  labelAnimated: boolean;
  focusable: boolean;
  reduce: boolean;
  onOpen: () => void;
  onHover: () => void;
  onFocus: (event: React.FocusEvent<HTMLButtonElement>) => void;
  onBlur: () => void;
  ref: (el: HTMLButtonElement | null) => void;
}

function DockTile({
  app,
  pointerX,
  size,
  magnification,
  reach,
  running,
  launching,
  label,
  labelAnimated,
  focusable,
  reduce,
  onOpen,
  onHover,
  onFocus,
  onBlur,
  ref,
}: DockTileProps) {
  const local = useRef<HTMLButtonElement | null>(null);
  const bounce = useAnimationControls();

  const distance = useTransform(pointerX, (x) => {
    const r = local.current?.getBoundingClientRect();
    if (!r || !Number.isFinite(x)) return reach * 2;
    return x - (r.left + r.width / 2);
  });
  const target = useTransform(distance, [-reach, 0, reach], [size, magnification, size], { clamp: true });
  const width = useSpring(target, { stiffness: 380, damping: 32, mass: 0.6 });

  useEffect(() => {
    if (!launching) return;
    bounce.start({
      y: [0, -size * 0.55, 0, -size * 0.3, 0],
      transition: { duration: LAUNCH_MS / 1000, times: [0, 0.25, 0.5, 0.72, 0.92], ease: ["easeOut", "easeIn", "easeOut", "easeIn"] },
    });
  }, [launching, bounce, size]);

  return (
    <motion.div className="relative flex shrink-0 flex-col items-center" style={{ width }}>
      <AnimatePresence>
        {label && !launching && (
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded-md border bg-popover px-2 py-0.5 font-medium text-popover-foreground text-xs shadow-md/5"
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            initial={labelAnimated && !reduce ? { opacity: 0, y: 3 } : false}
            transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
          >
            {app.name}
          </motion.span>
        )}
      </AnimatePresence>
      <motion.button
        animate={bounce}
        aria-busy={launching || undefined}
        aria-label={`${app.name}${running ? ", open" : ""}${app.badge ? `, ${app.badge} unread` : ""}`}
        className={cn(
          "group/tile relative flex aspect-square w-full cursor-pointer items-center justify-center rounded-[22%] outline-none",
          "shadow-[0_1px_2px_--theme(--color-black/12%),inset_0_1px_--theme(--color-white/25%)] transition-[filter] duration-150",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "active:brightness-90 [&_svg]:size-[52%] [&_svg]:drop-shadow-[0_1px_1px_--theme(--color-black/18%)]",
          app.tile ?? "bg-muted text-foreground",
        )}
        onBlur={onBlur}
        onClick={onOpen}
        onFocus={onFocus}
        onPointerEnter={(event) => event.pointerType !== "touch" && onHover()}
        ref={(el) => {
          local.current = el;
          ref(el);
        }}
        tabIndex={focusable ? 0 : -1}
        type="button"
        whileTap={reduce ? undefined : { scale: 0.97 }}
      >
        {app.icon}
        {app.badge ? (
          <span className="absolute -top-1 -right-1 flex h-[38%] min-w-[38%] items-center justify-center rounded-full bg-destructive px-[0.3em] font-semibold text-[max(10px,22%)] text-white tabular-nums leading-none shadow-xs">
            {app.badge}
          </span>
        ) : null}
      </motion.button>
      <motion.span
        animate={{ opacity: running ? 1 : 0, scale: running ? 1 : 0.5 }}
        aria-hidden
        className="absolute -bottom-2 size-1 rounded-full bg-foreground/70"
        initial={false}
        transition={{ duration: 0.2, ease: "easeOut" }}
      />
    </motion.div>
  );
}
