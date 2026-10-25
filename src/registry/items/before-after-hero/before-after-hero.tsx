"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  ChevronsLeftRightIcon,
  Clock3Icon,
  CopyMinusIcon,
  FileSpreadsheetIcon,
  MailCheckIcon,
  ReceiptTextIcon,
  SigmaIcon,
} from "lucide-react";
import {
  type AnimationPlaybackControls,
  animate,
  motion,
  type Transition,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export type ExpenseCategory = "Meals" | "Travel" | "Software" | "Shipping" | "Office";
export type SheetMark = "highlight" | "error";

export interface ExpenseLine {
  id: string;
  date: string;
  merchant: string;
  spender?: string;
  category: ExpenseCategory;
  amount: number;
  receipt: "matched" | "found" | "duplicate";
  sheet: {
    date: string;
    description: string;
    category?: string;
    amount: string;
    note?: string;
    marks?: Partial<Record<"category" | "amount" | "note", SheetMark>>;
  };
}

export interface BeforeAfterHeroProps {
  eyebrow?: string;
  headline: { lead: string; before: string; after: string };
  description?: ReactNode;
  cta: { label: string; href?: string };
  note?: string;
  before: { label: string; file: string; editedBy: string; formula: string; status: string; sticky?: string };
  after: { product: string; title: string; company: string; status: string };
  lines: ExpenseLine[];
  currency?: string;
  defaultPosition?: number;
  className?: string;
}

type Side = "before" | "after";

const ease = [0.23, 1, 0.32, 1] as const;
const settle: Transition = { type: "spring", stiffness: 420, damping: 36 };
const chase: Transition = { type: "spring", stiffness: 560, damping: 44 };

const tones: Record<ExpenseCategory, string> = {
  Meals: "bg-amber-500/12 text-amber-700 dark:bg-amber-400/12 dark:text-amber-300",
  Travel: "bg-sky-500/12 text-sky-700 dark:bg-sky-400/12 dark:text-sky-300",
  Software: "bg-violet-500/12 text-violet-700 dark:bg-violet-400/14 dark:text-violet-300",
  Shipping: "bg-rose-500/12 text-rose-700 dark:bg-rose-400/12 dark:text-rose-300",
  Office: "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-300",
};

const columns =
  "grid grid-cols-[2rem_minmax(0,1fr)_5.75rem_5.25rem] @2xl/compare:grid-cols-[2.5rem_5rem_minmax(0,1fr)_9rem_7rem_11rem]";
const wideOnly = "hidden @2xl/compare:flex";

const clamp = (value: number) => Math.min(100, Math.max(0, value));

function SheetCell({
  children,
  mark,
  selected,
  className,
}: {
  children?: ReactNode;
  mark?: SheetMark;
  selected?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 items-center border-r px-2 last:border-r-0",
        mark === "highlight" && "bg-amber-300/35 dark:bg-amber-400/15",
        mark === "error" && "bg-destructive/8 text-destructive-foreground",
        selected && "outline-2 -outline-offset-2 outline-info",
        className,
      )}
    >
      <span className="truncate">{children}</span>
      {mark === "error" && (
        <span className="absolute top-0 right-0 size-2 bg-destructive [clip-path:polygon(0_0,100%_0,100%_100%)]" />
      )}
    </div>
  );
}

