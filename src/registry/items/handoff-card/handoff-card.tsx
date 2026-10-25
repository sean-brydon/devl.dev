"use client";

import {
  ArrowRightIcon,
  BellIcon,
  CheckIcon,
  CircleHelpIcon,
  FileTextIcon,
  GitPullRequestIcon,
  type LucideIcon,
  MessageSquareIcon,
  Undo2Icon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Stays false until mounted so the server render and the first client render match.
function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export interface HandoffPerson {
  name: string;
  initials: string;
  avatarClassName?: string;
}

export interface HandoffLink {
  label: string;
  meta?: string;
  href?: string;
  kind?: "pr" | "doc" | "thread";
}

export interface HandoffCardProps {
  from: HandoffPerson;
  to: HandoffPerson;
  title: string;
  summary: string;
  questions?: string[];
  links?: HandoffLink[];
  sentAt?: string;
  acceptedAt?: string;
  defaultAccepted?: boolean;
  onAccept?: () => void;
  onUndo?: () => void;
  onAsk?: () => void;
  className?: string;
}

const linkIcon: Record<NonNullable<HandoffLink["kind"]>, LucideIcon> = {
  pr: GitPullRequestIcon,
  doc: FileTextIcon,
  thread: MessageSquareIcon,
};

function Avatar({ person, className }: { person: HandoffPerson; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-medium",
        person.avatarClassName ?? "bg-muted text-foreground",
        className,
      )}
    >
      {person.initials}
    </span>
  );
}

function first(p: HandoffPerson) {
  return p.name.split(" ")[0];
}

