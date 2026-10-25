"use client";

import { CheckIcon, LockIcon, PlusIcon, TrophyIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface Poll {
  question: string;
  options: PollOption[];
  author?: string;
  closed?: boolean;
}

export interface LivePollProps {
  defaultPoll?: Poll;
  defaultVote?: string | null;
  simulateCrowd?: boolean;
  you?: string;
  onVote?: (optionId: string) => void;
  onClose?: (poll: Poll) => void;
  className?: string;
}

const MAX_OPTIONS = 5;
const ease = [0.23, 1, 0.32, 1] as const;
let uid = 0;
const nextId = () => `o${++uid}`;

function Rolling({ value, suffix = "", reduce }: { value: number; suffix?: string; reduce: boolean | null }) {
  return (
    <span className="relative inline-flex overflow-hidden tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: -8, opacity: 0 }}
          initial={reduce ? { opacity: 0 } : { y: 8, opacity: 0 }}
          key={value}
          transition={{ duration: 0.18, ease }}
        >
          {value}
          {suffix}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function LivePoll({
  defaultPoll,
  defaultVote = null,
  simulateCrowd = false,
  you = "You",
  onVote,
  onClose,
  className,
}: LivePollProps) {
  const reduce = useReducedMotionAfterMount();
  const [poll, setPoll] = useState<Poll | null>(defaultPoll ?? null);
  const [vote, setVote] = useState<string | null>(defaultVote);
  const [pulse, setPulse] = useState<string | null>(null);
  const previous = useRef<{ poll: Poll; vote: string | null } | null>(null);

  useEffect(() => {
    if (!simulateCrowd || !poll || poll.closed) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setPoll((p) => {
        if (!p || p.closed) return p;
        const weights = p.options.map((o) => o.votes + 2);
        let r = Math.random() * weights.reduce((a, b) => a + b, 0);
        const idx = weights.findIndex((w) => (r -= w) < 0);
        const target = p.options[Math.max(0, idx)];
        setPulse(target.id);
        return { ...p, options: p.options.map((o) => (o.id === target.id ? { ...o, votes: o.votes + 1 } : o)) };
      });
      timer = setTimeout(tick, 1400 + Math.random() * 1800);
    };
    timer = setTimeout(tick, 1600);
    return () => clearTimeout(timer);
  }, [simulateCrowd, poll?.closed, poll === null]);

  const castVote = (id: string) => {
    if (!poll || poll.closed || id === vote) return;
    setPoll({
      ...poll,
      options: poll.options.map((o) =>
        o.id === id ? { ...o, votes: o.votes + 1 } : o.id === vote ? { ...o, votes: Math.max(0, o.votes - 1) } : o,
      ),
    });
    setVote(id);
    setPulse(null);
    onVote?.(id);
  };

  const close = () => {
    if (!poll) return;
    const done = { ...poll, closed: true };
    setPoll(done);
    onClose?.(done);
  };

  return (
    <section
      aria-label={poll ? `Poll: ${poll.question}` : "New poll"}
      className={cn("w-full max-w-[400px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {poll ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            key="poll"
            transition={{ duration: 0.22, ease }}
          >
            <PollView
              onClose={close}
              onNew={() => {
                previous.current = { poll, vote };
                setPoll(null);
                setVote(null);
              }}
              onVote={castVote}
              poll={poll}
              pulse={pulse}
              reduce={reduce}
              vote={vote}
              you={you}
            />
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            key="compose"
            transition={{ duration: 0.22, ease }}
          >
            <Composer
              onCancel={
                previous.current
                  ? () => {
                      const prev = previous.current;
                      if (!prev) return;
                      setPoll(prev.poll);
                      setVote(prev.vote);
                    }
                  : undefined
              }
              onPost={(question, labels) => {
                setVote(null);
                setPoll({ question, author: you, options: labels.map((label) => ({ id: nextId(), label, votes: 0 })) });
              }}
              reduce={reduce}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function PollView({
  poll,
  vote,
  pulse,
  you,
  reduce,
  onVote,
  onClose,
  onNew,
}: {
  poll: Poll;
  vote: string | null;
  pulse: string | null;
  you: string;
  reduce: boolean | null;
  onVote: (id: string) => void;
  onClose: () => void;
  onNew: () => void;
}) {
  const total = poll.options.reduce((n, o) => n + o.votes, 0);
  const showResults = vote !== null || !!poll.closed;
  const top = Math.max(...poll.options.map((o) => o.votes));
  const mine = poll.author === you;
  const groupId = useId();

  return (
    <div>
      <header className="flex items-center gap-2 px-4 pt-4 text-muted-foreground text-xs">
        <AnimatePresence initial={false} mode="popLayout">
          {poll.closed ? (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              className="flex h-5 items-center gap-1 rounded-full bg-muted px-2 font-medium text-foreground"
              initial={{ opacity: 0, scale: 0.9 }}
              key="closed"
              transition={{ duration: 0.18, ease }}
            >
              <LockIcon className="size-3" />
              Final results
            </motion.span>
          ) : (
            <motion.span
              className="flex h-5 items-center gap-1.5 rounded-full bg-success/10 px-2 font-medium text-success-foreground"
              exit={{ opacity: 0, scale: 0.9 }}
              key="live"
            >
              <span className="relative flex size-1.5">
                {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60 [animation-duration:1.8s]" />}
                <span className="relative size-1.5 rounded-full bg-success" />
              </span>
              Live
            </motion.span>
          )}
        </AnimatePresence>
        <span>{poll.author ? `${poll.author} asked` : "Poll"}</span>
        <span className="ms-auto" aria-live="polite">
          <Rolling reduce={reduce} value={total} /> {total === 1 ? "vote" : "votes"}
        </span>
      </header>

      <h3 className="text-balance px-4 pt-2.5 pb-3 font-medium text-base leading-snug tracking-tight" id={groupId}>
        {poll.question}
      </h3>

      <div aria-labelledby={groupId} className="space-y-1.5 px-3" role="radiogroup">
        {poll.options.map((o) => {
          const pct = total ? Math.round((o.votes / total) * 100) : 0;
          const chosen = vote === o.id;
          const winner = poll.closed && o.votes === top && top > 0;
          return (
            <button
              aria-checked={chosen}
              className={cn(
                "group/opt relative flex h-11 w-full items-center gap-2.5 overflow-hidden rounded-xl border px-3 text-left text-sm outline-none transition-[border-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                poll.closed ? "cursor-default" : "cursor-pointer active:scale-[0.99]",
                chosen ? "border-info/40" : winner ? "border-success/40" : "border-border",
                !poll.closed && !chosen && "[@media(hover:hover)]:hover:border-foreground/20",
              )}
              disabled={poll.closed}
              key={o.id}
              onClick={() => onVote(o.id)}
              role="radio"
              type="button"
            >
              <motion.span
                animate={{ clipPath: `inset(0 ${showResults ? 100 - pct : 100}% 0 0 round 13px)` }}
                aria-hidden
                className={cn(
                  "absolute inset-0 transition-colors duration-300",
                  chosen ? "bg-info/14" : winner ? "bg-success/14" : "bg-muted",
                )}
                initial={false}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 28 }}
              />
              {pulse === o.id && showResults && !poll.closed && !reduce && (
                <motion.span
                  animate={{ opacity: [0, 0.6, 0] }}
                  aria-hidden
                  className="absolute inset-0 bg-foreground/5"
                  key={`${o.id}-${o.votes}`}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              )}
              <span
                className={cn(
                  "relative flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
                  chosen ? "border-info bg-info text-white" : "border-foreground/25",
                  poll.closed && !chosen && (winner ? "border-transparent text-success-foreground" : "opacity-0"),
                )}
              >
                {winner && !chosen && <TrophyIcon aria-hidden className="size-3.5" />}
                <AnimatePresence>
                  {chosen && (
                    <motion.span
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 600, damping: 30 }}
                    >
                      <CheckIcon className="size-2.5" strokeWidth={3.5} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <span className={cn("relative min-w-0 flex-1 truncate", (chosen || winner) && "font-medium")}>{o.label}
                {winner && <span className="sr-only">, winner</span>}
              </span>
              <AnimatePresence initial={false}>
                {showResults && (
                  <motion.span
                    animate={{ opacity: 1, x: 0 }}
                    className={cn("relative text-xs tabular-nums", chosen || winner ? "text-foreground" : "text-muted-foreground")}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, x: 4 }}
                    transition={{ duration: 0.2, ease, delay: 0.08 }}
                  >
                    <Rolling reduce={reduce} suffix="%" value={pct} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      <footer className="mt-3 flex min-h-12 items-center justify-between gap-2 border-t px-4 py-2.5 text-muted-foreground text-xs">
        <span>
          {poll.closed
            ? "Voting has ended"
            : vote
              ? "You can change your vote until it closes"
              : "Vote to see the results"}
        </span>
        {poll.closed ? (
          <Button onClick={onNew} size="sm" variant="ghost">
            <PlusIcon />
            New poll
          </Button>
        ) : (
          mine && (
            <Button onClick={onClose} size="sm" variant="outline">
              <LockIcon />
              Close poll
            </Button>
          )
        )}
      </footer>
    </div>
  );
}

function Composer({
  onPost,
  onCancel,
  reduce,
}: {
  onPost: (question: string, options: string[]) => void;
  onCancel?: () => void;
  reduce: boolean | null;
}) {
  const qId = useId();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(() => [
    { id: nextId(), label: "" },
    { id: nextId(), label: "" },
  ]);
  const refs = useRef(new Map<string, HTMLInputElement>());
  const focusNext = useRef<string | null>(null);

  useEffect(() => {
    if (!focusNext.current) return;
    refs.current.get(focusNext.current)?.focus();
    focusNext.current = null;
  });

  const filled = options.map((o) => o.label.trim()).filter(Boolean);
  const ready = question.trim().length > 0 && filled.length >= 2;

  const add = () => {
    if (options.length >= MAX_OPTIONS) return;
    const id = nextId();
    focusNext.current = id;
    setOptions((os) => [...os, { id, label: "" }]);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (ready) onPost(question.trim(), filled);
  };

  return (
    <form className="p-4" onSubmit={submit}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">New poll</h3>
        <span className="text-muted-foreground text-xs tabular-nums">
          {options.length}/{MAX_OPTIONS} options
        </span>
      </div>
      <label className="sr-only" htmlFor={qId}>
        Question
      </label>
      <input
        autoComplete="off"
        className="mt-3 h-10 w-full rounded-xl border bg-background px-3 font-medium text-sm outline-none transition-shadow placeholder:font-normal placeholder:text-muted-foreground/72 focus:border-ring focus:ring-[3px] focus:ring-ring/24 dark:bg-input/32"
        id={qId}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question…"
        value={question}
      />
      <ol className="mt-2 space-y-1.5">
        <AnimatePresence initial={false}>
          {options.map((o, i) => (
            <motion.li
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden"
              exit={{ opacity: 0, height: 0 }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              key={o.id}
              transition={{ type: "spring", stiffness: 520, damping: 40, opacity: { duration: 0.14 } }}
            >
              <div className="flex items-center gap-2 pb-px">
                <span className="w-4 shrink-0 text-center text-muted-foreground text-xs tabular-nums">{i + 1}</span>
                <input
                  aria-label={`Option ${i + 1}`}
                  autoComplete="off"
                  className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground/72 focus:border-ring focus:ring-[3px] focus:ring-ring/24 dark:bg-input/32"
                  onChange={(e) => setOptions((os) => os.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && i === options.length - 1 && o.label.trim()) {
                      e.preventDefault();
                      add();
                    }
                  }}
                  placeholder={i === 0 ? "First choice" : i === 1 ? "Second choice" : "Another choice"}
                  ref={(el) => {
                    if (el) refs.current.set(o.id, el);
                    else refs.current.delete(o.id);
                  }}
                  value={o.label}
                />
                <button
                  aria-label={`Remove option ${i + 1}`}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30"
                  disabled={options.length <= 2}
                  onClick={() => setOptions((os) => os.filter((x) => x.id !== o.id))}
                  type="button"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      <div className="mt-3 flex items-center gap-2">
        <Button disabled={options.length >= MAX_OPTIONS} onClick={add} size="sm" variant="ghost">
          <PlusIcon />
          Add option
        </Button>
        <span className="flex-1" />
        {onCancel && (
          <Button onClick={onCancel} size="sm" variant="ghost">
            Cancel
          </Button>
        )}
        <Button disabled={!ready} size="sm" type="submit">
          Post poll
        </Button>
      </div>
    </form>
  );
}
