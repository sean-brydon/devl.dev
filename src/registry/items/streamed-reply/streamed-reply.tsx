"use client";

import {
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  CornerDownRightIcon,
  RefreshCwIcon,
  SparklesIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  PreviewCard,
  PreviewCardPopup,
  PreviewCardTrigger,
} from "@/components/ui/preview-card";
import { cn } from "@/lib/utils";

// Stays false until mounted so the server render and the first client render match.
function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export interface ReplySource {
  title: string;
  domain: string;
  url?: string;
  snippet: string;
}

export interface StreamedReplyProps {
  question?: string;
  answer?: string;
  sources?: ReplySource[];
  followUps?: string[];
  speed?: number;
  onFollowUp?: (question: string) => void;
  onFeedback?: (value: "up" | "down" | null) => void;
  className?: string;
}

const defaultSources: ReplySource[] = [
  {
    title: "Why sourdough rises slower in winter",
    domain: "crumbjournal.com",
    snippet:
      "Wild yeast activity roughly halves for every 8\u00a0°C drop, so a cold kitchen can double bulk fermentation time.",
  },
  {
    title: "Dough temperature, explained",
    domain: "bakersfield.guide",
    snippet:
      "Aim for a final dough temperature of 24–26\u00a0°C. Use warmer water to compensate for a cool room or cold flour.",
  },
  {
    title: "Proofing boxes vs. the oven-light trick",
    domain: "hearthandloaf.co",
    snippet:
      "An oven with only the light on sits around 27–30\u00a0°C, close to a proofing box for most home bakers.",
  },
];

const defaultAnswer = `Your starter is probably fine. Wild yeast slows down a lot in the cold, so a chilly kitchen can easily double how long bulk fermentation takes [1].

Try mixing with warmer water so the dough lands around 25\u00a0°C [2], then let it rise somewhere snug: an oven with just the light on works surprisingly well [3]. Judge by the dough, not the clock: look for a 50–75% rise, a domed top and bubbles along the sides.`;

const defaultFollowUps = [
  "How do I know my starter is active?",
  "Can I proof overnight in the fridge?",
];

const easeOut = [0.23, 1, 0.32, 1] as const;
const tints = [
  "bg-orange-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-rose-500",
];
const press =
  "transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97]";

type Part = { kind: "text"; text: string } | { kind: "cite"; n: number };
type Token = { kind: "space" } | { kind: "word"; parts: Part[] };

function tokenize(answer: string): Token[][] {
  return answer
    .trim()
    .replace(/[ \t]+(\[\d+\])/g, "$1")
    .split(/\n\s*\n/)
    .map((para) =>
      para
        .split(/([ \t\n]+)/)
        .filter(Boolean)
        .map((chunk): Token => {
          if (/^[ \t\n]+$/.test(chunk)) return { kind: "space" };
          const parts = chunk
            .split(/(\[\d+\])/)
            .filter(Boolean)
            .map((part): Part => {
              const cite = /^\[(\d+)\]$/.exec(part);
              return cite
                ? { kind: "cite", n: Number(cite[1]) }
                : { kind: "text", text: part };
            });
          const last = parts.at(-1);
          const prev = parts.at(-2);
          if (
            last?.kind === "text" &&
            prev?.kind === "cite" &&
            /^[.,;:!?]+$/.test(last.text)
          ) {
            let i = parts.length - 2;
            while (parts[i - 1]?.kind === "cite") i--;
            parts.splice(parts.length - 1, 1);
            const before = parts[i - 1];
            if (before?.kind === "text") before.text += last.text;
            else parts.splice(i, 0, last);
          }
          return { kind: "word", parts };
        }),
    );
}

