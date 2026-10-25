"use client";

import { EyeIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export type PresenceHue = "rose" | "sky" | "amber" | "emerald" | "violet" | "orange";

export interface PresencePerson {
  id: string;
  name: string;
  initials: string;
  hue: PresenceHue;
  status?: "active" | "idle";
  location?: string;
}

export interface PresenceBarProps {
  people: PresencePerson[];
  title?: string;
  subtitle?: string;
  max?: number;
  following?: string | null;
  onFollowChange?: (id: string | null) => void;
  children?: ReactNode | ((following: PresencePerson | null) => ReactNode);
  className?: string;
}

export const presenceHues: Record<PresenceHue, { avatar: string; frame: string; flag: string; tint: string }> = {
  rose: {
    avatar: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    frame: "border-rose-600",
    flag: "bg-rose-600 text-white",
    tint: "bg-rose-500/8",
  },
  sky: {
    avatar: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    frame: "border-sky-600",
    flag: "bg-sky-600 text-white",
    tint: "bg-sky-500/8",
  },
  amber: {
    avatar: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    frame: "border-amber-600",
    flag: "bg-amber-600 text-white",
    tint: "bg-amber-500/10",
  },
  emerald: {
    avatar: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    frame: "border-emerald-600",
    flag: "bg-emerald-600 text-white",
    tint: "bg-emerald-500/8",
  },
  violet: {
    avatar: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    frame: "border-violet-600",
    flag: "bg-violet-600 text-white",
    tint: "bg-violet-500/8",
  },
  orange: {
    avatar: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    frame: "border-orange-600",
    flag: "bg-orange-600 text-white",
    tint: "bg-orange-500/10",
  },
};

const spring = { type: "spring", stiffness: 520, damping: 34 } as const;

function RollingNumber({ value, reduce }: { value: number; reduce: boolean | null }) {
  return (
    <span className="relative inline-flex overflow-hidden tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
          initial={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
          key={value}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function PresenceBar({
  people,
  title = "Q3 roadmap",
  subtitle = "Edited just now",
  max = 4,
  following: followingProp,
  onFollowChange,
  children,
  className,
}: PresenceBarProps) {
  const reduce = useSafeReducedMotion();
  const [followingState, setFollowingState] = useState<string | null>(null);
  const followingId = followingProp !== undefined ? followingProp : followingState;
  const followed = people.find((p) => p.id === followingId) ?? null;

  const setFollowing = (id: string | null) => {
    if (followingProp === undefined) setFollowingState(id);
    onFollowChange?.(id);
  };

  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  const hue = followed ? presenceHues[followed.hue] : null;

  return (
    <section
      aria-label={title}
      className={cn("relative w-full max-w-[480px] rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
      onKeyDown={(e) => e.key === "Escape" && followed && setFollowing(null)}
    >
      <header className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-sm">{title}</h3>
          <div className="relative h-4 text-muted-foreground text-xs">
            <AnimatePresence initial={false} mode="popLayout">
              {followed ? (
                <motion.span
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1"
                  exit={{ opacity: 0, y: reduce ? 0 : -4 }}
                  initial={{ opacity: 0, y: reduce ? 0 : 4 }}
                  key="following"
                  transition={{ duration: 0.18 }}
                >
                  <EyeIcon className="size-3" />
                  Following {followed.name.split(" ")[0]}
                  {followed.location && <span className="text-muted-foreground/72">· {followed.location}</span>}
                </motion.span>
              ) : (
                <motion.span
                  animate={{ opacity: 1, y: 0 }}
                  className="block"
                  exit={{ opacity: 0, y: reduce ? 0 : -4 }}
                  initial={{ opacity: 0, y: reduce ? 0 : 4 }}
                  key="subtitle"
                  transition={{ duration: 0.18 }}
                >
                  {subtitle}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <TooltipProvider delay={400}>
          <div aria-label={`${people.length} people here`} className="flex items-center" role="group">
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((p, i) => {
                const isFollowed = p.id === followingId;
                return (
                  <motion.div
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    className={cn("relative", i > 0 && "-ms-2.5")}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.14 } }}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, x: 8 }}
                    key={p.id}
                    layout
                    style={{ zIndex: isFollowed ? 20 : shown.length - i }}
                    transition={reduce ? { duration: 0 } : spring}
                  >
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            aria-label={isFollowed ? `Stop following ${p.name}` : `Follow ${p.name}`}
                            aria-pressed={isFollowed}
                            className="group/face relative block cursor-pointer rounded-full bg-card p-[2px] outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] [@media(hover:hover)]:hover:-translate-y-0.5"
                            onClick={() => setFollowing(isFollowed ? null : p.id)}
                            type="button"
                          />
                        }
                      >
                        <span
                          className={cn(
                            "block rounded-full border-[1.5px] p-[1.5px] transition-colors duration-200",
                            isFollowed && hue
                              ? hue.frame
                              : p.status === "idle"
                                ? "border-warning"
                                : "border-success",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-7 select-none items-center justify-center rounded-full font-medium text-[10px] transition-opacity",
                              presenceHues[p.hue].avatar,
                              p.status === "idle" && !isFollowed && "opacity-60",
                            )}
                          >
                            {p.initials}
                          </span>
                        </span>
                      </TooltipTrigger>
                      <TooltipPopup>
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {p.status === "idle" ? "Idle" : "Active"}
                          {p.location ? ` in ${p.location}` : ""}
                        </span>
                      </TooltipPopup>
                    </Tooltip>
                  </motion.div>
                );
              })}
              {rest > 0 && (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative -ms-2.5"
                  exit={{ opacity: 0, scale: 0.8 }}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                  key="rest"
                  layout
                  transition={reduce ? { duration: 0 } : spring}
                >
                  <span className="block rounded-full bg-card p-[2px]">
                    <span className="flex size-[34px] items-center justify-center rounded-full bg-muted font-medium text-[10px] text-muted-foreground tabular-nums ring-1 ring-border ring-inset">
                      +{rest}
                    </span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </TooltipProvider>

        <div className="hidden w-[68px] shrink-0 items-center gap-1 text-muted-foreground text-xs min-[400px]:flex" aria-live="polite">
          <span aria-hidden className="size-1.5 rounded-full bg-success" />
          <span>
            <RollingNumber reduce={reduce} value={people.length} /> viewing
          </span>
        </div>
      </header>

      {children !== undefined && (
        <div className="relative border-t">
          <div className="relative overflow-hidden rounded-b-2xl">
            {typeof children === "function" ? children(followed) : children}
          </div>
          <AnimatePresence>
            {followed && hue && (
              <motion.div
                animate={{ opacity: 1 }}
                className={cn("pointer-events-none absolute -inset-px rounded-b-2xl border-2", hue.frame)}
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key={followed.id}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="pointer-events-auto absolute -top-px right-3 flex items-center"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                >
                  <span className={cn("flex h-6 items-center gap-1 rounded-b-lg ps-2 pe-1 font-medium text-xs", hue.flag)}>
                    {followed.name.split(" ")[0]}'s view
                    <button
                      aria-label="Stop following"
                      className="relative flex size-5 cursor-pointer items-center justify-center rounded-md outline-none transition-colors before:absolute before:-inset-1.5 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
                      onClick={() => setFollowing(null)}
                      type="button"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
