"use client";

import { ArrowRightIcon, CheckIcon, CopyIcon, RotateCcwIcon } from "lucide-react";
import { AnimatePresence, motion, MotionConfig, useInView, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export interface TerminalInstaller {
  id: string;
  label: string;
  command: string;
  done?: string;
}

export type TerminalOutput =
  | { kind: "step"; text: string; meta?: string }
  | { kind: "success"; text: string; meta?: string }
  | { kind: "progress"; text: string }
  | { kind: "result"; text: string; href?: string };

export interface TerminalHeroProps {
  eyebrow?: string;
  title: ReactNode;
  titleQuiet?: ReactNode;
  description?: ReactNode;
  installers: TerminalInstaller[];
  run: string;
  output: TerminalOutput[];
  features?: string[];
  cwd?: string;
  docs?: { label: string; href: string };
  className?: string;
}

type Line =
  | { id: number; kind: "cmd"; text: string; typed: number }
  | { id: number; kind: "dim"; text: string }
  | { id: number; kind: "step" | "success"; text: string; meta?: string }
  | { id: number; kind: "progress"; text: string; value: number }
  | { id: number; kind: "result"; text: string; href?: string };

type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;
type NewLine = WithoutId<Line>;

const ease = [0.23, 1, 0.32, 1] as const;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function useTerminalScript({
  installer,
  run,
  output,
  active,
  instant,
}: {
  installer: TerminalInstaller;
  run: string;
  output: TerminalOutput[];
  active: boolean;
  instant: boolean;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);
  const outputRef = useRef(output);
  outputRef.current = output;
  const outputKey = JSON.stringify(output);
  const played = useRef(false);
  const lastRound = useRef(round);

  useEffect(() => {
    if (!active) return;
    const replaying = round !== lastRound.current;
    lastRound.current = round;
    const skip = instant || (played.current && !replaying);
    let cancelled = false;
    let id = 0;
    const output = outputRef.current;
    const push = (line: NewLine) => {
      if (cancelled) return -1;
      const next = { ...line, id: id++ } as Line;
      setLines((prev) => [...prev, next]);
      return next.id;
    };
    const patch = (lineId: number, change: Partial<Line>) =>
      !cancelled &&
      setLines((prev) => prev.map((l) => (l.id === lineId ? ({ ...l, ...change } as Line) : l)));

    const all = (): Line[] => {
      const list: Line[] = [
        { id: 0, kind: "cmd", text: installer.command, typed: installer.command.length },
        { id: 1, kind: "dim", text: installer.done ?? "added 1 package in 1.2s" },
        { id: 2, kind: "cmd", text: run, typed: run.length },
      ];
      output.forEach((o, i) =>
        list.push(o.kind === "progress" ? { ...o, id: 3 + i, value: 1 } : ({ ...o, id: 3 + i } as Line)),
      );
      return list;
    };

    const type = async (text: string) => {
      const lineId = push({ kind: "cmd", text, typed: 0 });
      await wait(420);
      for (let i = 1; i <= text.length; i++) {
        if (cancelled) return;
        patch(lineId, { typed: i });
        const ch = text[i - 1];
        await wait(ch === " " ? 90 : ch === "-" || ch === "@" ? 70 : 32 + Math.random() * 30);
      }
      await wait(260);
    };

    (async () => {
      setLines([]);
      setDone(false);
      if (skip) {
        setLines(all());
        setDone(true);
        return;
      }
      await wait(300);
      await type(installer.command);
      if (cancelled) return;
      await wait(520);
      push({ kind: "dim", text: installer.done ?? "added 1 package in 1.2s" });
      await wait(700);
      await type(run);
      for (const o of output) {
        if (cancelled) return;
        if (o.kind === "progress") {
          await wait(220);
          const lineId = push({ kind: "progress", text: o.text, value: 0 });
          for (let v = 1; v <= 24; v++) {
            if (cancelled) return;
            await wait(55 + Math.random() * 45);
            patch(lineId, { value: v / 24 });
          }
          await wait(160);
        } else {
          await wait(o.kind === "result" ? 520 : 300 + Math.random() * 200);
          push(o as NewLine);
        }
      }
      if (!cancelled) {
        played.current = true;
        setDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, instant, installer.command, installer.done, run, outputKey, round]);

  const replay = useCallback(() => setRound((r) => r + 1), []);
  return { lines, done, replay };
}

function Bar({ value }: { value: number }) {
  const cells = 24;
  const filled = Math.round(value * cells);
  return (
    <span aria-hidden>
      <span className="text-violet-400">{"█".repeat(filled)}</span>
      <span className="text-foreground/15">{"█".repeat(cells - filled)}</span>
    </span>
  );
}

function Cursor() {
  return <span aria-hidden className="ms-px inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em] animate-caret-blink bg-foreground/80" />;
}

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="flex h-11 w-full min-w-0 items-center gap-2 rounded-xl border bg-card ps-3.5 pe-1.5 shadow-xs/5 sm:w-auto">
      <span aria-hidden className="select-none font-mono text-muted-foreground/70 text-sm">
        $
      </span>
      <code className="min-w-0 flex-1 truncate font-mono text-[0.8125rem] sm:w-[22ch] sm:flex-none">{command}</code>
      <button
        aria-label={copied ? "Copied" : "Copy install command"}
        className="relative ms-auto flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-[background-color,color,translate,scale,rotate] duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.94]"
        onClick={copy}
        type="button"
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.6, filter: "blur(2px)" }}
            initial={{ opacity: 0, scale: 0.6, filter: "blur(2px)" }}
            key={copied ? "check" : "copy"}
            transition={{ duration: 0.18, ease }}
          >
            {copied ? <CheckIcon className="size-4 text-success-foreground" /> : <CopyIcon className="size-4" />}
          </motion.span>
        </AnimatePresence>
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </div>
  );
}

