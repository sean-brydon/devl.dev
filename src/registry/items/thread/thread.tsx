"use client";

import { CheckIcon, ChevronDownIcon, CircleSlashIcon, CornerDownLeftIcon, SparklesIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, Fragment, type ReactNode, useId, useState } from "react";
import { cn } from "@/lib/utils";

export type ThreadTone = "info" | "success" | "warning" | "destructive" | "muted";

export interface ThreadAuthor {
  name: string;
  initials: string;
  tone?: ThreadTone;
  assistant?: boolean;
}

export interface ThreadStep {
  label: string;
  detail?: string;
  status?: "done" | "skipped";
}

export interface ThreadMessage {
  id: string;
  author: ThreadAuthor;
  time: string;
  body: string;
  steps?: ThreadStep[];
}

export interface ThreadProps {
  comment: ThreadMessage;
  replies?: ThreadMessage[];
  currentUser?: ThreadAuthor;
  mentionable?: string[];
  className?: string;
}

const toneClass: Record<ThreadTone, string> = {
  info: "bg-info/12 text-info-foreground",
  success: "bg-success/12 text-success-foreground",
  warning: "bg-warning/14 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive-foreground",
  muted: "bg-muted text-foreground",
};

const spring = { type: "spring", stiffness: 420, damping: 32 } as const;

function Initials({ author, size = "md" }: { author: ThreadAuthor; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex shrink-0 select-none items-center justify-center rounded-full font-medium",
        size === "md" ? "size-8 text-xs" : "size-6 text-[10px]",
        author.assistant ? "bg-primary text-primary-foreground" : toneClass[author.tone ?? "muted"],
      )}
    >
      {author.assistant ? <SparklesIcon className={size === "md" ? "size-4" : "size-3"} /> : author.initials}
    </span>
  );
}

function renderBody(text: string, mentionable: string[]): ReactNode {
  const names = mentionable.map((n) => n.toLowerCase());
  return text.split(/(@[\p{L}\d_-]+)/u).map((part, i) => {
    const isMention = part.startsWith("@") && (names.length === 0 || names.includes(part.slice(1).toLowerCase()));
    if (!isMention) return <Fragment key={i}>{part}</Fragment>;
    return (
      <span
        className="rounded-md bg-info/10 px-1 py-px font-medium text-info-foreground [box-decoration-break:clone]"
        key={i}
      >
        {part}
      </span>
    );
  });
}

