"use client";

import { CheckCheckIcon, CheckIcon, SparklesIcon, Undo2Icon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Fragment, type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export interface DiffChange {
  del?: string;
  ins?: string;
  reason?: string;
}

export type DiffSegment = string | DiffChange;

export interface RedlineProps {
  segments: DiffSegment[];
  title?: string;
  onComplete?: (text: string) => void;
  className?: string;
}

type Decision = "accepted" | "rejected";

const spring = { type: "spring", stiffness: 440, damping: 32 } as const;

function Count({ value }: { value: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-flex h-4 min-w-[1ch] justify-center overflow-hidden tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
          initial={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
          key={value}
          transition={spring}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Redline({ segments, title = "Suggested edits", onComplete, className }: RedlineProps) {
  const reduce = useReducedMotion();
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [history, setHistory] = useState<number[][]>([]);
  const [hot, setHot] = useState<number | null>(null);
  const refs = useRef<Record<number, HTMLSpanElement | null>>({});
  const warm = useRef(false);
  const openTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const coolTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const instant = warm.current;

  useEffect(() => {
    if (hot !== null) {
      clearTimeout(coolTimer.current);
      warm.current = true;
    } else {
      coolTimer.current = setTimeout(() => {
        warm.current = false;
      }, 400);
    }
  }, [hot]);
  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(coolTimer.current);
    },
    [],
  );

  const show = (i: number, now = false) => {
    clearTimeout(openTimer.current);
    if (now || warm.current) setHot(i);
    else openTimer.current = setTimeout(() => setHot(i), 120);
  };
  const hide = (i: number) => {
    clearTimeout(openTimer.current);
    setHot((h) => (h === i ? null : h));
  };

  const wrapRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ i: number; x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    if (hot === null) return;
    const el = refs.current[hot];
    const wrap = wrapRef.current;
    const first = el?.getClientRects()[0];
    if (!wrap || !first) return;
    const box = wrap.getBoundingClientRect();
    const half = (barRef.current?.offsetWidth ?? 0) / 2;
    const center = first.left - box.left + first.width / 2;
    setPos({ i: hot, x: Math.min(Math.max(center, half + 8), box.width - half - 8), y: first.top - box.top });
  }, [hot]);

  const changeIdx = segments.flatMap((s, i) => (typeof s === "string" ? [] : [i]));
  const pending = changeIdx.filter((i) => !decisions[i]);
  const accepted = changeIdx.filter((i) => decisions[i] === "accepted").length;
  const done = pending.length === 0;

  const finalText = segments
    .map((s, i) => (typeof s === "string" ? s : decisions[i] === "rejected" ? (s.del ?? "") : (s.ins ?? "")))
    .join("");

  const reported = useRef(false);
  useEffect(() => {
    if (done && !reported.current) {
      reported.current = true;
      onComplete?.(finalText);
    }
    if (!done) reported.current = false;
  }, [done, finalText, onComplete]);

  const focusNext = (from: number, dir: 1 | -1, list = pending) => {
    const ordered = dir === 1 ? list : [...list].reverse();
    const next = ordered.find((i) => (dir === 1 ? i > from : i < from)) ?? ordered.find((i) => i !== from);
    if (next !== undefined) refs.current[next]?.focus();
  };

  const decide = (i: number, d: Decision) => {
    setDecisions((prev) => ({ ...prev, [i]: d }));
    setHistory((h) => [...h, [i]]);
    focusNext(
      i,
      1,
      pending.filter((p) => p !== i),
    );
  };

  const acceptAll = () => {
    if (!pending.length) return;
    setDecisions((prev) => ({ ...prev, ...Object.fromEntries(pending.map((i) => [i, "accepted" as const])) }));
    setHistory((h) => [...h, pending]);
  };

  const undo = () => {
    const last = history.at(-1);
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setDecisions((prev) => {
      const next = { ...prev };
      for (const i of last) delete next[i];
      return next;
    });
    setTimeout(() => refs.current[last[0]]?.focus(), 0);
  };

  const onChangeKey = (e: KeyboardEvent, i: number) => {
    const k = e.key.toLowerCase();
    if (k === "enter" || k === "a" || k === "y") {
      e.preventDefault();
      decide(i, "accepted");
    } else if (k === "backspace" || k === "delete" || k === "r" || k === "n") {
      e.preventDefault();
      decide(i, "rejected");
    } else if (k === "arrowright" || k === "arrowdown") {
      e.preventDefault();
      focusNext(i, 1);
    } else if (k === "arrowleft" || k === "arrowup") {
      e.preventDefault();
      focusNext(i, -1);
    }
  };

  const onRootKey = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
    }
  };

  return (
    <section
      aria-label={title}
      className={cn("w-full max-w-[480px] rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
      onKeyDown={onRootKey}
    >
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground max-sm:hidden">
          <SparklesIcon className="size-3" />
        </span>
        <h2 className="truncate font-medium text-sm">{title}</h2>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
          <Count value={pending.length} /> left
        </span>
        <div className="ms-auto flex shrink-0 items-center gap-1">
          <Button
            aria-label="Undo last decision"
            className="transition-[scale,background-color] duration-150 ease-out after:absolute after:-inset-0.5 active:scale-[0.97]"
            disabled={!history.length}
            onClick={undo}
            size="icon-sm"
            variant="ghost"
          >
            <Undo2Icon />
          </Button>
          <Button
            className="transition-[scale,background-color,box-shadow] duration-150 ease-out active:scale-[0.97]"
            disabled={done}
            onClick={acceptAll}
            size="sm"
            variant="outline"
          >
            <CheckCheckIcon className="max-sm:hidden" />
            Accept all
          </Button>
        </div>
      </header>

      <div className="relative" ref={wrapRef}>
      <p className="px-5 py-5 text-[15px] text-foreground/90 leading-[1.9]">
        {segments.map((seg, i) => {
          if (typeof seg === "string") return <Fragment key={i}>{seg}</Fragment>;
          const d = decisions[i];
          if (d) {
            const text = d === "accepted" ? seg.ins : seg.del;
            if (!text) return null;
            return (
              <motion.span
                animate={{ opacity: 1, filter: "blur(0px)" }}
                className={cn(d === "accepted" && "underline decoration-2 decoration-success/40 underline-offset-4")}
                initial={reduce ? false : { opacity: 0, filter: "blur(3px)" }}
                key={`${i}-${d}`}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              >
                {text}
              </motion.span>
            );
          }
          const label = [
            seg.del && seg.ins ? `Replace “${seg.del}” with “${seg.ins}”` : seg.ins ? `Insert “${seg.ins}”` : `Delete “${seg.del}”`,
            seg.reason,
            "Enter to accept, Backspace to reject",
          ]
            .filter(Boolean)
            .join(". ");
          return (
            <span
              aria-label={label}
              className="group/change cursor-default rounded-md outline-none [box-decoration-break:clone] focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              key={i}
              onBlur={() => hide(i)}
              onFocus={() => show(i, true)}
              onMouseEnter={() => show(i)}
              onMouseLeave={() => hide(i)}
              onKeyDown={(e) => onChangeKey(e, i)}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="button"
              tabIndex={0}
            >
              {seg.del && (
                <del className="rounded-sm bg-destructive/10 px-0.5 text-destructive-foreground decoration-destructive/60 decoration-[1.5px]">
                  {seg.del}
                </del>
              )}
              {seg.del && seg.ins && " "}
              {seg.ins && (
                <ins className="rounded-sm bg-success/12 px-0.5 text-success-foreground no-underline">{seg.ins}</ins>
              )}
              <AnimatePresence>
                {hot === i && (
                  <motion.span
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn(
                      "absolute z-10 -mt-1 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 whitespace-nowrap rounded-full border bg-popover p-0.5 text-popover-foreground leading-none shadow-md/5",
                      pos?.i !== i && "invisible",
                    )}
                    ref={barRef}
                    exit={{ opacity: 0, transition: { duration: instant ? 0 : 0.1 } }}
                    initial={instant ? false : reduce ? { opacity: 0 } : { opacity: 0, y: 3, scale: 0.95 }}
                    style={{ left: pos?.x ?? 0, top: pos?.y ?? 0, transformOrigin: "50% 100%" }}
                    transition={reduce ? { duration: 0.1 } : { type: "spring", stiffness: 600, damping: 38 }}
                  >
                    <button
                      aria-label="Accept change"
                      className="relative flex size-7 cursor-pointer items-center justify-center rounded-full text-success-foreground transition-[background-color,scale] duration-150 ease-out after:absolute after:-inset-0.5 hover:bg-success/12 active:scale-[0.97]"
                      onClick={() => decide(i, "accepted")}
                      onMouseDown={(e) => e.preventDefault()}
                      tabIndex={-1}
                      type="button"
                    >
                      <CheckIcon className="size-3.5" />
                    </button>
                    <button
                      aria-label="Reject change"
                      className="relative flex size-7 cursor-pointer items-center justify-center rounded-full text-destructive-foreground transition-[background-color,scale] duration-150 ease-out after:absolute after:-inset-0.5 hover:bg-destructive/10 active:scale-[0.97]"
                      onClick={() => decide(i, "rejected")}
                      onMouseDown={(e) => e.preventDefault()}
                      tabIndex={-1}
                      type="button"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                    {seg.reason && (
                      <span className="max-w-48 truncate px-1.5 text-[11px] text-muted-foreground">{seg.reason}</span>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          );
        })}
      </p>
      </div>

      <footer className="flex min-h-11 items-center gap-3 border-t px-4 py-2.5 text-muted-foreground text-xs">
        <AnimatePresence initial={false} mode="popLayout">
          {done ? (
            <motion.span
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              key="done"
              transition={spring}
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-success text-white">
                <CheckIcon className="size-2.5" strokeWidth={3} />
              </span>
              <span className="font-medium text-foreground">All changes reviewed</span>
              <span className="tabular-nums">
                {accepted} accepted · {changeIdx.length - accepted} rejected
              </span>
            </motion.span>
          ) : (
            <motion.span
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-x-3 gap-y-1"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              key="hint"
              transition={spring}
            >
              <span className="flex items-center gap-1">
                <Kbd>↵</Kbd> accept
              </span>
              <span className="flex items-center gap-1">
                <Kbd>⌫</Kbd> reject
              </span>
              <span className="flex items-center gap-1">
                <Kbd>←</Kbd>
                <Kbd>→</Kbd> move
              </span>
              <span className="flex items-center gap-1">
                <Kbd>⌘Z</Kbd> undo
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </footer>
    </section>
  );
}