export function HandoffCard({
  from,
  to,
  title,
  summary,
  questions = [],
  links = [],
  sentAt = "Today, 4:10 PM",
  acceptedAt,
  defaultAccepted = false,
  onAccept,
  onUndo,
  onAsk,
  className,
}: HandoffCardProps) {
  const reduce = useSafeReducedMotion();
  const [accepted, setAccepted] = useState(defaultAccepted);
  const [stamp, setStamp] = useState(acceptedAt ?? "");

  const accept = () => {
    setStamp(acceptedAt ?? new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    setAccepted(true);
    onAccept?.();
  };
  const undo = () => {
    setAccepted(false);
    onUndo?.();
  };

  const face = "col-start-1 row-start-1 flex flex-col rounded-2xl border bg-card text-card-foreground shadow-xs/5 [backface-visibility:hidden]";

  return (
    <div className={cn("w-full max-w-[400px] [perspective:1400px]", className)}>
      <motion.div
        animate={reduce ? undefined : { rotateY: accepted ? 180 : 0 }}
        className="grid [transform-style:preserve-3d]"
        initial={false}
        transition={{ type: "spring", stiffness: 220, damping: 28 }}
      >
        <motion.section
          animate={reduce ? { opacity: accepted ? 0 : 1 } : undefined}
          aria-hidden={accepted}
          aria-label={`Handoff from ${from.name}: ${title}`}
          className={cn(face, accepted && "pointer-events-none")}
          inert={accepted}
          transition={{ duration: 0.2 }}
        >
          <header className="flex items-center gap-2 px-4 pt-4">
            <div className="flex items-center">
              <Avatar className="size-7 text-[10px] ring-2 ring-card" person={from} />
              <span className="z-10 -mx-1 flex size-4 items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-border">
                <ArrowRightIcon className="size-2.5" />
              </span>
              <Avatar className="size-7 text-[10px] ring-2 ring-card" person={to} />
            </div>
            <p className="min-w-0 flex-1 truncate text-muted-foreground text-xs">
              <span className="font-medium text-foreground">{first(from)}</span> handed this to{" "}
              <span className="font-medium text-foreground">{first(to)}</span>
            </p>
            <span className="shrink-0 text-muted-foreground text-xs">{sentAt}</span>
          </header>

          <div className="px-4 pt-3">
            <h3 className="text-balance font-medium text-base leading-snug tracking-tight">{title}</h3>
            <p className="mt-1 text-pretty text-muted-foreground text-sm leading-relaxed">{summary}</p>
          </div>

          {questions.length > 0 && (
            <div className="px-4 pt-4">
              <h4 className="mb-1.5 font-medium text-muted-foreground text-xs">
                Open questions <span className="tabular-nums">· {questions.length}</span>
              </h4>
              <ul className="space-y-1.5">
                {questions.map((q) => (
                  <li className="flex gap-2 text-sm leading-snug" key={q}>
                    <CircleHelpIcon className="mt-0.5 size-3.5 shrink-0 text-warning-foreground" />
                    <span className="text-pretty">{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {links.length > 0 && (
            <div className="px-3 pt-4">
              <h4 className="mb-1 px-1 font-medium text-muted-foreground text-xs">Links</h4>
              <ul>
                {links.map((l) => {
                  const Icon = linkIcon[l.kind ?? "doc"];
                  return (
                    <li key={l.label}>
                      <a
                        className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                        href={l.href ?? "#"}
                        onClick={(e) => !l.href && e.preventDefault()}
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground dark:bg-input/32">
                          <Icon className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{l.label}</span>
                        {l.meta && <span className="shrink-0 font-mono text-muted-foreground text-xs">{l.meta}</span>}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <footer className="mt-auto flex items-center justify-end gap-2 px-4 pt-4 pb-4">
            {onAsk && (
              <Button onClick={onAsk} size="sm" variant="ghost">
                Ask {first(from)}
              </Button>
            )}
            <Button onClick={accept} size="sm">
              <CheckIcon />
              Accept handoff
            </Button>
          </footer>
        </motion.section>

        <motion.section
          animate={reduce ? { opacity: accepted ? 1 : 0 } : undefined}
          aria-hidden={!accepted}
          aria-label={`${title}, now with ${to.name}`}
          className={cn(face, "items-center px-4 pt-7 pb-4 text-center", !accepted && "pointer-events-none")}
          inert={!accepted}
          initial={false}
          style={reduce ? undefined : { transform: "rotateY(180deg)" }}
          transition={{ duration: 0.2 }}
        >
          <div className="relative">
            <motion.div
              animate={accepted ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
              initial={false}
              transition={reduce ? { duration: 0.2 } : { type: "spring", stiffness: 300, damping: 20, delay: accepted ? 0.28 : 0 }}
            >
              <Avatar className="size-16 text-lg ring-4 ring-card" person={to} />
            </motion.div>
            <motion.span
              animate={accepted ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
              className="absolute -end-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full bg-success text-white ring-[3px] ring-card"
              initial={false}
              transition={reduce ? { duration: 0.2 } : { type: "spring", stiffness: 500, damping: 22, delay: accepted ? 0.42 : 0 }}
            >
              <CheckIcon className="size-3.5" strokeWidth={3} />
            </motion.span>
          </div>

          <p className="mt-4 font-medium text-muted-foreground text-xs">{title}</p>
          <h3 className="mt-1 text-balance font-semibold text-xl tracking-tight">Now with {first(to)}</h3>
          <p className="mt-1 text-pretty text-muted-foreground text-sm">
            Accepted{stamp ? ` at ${stamp}` : ""}. {first(to)} owns it from here.
          </p>

          {(questions.length > 0 || links.length > 0) && (
            <div className="mt-5 w-full rounded-xl border text-left">
              <p className="border-b px-3 py-2 font-medium text-muted-foreground text-xs">
                {first(to)} picked up
              </p>
              <ul className="space-y-2 px-3 py-2.5">
                {questions.map((q, i) => (
                  <motion.li
                    animate={accepted ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
                    className="flex gap-2 text-xs leading-snug"
                    initial={false}
                    key={q}
                    transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: accepted && !reduce ? 0.45 + i * 0.04 : 0 }}
                  >
                    <CircleHelpIcon className="size-3.5 shrink-0 text-warning-foreground" />
                    <span className="text-pretty">{q}</span>
                  </motion.li>
                ))}
              </ul>
              {links.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t px-3 py-2.5">
                  {links.map((l) => {
                    const Icon = linkIcon[l.kind ?? "doc"];
                    return (
                      <span
                        className="flex h-6 max-w-full items-center gap-1 rounded-full bg-muted px-2 text-muted-foreground text-xs"
                        key={l.label}
                      >
                        <Icon className="size-3 shrink-0" />
                        <span className="truncate">{l.meta && l.kind === "pr" ? l.meta : l.label}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="mt-auto w-full pt-4">
          <div className="flex w-full items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-left text-xs">
            <BellIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 text-muted-foreground">
              <span className="font-medium text-foreground">{first(from)}</span> was notified and stays in the loop.
            </span>
            <Button className="-me-1" onClick={undo} size="xs" variant="ghost">
              <Undo2Icon />
              Undo
            </Button>
          </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