export function StreamedReply({
  question = "My sourdough barely rose overnight. Is my starter dead?",
  answer = defaultAnswer,
  sources = defaultSources,
  followUps = defaultFollowUps,
  speed = 38,
  onFollowUp,
  onFeedback,
  className,
}: StreamedReplyProps) {
  const reduce = useSafeReducedMotion();
  const paragraphs = useMemo(() => tokenize(answer), [answer]);
  const total = useMemo(
    () => paragraphs.reduce((n, p) => n + p.length, 0),
    [paragraphs],
  );
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<"searching" | "streaming" | "done">(
    "searching",
  );
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduce) {
      setShown(total);
      setPhase("done");
      return;
    }
    setShown(0);
    setPhase("searching");
    let timer: ReturnType<typeof setTimeout>;
    let count = 0;
    const tick = () => {
      count = Math.min(total, count + 1 + Math.round(Math.random() * 2));
      setShown(count);
      if (count >= total) {
        setPhase("done");
        return;
      }
      timer = setTimeout(tick, speed + Math.random() * speed);
    };
    timer = setTimeout(() => {
      setPhase("streaming");
      tick();
    }, 1100);
    return () => clearTimeout(timer);
  }, [run, total, speed, reduce]);

  const plain = answer.replace(/\s?\[\d+\]/g, "");
  const done = phase === "done";
  let index = 0;

  return (
    <article
      className={cn(
        "w-full max-w-lg rounded-2xl border bg-card p-4 text-sm shadow-xs/5",
        className,
      )}
    >
      <div className="mb-3 flex items-start gap-2.5">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <SparklesIcon className="size-3.5" />
        </span>
        <p className="text-pretty font-medium text-foreground leading-6">
          {question}
        </p>
      </div>

      <div
        aria-label="Sources"
        className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1"
        role="list"
      >
        {sources.map((src, i) => (
          <motion.a
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
              "flex min-w-36 flex-1 basis-0 flex-col gap-1.5 rounded-xl border bg-background p-2.5 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
              press,
            )}
            href={src.url ?? "#"}
            initial={reduce ? false : { opacity: 0, y: 6, scale: 0.97 }}
            key={`${run}-${src.domain}`}
            onClick={(e) => !src.url && e.preventDefault()}
            role="listitem"
            transition={{ duration: 0.3, ease: easeOut, delay: 0.1 + i * 0.04 }}
          >
            <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Favicon domain={src.domain} i={i} />
              <span className="truncate">{src.domain}</span>
              <span className="ms-auto font-mono tabular-nums">{i + 1}</span>
            </span>
            <span className="line-clamp-2 text-foreground text-xs leading-4">
              {src.title}
            </span>
          </motion.a>
        ))}
      </div>

      {/* An invisible copy of the full answer sizes the card from the first frame. */}
      <div className="grid leading-6 *:col-start-1 *:row-start-1">
        <div aria-hidden className="invisible">
          {paragraphs.map((tokens, pi) => (
            <p className="mb-2.5 last:mb-0" key={pi}>
              {tokens.map((tok, ti) =>
                tok.kind === "space" ? (
                  <span key={ti}> </span>
                ) : (
                  <span className="whitespace-nowrap" key={ti}>
                    {tok.parts.map((part, k) =>
                      part.kind === "cite" ? (
                        sources[part.n - 1] ? (
                          <span className={chip} key={k}>
                            {part.n}
                          </span>
                        ) : null
                      ) : (
                        <span key={k}>{part.text}</span>
                      ),
                    )}
                  </span>
                ),
              )}
            </p>
          ))}
        </div>
        <div aria-busy={!done} aria-live="polite">
          {phase === "searching" ? (
            <div className="flex flex-col">
              <Shimmer>{`Reading ${sources.length} sources…`}</Shimmer>
              <div aria-hidden className="mt-2 flex flex-col gap-2.5">
                {["w-full", "w-11/12", "w-3/5"].map((w) => (
                  <span className={cn("h-2.5 rounded-full bg-muted/70", w)} key={w} />
                ))}
              </div>
            </div>
          ) : (
            paragraphs.map((tokens, pi) => (
              <p
                className="mb-2.5 text-foreground/90 last:mb-0"
                key={`${run}-${pi}`}
              >
                {tokens.map((tok, ti) => {
                  const at = index++;
                  if (at >= shown) return null;
                  const key = `${pi}-${ti}`;
                  if (tok.kind === "space") return <span key={key}> </span>;
                  return (
                    <span className="whitespace-nowrap" key={key}>
                      {tok.parts.map((part, k) => {
                        if (part.kind === "cite") {
                          const src = sources[part.n - 1];
                          return src ? (
                            <Citation key={k} n={part.n} source={src} />
                          ) : null;
                        }
                        return (
                          <motion.span
                            animate={{ opacity: 1, filter: "blur(0px)" }}
                            initial={{ opacity: 0, filter: "blur(4px)" }}
                            key={k}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                          >
                            {part.text}
                          </motion.span>
                        );
                      })}
                    </span>
                  );
                })}
                {phase === "streaming" && caretInParagraph(pi, paragraphs, shown) && (
                  <Caret />
                )}
              </p>
            ))
          )}
        </div>
      </div>

      <motion.div
        animate={done ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
        className={cn(!done && "pointer-events-none")}
        inert={!done}
        initial={false}
        transition={{ duration: done ? 0.25 : 0.12, ease: easeOut }}
      >
        <Actions
          onFeedback={onFeedback}
          onRegenerate={() => setRun((r) => r + 1)}
          run={run}
          text={plain}
        />
        {followUps.length > 0 && (
          <div className="mt-3 border-t pt-2">
            <div className="-mx-2 flex flex-col gap-0.5">
              {followUps.map((q, i) => (
                <motion.button
                  animate={done ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
                  className={cn(
                    "group/fu flex min-h-8 items-center gap-2 rounded-lg px-2 py-1.5 text-start text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                    press,
                  )}
                  initial={false}
                  key={q}
                  onClick={() => onFollowUp?.(q)}
                  transition={{
                    duration: 0.25,
                    ease: easeOut,
                    delay: done ? 0.06 + i * 0.04 : 0,
                  }}
                  type="button"
                >
                  <CornerDownRightIcon className="size-3.5 shrink-0" />
                  <span className="flex-1">{q}</span>
                  <ArrowUpRightIcon className="size-3.5 shrink-0 opacity-0 transition-[opacity,translate] duration-150 ease-out group-hover/fu:translate-x-0.5 group-hover/fu:opacity-100 group-focus-visible/fu:opacity-100" />
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </article>
  );
}

function caretInParagraph(pi: number, paragraphs: Token[][], shown: number) {
  let start = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const end = start + paragraphs[i].length;
    if (shown <= end || i === paragraphs.length - 1) return i === pi;
    start = end;
  }
  return false;
}

const chip =
  "ms-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 align-[2px] font-medium font-mono text-[10px] tabular-nums";

function Favicon({ domain, i }: { domain: string; i: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-full font-semibold text-[9px] text-white uppercase",
        tints[i % tints.length],
      )}
    >
      {domain[0]}
    </span>
  );
}

function Citation({ n, source }: { n: number; source: ReplySource }) {
  const reduce = useSafeReducedMotion();
  return (
    <PreviewCard>
      <PreviewCardTrigger
        aria-label={`Source ${n}: ${source.title}`}
        className={cn(
          chip,
          "relative bg-muted text-muted-foreground no-underline outline-none transition-colors duration-150 after:absolute after:-inset-x-1.5 after:-inset-y-2 hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-primary data-popup-open:text-primary-foreground",
        )}
        closeDelay={120}
        delay={150}
        href={source.url ?? "#"}
        onClick={(e) => !source.url && e.preventDefault()}
        render={
          <motion.a
            animate={{ opacity: 1, scale: 1 }}
            initial={reduce ? false : { opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: easeOut }}
          />
        }
      >
        {n}
      </PreviewCardTrigger>
      <PreviewCardPopup
        className="w-72 flex-col gap-2 text-pretty p-3 duration-150 ease-out"
        sideOffset={6}
      >
        <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Favicon domain={source.domain} i={n - 1} />
          {source.domain}
          <span className="ms-auto font-mono tabular-nums">[{n}]</span>
        </span>
        <span className="font-medium text-foreground text-sm leading-5">
          {source.title}
        </span>
        <span className="text-muted-foreground text-xs leading-5">
          {source.snippet}
        </span>
      </PreviewCardPopup>
    </PreviewCard>
  );
}

function Caret() {
  return (
    <motion.span
      animate={{ opacity: [1, 0.25, 1] }}
      aria-hidden
      className="ms-1 inline-block size-2 rounded-full bg-foreground align-[1px]"
      transition={{
        duration: 0.9,
        ease: "easeInOut",
        repeat: Number.POSITIVE_INFINITY,
      }}
    />
  );
}

function Shimmer({ children }: { children: string }) {
  return (
    <motion.span
      animate={{ backgroundPosition: ["100% 0%", "-100% 0%"] }}
      className="bg-clip-text font-medium text-transparent"
      style={{
        backgroundImage:
          "linear-gradient(90deg, var(--color-muted-foreground) 35%, var(--color-foreground) 50%, var(--color-muted-foreground) 65%)",
        backgroundSize: "200% 100%",
      }}
      transition={{
        duration: 1.5,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
      }}
    >
      {children}
    </motion.span>
  );
}

function Actions({
  text,
  run,
  onRegenerate,
  onFeedback,
}: {
  text: string;
  run: number;
  onRegenerate: () => void;
  onFeedback?: (value: "up" | "down" | null) => void;
}) {
  const reduce = useSafeReducedMotion();
  const [copied, setCopied] = useState(false);
  const [voted, setVoted] = useState<{ run: number; v: "up" | "down" }>();
  const vote = voted?.run === run ? voted.v : null;
  const [spins, setSpins] = useState(0);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
    setCopied(true);
  };

  const castVote = (v: "up" | "down") => {
    const next = vote === v ? null : v;
    setVoted(next ? { run, v: next } : undefined);
    onFeedback?.(next);
  };

  const btn = cn(
    "relative grid size-8 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
    press,
  );

  return (
    <div className="-ms-2 mt-3 flex h-8 items-center gap-0.5">
      <button
        aria-label={copied ? "Copied" : "Copy answer"}
        className={btn}
        onClick={copy}
        type="button"
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            exit={{ scale: 0.6, opacity: 0, filter: "blur(2px)" }}
            initial={{ scale: 0.6, opacity: 0, filter: "blur(2px)" }}
            key={copied ? "check" : "copy"}
            transition={{ duration: 0.18, ease: easeOut }}
          >
            {copied ? (
              <CheckIcon className="size-4 text-success-foreground" />
            ) : (
              <CopyIcon className="size-4" />
            )}
          </motion.span>
        </AnimatePresence>
      </button>
      <button
        aria-label="Regenerate"
        className={btn}
        onClick={() => {
          setSpins((n) => n + 1);
          onRegenerate();
        }}
        type="button"
      >
        <motion.span
          animate={{ rotate: reduce ? 0 : spins * 360 }}
          className="grid"
          initial={false}
          transition={{ duration: 0.5, ease: easeOut }}
        >
          <RefreshCwIcon className="size-4" />
        </motion.span>
      </button>
      <span aria-hidden className="mx-1 h-4 w-px bg-border" />
      {(["up", "down"] as const).map((v) => {
        const Icon = v === "up" ? ThumbsUpIcon : ThumbsDownIcon;
        const on = vote === v;
        return (
          <button
            aria-label={v === "up" ? "Good answer" : "Bad answer"}
            aria-pressed={on}
            className={cn(btn, on && "text-foreground")}
            key={v}
            onClick={() => castVote(v)}
            type="button"
          >
            <motion.span
              animate={
                on && !reduce
                  ? { scale: [1, 1.2, 1], rotate: v === "up" ? [0, -10, 0] : [0, 10, 0] }
                  : { scale: 1, rotate: 0 }
              }
              className="grid"
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Icon
                className={cn(
                  "size-4 transition-[fill] duration-150",
                  on && "fill-current",
                )}
              />
            </motion.span>
          </button>
        );
      })}
      <AnimatePresence>
        {vote && (
          <motion.span
            animate={{ opacity: 1, x: 0 }}
            className="ms-1 text-muted-foreground text-xs"
            exit={{ opacity: 0, x: -4, transition: { duration: 0.12 } }}
            initial={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.2, ease: easeOut }}
          >
            Thanks for the feedback
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
