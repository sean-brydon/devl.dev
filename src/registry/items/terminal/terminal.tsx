"use client";

import { CheckIcon, FastForwardIcon, PlayIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TerminalStep =
  | { type: "command"; text: string }
  | { type: "output"; text: string; pace?: number }
  | { type: "spinner"; text: string; duration: number; done: string; ok?: boolean }
  | { type: "wait"; ms: number };

export interface TerminalProps {
  steps: TerminalStep[];
  title?: string;
  cwd?: string;
  branch?: string;
  autoPlay?: boolean;
  speed?: number;
  onDone?: () => void;
  className?: string;
}

type Line =
  | { kind: "prompt"; text: string; typed: number; ok: boolean }
  | { kind: "out"; text: string }
  | { kind: "spin"; text: string; done?: string; ok?: boolean };

const fg: Record<number, string> = {
  30: "text-foreground",
  31: "text-red-600 dark:text-red-400",
  32: "text-emerald-600 dark:text-emerald-400",
  33: "text-amber-600 dark:text-amber-300",
  34: "text-sky-600 dark:text-sky-400",
  35: "text-violet-600 dark:text-violet-400",
  36: "text-cyan-600 dark:text-cyan-300",
  37: "text-foreground",
  90: "text-muted-foreground",
};

function Ansi({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let color = "";
  let bold = false;
  let dim = false;
  let k = 0;
  for (const chunk of text.split(/(\x1b\[[\d;]*m)/)) {
    const code = chunk.match(/^\x1b\[([\d;]*)m$/);
    if (code) {
      for (const n of (code[1] || "0").split(";").map(Number)) {
        if (n === 0) {
          color = "";
          bold = false;
          dim = false;
        } else if (n === 1) bold = true;
        else if (n === 2) dim = true;
        else if (n === 22) {
          bold = false;
          dim = false;
        } else if (n === 39) color = "";
        else if (fg[n] || fg[n - 60]) color = fg[n] ?? fg[n - 60];
      }
      continue;
    }
    if (!chunk) continue;
    parts.push(
      <span className={cn(color, bold && "font-semibold", dim && "opacity-60")} key={k++}>
        {chunk}
      </span>,
    );
  }
  return <>{parts}</>;
}

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function Spinner() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % FRAMES.length), 80);
    return () => clearInterval(t);
  }, []);
  return <span className="text-sky-600 dark:text-sky-400">{FRAMES[i]}</span>;
}

function Caret({ idle }: { idle: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      animate={idle && !reduce ? { opacity: [1, 1, 0, 0] } : { opacity: 1 }}
      aria-hidden
      className="ms-px inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em] bg-foreground/80"
      transition={idle ? { duration: 1.1, repeat: Number.POSITIVE_INFINITY, times: [0, 0.5, 0.5, 1], ease: "linear" } : undefined}
    />
  );
}

function Prompt({ cwd, branch, ok }: { cwd: string; branch?: string; ok: boolean }) {
  return (
    <span className="select-none">
      <span className="text-sky-600 dark:text-sky-400">{cwd}</span>
      {branch && <span className="text-violet-600 dark:text-violet-400"> {branch}</span>}
      <span className={ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}> ❯ </span>
    </span>
  );
}

