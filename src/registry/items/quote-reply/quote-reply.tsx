"use client";

import { ArrowUpIcon, CheckIcon, CopyIcon, TextQuoteIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, Fragment, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export interface QuoteAuthor {
  id: string;
  name: string;
  initials: string;
  avatarClassName?: string;
}

export interface QuotedSnippet {
  messageId: string;
  authorName: string;
  text: string;
}

export interface QuoteMessage {
  id: string;
  author: QuoteAuthor;
  time: string;
  text: string;
  quote?: QuotedSnippet;
}

export interface QuoteReplyProps {
  title?: string;
  messages: QuoteMessage[];
  currentUser: QuoteAuthor;
  onSend?: (text: string, quote: QuotedSnippet | null) => void;
  className?: string;
}

interface Floating {
  messageId: string;
  text: string;
  x: number;
  y: number;
  below: boolean;
}

const spring = { type: "spring", stiffness: 480, damping: 38 } as const;

export function QuoteReply({ title = "Onboarding review", messages: initial, currentUser, onSend, className }: QuoteReplyProps) {
  const reduce = useSafeReducedMotion();
  const inputId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [messages, setMessages] = useState(initial);
  const [floating, setFloating] = useState<Floating | null>(null);
  const [quote, setQuote] = useState<QuotedSnippet | null>(null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState<{ id: string; text: string; on: boolean } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  useEffect(() => {
    if (!floating) return;
    const onChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) setFloating(null);
    };
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, [floating]);

  const readSelection = () => {
    const sel = window.getSelection();
    const card = cardRef.current;
    if (!sel || sel.isCollapsed || !sel.rangeCount || !card) return setFloating(null);
    const anchor = sel.anchorNode?.parentElement?.closest<HTMLElement>("[data-quote-source]");
    const focus = sel.focusNode?.parentElement?.closest<HTMLElement>("[data-quote-source]");
    const text = sel.toString().replace(/\s+/g, " ").trim();
    if (!anchor || anchor !== focus || text.length < 2) return setFloating(null);
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const box = card.getBoundingClientRect();
    const below = rect.top - box.top < 56;
    setCopied(false);
    setFloating({
      messageId: anchor.dataset.quoteSource ?? "",
      text: text.length > 280 ? `${text.slice(0, 277)}…` : text,
      x: Math.min(Math.max(rect.left + rect.width / 2 - box.left, 80), box.width - 80),
      y: below ? rect.bottom - box.top + 8 : rect.top - box.top - 8,
      below,
    });
  };

  const startQuote = (snippet: QuotedSnippet) => {
    setQuote(snippet);
    setFloating(null);
    window.getSelection()?.removeAllRanges();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const quoteFromFloating = () => {
    if (!floating) return;
    const msg = messages.find((m) => m.id === floating.messageId);
    if (msg) startQuote({ messageId: msg.id, authorName: msg.author.name, text: floating.text });
  };

  const copy = async () => {
    if (!floating) return;
    try {
      await navigator.clipboard.writeText(floating.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const jumpTo = (q: QuotedSnippet) => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-message="${q.messageId}"]`);
    if (list && el) {
      const offset = el.getBoundingClientRect().top - list.getBoundingClientRect().top;
      list.scrollTo({ top: list.scrollTop + offset - (list.clientHeight - el.offsetHeight) / 2, behavior: reduce ? "auto" : "smooth" });
    }
    setFlash({ id: q.messageId, text: q.text, on: true });
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => {
      setFlash((f) => (f ? { ...f, on: false } : f));
      flashTimer.current = setTimeout(() => setFlash(null), 900);
    }, 700);
  };

  const send = (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend?.(text, quote);
    setMessages((m) => [...m, { id: `m-${Date.now()}`, author: currentUser, time: "now", text, quote: quote ?? undefined }]);
    setDraft("");
    setQuote(null);
    requestAnimationFrame(() => {
      const list = listRef.current;
      list?.scrollTo({ top: list.scrollHeight, behavior: reduce ? "auto" : "smooth" });
    });
  };

  return (
    <section
      aria-label={title}
      className={cn("relative flex h-[520px] w-full max-w-[420px] flex-col rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
      ref={cardRef}
    >
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h3 className="truncate font-medium text-sm">{title}</h3>
        <span className="shrink-0 text-muted-foreground text-xs">Select text to quote</span>
      </header>

      <div
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
        onKeyUp={(e) => e.shiftKey && readSelection()}
        onMouseUp={() => requestAnimationFrame(readSelection)}
        onScroll={() => floating && setFloating(null)}
        ref={listRef}
      >
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const mine = m.author.id === currentUser.id;
            return (
              <motion.article
                animate={{ opacity: 1, y: 0 }}
                className="group/msg relative flex gap-2.5"
                data-message={m.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                key={m.id}
                transition={{ ...spring, opacity: { duration: 0.16 } }}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-8 shrink-0 select-none items-center justify-center rounded-full font-medium text-xs",
                    m.author.avatarClassName ?? "bg-muted",
                  )}
                >
                  {m.author.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-sm">{mine ? "You" : m.author.name}</span>
                    <span className="text-muted-foreground text-xs">{m.time}</span>
                  </div>
                  {m.quote && (
                    <button
                      className="mt-1 mb-1.5 block w-full cursor-pointer rounded-lg border-foreground/20 border-s-2 bg-muted/60 py-1.5 ps-2.5 pe-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => jumpTo(m.quote as QuotedSnippet)}
                      type="button"
                    >
                      <span className="block font-medium text-muted-foreground text-xs">{m.quote.authorName}</span>
                      <span className="line-clamp-2 text-pretty text-foreground/80 text-xs leading-relaxed">{m.quote.text}</span>
                    </button>
                  )}
                  <p
                    className="mt-0.5 text-pretty text-sm leading-relaxed selection:bg-info/25"
                    data-quote-source={m.id}
                  >
                    <MessageText flash={flash?.id === m.id ? flash : null} text={m.text} />
                  </p>
                </div>
                <button
                  aria-label={`Quote ${m.author.name}'s message`}
                  className="absolute -top-1 right-0 flex size-7 cursor-pointer items-center justify-center rounded-lg border bg-popover text-muted-foreground opacity-0 shadow-xs/5 outline-none transition-[opacity,color] duration-150 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/msg:opacity-100 [@media(hover:none)]:hidden"
                  onClick={() => startQuote({ messageId: m.id, authorName: m.author.name, text: m.text })}
                  type="button"
                >
                  <TextQuoteIcon className="size-3.5" />
                </button>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {floating && (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            aria-label="Selection"
            className="absolute z-30 flex items-center gap-0.5 rounded-lg border bg-popover p-0.5 text-popover-foreground shadow-lg/5"
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: floating.below ? -4 : 4 }}
            key="floating"
            onMouseDown={(e) => e.preventDefault()}
            role="toolbar"
            style={{
              left: floating.x,
              top: floating.y,
              translate: floating.below ? "-50% 0" : "-50% -100%",
              transformOrigin: floating.below ? "top center" : "bottom center",
            }}
            transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
          >
            <button
              className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 font-medium text-xs outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
              onClick={quoteFromFloating}
              type="button"
            >
              <TextQuoteIcon className="size-3.5" />
              Quote
            </button>
            <span aria-hidden className="h-4 w-px bg-border" />
            <button
              aria-label={copied ? "Copied" : "Copy selection"}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
              onClick={copy}
              type="button"
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  key={copied ? "check" : "copy"}
                  transition={{ duration: 0.12 }}
                >
                  {copied ? <CheckIcon className="size-3.5 text-success-foreground" /> : <CopyIcon className="size-3.5" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <form className="border-t p-3" onSubmit={send}>
        <div className="rounded-xl border bg-background transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24 dark:bg-input/32">
          <AnimatePresence initial={false}>
            {quote && (
              <motion.div
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden"
                exit={{ height: 0, opacity: 0 }}
                initial={{ height: 0, opacity: 0 }}
                transition={reduce ? { duration: 0 } : { ...spring, opacity: { duration: 0.14 } }}
              >
                <div className="flex items-start gap-2 px-2 pt-2">
                  <div className="min-w-0 flex-1 rounded-lg border-info border-s-2 bg-info/8 py-1.5 ps-2.5 pe-2">
                    <span className="block font-medium text-info-foreground text-xs">Replying to {quote.authorName.split(" ")[0]}</span>
                    <span className="line-clamp-2 text-pretty text-foreground/80 text-xs leading-relaxed">{quote.text}</span>
                  </div>
                  <button
                    aria-label="Remove quote"
                    className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      setQuote(null);
                      inputRef.current?.focus();
                    }}
                    type="button"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-end gap-2 ps-3 pe-1 pb-1">
            <label className="sr-only" htmlFor={inputId}>
              Reply
            </label>
            <textarea
              className="field-sizing-content max-h-28 min-h-9 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground/72"
              id={inputId}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) send(e);
                if (e.key === "Escape" && quote) setQuote(null);
              }}
              placeholder={quote ? "Add your reply…" : "Reply to the thread"}
              ref={inputRef}
              rows={1}
              value={draft}
            />
            <button
              aria-label="Send"
              className="mb-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-primary text-primary-foreground outline-none transition-[opacity,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:cursor-default disabled:opacity-40"
              disabled={!draft.trim()}
              type="submit"
            >
              <ArrowUpIcon className="size-4" />
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function MessageText({ text, flash }: { text: string; flash: { text: string; on: boolean } | null }) {
  const needle = flash?.text.replace(/…$/, "") ?? "";
  const flat = text.replace(/\s+/g, " ");
  const at = needle ? flat.indexOf(needle) : -1;
  if (!flash || at < 0) return <>{text}</>;
  return (
    <Fragment>
      {flat.slice(0, at)}
      <span
        className={cn(
          "rounded-sm [box-decoration-break:clone]",
          flash.on ? "bg-warning/30" : "bg-transparent transition-[background-color] duration-700 ease-out",
        )}
      >
        {flat.slice(at, at + needle.length)}
      </span>
      {flat.slice(at + needle.length)}
    </Fragment>
  );
}
