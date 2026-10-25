"use client";

import { ArrowUpRightIcon, AtSignIcon, GlobeIcon, MailIcon, PlusIcon } from "lucide-react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export type TeamTone = "violet" | "sky" | "emerald" | "amber" | "rose" | "teal" | "indigo" | "orange";

export interface TeamMember {
  name: string;
  role: string;
  team: string;
  location: string;
  timeZone?: string;
  bio: string;
  tone?: TeamTone;
  links?: { email?: string; website?: string; handle?: string };
}

export interface TeamGridProps {
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  members: TeamMember[];
  hiring?: { title: string; text: string; href: string; count?: number };
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;

const tones: Record<TeamTone, { bg: string; text: string; ring: string }> = {
  violet: {
    bg: "from-violet-100 to-violet-50/60 dark:from-violet-500/25 dark:to-violet-500/5",
    text: "text-violet-700 dark:text-violet-300",
    ring: "text-violet-500/25 dark:text-violet-300/15",
  },
  sky: {
    bg: "from-sky-100 to-sky-50/60 dark:from-sky-500/25 dark:to-sky-500/5",
    text: "text-sky-700 dark:text-sky-300",
    ring: "text-sky-500/25 dark:text-sky-300/15",
  },
  emerald: {
    bg: "from-emerald-100 to-emerald-50/60 dark:from-emerald-500/25 dark:to-emerald-500/5",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "text-emerald-500/25 dark:text-emerald-300/15",
  },
  amber: {
    bg: "from-amber-100 to-amber-50/60 dark:from-amber-500/25 dark:to-amber-500/5",
    text: "text-amber-800 dark:text-amber-300",
    ring: "text-amber-500/30 dark:text-amber-300/15",
  },
  rose: {
    bg: "from-rose-100 to-rose-50/60 dark:from-rose-500/25 dark:to-rose-500/5",
    text: "text-rose-700 dark:text-rose-300",
    ring: "text-rose-500/25 dark:text-rose-300/15",
  },
  teal: {
    bg: "from-teal-100 to-teal-50/60 dark:from-teal-500/25 dark:to-teal-500/5",
    text: "text-teal-700 dark:text-teal-300",
    ring: "text-teal-500/25 dark:text-teal-300/15",
  },
  indigo: {
    bg: "from-indigo-100 to-indigo-50/60 dark:from-indigo-500/25 dark:to-indigo-500/5",
    text: "text-indigo-700 dark:text-indigo-300",
    ring: "text-indigo-500/25 dark:text-indigo-300/15",
  },
  orange: {
    bg: "from-orange-100 to-orange-50/60 dark:from-orange-500/25 dark:to-orange-500/5",
    text: "text-orange-700 dark:text-orange-300",
    ring: "text-orange-500/25 dark:text-orange-300/15",
  },
};
const order = Object.keys(tones) as TeamTone[];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function localTime(now: Date | null, timeZone?: string) {
  if (!now || !timeZone) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone }).format(now);
  } catch {
    return null;
  }
}