function AssistantSteps({ steps }: { steps: ThreadStep[] }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const panelId = useId();
  const done = steps.filter((s) => s.status !== "skipped").length;

  return (
    <div className="mt-2 overflow-hidden rounded-xl border bg-muted/40">
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="flex min-h-9 w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-muted-foreground text-xs outline-none transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="flex size-4 items-center justify-center rounded-full bg-success/16 text-success-foreground">
          <CheckIcon className="size-2.5" strokeWidth={3} />
        </span>
        <span className="font-medium text-foreground">
          Did {done} {done === 1 ? "thing" : "things"}
        </span>
        {steps.length > done && <span className="tabular-nums">· {steps.length - done} skipped</span>}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          className="ms-auto"
          transition={reduce ? { duration: 0 } : spring}
        >
          <ChevronDownIcon className="size-3.5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { ...spring, opacity: { duration: 0.15 } }}
          >
            <ol className="relative space-y-2.5 border-t px-3 py-3">
              {steps.map((step, i) => {
                const skipped = step.status === "skipped";
                return (
                  <motion.li
                    animate={{ opacity: 1, x: 0 }}
                    className="relative flex gap-2.5 text-xs"
                    initial={reduce ? false : { opacity: 0, x: -6 }}
                    key={step.label}
                    transition={{ ...spring, delay: reduce ? 0 : 0.04 * i }}
                  >
                    {i < steps.length - 1 && (
                      <span aria-hidden className="absolute top-5 bottom-[-12px] left-[7px] w-px bg-border" />
                    )}
                    <span
                      className={cn(
                        "relative mt-0.5 flex size-[15px] shrink-0 items-center justify-center rounded-full",
                        skipped ? "bg-muted text-muted-foreground" : "bg-success text-white",
                      )}
                    >
                      {skipped ? (
                        <CircleSlashIcon className="size-2.5" />
                      ) : (
                        <CheckIcon className="size-2.5" strokeWidth={3} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block font-medium", skipped && "text-muted-foreground line-through")}>
                        {step.label}
                      </span>
                      {step.detail && <span className="block text-muted-foreground tabular-nums">{step.detail}</span>}
                    </span>
                  </motion.li>
                );
              })}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Message({
  message,
  mentionable,
  root,
  last,
}: {
  message: ThreadMessage;
  mentionable: string[];
  root?: boolean;
  last?: boolean;
}) {
  return (
    <div className="relative flex gap-3">
      {!last && <span aria-hidden className="absolute top-10 bottom-0 left-4 w-px -translate-x-1/2 bg-border" />}
      <Initials author={message.author} />
      <div className={cn("min-w-0 flex-1", !last && "pb-4")}>
        <div className="flex items-baseline gap-2">
          <span className="truncate font-medium text-sm">{message.author.name}</span>
          {message.author.assistant && (
            <span className="rounded-full bg-muted px-1.5 py-px font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
              AI
            </span>
          )}
          <span className="shrink-0 text-muted-foreground text-xs">{message.time}</span>
        </div>
        <p className={cn("mt-0.5 text-pretty text-sm leading-relaxed", !root && "text-foreground/90")}>
          {renderBody(message.body, mentionable)}
        </p>
        {message.steps && message.steps.length > 0 && <AssistantSteps steps={message.steps} />}
      </div>
    </div>
  );
}

export function Thread({
  comment,
  replies = [],
  currentUser = { name: "You", initials: "YO", tone: "muted" },
  mentionable = [],
  className,
}: ThreadProps) {
  const reduce = useReducedMotion();
  const inputId = useId();
  const [items, setItems] = useState<ThreadMessage[]>(replies);
  const [draft, setDraft] = useState("");
  const [resolved, setResolved] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setItems((prev) => [...prev, { id: `r-${Date.now()}`, author: currentUser, time: "now", body }]);
    setDraft("");
  };

  const all = [comment, ...items];

  return (
    <section
      aria-label={`Thread started by ${comment.author.name}`}
      className={cn("w-full max-w-[440px] rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <span className="text-muted-foreground text-xs">
          <span className="font-medium text-foreground tabular-nums">{all.length}</span> messages
        </span>
        <button
          aria-pressed={resolved}
          className={cn(
            "relative inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-2.5 font-medium text-xs outline-none transition-[color,background-color,scale] duration-150 ease-out after:absolute after:-inset-x-0.5 after:-inset-y-1 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
            resolved ? "bg-success/12 text-success-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
          onClick={() => setResolved((r) => !r)}
          type="button"
        >
          <motion.span
            animate={resolved && !reduce ? { scale: [1, 1.25, 1] } : { scale: 1 }}
            className="flex"
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          >
            <CheckIcon className="size-3.5" />
          </motion.span>
          <span className="grid text-start">
            <span aria-hidden className="invisible col-start-1 row-start-1">
              Resolved
            </span>
            <span className="col-start-1 row-start-1">{resolved ? "Resolved" : "Resolve"}</span>
          </span>
        </button>
      </header>

      <div className={cn("px-4 pt-4 transition-opacity", resolved && "opacity-60")}>
        <AnimatePresence initial={false}>
          {all.map((m, i) => (
            <motion.div
              animate={{ opacity: 1, y: 0, height: "auto" }}
              className="overflow-hidden"
              initial={reduce ? false : { opacity: 0, y: 8, height: 0 }}
              key={m.id}
              transition={spring}
            >
              <Message last={i === all.length - 1} mentionable={mentionable} message={m} root={i === 0} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <form className="flex items-center gap-3 px-4 pt-3 pb-4" onSubmit={submit}>
        <span className="flex w-8 shrink-0 justify-center">
          <Initials author={currentUser} size="sm" />
        </span>
        <label className="sr-only" htmlFor={inputId}>
          Reply
        </label>
        <div className="relative flex min-w-0 flex-1 items-center rounded-full border bg-background ps-3 pe-1 transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24 dark:bg-input/32">
          <input
            autoComplete="off"
            className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/72"
            disabled={resolved}
            id={inputId}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={resolved ? "Thread resolved" : "Reply, @mention someone…"}
            value={draft}
          />
          <motion.button
            animate={{ scale: draft.trim() ? 1 : 0.85, opacity: draft.trim() ? 1 : 0.4 }}
            aria-label="Send reply"
            className="relative flex size-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground outline-none transition-[scale] duration-150 ease-out after:absolute after:-inset-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[0.97] disabled:cursor-default"
            disabled={!draft.trim()}
            transition={reduce ? { duration: 0 } : spring}
            type="submit"
          >
            <CornerDownLeftIcon className="size-3.5" />
          </motion.button>
        </div>
      </form>
    </section>
  );
}