const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export function Terminal({
  steps,
  title = "zsh",
  cwd = "~/acme-web",
  branch = "main",
  autoPlay = true,
  speed = 1,
  onDone,
  className,
}: TerminalProps) {
  const [lines, setLines] = useState<Line[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [run, setRun] = useState(autoPlay ? 1 : 0);
  const [elapsed, setElapsed] = useState(0);
  const [current, setCurrent] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const skip = useRef(false);
  const wakers = useRef(new Set<() => void>());
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const commands = steps.filter((s) => s.type === "command").length;

  useEffect(() => {
    if (!run) return;
    let alive = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    skip.current = false;
    stick.current = true;
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        if (skip.current || ms <= 0) return resolve();
        const wake = () => {
          clearTimeout(t);
          timers.delete(t);
          wakers.current.delete(wake);
          resolve();
        };
        const t = setTimeout(wake, ms / speed);
        timers.add(t);
        wakers.current.add(wake);
      });
    const patchLast = (fn: (l: Line) => Line) =>
      setLines((ls) => (ls.length ? [...ls.slice(0, -1), fn(ls[ls.length - 1])] : ls));

    const started = performance.now();
    const tick = setInterval(() => setElapsed(performance.now() - started), 100);

    (async () => {
      setLines([]);
      setStatus("running");
      setElapsed(0);
      let ok = true;
      await sleep(350);
      for (const step of steps) {
        if (!alive) return;
        if (step.type === "command") {
          setLines((ls) => [...ls, { kind: "prompt", text: step.text, typed: 0, ok }]);
          await sleep(380);
          for (let i = 1; i <= step.text.length && alive; i++) {
            patchLast((l) => (l.kind === "prompt" ? { ...l, typed: i } : l));
            const ch = step.text[i - 1];
            await sleep(ch === " " ? 70 : 28 + Math.random() * 46);
          }
          setCurrent(step.text);
          await sleep(260);
        } else if (step.type === "output") {
          for (const text of step.text.split("\n")) {
            if (!alive) return;
            setLines((ls) => [...ls, { kind: "out", text }]);
            await sleep(step.pace ?? 45);
          }
        } else if (step.type === "spinner") {
          setLines((ls) => [...ls, { kind: "spin", text: step.text }]);
          await sleep(step.duration);
          const passed = step.ok ?? true;
          if (!passed) ok = false;
          patchLast((l) => (l.kind === "spin" ? { ...l, done: step.done, ok: passed } : l));
          await sleep(120);
        } else {
          await sleep(step.ms);
        }
      }
      if (!alive) return;
      clearInterval(tick);
      setElapsed(performance.now() - started);
      setLines((ls) => [...ls, { kind: "prompt", text: "", typed: 0, ok }]);
      setCurrent(null);
      setStatus(ok ? "done" : "failed");
      doneRef.current?.();
    })();

    return () => {
      alive = false;
      clearInterval(tick);
      timers.forEach(clearTimeout);
      wakers.current.clear();
    };
  }, [run, steps, speed]);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const fastForward = () => {
    skip.current = true;
    for (const wake of [...wakers.current]) wake();
  };

  const reduce = useReducedMotion();
  const running = status === "running";
  const last = lines[lines.length - 1];

  return (
    <div
      className={cn("flex w-full min-w-0 max-w-[540px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5", className)}
    >
      <div className="grid h-10 grid-cols-[1fr_auto_1fr] items-center border-b ps-3.5 pe-1.5">
        <div aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-muted-foreground/20" />
          <span className="size-2.5 rounded-full bg-muted-foreground/20" />
          <span className="size-2.5 rounded-full bg-muted-foreground/20" />
        </div>
        <span className="truncate font-mono text-muted-foreground text-xs">
          {cwd.split("/").pop()} — {title}
        </span>
        <div className="flex justify-end">
          <Button
            aria-label={running ? "Skip to end" : status === "idle" ? "Run session" : "Replay session"}
            className="gap-1.5 text-muted-foreground text-xs transition-[color,background-color,scale] active:scale-[0.97] sm:text-xs [@media(hover:hover)]:hover:text-foreground"
            onClick={() => (running ? fastForward() : setRun((n) => n + 1))}
            size="sm"
            variant="ghost"
          >
            {running ? <FastForwardIcon className="size-3.5" /> : status === "idle" ? <PlayIcon className="size-3.5" /> : <RotateCcwIcon className="size-3.5" />}
            <span className="w-11 text-start">{running ? "Skip" : status === "idle" ? "Run" : "Replay"}</span>
          </Button>
        </div>
      </div>

      <div
        aria-busy={running}
        aria-label="Terminal output"
        aria-live="off"
        className="h-[300px] overflow-auto bg-code px-4 py-3 font-mono text-[12.5px] leading-5 outline-none [scrollbar-width:thin] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
        ref={bodyRef}
        role="log"
        tabIndex={0}
      >
        {lines.map((line, i) => {
          const isLast = i === lines.length - 1;
          if (line.kind === "prompt") {
            return (
              <div className={cn("whitespace-pre-wrap break-all", i > 0 && "mt-2")} key={i}>
                <Prompt branch={branch} cwd={cwd} ok={line.ok} />
                <span className="text-foreground">{line.text.slice(0, line.typed)}</span>
                {isLast && <Caret idle={!running || line.typed === 0 || line.typed === line.text.length} />}
              </div>
            );
          }
          if (line.kind === "spin") {
            return (
              <div className="whitespace-pre-wrap" key={i}>
                {line.done ? (
                  <>
                    <span className={line.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                      {line.ok ? "✓" : "✗"}
                    </span>{" "}
                    <Ansi text={line.done} />
                  </>
                ) : (
                  <>
                    <Spinner /> <span className="text-muted-foreground">{line.text}</span>
                  </>
                )}
              </div>
            );
          }
          return (
            <div className="min-h-5 w-max min-w-full whitespace-pre text-foreground/90" key={i}>
              <Ansi text={line.text} />
            </div>
          );
        })}
        {status === "idle" && (
          <div>
            <Prompt branch={branch} cwd={cwd} ok />
            <Caret idle />
          </div>
        )}
        {last?.kind === "out" && running && <span className="sr-only">streaming</span>}
      </div>

      <div className="flex h-9 items-center gap-2 border-t px-3.5 text-xs">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            className="flex min-w-0 flex-1 items-center gap-2"
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            key={status}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            {status === "running" && (
              <>
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inset-0 animate-ping rounded-full bg-info/60 motion-reduce:hidden" />
                  <span className="relative size-2 rounded-full bg-info" />
                </span>
                <span className="truncate text-muted-foreground">
                  Running <span className="font-mono text-foreground">{current ?? "…"}</span>
                </span>
              </>
            )}
            {(status === "done" || status === "failed") && (
              <>
                <motion.span
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full text-white",
                    status === "done" ? "bg-success" : "bg-destructive",
                  )}
                  initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 600, damping: 32 }}
                >
                  {status === "done" ? <CheckIcon className="size-2.5" strokeWidth={3.5} /> : <XIcon className="size-2.5" strokeWidth={3.5} />}
                </motion.span>
                <span className="truncate">
                  {status === "done" ? "All commands succeeded" : "A command failed"}
                  <span className="text-muted-foreground">
                    {" "}
                    · {commands} command{commands === 1 ? "" : "s"}
                  </span>
                </span>
              </>
            )}
            {status === "idle" && <span className="text-muted-foreground">Ready · press Run to start</span>}
          </motion.span>
        </AnimatePresence>
        <span className="shrink-0 font-mono text-muted-foreground tabular-nums">{fmt(elapsed)}</span>
      </div>
    </div>
  );
}
