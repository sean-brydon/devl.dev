"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  FileTextIcon,
  PaperclipIcon,
  PencilIcon,
  SendIcon,
  SparklesIcon,
  Trash2Icon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

export interface EmailRecipient {
  name: string;
  email: string;
  firstName?: string;
}

export interface EmailAttachment {
  name: string;
  size: string;
}

export interface DraftReviewProps<T extends string = string> {
  recipients: EmailRecipient[];
  subject: string;
  bodies: Record<T, string>;
  attachment?: EmailAttachment;
  undoMs?: number;
  onSend?: (draft: { to: EmailRecipient; subject: string; body: string; attachment?: EmailAttachment }) => void;
  className?: string;
}

type Phase = "draft" | "sent" | "discarded";

const spring = { type: "spring", stiffness: 420, damping: 34 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;
const press = "transition-[scale,background-color,box-shadow] duration-150 ease-out active:scale-[0.97]";

function fill(template: string, r: EmailRecipient) {
  return template.replaceAll("{name}", r.firstName ?? r.name.split(" ")[0]);
}

function ToneSwitch<T extends string>({ tones, value, onChange }: { tones: T[]; value: T; onChange: (t: T) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = tones.indexOf(value);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + tones.length) % tones.length;
    onChange(tones[next]);
    refs.current[next]?.focus();
  };

  return (
    <SegmentedControl aria-label="Tone" onKeyDown={onKeyDown} role="radiogroup" size="sm">
      {tones.map((t, i) => {
        const active = t === value;
        return (
          <SegmentedControlItem
            aria-checked={active}
            className="px-2.5 text-xs capitalize sm:text-xs"
            data-checked={active ? "" : undefined}
            key={t}
            onClick={() => onChange(t)}
            ref={(el: HTMLButtonElement | null) => {
              refs.current[i] = el;
            }}
            role="radio"
            tabIndex={active ? 0 : -1}
          >
            {t}
          </SegmentedControlItem>
        );
      })}
    </SegmentedControl>
  );
}