function SheetLayer({
  lines,
  before,
}: {
  lines: ExpenseLine[];
  before: BeforeAfterHeroProps["before"];
}) {
  return (
    <div aria-hidden className="relative flex flex-col bg-background text-xs">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
        <FileSpreadsheetIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">{before.file}</span>
        <span className="hidden shrink-0 text-muted-foreground @3xl/compare:inline">{before.editedBy}</span>
        <span className="ms-2 hidden h-6 min-w-0 flex-1 items-center gap-2 rounded-md border bg-muted/60 px-2 font-mono text-[0.6875rem] @2xl/compare:flex">
          <span className="text-muted-foreground italic">fx</span>
          <span className="truncate">{before.formula}</span>
        </span>
        <span className="ms-auto flex shrink-0 items-center gap-1.5 font-medium text-warning-foreground">
          <Clock3Icon className="size-3.5" />
          {before.status}
        </span>
      </div>
      <div className={cn(columns, "h-7 shrink-0 border-b bg-muted font-mono text-[0.625rem] text-muted-foreground")}>
        <span className="border-r" />
        {["A", "B", "C", "D", "E"].map((letter) => (
          <span
            className={cn(
              "items-center justify-center border-r last:border-r-0",
              letter === "A" || letter === "E" ? wideOnly : "flex",
            )}
            key={letter}
          >
            {letter}
          </span>
        ))}
      </div>
      {lines.map((line, i) => (
        <div className={cn(columns, "h-10 shrink-0 border-b")} key={line.id}>
          <SheetCell className="justify-center bg-muted font-mono text-[0.625rem] text-muted-foreground">{i + 1}</SheetCell>
          <SheetCell className={cn(wideOnly, "font-mono tabular-nums")}>{line.sheet.date}</SheetCell>
          <SheetCell className="font-mono text-[0.6875rem] uppercase">{line.sheet.description}</SheetCell>
          <SheetCell mark={line.sheet.marks?.category}>{line.sheet.category}</SheetCell>
          <SheetCell className="justify-end font-mono tabular-nums" mark={line.sheet.marks?.amount}>
            {line.sheet.amount}
          </SheetCell>
          <SheetCell className={wideOnly} mark={line.sheet.marks?.note}>
            {line.sheet.note}
          </SheetCell>
        </div>
      ))}
      <div className={cn(columns, "h-10 shrink-0")}>
        <SheetCell className="justify-center bg-muted font-mono text-[0.625rem] text-muted-foreground">
          {lines.length + 1}
        </SheetCell>
        <SheetCell className={wideOnly} />
        <SheetCell className="font-mono font-semibold text-[0.6875rem]">TOTAL</SheetCell>
        <SheetCell />
        <SheetCell className="justify-end font-mono font-semibold" mark="error" selected>
          #REF!
        </SheetCell>
        <SheetCell className={wideOnly} mark="highlight">
          fix before fri!!
        </SheetCell>
      </div>
      {before.sticky && (
        <div className="absolute top-[14.75rem] left-[18.5rem] hidden w-44 -rotate-3 rounded-sm bg-amber-200 p-3 font-medium text-[0.6875rem] text-amber-950 leading-snug shadow-md/10 @4xl/compare:block">
          {before.sticky}
        </div>
      )}
    </div>
  );
}

