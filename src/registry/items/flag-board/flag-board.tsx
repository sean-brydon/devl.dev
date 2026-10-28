"use client";

import { PlusIcon, PowerIcon, XIcon } from "lucide-react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface FlagState {
  on: boolean;
  rollout: number;
  segments: string[];
}

export interface FeatureFlag {
  key: string;
  description: string;
  envs: Record<string, FlagState>;
  updated?: string;
}

export interface FlagEnvironment {
  id: string;
  name: string;
  audience?: number;
}

export interface FlagSegment {
  id: string;
  name: string;
}

export interface FlagBoardProps {
  flags: FeatureFlag[];
  environments: FlagEnvironment[];
  segments: FlagSegment[];
  defaultEnvironment?: string;
  onChange?: (flags: FeatureFlag[]) => void;
  className?: string;
}

const HOLD_MS = 1100;

function HoldToConfirm({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const reduce = useReducedMotion();
  const progress = useMotionValue(0);
  const width = useTransform(progress, (p) => `${p * 100}%`);
  const clip = useTransform(progress, (p) => `inset(0 ${100 - p * 100}% 0 0)`);
  const run = useRef<ReturnType<typeof animate> | null>(null);
  const [holding, setHolding] = useState(false);

  const start = () => {
    setHolding(true);
    run.current?.stop();
    run.current = animate(progress, 1, {
      duration: (HOLD_MS / 1000) * (1 - progress.get()),
      ease: "linear",
      onComplete: () => {
        setHolding(false);
        onConfirm();
      },
    });
  };
  const cancel = () => {
    if (progress.get() >= 1) return;
    setHolding(false);
    run.current?.stop();
    run.current = animate(progress, 0, { duration: reduce ? 0 : 0.25, ease: [0.23, 1, 0.32, 1] });
  };
  useEffect(() => () => run.current?.stop(), []);

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      start();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") cancel();
  };

  return (
    <button
      aria-label={`${label}. Press and hold to confirm.`}
      className="relative isolate inline-flex h-8 w-[148px] shrink-0 select-none items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-destructive bg-destructive/10 px-3 font-medium text-destructive-foreground text-sm outline-none transition-[scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[0.97]"
      onBlur={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onPointerCancel={cancel}
      onPointerDown={start}
      onPointerLeave={cancel}
      onPointerUp={cancel}
      type="button"
    >
      <motion.span aria-hidden className="absolute inset-y-0 left-0 -z-10 bg-destructive" style={{ width }} />
      <motion.span
        aria-hidden
        className="absolute inset-0 -z-0 flex items-center justify-center gap-1.5 text-white"
        style={{ clipPath: clip }}
      >
        <PowerIcon className="size-3.5" />
        {holding ? "Keep holding…" : label}
      </motion.span>
      <PowerIcon className="size-3.5" />
      {holding ? "Keep holding…" : label}
    </button>
  );
}

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function FlagBoard({ flags: initial, environments, segments, defaultEnvironment, onChange, className }: FlagBoardProps) {
  const reduce = useReducedMotion();
  const [flags, setFlags] = useState(initial);
  const [env, setEnv] = useState(defaultEnvironment ?? environments[0]?.id);
  const [confirming, setConfirming] = useState(false);
  const [killed, setKilled] = useState<{ env: string; keys: string[] } | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  const environment = environments.find((e) => e.id === env) ?? environments[0];
  const segName = (id: string) => segments.find((s) => s.id === id)?.name ?? id;
  const live = flags.filter((f) => f.envs[env]?.on);

  useEffect(() => {
    if (!killed) return;
    const t = setTimeout(() => setKilled(null), 6000);
    return () => clearTimeout(t);
  }, [killed]);

  const update = (next: FeatureFlag[]) => {
    setFlags(next);
    onChange?.(next);
  };

  const patch = (key: string, p: Partial<FlagState>) =>
    update(flags.map((f) => (f.key === key ? { ...f, updated: "just now", envs: { ...f.envs, [env]: { ...f.envs[env], ...p } } } : f)));

  const killAll = () => {
    setKilled({ env, keys: live.map((f) => f.key) });
    update(flags.map((f) => (f.envs[env]?.on ? { ...f, updated: "just now", envs: { ...f.envs, [env]: { ...f.envs[env], on: false } } } : f)));
    setConfirming(false);
  };

  const undoKill = () => {
    if (!killed) return;
    update(flags.map((f) => (killed.keys.includes(f.key) ? { ...f, envs: { ...f.envs, [killed.env]: { ...f.envs[killed.env], on: true } } } : f)));
    setKilled(null);
  };

  return (
    <div className={cn("flex w-full min-w-0 max-w-[560px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5", className)}>
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium">Feature flags</h3>
          <p className="text-muted-foreground text-xs tabular-nums">
            {live.length} of {flags.length} on in {environment.name}
          </p>
        </div>
        <Button
          aria-expanded={confirming}
          className="shrink-0"
          disabled={live.length === 0}
          onClick={() => setConfirming((c) => !c)}
          size="sm"
          variant="destructive-outline"
        >
          <PowerIcon />
          Kill switch
        </Button>
      </div>

      <div className="px-4 pb-3">
        <Tabs
          onValueChange={(v) => {
            setEnv(String(v));
            setConfirming(false);
          }}
          value={env}
        >
          <TabsList className="w-full text-muted-foreground">
            {environments.map((e) => {
              const on = flags.filter((f) => f.envs[e.id]?.on).length;
              return (
                <TabsTab className="gap-1.5 text-xs sm:text-xs" key={e.id} value={e.id}>
                  {e.name}
                  <span className="rounded-full bg-foreground/6 px-1.5 text-[10.5px] text-muted-foreground tabular-nums leading-4 max-sm:hidden dark:bg-foreground/10">
                    {on}
                  </span>
                </TabsTab>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      <AnimatePresence initial={false}>
        {confirming && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="mx-4 mb-3 flex flex-col gap-3 rounded-xl border border-destructive/24 bg-destructive/6 p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-destructive-foreground text-sm">
                  Turn off {live.length} {live.length === 1 ? "flag" : "flags"} in {environment.name}?
                </p>
                <p className="mt-0.5 text-muted-foreground text-xs text-pretty">
                  {environment.audience ? `${compact(environment.audience)} users` : "Everyone"} fall back to the default experience right away.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setConfirming(false)} size="sm" variant="ghost">
                  Cancel
                </Button>
                <HoldToConfirm label="Hold to turn off" onConfirm={killAll} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {killed && killed.env === env && !confirming && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border bg-muted/50 py-1.5 ps-3 pe-1.5 text-xs">
              <PowerIcon className="size-3.5 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">
                {killed.keys.length} {killed.keys.length === 1 ? "flag" : "flags"} turned off in {environment.name}
              </span>
              <Button className="text-xs sm:text-xs" onClick={undoKill} size="xs" variant="ghost">
                Undo
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.ul
        animate={{ opacity: 1 }}
        className="border-t"
        initial={mounted.current ? { opacity: 0.4 } : false}
        key={env}
        transition={{ duration: 0.18 }}
      >
        {flags.map((f) => {
          const s = f.envs[env] ?? { on: false, rollout: 0, segments: [] };
          const available = segments.filter((seg) => !s.segments.includes(seg.id));
          const reach = environment.audience ? Math.round((environment.audience * s.rollout) / 100) : null;
          return (
            <li className="border-b px-4 py-3 last:border-b-0" key={f.key}>
              <div className="flex items-start gap-3">
                <Switch aria-label={`${f.key} in ${environment.name}`} checked={s.on} className="mt-0.5" onCheckedChange={(on) => patch(f.key, { on })} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <code className={cn("truncate font-medium font-mono text-[13px] transition-colors", !s.on && "text-muted-foreground")}>{f.key}</code>
                    <span className="ms-auto shrink-0 text-muted-foreground text-xs">{f.updated}</span>
                  </div>
                  <p className="mt-0.5 text-muted-foreground text-xs text-pretty">{f.description}</p>

                  <AnimatePresence initial={false}>
                    {s.on && (
                      <motion.div
                        animate={{ height: "auto", opacity: 1 }}
                        className="overflow-hidden"
                        exit={{ height: 0, opacity: 0 }}
                        initial={{ height: 0, opacity: 0 }}
                        transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                      >
                        <div className="flex flex-col gap-2.5 pt-3">
                          <div className="flex items-center gap-3">
                            <Slider
                              getAriaLabel={() => `${f.key} rollout`}
                              className="min-w-0 flex-1 [&_[data-slot=slider-control]]:min-w-0"
                              onValueChange={(v) => patch(f.key, { rollout: Array.isArray(v) ? v[0] : v })}
                              step={5}
                              value={[s.rollout]}
                            />
                            <span className="w-[78px] shrink-0 whitespace-nowrap text-end text-xs tabular-nums">
                              <span className="font-medium">{s.rollout}%</span>
                              {reach !== null && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  · {compact(reach)}
                                  <span className="sr-only"> users</span>
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="me-0.5 text-muted-foreground text-xs">{s.segments.length ? "Only" : "Targeting"}</span>
                            <AnimatePresence initial={false} mode="popLayout">
                              {s.segments.length === 0 && (
                                <motion.span
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="inline-flex h-6 items-center rounded-full border border-dashed px-2 text-muted-foreground text-xs"
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  key="all"
                                  transition={{ duration: 0.15 }}
                                >
                                  everyone
                                </motion.span>
                              )}
                              {s.segments.map((id) => (
                                <motion.span
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="inline-flex h-6 items-center gap-0.5 rounded-full bg-info/10 ps-2 pe-0.5 text-info-foreground text-xs"
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  initial={reduce ? false : { opacity: 0, scale: 0.95 }}
                                  key={id}
                                  layout={reduce ? false : "position"}
                                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                                >
                                  {segName(id)}
                                  <button
                                    aria-label={`Remove ${segName(id)}`}
                                    className="relative grid size-5 place-items-center rounded-full outline-none transition-colors after:absolute after:-inset-1.5 focus-visible:ring-2 focus-visible:ring-ring [@media(hover:hover)]:hover:bg-info/15"
                                    onClick={() => patch(f.key, { segments: s.segments.filter((x) => x !== id) })}
                                    type="button"
                                  >
                                    <XIcon className="size-3" />
                                  </button>
                                </motion.span>
                              ))}
                            </AnimatePresence>
                            {available.length > 0 && (
                              <Menu>
                                <MenuTrigger
                                  aria-label={`Add segment to ${f.key}`}
                                  className="relative grid size-6 place-items-center rounded-full border border-dashed text-muted-foreground outline-none transition-colors after:absolute after:-inset-1 focus-visible:ring-2 focus-visible:ring-ring data-popup-open:border-solid data-popup-open:text-foreground [@media(hover:hover)]:hover:border-solid [@media(hover:hover)]:hover:text-foreground"
                                >
                                  <PlusIcon className="size-3.5" />
                                </MenuTrigger>
                                <MenuPopup align="start">
                                  {available.map((seg) => (
                                    <MenuItem key={seg.id} onClick={() => patch(f.key, { segments: [...s.segments, seg.id] })}>
                                      {seg.name}
                                    </MenuItem>
                                  ))}
                                </MenuPopup>
                              </Menu>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </li>
          );
        })}
      </motion.ul>
    </div>
  );
}