function InstallerTabs({
  installers,
  value,
  onChange,
}: {
  installers: TerminalInstaller[];
  value: string;
  onChange: (id: string) => void;
}) {
  const reduce = useReducedMotionSafe();
  const layoutId = useId();
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = installers.findIndex((i) => i.id === value);
    const next = installers[(index + step + installers.length) % installers.length];
    onChange(next.id);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-id="${next.id}"]`)?.focus();
  };
  return (
    <div aria-label="Package manager" className="flex gap-1" onKeyDown={onKeyDown} role="tablist">
      {installers.map((item) => {
        const selected = item.id === value;
        return (
          <button
            aria-selected={selected}
            data-id={item.id}
            tabIndex={selected ? 0 : -1}
            className={cn(
              "relative h-8 cursor-pointer rounded-md px-2.5 font-medium font-mono text-xs outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            key={item.id}
            onClick={() => onChange(item.id)}
            role="tab"
            type="button"
          >
            {selected && (
              <motion.span
                className="absolute inset-0 -z-10 rounded-md bg-accent"
                layoutId={layoutId}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function TerminalHero({
  eyebrow,
  title,
  titleQuiet,
  description,
  installers,
  run,
  output,
  features = [],
  cwd = "~/acme-web",
  docs,
  className,
}: TerminalHeroProps) {
  const reduce = useReducedMotionSafe();
  const [pm, setPm] = useState(installers[0]?.id ?? "");
  const installer = installers.find((i) => i.id === pm) ?? installers[0];
  const termRef = useRef<HTMLDivElement>(null);
  const inView = useInView(termRef, { once: true, amount: 0.4 });
  const { lines, done, replay } = useTerminalScript({
    installer,
    run,
    output,
    active: inView,
    instant: Boolean(reduce),
  });
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 12, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.6, ease, delay },
  });

  const typingIndex = lines.findIndex((l) => l.kind === "cmd" && l.typed < l.text.length);

  return (
    <MotionConfig reducedMotion="user">
      <section className={cn("mx-auto w-full max-w-[1100px]", className)}>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-14">
          <div className="flex min-w-0 flex-col items-start">
            {eyebrow && (
              <motion.p
                {...rise(0)}
                className="inline-flex items-center gap-2 rounded-full border bg-background px-2.5 py-1 font-medium font-mono text-muted-foreground text-xs shadow-xs/5"
              >
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {eyebrow}
              </motion.p>
            )}
            <motion.h1
              {...rise(0.06)}
              className="mt-5 text-balance font-heading font-semibold text-[2.5rem] leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-[3.5rem]"
            >
              {title} {titleQuiet && <span className="text-muted-foreground">{titleQuiet}</span>}
            </motion.h1>
            {description && (
              <motion.p
                {...rise(0.12)}
                className="mt-5 max-w-md text-pretty text-base text-muted-foreground leading-relaxed sm:text-lg"
              >
                {description}
              </motion.p>
            )}

            <motion.div {...rise(0.18)} className="mt-8 flex w-full flex-col items-start gap-2 sm:w-auto">
              <InstallerTabs installers={installers} onChange={setPm} value={pm} />
              <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                <CopyCommand command={installer.command} />
                {docs && (
                  <Button
                    className="group h-11 rounded-xl transition-[box-shadow,translate,scale,rotate] duration-150 ease-out active:scale-[0.97] sm:h-11"
                    render={<a href={docs.href} />}
                    size="lg"
                    variant="ghost"
                  >
                    {docs.label}
                    <ArrowRightIcon className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
                  </Button>
                )}
              </div>
            </motion.div>

            {features.length > 0 && (
              <motion.ul {...rise(0.24)} className="mt-9 grid w-full gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {features.map((feature) => (
                  <li className="flex items-center gap-2.5" key={feature}>
                    <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-success/12 text-success-foreground">
                      <CheckIcon className="size-3" strokeWidth={3} />
                    </span>
                    {feature}
                  </li>
                ))}
              </motion.ul>
            )}
          </div>

          {/* The terminal is always dark: the .dark scope swaps every token inside it. */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="dark relative isolate min-w-0"
            initial={{ opacity: 0, y: 24 }}
            ref={termRef}
            transition={{ duration: 0.8, ease, delay: 0.15 }}
          >
            <div
              aria-hidden
              className="absolute inset-x-0 -inset-y-10 -z-10 sm:-inset-x-6 bg-[radial-gradient(50%_50%_at_60%_40%,var(--color-violet-500),transparent_70%),radial-gradient(40%_45%_at_30%_75%,var(--color-emerald-500),transparent_70%)] opacity-15 blur-2xl"
            />
            <div className="overflow-hidden rounded-2xl border bg-[color-mix(in_srgb,var(--background)_82%,black)] text-foreground shadow-2xl/20 ring-1 ring-black/10">
              <div className="flex h-10 items-center gap-2 border-b bg-card px-4">
                <span className="size-2.5 rounded-full bg-red-400/90" />
                <span className="size-2.5 rounded-full bg-amber-400/90" />
                <span className="size-2.5 rounded-full bg-emerald-400/90" />
                <span className="mx-auto truncate px-2 font-mono text-[0.6875rem] text-muted-foreground">
                  {cwd.replace("~/", "")} — zsh
                </span>
                <button
                  aria-label="Replay"
                  className={cn(
                    "-me-2 flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-[opacity,background-color,color,translate,scale,rotate] duration-200 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.94]",
                    done ? "opacity-100" : "pointer-events-none opacity-0",
                  )}
                  onClick={replay}
                  tabIndex={done ? 0 : -1}
                  type="button"
                >
                  <RotateCcwIcon className="size-3.5" />
                </button>
              </div>
              <div
                aria-label="Terminal session"
                className="h-[19.5rem] overflow-hidden px-4 py-4 font-mono text-[0.75rem] leading-[1.7] sm:h-[20rem] sm:px-5 sm:text-[0.8125rem]"
                ref={bodyRef}
                role="log"
              >
                {lines.map((line, i) => {
                  if (line.kind === "cmd") {
                    return (
                      <div className={cn("whitespace-pre-wrap break-all", i > 0 && "mt-3")} key={line.id}>
                        <span className="text-sky-400">{cwd}</span> <span className="text-muted-foreground">$</span>{" "}
                        <span>{line.text.slice(0, line.typed)}</span>
                        {i === typingIndex && <Cursor />}
                      </div>
                    );
                  }
                  return (
                    <motion.div
                      animate={{ opacity: 1, x: 0 }}
                      className="whitespace-pre-wrap"
                      initial={reduce ? false : { opacity: 0, x: -4 }}
                      key={line.id}
                      transition={{ duration: 0.2, ease }}
                    >
                      {line.kind === "dim" && <span className="text-muted-foreground">{line.text}</span>}
                      {line.kind === "step" && (
                        <span>
                          <span className="text-violet-400">◇</span> {line.text}
                          {line.meta && <span className="text-muted-foreground"> {line.meta}</span>}
                        </span>
                      )}
                      {line.kind === "success" && (
                        <span>
                          <span className="text-emerald-400">✓</span> {line.text}
                          {line.meta && <span className="text-muted-foreground"> {line.meta}</span>}
                        </span>
                      )}
                      {line.kind === "progress" && (
                        <span className="flex flex-wrap items-center gap-x-3">
                          <span>
                            <span className="text-violet-400">◇</span> {line.text}
                          </span>
                          <span className="flex items-center gap-2">
                            <Bar value={line.value} />
                            <span className="w-[4ch] text-end text-muted-foreground tabular-nums">
                              {Math.round(line.value * 100)}%
                            </span>
                          </span>
                        </span>
                      )}
                      {line.kind === "result" && (
                        <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/8 px-3 py-2">
                          <span className="text-emerald-400">●</span> <span className="font-medium">Preview ready</span>
                          <a
                            className="mt-0.5 block truncate text-emerald-300 underline decoration-emerald-300/30 underline-offset-4 outline-none hover:decoration-emerald-300 focus-visible:ring-2 focus-visible:ring-ring"
                            href={line.href ?? "#"}
                          >
                            {line.text}
                          </a>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                {done && (
                  <div className="mt-3">
                    <span className="text-sky-400">{cwd}</span> <span className="text-muted-foreground">$</span>{" "}
                    <Cursor />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </MotionConfig>
  );
}