function LedgerLayer({
  lines,
  after,
  format,
}: {
  lines: ExpenseLine[];
  after: BeforeAfterHeroProps["after"];
  format: (n: number) => string;
}) {
  const kept = lines.filter((line) => line.receipt !== "duplicate");
  const removed = lines.length - kept.length;
  const total = kept.reduce((sum, line) => sum + line.amount, 0);
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex flex-col bg-card text-xs [clip-path:inset(var(--pos)_0_0_0)] @2xl/compare:[clip-path:inset(0_0_0_var(--pos))]"
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary font-semibold text-[0.625rem] text-primary-foreground">
          {after.product.charAt(0)}
        </span>
        <span className="truncate font-medium">{after.title}</span>
        <span className="hidden truncate text-muted-foreground @2xl/compare:inline">{after.company}</span>
        <span className="ms-auto flex shrink-0 items-center gap-1.5 font-medium text-success-foreground">
          <CheckIcon className="size-3.5" />
          {after.status}
        </span>
      </div>
      <div className={cn(columns, "h-7 shrink-0 border-b font-medium text-[0.6875rem] text-muted-foreground")}>
        <span />
        <span className={cn(wideOnly, "items-center px-2")}>Date</span>
        <span className="flex items-center px-2">Merchant</span>
        <span className="flex items-center px-2">Category</span>
        <span className="flex items-center justify-end px-2">Amount</span>
        <span className={cn(wideOnly, "items-center px-3")}>Receipt</span>
      </div>
      {lines.map((line) => {
        const duplicate = line.receipt === "duplicate";
        return (
          <div className={cn(columns, "h-10 shrink-0 border-b", duplicate && "text-muted-foreground")} key={line.id}>
            <span className="flex items-center justify-center">
              {duplicate ? (
                <CopyMinusIcon className="size-3.5" />
              ) : (
                <span className="flex size-4 items-center justify-center rounded-full bg-success/16 text-success-foreground">
                  <CheckIcon className="size-2.5" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className={cn(wideOnly, "items-center px-2 text-muted-foreground tabular-nums")}>{line.date}</span>
            <span className="flex min-w-0 items-center gap-2 px-2 @3xl/compare:grid @3xl/compare:grid-cols-[1.5rem_minmax(0,17rem)_minmax(0,1fr)]">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md font-semibold text-[0.625rem]",
                  duplicate ? "bg-muted" : tones[line.category],
                )}
              >
                {line.merchant.charAt(0)}
              </span>
              <span className={cn("truncate text-[0.8125rem]", !duplicate && "font-medium text-foreground")}>
                {line.merchant}
              </span>
              {line.spender && (
                <span className="hidden truncate text-[0.6875rem] text-muted-foreground @3xl/compare:inline">
                  {line.spender}
                </span>
              )}
            </span>
            <span className="flex items-center px-2">
              {duplicate ? (
                <span className="text-[0.6875rem]">Duplicate</span>
              ) : (
                <span
                  className={cn(
                    "inline-flex h-5 items-center rounded-full px-2 font-medium text-[0.6875rem]",
                    tones[line.category],
                  )}
                >
                  {line.category}
                </span>
              )}
            </span>
            <span
              className={cn(
                "flex items-center justify-end px-2 text-[0.8125rem] tabular-nums",
                duplicate ? "line-through decoration-muted-foreground/60" : "font-medium text-foreground",
              )}
            >
              {format(line.amount)}
            </span>
            <span className={cn(wideOnly, "items-center gap-1.5 px-3", !duplicate && "text-foreground")}>
              {line.receipt === "matched" && <ReceiptTextIcon className="size-3.5 text-success-foreground" />}
              {line.receipt === "found" && <MailCheckIcon className="size-3.5 text-success-foreground" />}
              {line.receipt === "matched" ? "Receipt matched" : line.receipt === "found" ? "Found in inbox" : "Merged into row 2"}
            </span>
          </div>
        );
      })}
      <div className={cn(columns, "h-10 shrink-0")}>
        <span className="flex items-center justify-center text-muted-foreground">
          <SigmaIcon className="size-3.5" />
        </span>
        <span className={wideOnly} />
        <span className="flex min-w-0 items-center gap-1.5 px-2">
          <span className="font-medium text-[0.8125rem]">Total</span>
          <span className="hidden truncate text-muted-foreground @2xl/compare:inline">
            {kept.length} expenses{removed > 0 ? `, ${removed} duplicate removed` : ""}
          </span>
        </span>
        <span />
        <span className="flex items-center justify-end px-2 font-semibold text-[0.8125rem] tabular-nums">{format(total)}</span>
        <span className={cn(wideOnly, "items-center px-3")}>
          <span className="inline-flex h-5 items-center gap-1 rounded-full bg-success/14 px-2 font-medium text-[0.6875rem] text-success-foreground">
            <CheckIcon className="size-3" strokeWidth={2.5} />
            Ready to close
          </span>
        </span>
      </div>
    </div>
  );
}

function Ending({ text, active, side, reduce }: { text: string; active: boolean; side: Side; reduce: boolean }) {
  const away = side === "before" ? "-0.35em" : "0.35em";
  return (
    <motion.span
      animate={
        active
          ? { opacity: 1, y: "0em", filter: "blur(0px)" }
          : { opacity: 0, y: reduce ? "0em" : away, filter: reduce ? "blur(0px)" : "blur(6px)" }
      }
      aria-hidden={!active}
      className={cn(
        "relative col-start-1 row-start-1 justify-self-start",
        side === "before" &&
          "underline decoration-[length:0.05em] decoration-destructive/60 decoration-wavy underline-offset-[0.22em] [text-decoration-skip-ink:none]",
      )}
      initial={false}
      transition={{ duration: active ? 0.32 : 0.2, ease }}
    >
      {text}
      {side === "after" && (
        <motion.span
          animate={reduce ? { opacity: active ? 1 : 0, scaleX: 1 } : { opacity: 1, scaleX: active ? 1 : 0 }}
          className="absolute inset-x-0 -bottom-[0.06em] h-[0.07em] origin-left rounded-full bg-success"
          initial={false}
          transition={{ duration: active ? 0.5 : 0.15, ease, delay: active && !reduce ? 0.12 : 0 }}
        />
      )}
    </motion.span>
  );
}