function MemberCard({ member, index, now }: { member: TeamMember; index: number; now: Date | null }) {
  const reduce = useReducedMotionSafe();
  const bioId = useId();
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hover || focus || pinned;
  const tone = tones[member.tone ?? order[index % order.length]];
  const time = localTime(now, member.timeZone);
  const links = member.links ?? {};

  return (
    <motion.li
      animate={{ opacity: 1, scale: 1 }}
      className="group/card relative"
      exit={{ opacity: 0, scale: 0.97 }}
      initial={{ opacity: 0, scale: 0.97 }}
      layout="position"
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setFocus(false)}
      onFocus={() => setFocus(true)}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={() => setHover(false)}
      transition={{ duration: 0.3, ease }}
    >
      <article className="relative isolate overflow-hidden rounded-2xl border bg-card shadow-xs/5 transition-shadow duration-200 group-hover/card:shadow-md/5">
        <button
          aria-controls={bioId}
          aria-expanded={open}
          aria-label={`About ${member.name}`}
          className="relative block aspect-[4/3] w-full cursor-pointer overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          onClick={() => setPinned((p) => !p)}
          type="button"
        >
          <span aria-hidden className={cn("absolute inset-0 bg-linear-to-br", tone.bg)} />
          <svg aria-hidden className={cn("absolute -right-10 -bottom-12 size-56", tone.ring)} fill="none" viewBox="0 0 200 200">
            {[30, 50, 70, 90].map((r) => (
              <circle cx="100" cy="100" key={r} r={r} stroke="currentColor" strokeWidth="1.25" />
            ))}
          </svg>
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center font-heading font-semibold text-4xl tracking-tight sm:text-5xl",
              tone.text,
            )}
          >
            {initials(member.name)}
          </span>
        </button>

        <div className="p-4">
          <h3 className="truncate font-medium text-sm">{member.name}</h3>
          <p className="truncate text-muted-foreground text-xs">{member.role}</p>
          <p className="mt-2.5 flex items-center gap-1.5 text-muted-foreground text-xs">
            <span className="truncate">{member.location}</span>
            {time && (
              <>
                <span aria-hidden className="size-0.5 shrink-0 rounded-full bg-foreground/30" />
                <span className="shrink-0 font-mono tabular-nums" title="Local time">
                  {time}
                </span>
              </>
            )}
          </p>
        </div>

        <motion.div
          animate={open ? { y: "0%", opacity: 1 } : { y: reduce ? "0%" : "12%", opacity: 0 }}
          className={cn(
            "absolute inset-0 flex flex-col bg-card p-4",
            !open && "pointer-events-none",
          )}
          id={bioId}
          inert={!open}
          initial={false}
          transition={{ duration: 0.22, ease }}
        >
          <p className="font-medium text-sm">{member.name}</p>
          <p className="text-muted-foreground text-xs">{member.role}</p>
          <p className="mt-2.5 line-clamp-4 shrink-0 text-pretty text-xs leading-relaxed sm:mt-3 sm:line-clamp-6 sm:text-[0.8125rem]">{member.bio}</p>
          <div className="mt-auto flex gap-1 pt-3">
            {links.email && (
              <a
                aria-label={`Email ${member.name}`}
                className="flex size-8 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-xs/5 outline-none transition-[color,translate,scale,rotate] duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.94]"
                href={`mailto:${links.email}`}
              >
                <MailIcon className="size-3.5" />
              </a>
            )}
            {links.website && (
              <a
                aria-label={`${member.name}'s website`}
                className="flex size-8 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-xs/5 outline-none transition-[color,translate,scale,rotate] duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.94]"
                href={links.website}
              >
                <GlobeIcon className="size-3.5" />
              </a>
            )}
            {links.handle && (
              <a
                className="flex h-8 min-w-0 items-center gap-1 rounded-lg border bg-background px-2 text-muted-foreground text-xs shadow-xs/5 outline-none transition-[color,translate,scale,rotate] duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
                href={`#${links.handle}`}
              >
                <AtSignIcon className="size-3 shrink-0" />
                <span className="truncate">{links.handle}</span>
              </a>
            )}
          </div>
        </motion.div>
      </article>
    </motion.li>
  );
}

export function TeamGrid({
  eyebrow = "Team",
  title = "The people behind it",
  description,
  members,
  hiring,
  className,
}: TeamGridProps) {
  const reduce = useReducedMotionSafe();
  const tabsId = useId();
  const now = useNow();
  const teams = ["Everyone", ...Array.from(new Set(members.map((m) => m.team)))];
  const [team, setTeam] = useState("Everyone");
  const shown = members.filter((m) => team === "Everyone" || m.team === team);

  return (
    <MotionConfig reducedMotion="user">
      <section className={cn("mx-auto w-full max-w-[1100px]", className)}>
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            {eyebrow && <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">{eyebrow}</p>}
            <h2 className="mt-2 text-balance font-heading font-semibold text-3xl tracking-tight sm:text-4xl">{title}</h2>
            {description && <p className="mt-3 text-pretty text-muted-foreground text-sm leading-relaxed">{description}</p>}
          </div>
          <div
            aria-label="Filter by team"
            className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0"
            role="group"
          >
            {teams.map((t) => {
              const on = t === team;
              return (
                <button
                  aria-pressed={on}
                  className={cn(
                    "relative h-8 shrink-0 cursor-pointer rounded-full px-3 font-medium text-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                    on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  key={t}
                  onClick={() => setTeam(t)}
                  type="button"
                >
                  {on && (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-accent"
                      layoutId={tabsId}
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <span className="relative">{t}</span>
                </button>
              );
            })}
          </div>
        </header>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((member) => (
              <MemberCard index={members.indexOf(member)} key={member.name} member={member} now={now} />
            ))}
            {hiring && (
              <motion.li key="hiring" layout="position" transition={{ duration: 0.3, ease }}>
                <a
                  className="group/hire flex h-full min-h-56 flex-col justify-between rounded-2xl border border-dashed p-4 outline-none transition-[background-color,border-color,translate,scale,rotate] duration-200 ease-out hover:border-foreground/20 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                  href={hiring.href}
                >
                  <span className="flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs/5 transition-transform duration-200 ease-out group-hover/hire:rotate-90">
                    <PlusIcon className="size-4" />
                  </span>
                  <span>
                    <span className="flex items-center gap-2 font-medium text-sm">
                      {hiring.title}
                      {hiring.count !== undefined && (
                        <span className="rounded-full bg-success/10 px-1.5 py-px font-medium text-[0.625rem] text-success-foreground tabular-nums">
                          {hiring.count} open
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-pretty text-muted-foreground text-xs leading-relaxed">{hiring.text}</span>
                    <span className="mt-3 inline-flex items-center gap-1 font-medium text-xs">
                      See roles
                      <ArrowUpRightIcon className="size-3.5 transition-transform duration-200 ease-out group-hover/hire:translate-x-0.5 group-hover/hire:-translate-y-0.5" />
                    </span>
                  </span>
                </a>
              </motion.li>
            )}
          </AnimatePresence>
        </ul>
      </section>
    </MotionConfig>
  );
}
