"use client";

import { SparklesIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export interface Typer {
  id: string;
  name: string;
  initials: string;
  avatarClassName?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;

function Dots({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  const reduce = useReducedMotionAfterMount();
  return (
    <span aria-hidden className={cn("inline-flex items-center", size === "md" ? "gap-1" : "gap-[3px]", className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          animate={reduce ? { opacity: [0.4, 0.9, 0.4] } : { y: [0, size === "md" ? -2 : -1.5, 0], opacity: [0.4, 0.9, 0.4] }}
          className={cn("rounded-full bg-current", size === "md" ? "size-1.5" : "size-1")}
          key={i}
          transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: i * 0.18 }}
        />
      ))}
    </span>
  );
}

function Avatar({ person, className }: { person: Typer; className?: string }) {
  return (
    <span
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

export interface TypingDotsProps {
  label?: string;
  className?: string;
}

export function TypingDots({ label = "Someone is typing", className }: TypingDotsProps) {
  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex h-9 items-center rounded-2xl rounded-bl-md bg-muted px-3.5 text-muted-foreground",
        className,
      )}
      role="status"
    >
      <Dots />
    </span>
  );
}

export interface TypingNameProps {
  person: Typer;
  className?: string;
}

export function TypingName({ person, className }: TypingNameProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-muted-foreground text-xs", className)} role="status">
      <Avatar className="size-5 text-[9px]" person={person} />
      <span>
        <span className="font-medium text-foreground">{person.name}</span> is typing
      </span>
      <Dots className="-ms-1 translate-y-[3px]" size="sm" />
    </span>
  );
}

function crowdLabel(people: Typer[]) {
  const names = people.map((p) => p.name.split(" ")[0]);
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is typing`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
  return `${names.length} people are typing`;
}

export interface TypingCrowdProps {
  people: Typer[];
  maxAvatars?: number;
  className?: string;
}

export function TypingCrowd({ people, maxAvatars = 3, className }: TypingCrowdProps) {
  const reduce = useReducedMotionAfterMount();
  const shown = people.slice(0, maxAvatars);
  const label = crowdLabel(people);
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 520, damping: 34 };

  return (
    <div className={cn("flex h-7 items-center gap-2.5 text-muted-foreground text-xs", className)} role="status">
      <motion.div className="flex items-center" layout transition={spring}>
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((p, i) => (
            <motion.span
              animate={{ opacity: 1, scale: 1, x: 0 }}
              className={cn("relative rounded-full ring-2 ring-card", i > 0 && "-ms-1")}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.14 } }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, x: -6 }}
              key={p.id}
              layout
              style={{ zIndex: maxAvatars - i }}
              transition={spring}
            >
              <Avatar className="size-6 text-[9px] tracking-tight" person={p} />
            </motion.span>
          ))}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {people.length > 0 && (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              className="relative -ms-1 flex h-5 items-center rounded-full border bg-card px-1.5 text-muted-foreground"
              exit={{ opacity: 0, scale: 0.85 }}
              initial={{ opacity: 0, scale: 0.85 }}
              layout
              transition={spring}
            >
              <Dots size="sm" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      <span className="relative min-w-0 flex-1">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className="block truncate"
            exit={{ opacity: 0, y: reduce ? 0 : -4, transition: { duration: 0.12 } }}
            initial={{ opacity: 0, y: reduce ? 0 : 4 }}
            key={label}
            transition={{ duration: 0.18, ease }}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  );
}

export interface ComposingIndicatorProps {
  name?: string;
  label?: string;
  showElapsed?: boolean;
  className?: string;
}

export function ComposingIndicator({
  name = "Lumen",
  label = "Composing a reply",
  showElapsed = true,
  className,
}: ComposingIndicatorProps) {
  const reduce = useReducedMotionAfterMount();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!showElapsed) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [showElapsed]);

  return (
    <span className={cn("inline-flex items-center gap-2 text-xs", className)} role="status">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <SparklesIcon className="size-3" />
      </span>
      <span className="sr-only">
        {name} is {label.toLowerCase()}
      </span>
      <motion.span
        animate={reduce ? undefined : { backgroundPosition: ["100% 0", "-100% 0"] }}
        aria-hidden
        className="bg-clip-text font-medium text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(90deg, var(--color-muted-foreground) 0%, var(--color-muted-foreground) 35%, var(--color-foreground) 50%, var(--color-muted-foreground) 65%, var(--color-muted-foreground) 100%)",
          backgroundSize: "200% 100%",
          backgroundPosition: reduce ? "0 0" : undefined,
        }}
        transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      >
        {label}
      </motion.span>
      {showElapsed && (
        <span aria-hidden className="text-muted-foreground/72 tabular-nums">
          {seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`}
        </span>
      )}
    </span>
  );
}