export function BeforeAfterHero({
  eyebrow,
  headline,
  description,
  cta,
  note,
  before,
  after,
  lines,
  currency = "USD",
  defaultPosition = 55,
  className,
}: BeforeAfterHeroProps) {
  const reduce = useReducedMotionSafe();
  const start = clamp(defaultPosition);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pos = useMotionValue(start);
  const clamped = useTransform(pos, clamp);
  const cssPos = useMotionTemplate`${clamped}%`;
  const [value, setValue] = useState(Math.round(start));
  const [side, setSide] = useState<Side>(start < 50 ? "after" : "before");
  const [vertical, setVertical] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const sideRef = useRef<Side>(side);
  const interactedRef = useRef(false);
  const targetRef = useRef(start);
  const motionRef = useRef<AnimationPlaybackControls | null>(null);
  const hintRef = useRef<AnimationPlaybackControls | null>(null);
  const dragRef = useRef<{ id: number; offset: number; chasing: boolean } | null>(null);
  const tapRef = useRef<{ x: number; y: number } | null>(null);
  const inView = useInView(frameRef, { once: true, amount: 0.6 });
  const { format } = new Intl.NumberFormat("en-US", { style: "currency", currency });

  useMotionValueEvent(clamped, "change", (v) => {
    setValue(Math.round(v));
    const current = sideRef.current;
    const next: Side = current === "before" ? (v < 49 ? "after" : "before") : v > 51 ? "before" : "after";
    if (next === current) return;
    sideRef.current = next;
    setSide(next);
    if (interactedRef.current) setAnnouncement(`${headline.lead} ${next === "before" ? headline.before : headline.after}`);
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const check = () => {
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setVertical(el.clientWidth < 42 * rem);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || reduce || interactedRef.current) return;
    const nudge = start >= 50 ? Math.min(7, 100 - start) : -Math.min(7, start);
    const timer = window.setTimeout(() => {
      if (interactedRef.current) return;
      hintRef.current = animate(pos, [start, start + nudge, start - nudge * 0.18, start], {
        duration: 1.15,
        times: [0, 0.42, 0.78, 1],
        ease: ["easeInOut", "easeOut", "easeInOut"],
      });
    }, 650);
    return () => {
      window.clearTimeout(timer);
      hintRef.current?.stop();
    };
  }, [inView, reduce, pos, start]);

  const wake = () => {
    hintRef.current?.stop();
    if (interactedRef.current) return;
    interactedRef.current = true;
    setInteracted(true);
  };

  const glide = (target: number, transition: Transition) => {
    motionRef.current?.stop();
    targetRef.current = target;
    motionRef.current = animate(pos, target, reduce ? { duration: 0 } : transition);
    return motionRef.current;
  };

  const percentAt = (x: number, y: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return pos.get();
    return clamp(vertical ? ((y - rect.top) / rect.height) * 100 : ((x - rect.left) / rect.width) * 100);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    wake();
    const grabbed = (e.target as HTMLElement).closest("[data-grab]") !== null;
    if (vertical && e.pointerType !== "mouse" && !grabbed) {
      tapRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (!knobRef.current?.contains(e.target as Node)) e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const at = percentAt(e.clientX, e.clientY);
    if (grabbed) {
      motionRef.current?.stop();
      dragRef.current = { id: e.pointerId, offset: at - pos.get(), chasing: false };
    } else {
      dragRef.current = { id: e.pointerId, offset: 0, chasing: true };
      glide(at, chase).finished.then(() => {
        if (dragRef.current) dragRef.current.chasing = false;
      });
    }
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    const target = clamp(percentAt(e.clientX, e.clientY) - drag.offset);
    if (drag.chasing && !reduce) {
      glide(target, chase);
      return;
    }
    motionRef.current?.stop();
    targetRef.current = target;
    pos.set(target);
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const tap = tapRef.current;
    if (tap) {
      tapRef.current = null;
      if (e.type === "pointerup" && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 10) {
        glide(percentAt(e.clientX, e.clientY), settle);
      }
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    const velocity = pos.getVelocity();
    let target = drag.chasing ? targetRef.current : clamp(pos.get() + velocity * 0.12);
    if (target < 8) target = 0;
    else if (target > 92) target = 100;
    glide(target, { type: "spring", stiffness: 300, damping: 20, velocity });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 5;
    const page = vertical ? -20 : 20;
    const moves: Record<string, number> = vertical
      ? { ArrowUp: -step, ArrowLeft: -step, ArrowDown: step, ArrowRight: step, PageUp: page, PageDown: -page }
      : { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step, PageUp: page, PageDown: -page };
    let next: number;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;
    else if (e.key in moves) next = Math.round(targetRef.current) + moves[e.key];
    else return;
    e.preventDefault();
    wake();
    glide(clamp(next), settle);
  };

  const beforeLabel = before.label;
  const afterLabel = after.product;

  return (
    <section className={cn("@container/hero mx-auto w-full max-w-[1100px]", className)}>
      <div className="grid gap-6 @3xl/hero:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] @3xl/hero:items-end @3xl/hero:gap-12">
        <div>
          {eyebrow && <p className="font-medium text-muted-foreground text-sm">{eyebrow}</p>}
          <h1 className="mt-3 font-heading font-semibold text-[2.5rem] leading-[1.04] tracking-tight @lg/hero:text-5xl @3xl/hero:text-[4rem]">
            <span className="block">{headline.lead}</span>
            <span className="grid">
              <Ending active={side === "before"} reduce={reduce} side="before" text={headline.before} />
              <Ending active={side === "after"} reduce={reduce} side="after" text={headline.after} />
            </span>
          </h1>
          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>
        </div>
        <div className="flex flex-col gap-5 @3xl/hero:pb-2">
          {description && (
            <p className="text-pretty text-muted-foreground text-sm leading-relaxed @lg/hero:text-base">{description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button
              className="transition-[box-shadow,background-color,transform] duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100"
              render={<a href={cta.href ?? "#"} />}
              size="lg"
            >
              {cta.label}
              <ArrowRightIcon />
            </Button>
            {note && <span className="text-muted-foreground text-xs">{note}</span>}
          </div>
        </div>
      </div>

      <div className="@container/compare mt-8" ref={containerRef}>
        <motion.div
          className={cn(
            "relative cursor-ns-resize touch-auto select-none overflow-hidden rounded-2xl border bg-background shadow-xs/5 @2xl/compare:cursor-ew-resize @2xl/compare:touch-pan-y",
            dragging && "cursor-grabbing @2xl/compare:cursor-grabbing",
          )}
          onPointerCancel={onPointerEnd}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          ref={frameRef}
          style={{ "--pos": cssPos } as unknown as CSSProperties}
        >
          <SheetLayer before={before} lines={lines} />
          <LedgerLayer after={after} format={format} lines={lines} />

          <div
            className="absolute inset-x-0 top-(--pos) h-0.5 -translate-y-1/2 touch-none bg-foreground/85 shadow-[0_0_0_1px_var(--background)] before:absolute before:-inset-y-3 before:inset-x-0 @2xl/compare:inset-x-auto @2xl/compare:inset-y-0 @2xl/compare:left-(--pos) @2xl/compare:h-auto @2xl/compare:w-0.5 @2xl/compare:translate-x-[-50%] @2xl/compare:translate-y-0 @2xl/compare:before:-inset-x-3 @2xl/compare:before:inset-y-0"
            data-grab
          />

          <motion.div
            animate={{ scale: dragging && !reduce ? 1.12 : 1 }}
            aria-label={`Compare ${beforeLabel.toLowerCase()} with ${afterLabel}`}
            aria-orientation={vertical ? "vertical" : "horizontal"}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={value}
            aria-valuetext={`${beforeLabel} ${value}%, ${afterLabel} ${100 - value}%`}
            className="absolute top-[clamp(1.5rem,var(--pos),calc(100%_-_1.5rem))] left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-full border border-foreground/20 bg-background text-foreground shadow-md/10 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background pointer-coarse:after:absolute pointer-coarse:after:-inset-1 @2xl/compare:top-1/2 @2xl/compare:left-[clamp(1.5rem,var(--pos),calc(100%_-_1.5rem))]"
            data-grab
            onKeyDown={onKeyDown}
            ref={knobRef}
            role="slider"
            tabIndex={0}
            transition={dragging ? { type: "spring", stiffness: 600, damping: 30 } : { type: "spring", stiffness: 520, damping: 14 }}
          >
            <ChevronsLeftRightIcon className="size-4 rotate-90 @2xl/compare:rotate-0" />
          </motion.div>

          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-[clamp(1.5rem,var(--pos),calc(100%_-_1.5rem))] left-[calc(50%+2rem)] -translate-y-1/2 whitespace-nowrap rounded-full bg-foreground px-2 py-0.5 font-medium text-[0.6875rem] text-background transition-opacity duration-200 @2xl/compare:top-1/2 @2xl/compare:left-[calc(clamp(1.5rem,var(--pos),calc(100%_-_1.5rem))_-_2rem)] @2xl/compare:-translate-x-full",
              interacted && "opacity-0",
            )}
          >
            Drag to compare
          </span>
        </motion.div>
      </div>
    </section>
  );
}
