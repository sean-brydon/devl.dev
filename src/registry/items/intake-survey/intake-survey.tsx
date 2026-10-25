"use client";

import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, CornerDownLeftIcon, RotateCcwIcon, SparklesIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export type SurveyQuestion =
  | { id: string; kind: "single"; title: string; hint?: string; options: string[] }
  | { id: string; kind: "multi"; title: string; hint?: string; options: string[]; max?: number }
  | { id: string; kind: "text"; title: string; hint?: string; placeholder?: string; optional?: boolean };

export type SurveyAnswers = Record<string, string | string[]>;

export interface IntakeSurveyProps {
  questions: SurveyQuestion[];
  name?: string;
  doneTitle?: string;
  doneText?: string;
  onComplete?: (answers: SurveyAnswers) => void;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;
const press = "transition-[box-shadow,scale,background-color] duration-150 active:scale-[0.97]";
const LETTERS = "ABCDEFGHI";

function useMeasuredHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, height] as const;
}

export function IntakeSurvey({
  questions,
  name,
  doneTitle,
  doneText = "We’ve set up your workspace around your answers. You can change any of this later in settings.",
  onComplete,
  className,
}: IntakeSurveyProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const rootRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [flash, setFlash] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [contentRef, height] = useMeasuredHeight<HTMLDivElement>();
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const done = step >= questions.length;
  const q = questions[step];
  const progress = done ? 1 : (step + 1) / (questions.length + 1);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);
  useEffect(() => {
    if (!limitHit) return;
    const t = setTimeout(() => setLimitHit(false), 1600);
    return () => clearTimeout(t);
  }, [limitHit]);

  useEffect(() => {
    if (!rootRef.current?.contains(document.activeElement)) return;
    const t = setTimeout(() => {
      if (q?.kind === "text") textRef.current?.focus();
      else rootRef.current?.querySelector<HTMLElement>("[data-survey-stage]")?.focus();
    }, 230);
    return () => clearTimeout(t);
  }, [step, q?.kind]);

  const go = (next: number) => {
    clearTimeout(advanceTimer.current);
    setFlash(null);
    setDir(next > step ? 1 : -1);
    setStep(Math.max(0, Math.min(questions.length, next)));
    if (next >= questions.length) setTimeout(() => onComplete?.(answersRef.current), 0);
  };

  const pick = (option: string) => {
    if (!q || done) return;
    if (q.kind === "single") {
      setAnswers((a) => ({ ...a, [q.id]: option }));
      setFlash(option);
      clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => go(step + 1), reduce ? 200 : 480);
    } else if (q.kind === "multi") {
      const current = (answers[q.id] as string[] | undefined) ?? [];
      if (current.includes(option)) {
        setAnswers((a) => ({ ...a, [q.id]: current.filter((o) => o !== option) }));
      } else if (q.max && current.length >= q.max) {
        setLimitHit(true);
      } else {
        setAnswers((a) => ({ ...a, [q.id]: [...current, option] }));
      }
    }
  };

  const canContinue =
    !q ||
    (q.kind === "single" && Boolean(answers[q.id])) ||
    (q.kind === "multi" && ((answers[q.id] as string[] | undefined)?.length ?? 0) > 0) ||
    (q.kind === "text" && (q.optional || Boolean((answers[q.id] as string | undefined)?.trim())));

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (done || !q || e.metaKey || e.ctrlKey || e.altKey) return;
    const inText = (e.target as HTMLElement).tagName === "TEXTAREA";
    if (e.key === "Enter" && !e.shiftKey) {
      if (inText || (e.target as HTMLElement).tagName !== "BUTTON") {
        e.preventDefault();
        if (canContinue) go(step + 1);
      }
      return;
    }
    if (inText || q.kind === "text") return;
    const i = LETTERS.indexOf(e.key.toUpperCase());
    if (e.key.length === 1 && i >= 0 && i < q.options.length) {
      e.preventDefault();
      pick(q.options[i]);
    }
  };

  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, y: d * 16, filter: "blur(3px)" }),
    center: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, y: d * -16, filter: "blur(3px)" }),
  };

  const first = name?.split(" ")[0];

  return (
    <section
      aria-label="Onboarding survey"
      className={cn("mx-auto w-full max-w-[640px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
      onKeyDown={onKeyDown}
      ref={rootRef}
    >
      <motion.div
        animate={{ height }}
        initial={false}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 40 }}
      >
        <div ref={contentRef}>
      <div className="flex items-center gap-3 px-5 pt-5 sm:px-8 sm:pt-6">
        <Button
          aria-label="Previous question"
          className={cn("-ms-2 text-muted-foreground", press, (step === 0 || done) && "invisible")}
          onClick={() => go(step - 1)}
          size="icon-sm"
          variant="ghost"
        >
          <ArrowLeftIcon />
        </Button>
        <div
          aria-label="Survey progress"
          aria-valuemax={questions.length}
          aria-valuemin={0}
          aria-valuenow={Math.min(step, questions.length)}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
        >
          <motion.div
            animate={{ scaleX: progress }}
            className="h-full origin-left rounded-full bg-foreground"
            initial={false}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 26 }}
          />
        </div>
        <span className="w-10 text-end text-muted-foreground text-xs tabular-nums">
          {done ? "Done" : `${step + 1}/${questions.length}`}
        </span>
      </div>

      <div className="relative min-h-[400px] sm:min-h-[380px]">
        <AnimatePresence custom={dir} initial={false} mode="wait">
          {!done && q ? (
            <motion.div
              animate="center"
              aria-labelledby={`${uid}-q`}
              className="px-5 pt-8 pb-6 outline-none sm:px-8"
              custom={dir}
              data-survey-stage
              exit="exit"
              initial="enter"
              key={q.id}
              role="group"
              tabIndex={-1}
              transition={{ duration: 0.2, ease }}
              variants={variants}
            >
              <p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
                <span className="tabular-nums">{step + 1}</span>
                <ArrowRightIcon className="size-3" />
              </p>
              <h2 className="mt-2 text-balance font-semibold text-xl tracking-tight sm:text-2xl" id={`${uid}-q`}>
                {q.title}
              </h2>
              {q.hint && (
                <p
                  className={cn(
                    "mt-1.5 text-pretty text-sm transition-colors duration-200",
                    limitHit ? "text-warning-foreground" : "text-muted-foreground",
                  )}
                >
                  {q.hint}
                </p>
              )}

              {q.kind === "text" ? (
                <div className="mt-6">
                  <label className="sr-only" htmlFor={`${uid}-text`}>
                    {q.title}
                  </label>
                  <textarea
                    className="block min-h-28 w-full resize-none rounded-xl border bg-background px-3.5 py-3 text-base shadow-xs/5 outline-none transition-shadow placeholder:text-muted-foreground/72 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/24 sm:text-sm dark:bg-input/32"
                    id={`${uid}-text`}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    placeholder={q.placeholder}
                    ref={textRef}
                    value={(answers[q.id] as string | undefined) ?? ""}
                  />
                  <p className="mt-2 flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> for a new line
                  </p>
                </div>
              ) : (
                <ul className="mt-6 grid gap-2">
                  {q.options.map((option, i) => {
                    const selected =
                      q.kind === "single" ? answers[q.id] === option : ((answers[q.id] as string[] | undefined) ?? []).includes(option);
                    return (
                      <li key={option}>
                        <motion.button
                          animate={flash === option && !reduce ? { opacity: [1, 0.45, 1, 0.45, 1] } : { opacity: 1 }}
                          aria-pressed={selected}
                          className={cn(
                            "group flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm outline-none transition-[background-color,border-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]",
                            selected ? "border-foreground/70 bg-accent" : "hover:border-foreground/20 hover:bg-accent/40",
                          )}
                          onClick={() => pick(option)}
                          transition={{ duration: 0.36, ease: "linear" }}
                          type="button"
                        >
                          <span
                            className={cn(
                              "flex size-6 shrink-0 items-center justify-center rounded-md border font-medium font-mono text-xs transition-colors duration-150",
                              selected ? "border-foreground bg-foreground text-background" : "bg-background text-muted-foreground dark:bg-input/32",
                            )}
                          >
                            {LETTERS[i]}
                          </span>
                          <span className="min-w-0 flex-1">{option}</span>
                          <motion.span
                            animate={{ opacity: selected ? 1 : 0, scale: selected ? 1 : 0.6 }}
                            className="flex"
                            initial={false}
                            transition={{ duration: 0.16, ease }}
                          >
                            <CheckIcon className="size-4" strokeWidth={2.5} />
                          </motion.span>
                        </motion.button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {q.kind !== "single" && (
                <div className="mt-5 flex items-center gap-3">
                  <Button className={press} disabled={!canContinue} onClick={() => go(step + 1)}>
                    {step === questions.length - 1 ? "Finish" : "Continue"}
                    {step === questions.length - 1 ? <CheckIcon /> : <ArrowRightIcon />}
                  </Button>
                  <span className="hidden items-center gap-1.5 text-muted-foreground text-xs sm:flex">
                    or press <Kbd>Enter</Kbd>
                    <CornerDownLeftIcon className="size-3" />
                  </span>
                  {q.kind === "text" && q.optional && (
                    <Button className={cn("ms-auto text-muted-foreground", press)} onClick={() => go(step + 1)} variant="ghost">
                      Skip
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="px-5 pt-10 pb-8 sm:px-8"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              key="done"
              transition={{ duration: 0.28, ease }}
            >
              <motion.span
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                className="flex size-12 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-700 dark:text-violet-300"
                initial={reduce ? false : { scale: 0.8, opacity: 0, rotate: -8 }}
                transition={{ type: "spring", stiffness: 380, damping: 20, delay: 0.08 }}
              >
                <SparklesIcon className="size-6" />
              </motion.span>
              <h2 className="mt-5 text-balance font-semibold text-2xl tracking-tight">
                {doneTitle ?? (first ? `You’re all set, ${first}` : "You’re all set")}
              </h2>
              <p className="mt-1.5 max-w-[48ch] text-pretty text-muted-foreground text-sm">{doneText}</p>
              <dl className="mt-6 divide-y rounded-xl border">
                {questions.map((item, i) => {
                  const a = answers[item.id];
                  const text = Array.isArray(a) ? a.join(", ") : a?.trim();
                  return (
                    <motion.div
                      animate={{ opacity: 1 }}
                      className="flex items-start justify-between gap-4 px-3.5 py-2.5 text-sm"
                      initial={reduce ? false : { opacity: 0 }}
                      key={item.id}
                      transition={{ duration: 0.2, delay: 0.15 + i * 0.04 }}
                    >
                      <dt className="min-w-0 truncate text-muted-foreground">{item.title}</dt>
                      <dd className={cn("max-w-[55%] shrink-0 text-end", !text && "text-muted-foreground")}>
                        <button
                          className="cursor-pointer rounded text-end outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => go(i)}
                          type="button"
                        >
                          {text || "Skipped"}
                        </button>
                      </dd>
                    </motion.div>
                  );
                })}
              </dl>
              <Button
                className={cn("mt-6 text-muted-foreground", press)}
                onClick={() => {
                  setAnswers({});
                  setDir(-1);
                  setStep(0);
                }}
                variant="ghost"
              >
                <RotateCcwIcon />
                Start over
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!done && q && q.kind !== "text" && (
        <div className="flex items-center gap-1.5 border-t bg-muted/40 px-5 py-3 text-muted-foreground text-xs sm:px-8">
          <span className="hidden sm:inline">Press</span>
          <span className="hidden items-center gap-1 sm:flex">
            {q.options.map((_, i) => (
              <Kbd key={i}>{LETTERS[i]}</Kbd>
            ))}
          </span>
          <span className="hidden sm:inline">to answer</span>
          <span className="sm:hidden">Tap an answer to continue</span>
          {q.kind === "multi" && q.max && (
            <span className="ms-auto tabular-nums">
              {((answers[q.id] as string[] | undefined) ?? []).length} of {q.max} picked
            </span>
          )}
        </div>
      )}
        </div>
      </motion.div>
    </section>
  );
}
