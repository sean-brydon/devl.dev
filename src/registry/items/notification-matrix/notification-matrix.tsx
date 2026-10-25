"use client";

import { BellIcon, CheckIcon, InboxIcon, LockIcon, type LucideIcon, MailIcon, MoonIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface NotificationChannel {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface NotificationEvent {
  id: string;
  label: string;
  description?: string;
  locked?: Record<string, string>;
}

export interface NotificationGroup {
  id: string;
  label: string;
  icon?: LucideIcon;
  events: NotificationEvent[];
}

export type NotificationPrefs = Record<string, Record<string, boolean>>;

export interface NotificationMatrixProps {
  title?: string;
  description?: string;
  groups: NotificationGroup[];
  channels?: NotificationChannel[];
  defaultValue?: NotificationPrefs;
  quietHours?: string;
  onSave?: (value: NotificationPrefs) => Promise<void>;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;
const press = "transition-[box-shadow,scale,background-color] duration-150 active:scale-[0.97]";
const DEFAULT_CHANNELS: NotificationChannel[] = [
  { id: "email", label: "Email", icon: MailIcon },
  { id: "push", label: "Push", icon: BellIcon },
  { id: "inApp", label: "In-app", icon: InboxIcon },
];

function normalise(groups: NotificationGroup[], channels: NotificationChannel[], value: NotificationPrefs = {}) {
  const out: NotificationPrefs = {};
  for (const g of groups) {
    for (const e of g.events) {
      out[e.id] = {};
      for (const c of channels) out[e.id][c.id] = e.locked?.[c.id] ? true : Boolean(value[e.id]?.[c.id]);
    }
  }
  return out;
}

const COLS = "grid-cols-[minmax(0,1fr)_repeat(3,3.25rem)] sm:grid-cols-[minmax(0,1fr)_repeat(3,5.5rem)]";

export function NotificationMatrix({
  title = "Notifications",
  description = "Choose where each kind of update reaches you.",
  groups,
  channels = DEFAULT_CHANNELS,
  defaultValue,
  quietHours = "10 pm – 7 am",
  onSave = async () => {},
  className,
}: NotificationMatrixProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const initial = useMemo(() => normalise(groups, channels, defaultValue), [groups, channels, defaultValue]);
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [quiet, setQuiet] = useState(true);
  const [savedQuiet, setSavedQuiet] = useState(true);
  const [phase, setPhase] = useState<"idle" | "saving" | "saved">("idle");

  const changes = useMemo(() => {
    let n = quiet !== savedQuiet ? 1 : 0;
    for (const id of Object.keys(value)) for (const c of channels) if (value[id][c.id] !== saved[id]?.[c.id]) n++;
    return n;
  }, [value, saved, channels, quiet, savedQuiet]);

  useEffect(() => {
    if (phase !== "saved") return;
    const t = setTimeout(() => setPhase("idle"), 1400);
    return () => clearTimeout(t);
  }, [phase]);

  const set = (eventIds: string[], channel: string, on: boolean) => {
    setValue((prev) => {
      const next = { ...prev };
      for (const id of eventIds) {
        const ev = groups.flatMap((g) => g.events).find((e) => e.id === id);
        if (ev?.locked?.[channel]) continue;
        next[id] = { ...next[id], [channel]: on };
      }
      return next;
    });
  };

  const save = async () => {
    setPhase("saving");
    await onSave(value);
    setSaved(value);
    setSavedQuiet(quiet);
    setPhase("saved");
  };

  const discard = () => {
    setValue(saved);
    setQuiet(savedQuiet);
  };

  const showBar = changes > 0 || phase !== "idle";

  return (
    <TooltipProvider delay={300}>
      <section className={cn("relative mx-auto w-full max-w-[880px] overflow-clip rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}>
        <header className="flex flex-col gap-4 px-4 pt-5 pb-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:pt-6">
          <div>
            <h2 className="text-balance font-semibold text-lg tracking-tight">{title}</h2>
            <p className="mt-0.5 text-pretty text-muted-foreground text-sm">{description}</p>
          </div>
          <label
            className="flex cursor-pointer items-center gap-3 rounded-xl border bg-muted/40 py-2 ps-3 pe-2.5 text-sm sm:max-w-[290px]"
            htmlFor={`${uid}-quiet`}
          >
            <MoonIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Quiet hours</span>
              <span className="block text-muted-foreground text-xs">Hold push alerts {quietHours}</span>
            </span>
            <Switch checked={quiet} id={`${uid}-quiet`} onCheckedChange={setQuiet} />
          </label>
        </header>

        <div className={cn("sticky top-0 z-[5] grid items-end border-y bg-card/95 px-4 py-2.5 backdrop-blur-sm sm:px-6", COLS)}>
          <span className="text-muted-foreground text-xs">Event</span>
          {channels.map((c) => (
            <span className="flex flex-col items-center gap-1 text-muted-foreground text-xs" key={c.id}>
              <c.icon className="size-4" />
              {c.label}
            </span>
          ))}
        </div>

        <div className="divide-y">
          {groups.map((g) => {
            const ids = g.events.map((e) => e.id);
            return (
              <div aria-labelledby={`${uid}-${g.id}`} key={g.id} role="group">
                <div className={cn("grid items-center bg-muted/40 px-4 py-2 sm:px-6", COLS)}>
                  <span className="flex min-w-0 items-center gap-2 font-medium text-sm" id={`${uid}-${g.id}`}>
                    {g.icon && <g.icon className="size-4 shrink-0 text-muted-foreground" />}
                    <span className="truncate">{g.label}</span>
                  </span>
                  {channels.map((c) => {
                    const editable = g.events.filter((e) => !e.locked?.[c.id]);
                    const on = editable.filter((e) => value[e.id][c.id]).length;
                    const all = editable.length > 0 && on === editable.length;
                    const some = on > 0 && !all;
                    if (!editable.length) {
                      return (
                        <span className="flex h-9 items-center justify-center text-muted-foreground/60" key={c.id}>
                          <LockIcon aria-label={`${g.label} by ${c.label} is always on`} className="size-3.5" />
                        </span>
                      );
                    }
                    return (
                      <label className="flex h-9 cursor-pointer items-center justify-center" key={c.id}>
                        <Checkbox
                          aria-label={`All ${g.label} by ${c.label}`}
                          checked={all}
                          indeterminate={some}
                          onCheckedChange={() => set(ids, c.id, !all)}
                        />
                      </label>
                    );
                  })}
                </div>
                <ul className="divide-y divide-border/60">
                  {g.events.map((e) => (
                    <li className={cn("grid items-center px-4 py-2.5 transition-colors duration-150 hover:bg-accent/30 sm:px-6", COLS)} key={e.id}>
                      <div className="min-w-0 py-0.5 pe-2">
                        <p className="text-sm">{e.label}</p>
                        {e.description && <p className="mt-0.5 text-pretty text-muted-foreground text-xs">{e.description}</p>}
                      </div>
                      {channels.map((c) => {
                        const lock = e.locked?.[c.id];
                        const on = value[e.id][c.id];
                        const dirty = on !== saved[e.id][c.id];
                        if (lock) {
                          return (
                            <div className="flex justify-center" key={c.id}>
                              <Tooltip>
                                <TooltipTrigger
                                  aria-label={`${e.label} by ${c.label} is always on: ${lock}`}
                                  className="flex size-9 cursor-help items-center justify-center rounded-lg text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  render={<button type="button" />}
                                >
                                  <LockIcon className="size-3.5" />
                                </TooltipTrigger>
                                <TooltipPopup>{lock}</TooltipPopup>
                              </Tooltip>
                            </div>
                          );
                        }
                        return (
                          <label className="relative flex h-9 cursor-pointer items-center justify-center" key={c.id}>
                            <AnimatePresence initial={false}>
                              {dirty && (
                                <motion.span
                                  animate={{ opacity: 1, scale: 1 }}
                                  aria-hidden
                                  className="absolute size-8 rounded-lg bg-info/10 dark:bg-info/20"
                                  exit={{ opacity: 0, scale: 0.85 }}
                                  initial={{ opacity: 0, scale: 0.85 }}
                                  transition={{ duration: 0.15, ease }}
                                />
                              )}
                            </AnimatePresence>
                            <Checkbox
                              aria-label={`${e.label} by ${c.label}`}
                              checked={on}
                              className="relative"
                              onCheckedChange={(v) => set([e.id], c.id, Boolean(v))}
                            />
                          </label>
                        );
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <footer className="flex h-[72px] items-center border-t px-4 text-muted-foreground text-xs sm:px-6">
          Security alerts always reach your email, whatever you choose here.
        </footer>

        <div className="sticky bottom-0 z-10 h-0">
          <AnimatePresence>
            {showBar && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-x-3 bottom-3 flex h-12 items-center gap-2 rounded-xl border bg-popover ps-3.5 pe-2 text-sm shadow-lg/5 sm:inset-x-4"
                exit={{ opacity: 0, y: reduce ? 0 : 12, transition: { duration: 0.16 } }}
                initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                role="status"
                transition={{ duration: 0.22, ease }}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {phase === "saved" ? (
                    <motion.span
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-1 items-center gap-2 font-medium text-success-foreground"
                      initial={{ opacity: 0, y: 6 }}
                      key="saved"
                      transition={{ duration: 0.18, ease }}
                    >
                      <CheckIcon className="size-4" strokeWidth={2.5} />
                      Preferences saved
                    </motion.span>
                  ) : (
                    <motion.span
                      animate={{ opacity: 1, y: 0 }}
                      className="flex min-w-0 flex-1 items-center gap-2"
                      exit={{ opacity: 0, y: -6 }}
                      initial={false}
                      key="dirty"
                      transition={{ duration: 0.18, ease }}
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-info" />
                      <span className="truncate">
                        <span className="font-medium tabular-nums">{changes}</span> <span className="hidden sm:inline">unsaved </span>
                        {changes === 1 ? "change" : "changes"}
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>
                {phase !== "saved" && (
                  <>
                    <Button className={press} disabled={phase === "saving"} onClick={discard} size="sm" variant="ghost">
                      Discard
                    </Button>
                    <Button className={press} loading={phase === "saving"} onClick={save} size="sm">
                      Save changes
                    </Button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </TooltipProvider>
  );
}