function RecipientPicker({
  recipients,
  value,
  onChange,
  disabled,
}: {
  recipients: EmailRecipient[];
  value: number;
  onChange: (i: number) => void;
  disabled?: boolean;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(value);
  const listId = useId();
  const current = recipients[value];

  const pick = (i: number) => {
    onChange(i);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setHi(value);
        return setOpen(true);
      }
      setHi((h) => (h + (e.key === "ArrowDown" ? 1 : -1) + recipients.length) % recipients.length);
    }
    if (open && e.key === "Enter") {
      e.preventDefault();
      pick(hi);
    }
  };

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        aria-activedescendant={open ? `${listId}-${hi}` : undefined}
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="relative flex h-7 max-w-full cursor-pointer items-center gap-1.5 rounded-full border bg-background ps-1 pe-2 text-sm outline-none transition-[background-color,scale] duration-150 ease-out after:absolute after:-inset-y-1 after:inset-x-0 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:pointer-events-none dark:bg-input/32"
        disabled={disabled}
        onClick={() => {
          setHi(value);
          setOpen((o) => !o);
        }}
        onKeyDown={onKeyDown}
        type="button"
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-info/14 font-medium text-[10px] text-info-foreground">
          {current.name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")}
        </span>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className="truncate font-medium"
            exit={{ opacity: 0, y: -6 }}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            key={current.email}
            transition={spring}
          >
            {current.name}
          </motion.span>
        </AnimatePresence>
        <ChevronDownIcon className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute top-full left-0 z-20 mt-1 w-64 rounded-xl border bg-popover p-1 text-popover-foreground shadow-md/5"
            exit={{ opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12, ease: easeOut } }}
            id={listId}
            initial={reduce ? false : { opacity: 0, scale: 0.97, y: -4 }}
            role="listbox"
            style={{ transformOrigin: "top left" }}
            transition={spring}
          >
            {recipients.map((r, i) => (
              <li
                aria-selected={i === value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                  i === hi && "bg-accent",
                )}
                id={`${listId}-${i}`}
                key={r.email}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(i);
                }}
                onMouseEnter={() => setHi(i)}
                role="option"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.name}</span>
                  <span className="block truncate text-muted-foreground text-xs">{r.email}</span>
                </span>
                {i === value && <CheckIcon className="size-4 text-muted-foreground" />}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DraftReview<T extends string>({
  recipients,
  subject: initialSubject,
  bodies,
  attachment: initialAttachment,
  undoMs = 5000,
  onSend,
  className,
}: DraftReviewProps<T>) {
  const reduce = useReducedMotion();
  const tones = Object.keys(bodies) as T[];
  const [to, setTo] = useState(0);
  const [tone, setTone] = useState<T>(tones[0]);
  const [subject, setSubject] = useState(initialSubject);
  const [custom, setCustom] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [attachment, setAttachment] = useState(initialAttachment);
  const [phase, setPhase] = useState<Phase>("draft");
  const [toast, setToast] = useState<null | { kind: "sent" | "discarded"; key: number }>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const subjectId = useId();

  const generated = fill(bodies[tone], recipients[to]);
  const body = custom ?? generated;

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduce) return;
    setRewriting(true);
    const t = setTimeout(() => setRewriting(false), 320);
    return () => clearTimeout(t);
  }, [tone, to, reduce]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), undoMs);
    return () => clearTimeout(t);
  }, [toast, undoMs]);

  useEffect(() => {
    const el = textRef.current;
    if (!editing || !el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  const rewrite = (fn: () => void) => {
    setCustom(null);
    setEditing(false);
    fn();
  };

  const finish = (kind: "sent" | "discarded") => {
    setEditing(false);
    setPhase(kind);
    setToast({ kind, key: Date.now() });
    if (kind === "sent") onSend?.({ to: recipients[to], subject, body, attachment });
  };

  const undo = () => {
    setPhase("draft");
    setToast(null);
  };

  const reset = () => {
    setPhase("draft");
    setToast(null);
    setCustom(null);
    setSubject(initialSubject);
    setAttachment(initialAttachment);
  };

  return (
    <section
      aria-label="Email draft"
      className={cn(
        "relative w-full max-w-[460px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5",
        className,
      )}
    >
      <header className="flex items-center gap-2 border-b px-4 py-2.5 text-xs">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <SparklesIcon className="size-3" />
        </span>
        <span className="font-medium">Draft ready for review</span>
        <AnimatePresence>
          {custom !== null && phase === "draft" && (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-full bg-warning/12 px-1.5 py-px font-medium text-[10px] text-warning-foreground"
              exit={{ opacity: 0, scale: 0.8 }}
              initial={reduce ? false : { opacity: 0, scale: 0.8 }}
              transition={spring}
            >
              Edited
            </motion.span>
          )}
        </AnimatePresence>
        <span className="ms-auto text-muted-foreground">
          {phase === "draft" ? "Not sent" : phase === "sent" ? "Sent" : "Discarded"}
        </span>
      </header>

      <motion.div
        animate={{ height }}
        className="overflow-hidden"
        initial={false}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 32 }}
      >
      <div ref={innerRef}>
      <AnimatePresence initial={false} mode="popLayout">
        {phase === "draft" ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: "blur(4px)" }}
            initial={reduce ? false : { opacity: 0, scale: 0.98, filter: "blur(4px)" }}
            key="draft"
            transition={spring}
          >
            <div className="space-y-2.5 px-4 pt-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="w-12 shrink-0 text-muted-foreground text-xs">To</span>
                <RecipientPicker onChange={(i) => rewrite(() => setTo(i))} recipients={recipients} value={to} />
              </div>
              <div className="flex items-center gap-3 text-sm">
                <label className="w-12 shrink-0 text-muted-foreground text-xs" htmlFor={subjectId}>
                  Subject
                </label>
                <input
                  className="-mx-1.5 h-7 min-w-0 flex-1 rounded-md bg-transparent px-1.5 font-medium text-sm outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/60"
                  id={subjectId}
                  onChange={(e) => setSubject(e.target.value)}
                  value={subject}
                />
              </div>
              <div className="flex items-center gap-3 border-t pt-2.5">
                <span className="w-12 shrink-0 text-muted-foreground text-xs">Tone</span>
                <ToneSwitch onChange={(t) => rewrite(() => setTone(t))} tones={tones} value={tone} />
              </div>
            </div>

            <div className="group/body relative mx-4 mt-3 min-h-[148px] rounded-xl bg-muted/40 p-3">
              {editing ? (
                <textarea
                  aria-label="Email body"
                  className="field-sizing-content block min-h-[124px] w-full resize-none whitespace-pre-wrap bg-transparent p-0 text-sm leading-relaxed outline-none"
                  onBlur={() => setEditing(false)}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditing(false);
                  }}
                  ref={textRef}
                  value={body}
                />
              ) : (
                <AnimatePresence initial={false} mode="popLayout">
                  {rewriting ? (
                    <motion.div
                      animate={{ opacity: 1 }}
                      aria-label="Rewriting"
                      className="space-y-2 pt-1"
                      exit={{ opacity: 0 }}
                      initial={{ opacity: 0 }}
                      key="rewriting"
                      role="status"
                    >
                      {[92, 100, 78, 64].map((w, i) => (
                        <motion.span
                          animate={{ opacity: [0.4, 0.9, 0.4] }}
                          className="block h-2.5 rounded-full bg-foreground/10"
                          key={i}
                          style={{ width: `${w}%` }}
                          transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, delay: i * 0.08 }}
                        />
                      ))}
                    </motion.div>
                  ) : (
                    <motion.button
                      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                      aria-label="Edit email body"
                      className="-m-1 block w-[calc(100%+--spacing(2))] cursor-text whitespace-pre-wrap rounded-lg p-1 text-left text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      exit={{ opacity: 0, filter: "blur(4px)", transition: { duration: 0.15 } }}
                      initial={reduce ? false : { opacity: 0, filter: "blur(4px)", y: 4 }}
                      key={`${tone}-${to}`}
                      onClick={() => setEditing(true)}
                      transition={{ duration: 0.25, ease: easeOut }}
                      type="button"
                    >
                      {body}
                    </motion.button>
                  )}
                </AnimatePresence>
              )}
              {!editing && !rewriting && (
                <span className="pointer-events-none absolute top-2 right-2 flex items-center gap-1 rounded-full bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 shadow-xs/5 transition-opacity duration-150 group-hover/body:opacity-100 group-has-focus-visible/body:opacity-100">
                  <PencilIcon className="size-2.5" /> Click to edit
                </span>
              )}
            </div>

            <div className="flex min-h-11 items-center px-4 pt-2">
              <AnimatePresence initial={false} mode="popLayout">
                {attachment ? (
                  <motion.div
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 rounded-lg border bg-background py-1 ps-1 pe-1 text-xs dark:bg-input/32"
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, x: -8, transition: { duration: 0.15, ease: easeOut } }}
                    initial={reduce ? false : { opacity: 0, scale: 0.95 }}
                    key="file"
                    transition={spring}
                  >
                    <span className="flex size-6 items-center justify-center rounded-md bg-destructive/10 text-destructive-foreground">
                      <FileTextIcon className="size-3.5" />
                    </span>
                    <span className="font-medium">{attachment.name}</span>
                    <span className="text-muted-foreground tabular-nums">{attachment.size}</span>
                    <button
                      aria-label={`Remove ${attachment.name}`}
                      className="relative flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-[background-color,color,scale] duration-150 ease-out after:absolute after:-inset-1 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
                      onClick={() => setAttachment(undefined)}
                      type="button"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.span
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1.5 text-muted-foreground text-xs"
                    initial={reduce ? false : { opacity: 0 }}
                    key="none"
                  >
                    <PaperclipIcon className="size-3.5" /> No attachment
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <footer className="flex items-center justify-end gap-2 px-4 pt-2 pb-4">
              <Button className={press} onClick={() => finish("discarded")} size="sm" variant="ghost">
                <Trash2Icon />
                Discard
              </Button>
              <Button className={press} onClick={() => finish("sent")} size="sm">
                <SendIcon />
                Send
              </Button>
            </footer>
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "flex flex-col items-center gap-2 px-6 pt-8 text-center transition-[padding] duration-200 ease-out",
              toast ? "pb-[72px]" : "pb-6",
            )}
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            key="done"
            transition={spring}
          >
            <motion.span
              animate={{ scale: 1, rotate: 0 }}
              className={cn(
                "flex size-11 items-center justify-center rounded-full",
                phase === "sent" ? "bg-success/12 text-success-foreground" : "bg-muted text-muted-foreground",
              )}
              initial={reduce ? false : { scale: 0.7, rotate: -20 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
            >
              {phase === "sent" ? <SendIcon className="size-5" /> : <Trash2Icon className="size-5" />}
            </motion.span>
            <p className="font-medium text-sm">
              {phase === "sent" ? `Sent to ${recipients[to].name}` : "Draft discarded"}
            </p>
            <p className="max-w-[28ch] text-muted-foreground text-xs">
              {phase === "sent" ? subject : toast ? "Nothing was sent. You can bring it back for a few seconds." : "Nothing was sent."}
            </p>
            {!toast && (
              <motion.div animate={{ opacity: 1 }} initial={reduce ? false : { opacity: 0 }}>
                <Button className={cn("mt-2", press)} onClick={reset} size="sm" variant="outline">
                  New draft
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      </motion.div>

      <AnimatePresence>
        {toast && (
          <motion.div
            animate={{ y: 0, opacity: 1, scale: 1 }}
            className="absolute inset-x-1.5 bottom-1.5 flex items-center gap-3 overflow-hidden rounded-[10px] bg-primary py-1.5 ps-3 pe-1.5 text-primary-foreground text-sm shadow-md/10"
            exit={reduce ? { opacity: 0 } : { y: 24, opacity: 0, scale: 0.96 }}
            initial={reduce ? false : { y: 24, opacity: 0, scale: 0.96 }}
            key={toast.key}
            role="status"
            transition={{ type: "spring", stiffness: 460, damping: 30 }}
          >
            {toast.kind === "sent" ? (
              <CheckIcon className="size-4 shrink-0 opacity-80" />
            ) : (
              <Trash2Icon className="size-4 shrink-0 opacity-80" />
            )}
            <span className="min-w-0 flex-1 truncate">{toast.kind === "sent" ? "Email sent" : "Draft discarded"}</span>
            <button
              className="relative flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 font-medium text-xs outline-none transition-[background-color,scale] duration-150 ease-out after:absolute after:-inset-y-0.5 after:inset-x-0 hover:bg-primary-foreground/12 focus-visible:ring-2 focus-visible:ring-primary-foreground/50 active:scale-[0.97]"
              onClick={undo}
              type="button"
            >
              <Undo2Icon className="size-3.5" />
              Undo
            </button>
            <motion.span
              animate={{ scaleX: 0 }}
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary-foreground/40"
              initial={{ scaleX: 1 }}
              transition={{ duration: undoMs / 1000, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
