"use client";

import { CheckIcon, ChevronDownIcon, RotateCwIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ReceiptStatus = "running" | "success" | "error";

export interface ToolReceiptCall {
  id: string;
  name: string;
  summary?: string;
  status: ReceiptStatus;
  time?: string;
  durationMs?: number;
  tokens?: number;
  cost?: number;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface ToolReceiptProps {
  call: ToolReceiptCall;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRetry?: (id: string) => void;
  currency?: string;
  className?: string;
  punched?: boolean;
}

export interface ToolReceiptSpikeProps {
  calls: ToolReceiptCall[];
  title?: string;
  newestFirst?: boolean;
  defaultOpenId?: string;
  onRetry?: (id: string) => void;
  currency?: string;
  className?: string;
}

const spring = { type: "spring", stiffness: 420, damping: 38, mass: 0.9 } as const;
const outline: CSSProperties = {
  filter:
    "drop-shadow(0 0 0.5px color-mix(in oklab, var(--color-foreground) 30%, transparent)) drop-shadow(0 1px 1.5px color-mix(in oklab, var(--color-foreground) 7%, transparent))",
};
const HOLE = { x: 16, y: 22, r: 5 };

function paperMask(punched: boolean): CSSProperties {
  const body = "linear-gradient(black, black) top / 100% calc(100% - 5px) no-repeat";
  const teeth = "conic-gradient(from -45deg at 50% 100%, black 90deg, transparent 0) bottom / 10px 5px repeat-x";
  if (!punched) return { mask: `${body}, ${teeth}` };
  const hole = `radial-gradient(circle at ${HOLE.x}px ${HOLE.y}px, transparent ${HOLE.r}px, black ${HOLE.r + 0.5}px) 0 0 / 100% 100% no-repeat`;
  return { mask: `${hole}, ${body}, ${teeth}`, maskComposite: "intersect, add, add" } as CSSProperties;
}

function fmtMs(ms: number) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`;
}
const fmtTokens = (n: number) => n.toLocaleString("en-US");
const fmtCost = (n: number, cur: string) => `${cur}${n.toFixed(4)}`;

function scalar(v: unknown) {
  if (typeof v === "string") return v;
  if (v === null || v === undefined) return "—";
  return String(v);
}

function toLines(value: unknown, prefix = ""): [string, string][] {
  if (value === null || typeof value !== "object") return [[prefix || "value", scalar(value)]];
  if (Array.isArray(value)) {
    if (value.every((v) => v === null || typeof v !== "object")) return [[prefix || "items", value.map(scalar).join(", ")]];
    return value.flatMap((v, i) => toLines(v, `${prefix}[${i}]`));
  }
  return Object.entries(value).flatMap(([k, v]) => toLines(v, prefix ? `${prefix}.${k}` : k));
}

function useElapsed(status: ReceiptStatus, durationMs?: number) {
  const [elapsed, setElapsed] = useState(0);
  const start = useRef(0);
  useEffect(() => {
    if (status !== "running") return;
    start.current = performance.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed(performance.now() - start.current), 100);
    return () => clearInterval(t);
  }, [status]);
  return status === "running" ? elapsed : (durationMs ?? elapsed);
}

function Barcode({ seed }: { seed: string }) {
  let h = 2166136261;
  const bars: number[] = [];
  for (let i = 0; i < 44; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i;
    h = Math.imul(h, 16777619) >>> 0;
    bars.push((h % 3) + 1);
  }
  return (
    <span aria-hidden className="flex h-6 items-stretch gap-[1.5px] opacity-80">
      {bars.map((w, i) => (
        <span className="bg-foreground" key={i} style={{ width: w }} />
      ))}
    </span>
  );
}

function Leader({ label, value, strong, className }: { label: ReactNode; value: ReactNode; strong?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-baseline gap-2", strong ? "text-foreground" : "text-muted-foreground", className)}>
      <span className={cn("min-w-0 shrink truncate", strong && "font-medium")}>{label}</span>
      <span aria-hidden className="min-w-4 flex-1 translate-y-[-3px] border-current/35 border-b border-dotted" />
      <span className={cn("max-w-[62%] shrink-0 truncate text-right tabular-nums", strong ? "font-medium" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

function Section({ title, lines }: { title: string; lines: [string, string][] }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground uppercase tracking-[0.14em]">{title}</span>
      {lines.map(([k, v]) => (
        <Leader key={k} label={k} value={v} />
      ))}
    </div>
  );
}

const Rule = ({ double }: { double?: boolean }) => (
  <div aria-hidden className={cn("border-foreground/20", double ? "h-[3px] border-y" : "border-t border-dashed")} />
);

export function ToolReceipt({
  call,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  onRetry,
  currency = "$",
  className,
  punched = false,
}: ToolReceiptProps) {
  const reduce = useReducedMotion();
  const bodyId = useId();
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };
  const elapsed = useElapsed(call.status, call.durationMs);
  const running = call.status === "running";
  const failed = call.status === "error";
  const argLines = call.args ? toLines(call.args) : [];
  const resultLines = call.result !== undefined && !failed ? toLines(call.result) : [];

  return (
    <div className={cn("relative w-full", className)} style={outline}>
      <div
        className={cn("relative bg-card pb-5 font-mono text-card-foreground text-xs", punched ? "pl-8" : "pl-4")}
        style={paperMask(punched)}
      >
        <button
          aria-controls={bodyId}
          aria-expanded={open}
          className="group flex w-full flex-col gap-1 py-3 pr-4 text-left outline-none focus-visible:bg-accent"
          onClick={() => setOpen(!open)}
          type="button"
        >
          <span className="flex w-full items-center gap-2">
            <StatusGlyph status={call.status} />
            <span className="min-w-0 flex-1 truncate font-medium text-foreground text-sm">{call.name}</span>
            <span className={cn("tabular-nums", running ? "text-foreground" : "text-muted-foreground")}>{fmtMs(elapsed)}</span>
            <ChevronDownIcon
              aria-hidden
              className={cn(
                "size-3.5 text-muted-foreground transition-transform duration-200 ease-out group-hover:text-foreground",
                open && "rotate-180",
              )}
            />
          </span>
          {call.summary && <span className="truncate pl-6 text-muted-foreground">{call.summary}</span>}
        </button>

        <div className="flex flex-col gap-2 pr-4">
          <Rule />
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden"
                exit={{ height: 0, opacity: 0 }}
                id={bodyId}
                initial={{ height: 0, opacity: 0 }}
                key="body"
                transition={reduce ? { duration: 0 } : { height: spring, opacity: { duration: 0.18, ease: "easeOut" } }}
              >
                <motion.div
                  animate={{ y: 0 }}
                  className="flex flex-col gap-2"
                  exit={{ y: -6 }}
                  initial={{ y: reduce ? 0 : -10 }}
                  transition={spring}
                >
                  {argLines.length > 0 && <Section lines={argLines} title="Arguments" />}
                  {resultLines.length > 0 && (
                    <>
                      <Rule />
                      <Section lines={resultLines} title="Result" />
                    </>
                  )}
                  {failed && call.error && (
                    <>
                      <Rule />
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-muted-foreground uppercase tracking-[0.14em]">Error</span>
                        <span className="text-pretty text-destructive-foreground">{call.error}</span>
                      </div>
                    </>
                  )}
                  <Rule />
                  <div className="flex flex-col gap-1">
                    <Leader label="Time" value={running ? "printing…" : fmtMs(elapsed)} />
                    <Leader label="Tokens" value={call.tokens !== undefined ? fmtTokens(call.tokens) : "—"} />
                  </div>
                  <div className="flex items-end justify-between gap-3 pt-1">
                    <Barcode seed={call.id} />
                    <span className="text-right text-muted-foreground">
                      {call.id}
                      {call.time && <span className="block tabular-nums">{call.time}</span>}
                    </span>
                  </div>
                  <Rule double />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex min-h-5 items-center gap-2">
            {failed ? (
              <>
                <span className="min-w-0 flex-1 truncate text-destructive-foreground">{open ? "Not charged" : (call.error ?? "Failed")}</span>
                {onRetry && (
                  <Button className="-my-1 font-sans" onClick={() => onRetry(call.id)} size="xs" variant="outline">
                    <RotateCwIcon />
                    Retry
                  </Button>
                )}
              </>
            ) : (
              <Leader
                className="flex-1"
                label={running ? "Printing" : open ? "Total" : `${call.tokens !== undefined ? fmtTokens(call.tokens) : "—"} tokens`}
                strong={!running}
                value={
                  running ? (
                    <PrintHead />
                  ) : call.cost !== undefined ? (
                    fmtCost(call.cost, currency)
                  ) : (
                    "—"
                  )
                }
              />
            )}
          </div>
        </div>

        <AnimatePresence>
          {failed && (
            <motion.span
              animate={{ opacity: 1, scale: 1, rotate: -12 }}
              aria-hidden
              className="pointer-events-none absolute top-7 right-24 rounded-md border-2 border-destructive/75 px-2 py-0.5 pl-[calc(--spacing(2)+0.24em)] font-bold text-base text-destructive-foreground/90 tracking-[0.24em]"
              exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.15 } }}
              initial={reduce ? { opacity: 0, scale: 1, rotate: -12 } : { opacity: 0, scale: 1.5, rotate: -18 }}
              transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 700, damping: 32 }}
            >
              VOID
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PrintHead() {
  return (
    <span className="inline-flex gap-[3px]" role="status">
      <span className="sr-only">Running</span>
      {[0, 1, 2].map((i) => (
        <span
          className="size-1 animate-pulse rounded-full bg-foreground/60 motion-reduce:animate-none"
          key={i}
          style={{ animationDelay: `${i * 160}ms`, animationDuration: "1s" }}
        />
      ))}
    </span>
  );
}

function StatusGlyph({ status }: { status: ReceiptStatus }) {
  return (
    <span className="relative flex size-4 shrink-0 items-center justify-center">
      <AnimatePresence initial={false} mode="popLayout">
        {status === "running" ? (
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            aria-label="Running"
            className="size-3 animate-spin rounded-full border-[1.5px] border-foreground/20 border-t-foreground motion-reduce:animate-none"
            exit={{ opacity: 0, scale: 0.8 }}
            initial={{ opacity: 0, scale: 0.8 }}
            key="run"
          />
        ) : status === "success" ? (
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            aria-label="Done"
            className="flex size-4 items-center justify-center rounded-full bg-success/15 text-success-foreground"
            exit={{ opacity: 0, scale: 0.8 }}
            initial={{ opacity: 0, scale: 0.6 }}
            key="ok"
            transition={{ type: "spring", stiffness: 600, damping: 30 }}
          >
            <CheckIcon className="size-2.5" strokeWidth={3} />
          </motion.span>
        ) : (
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            aria-label="Failed"
            className="size-2 rounded-full bg-destructive"
            exit={{ opacity: 0, scale: 0.8 }}
            initial={{ opacity: 0, scale: 0.6 }}
            key="err"
          />
        )}
      </AnimatePresence>
    </span>
  );
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Roll({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  let d = 0;
  let o = 0;
  const glyphs = [...text]
    .reverse()
    .map((c) => ({ c, digit: c >= "0" && c <= "9", key: c >= "0" && c <= "9" ? `d${d++}` : `s${o++}` }))
    .reverse();
  return (
    <span className={cn("inline-flex whitespace-nowrap tabular-nums leading-none", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex [--row:1.2em]">
        {glyphs.map(({ c, digit, key }) =>
          digit ? (
            <span className="relative inline-block h-(--row) overflow-hidden" key={key}>
              <span className="invisible block leading-(--row)">0</span>
              <motion.span
                animate={{ y: `${-Number(c) * 10}%` }}
                className="absolute inset-x-0 top-0 flex flex-col items-center"
                initial={false}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 32 }}
              >
                {DIGITS.map((n) => (
                  <span className="block h-(--row) leading-(--row)" key={n}>
                    {n}
                  </span>
                ))}
              </motion.span>
            </span>
          ) : (
            <span className="inline-block h-(--row) leading-(--row)" key={key}>
              {c}
            </span>
          ),
        )}
      </span>
    </span>
  );
}

export function ToolReceiptSpike({
  calls,
  title = "Tool calls",
  newestFirst = true,
  defaultOpenId,
  onRetry,
  currency = "$",
  className,
}: ToolReceiptSpikeProps) {
  const reduce = useReducedMotion();
  const ordered = newestFirst ? [...calls].reverse() : calls;
  const settled = calls.filter((c) => c.status === "success");
  const cost = settled.reduce((s, c) => s + (c.cost ?? 0), 0);
  const tokens = settled.reduce((s, c) => s + (c.tokens ?? 0), 0);
  const ms = calls.reduce((s, c) => s + (c.status === "running" ? 0 : (c.durationMs ?? 0)), 0);
  const running = calls.filter((c) => c.status === "running").length;
  const voided = calls.filter((c) => c.status === "error").length;

  return (
    <div className={cn("flex w-[400px] max-w-full flex-col gap-4", className)}>
      <div className="flex items-end justify-between gap-4 px-1">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-medium text-sm">{title}</span>
          <span aria-live="polite" className="text-muted-foreground text-xs tabular-nums">
            {calls.length} {calls.length === 1 ? "call" : "calls"} · {fmtMs(ms)}
            {running > 0 ? ` · ${running} printing` : ""}
            {voided > 0 ? ` · ${voided} void` : ""}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Roll className="font-medium font-mono text-sm" text={fmtCost(cost, currency)} />
          <span className="font-mono text-muted-foreground text-xs">
            <Roll text={fmtTokens(tokens)} /> tok
          </span>
        </div>
      </div>

      <div className="relative">
        <span
          aria-hidden
          className="absolute top-[-16px] bottom-1 left-[14.5px] w-[3px] bg-linear-to-b from-foreground/20 via-foreground/40 to-foreground/50"
          style={{ clipPath: "polygon(50% 0, 100% 12px, 100% 100%, 0 100%, 0 12px)" }}
        />
        <span aria-hidden className="absolute bottom-0 left-[4px] h-1.5 w-6 rounded-full bg-foreground/20" />
        <ol className="relative flex flex-col gap-2.5 pb-4">
          <AnimatePresence initial={false} mode="popLayout">
            {ordered.map((call) => (
              <motion.li
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -18 }}
                key={call.id}
                layout={reduce ? false : "position"}
                transition={spring}
              >
                <ToolReceipt call={call} currency={currency} defaultOpen={call.id === defaultOpenId} onRetry={onRetry} punched />
              </motion.li>
            ))}
          </AnimatePresence>
          {calls.length === 0 && (
            <li className="ml-8 rounded-lg border border-dashed px-4 py-6 text-center text-muted-foreground text-xs">
              Waiting for the first tool call
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}
