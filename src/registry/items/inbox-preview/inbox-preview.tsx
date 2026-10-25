"use client";

import {
  ArchiveIcon,
  ArrowLeftIcon,
  ClockIcon,
  InboxIcon,
  MailIcon,
  MailOpenIcon,
  PaperclipIcon,
  ReplyIcon,
  SearchIcon,
  SendIcon,
} from "lucide-react";
import { AnimatePresence, motion, type PanInfo, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export interface InboxLabel {
  name: string;
  tone: string;
}

export interface InboxEmail {
  id: string;
  from: { name: string; email: string; tone?: string };
  subject: string;
  snippet: string;
  body: string[];
  time: string;
  date: string;
  unread?: boolean;
  labels?: InboxLabel[];
  attachment?: { name: string; size: string };
}

export interface InboxPreviewProps {
  emails: InboxEmail[];
  me?: string;
  onArchive?: (email: InboxEmail) => void;
  onReply?: (email: InboxEmail, text: string) => void;
  onSnooze?: (email: InboxEmail) => void;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;
const SWIPE = 88;
const TONES = [
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ email, size = "size-9" }: { email: InboxEmail; size?: string }) {
  const tone = email.from.tone ?? TONES[email.from.name.length % TONES.length];
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full font-medium text-xs", size, tone)}>
      {initials(email.from.name)}
    </span>
  );
}

function Row({
  email,
  selected,
  onSelect,
  onArchive,
  onToggleRead,
  onSnooze,
}: {
  email: InboxEmail;
  selected: boolean;
  onSelect: () => void;
  onArchive: () => void;
  onToggleRead: () => void;
  onSnooze: () => void;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const archiveOpacity = useTransform(x, [-SWIPE, -24, 0], [1, 0.4, 0]);
  const readOpacity = useTransform(x, [0, 24, SWIPE], [0, 0.4, 1]);
  const archiveScale = useTransform(x, [-SWIPE * 1.2, -SWIPE, -24], [1.1, 1, 0.7]);
  const readScale = useTransform(x, [24, SWIPE, SWIPE * 1.2], [0.7, 1, 1.1]);
  const dragged = useRef(false);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x <= -SWIPE) onArchive();
    else if (info.offset.x >= SWIPE) onToggleRead();
    setTimeout(() => (dragged.current = false), 0);
  };

  return (
    <motion.li
      animate={{ height: "auto", opacity: 1 }}
      className="relative overflow-hidden"
      exit={{ height: 0, opacity: 0, transition: { duration: reduce ? 0 : 0.22, ease } }}
      initial={false}
      layout={reduce ? false : "position"}
    >
      <div aria-hidden className="absolute inset-0 flex items-center justify-between">
        <motion.span className="flex h-full items-center bg-info ps-5 pe-10 text-white" style={{ opacity: readOpacity }}>
          <motion.span style={{ scale: readScale }}>{email.unread ? <MailOpenIcon className="size-5" /> : <MailIcon className="size-5" />}</motion.span>
        </motion.span>
        <motion.span className="flex h-full items-center bg-success ps-10 pe-5 text-white" style={{ opacity: archiveOpacity }}>
          <motion.span style={{ scale: archiveScale }}>
            <ArchiveIcon className="size-5" />
          </motion.span>
        </motion.span>
      </div>
      <motion.div
        className={cn(
          "group relative isolate flex cursor-pointer touch-pan-y gap-3 border-b bg-card px-4 py-3 outline-none before:absolute before:inset-0 before:-z-10 before:transition-colors before:duration-150 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          selected ? "before:bg-accent dark:before:bg-white/6" : "hover:before:bg-accent/60",
        )}
        data-email-id={email.id}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragDirectionLock
        dragElastic={0.55}
        onClick={() => !dragged.current && onSelect()}
        onDragEnd={onDragEnd}
        onDragStart={() => (dragged.current = true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        role="option"
        aria-selected={selected}
        style={{ x }}
        tabIndex={selected ? 0 : -1}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-[1.35rem] left-1.5 size-1.5 rounded-full bg-info transition-[opacity,scale] duration-200",
            email.unread ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
        <Avatar email={email} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={cn("truncate text-sm", email.unread ? "font-semibold" : "font-medium text-foreground/80")}>
              {email.unread && <span className="sr-only">Unread: </span>}
              {email.from.name}
            </p>
            <span className="relative h-5 shrink-0 text-muted-foreground text-xs tabular-nums">
              <span className="transition-opacity duration-150 group-focus-within:opacity-0 [@media(hover:hover)]:group-hover:opacity-0">
                {email.time}
              </span>
            </span>
          </div>
          <p className={cn("truncate text-sm", email.unread ? "font-medium text-foreground" : "text-foreground/80")}>{email.subject}</p>
          <p className="mt-0.5 truncate text-muted-foreground text-xs">{email.snippet}</p>
          {(email.labels?.length || email.attachment) && (
            <div className="mt-2 flex items-center gap-1.5">
              {email.labels?.map((l) => (
                <span className={cn("rounded-full px-1.5 py-px font-medium text-[0.6875rem]", l.tone)} key={l.name}>
                  {l.name}
                </span>
              ))}
              {email.attachment && <PaperclipIcon aria-label="Has attachment" className="size-3 text-muted-foreground" />}
            </div>
          )}
        </div>
        <div className="absolute top-2 right-2 hidden items-center gap-0.5 rounded-lg border bg-popover p-0.5 opacity-0 shadow-xs/5 transition-opacity duration-150 group-focus-within:opacity-100 sm:flex [@media(hover:hover)]:group-hover:opacity-100">
          <button
            aria-label="Archive"
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
            tabIndex={-1}
            type="button"
          >
            <ArchiveIcon className="size-3.5" />
          </button>
          <button
            aria-label={email.unread ? "Mark as read" : "Mark as unread"}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(e) => {
              e.stopPropagation();
              onToggleRead();
            }}
            tabIndex={-1}
            type="button"
          >
            {email.unread ? <MailOpenIcon className="size-3.5" /> : <MailIcon className="size-3.5" />}
          </button>
          <button
            aria-label="Snooze"
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(e) => {
              e.stopPropagation();
              onSnooze();
            }}
            tabIndex={-1}
            type="button"
          >
            <ClockIcon className="size-3.5" />
          </button>
        </div>
      </motion.div>
    </motion.li>
  );
}

export function InboxPreview({ emails: initial, me = "you", onArchive, onReply, onSnooze, className }: InboxPreviewProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const tabsId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [emails, setEmails] = useState(() => initial.map((e, i) => (i === 0 ? { ...e, unread: false } : e)));
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [query, setQuery] = useState("");
  const [undo, setUndo] = useState<{ email: InboxEmail; index: number } | null>(null);
  const [reply, setReply] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return emails.filter(
      (e) =>
        (filter === "all" || e.unread || e.id === selectedId) &&
        (!q || `${e.from.name} ${e.subject} ${e.snippet}`.toLowerCase().includes(q)),
    );
  }, [emails, filter, query, selectedId]);
  const selected = emails.find((e) => e.id === selectedId) ?? null;
  const unreadCount = emails.filter((e) => e.unread).length;

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);

  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => setSent(null), 2400);
    return () => clearTimeout(t);
  }, [sent]);

  const select = (id: string) => {
    setSelectedId(id);
    setMobileOpen(true);
    setReply("");
    setEmails((list) => list.map((e) => (e.id === id ? { ...e, unread: false } : e)));
  };

  const archive = (id: string) => {
    const index = emails.findIndex((e) => e.id === id);
    const email = emails[index];
    if (!email) return;
    const nextVisible = visible.filter((e) => e.id !== id);
    const vi = visible.findIndex((e) => e.id === id);
    if (selectedId === id) {
      const n = nextVisible[Math.min(vi, nextVisible.length - 1)];
      setSelectedId(n?.id ?? null);
      if (!n) setMobileOpen(false);
    }
    setEmails((list) => list.filter((e) => e.id !== id));
    setUndo({ email, index });
    onArchive?.(email);
  };

  const restore = () => {
    if (!undo) return;
    setEmails((list) => {
      const next = [...list];
      next.splice(Math.min(undo.index, next.length), 0, undo.email);
      return next;
    });
    setSelectedId(undo.email.id);
    setUndo(null);
  };

  const toggleRead = (id: string) => setEmails((list) => list.map((e) => (e.id === id ? { ...e, unread: !e.unread } : e)));

  const focusRow = (id: string) => {
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-email-id="${id}"]`)?.focus());
  };

  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (!visible.length) return;
    const i = Math.max(0, visible.findIndex((m) => m.id === selectedId));
    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      const n = visible[Math.min(visible.length - 1, i + 1)];
      setSelectedId(n.id);
      focusRow(n.id);
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = visible[Math.max(0, i - 1)];
      setSelectedId(n.id);
      focusRow(n.id);
    } else if (e.key === "e" && selectedId) {
      e.preventDefault();
      const after = visible[i + 1] ?? visible[i - 1];
      archive(selectedId);
      if (after) focusRow(after.id);
    } else if (e.key === "u" && selectedId) {
      e.preventDefault();
      toggleRead(selectedId);
    }
  };

  return (
    <div
      className={cn(
        "relative mx-auto flex h-[680px] w-full max-w-[1100px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5",
        className,
      )}
    >
      <div className="flex w-full min-w-0 flex-col md:w-[380px] md:shrink-0 md:border-r">
        <div className="space-y-3 border-b px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold text-base tracking-tight">
              Inbox
              <span className="rounded-full bg-muted px-1.5 py-px font-medium text-muted-foreground text-xs tabular-nums">{unreadCount}</span>
            </h2>
            <div aria-label="Filter" className="grid grid-cols-2 rounded-lg bg-muted p-0.5" role="radiogroup">
              {(["all", "unread"] as const).map((f) => (
                <button
                  aria-checked={filter === f}
                  className={cn(
                    "relative h-7 cursor-pointer rounded-md px-3 font-medium text-xs capitalize outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                    filter === f ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  key={f}
                  onClick={() => setFilter(f)}
                  role="radio"
                  type="button"
                >
                  {filter === f && (
                    <motion.span
                      className="absolute inset-0 rounded-md bg-background shadow-xs/5 dark:bg-accent"
                      layoutId={tabsId}
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <span className="relative">{f}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="flex h-8 items-center gap-2 rounded-lg border bg-background px-2.5 text-sm shadow-xs/5 has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/24 dark:bg-input/32">
            <SearchIcon className="size-3.5 text-muted-foreground" />
            <span className="sr-only">Search mail</span>
            <input
              className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/72"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mail"
              type="search"
              value={query}
            />
          </label>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <ul aria-label="Messages" className="outline-none" onKeyDown={onListKey} ref={listRef} role="listbox">
            <AnimatePresence initial={false}>
              {visible.map((email) => (
                <Row
                  email={email}
                  key={email.id}
                  onArchive={() => archive(email.id)}
                  onSelect={() => select(email.id)}
                  onSnooze={() => onSnooze?.(email)}
                  onToggleRead={() => toggleRead(email.id)}
                  selected={email.id === selectedId}
                />
              ))}
            </AnimatePresence>
          </ul>
          {!visible.length && (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <InboxIcon className="size-5" />
              </span>
              <p className="mt-3 font-medium text-sm">{query ? "No matches" : filter === "unread" ? "All caught up" : "Inbox zero"}</p>
              <p className="mt-1 text-muted-foreground text-xs">
                {query ? `Nothing in your inbox mentions “${query}”.` : "Nothing new. Go do something nice."}
              </p>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-3 border-t px-4 py-2 text-muted-foreground text-xs sm:flex">
          <span className="flex items-center gap-1">
            <Kbd>j</Kbd>
            <Kbd>k</Kbd> move
          </span>
          <span className="flex items-center gap-1">
            <Kbd>e</Kbd> archive
          </span>
          <span className="flex items-center gap-1">
            <Kbd>u</Kbd> unread
          </span>
        </div>
        <p className="border-t px-4 py-2 text-muted-foreground text-xs sm:hidden">Swipe left to archive, right to mark read</p>
      </div>

          <section
            aria-label="Reading pane"
            className={cn(
              "absolute inset-0 z-10 flex min-w-0 flex-1 flex-col bg-card transition-[translate,visibility] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none md:static md:z-auto md:translate-x-0",
              !mobileOpen && "max-md:invisible max-md:translate-x-full",
            )}
          >
            {selected ? (
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="flex min-h-0 flex-1 flex-col"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0, x: reduce ? 0 : 12 }}
                  key={selected.id}
                  transition={{ duration: 0.18, ease }}
                >
                  <div className="flex h-[57px] shrink-0 items-center gap-1 border-b px-2 md:px-4">
                    <Button aria-label="Back to inbox" className="md:hidden" onClick={() => setMobileOpen(false)} size="icon" variant="ghost">
                      <ArrowLeftIcon />
                    </Button>
                    <div className="ms-auto flex items-center gap-1">
                      <Button aria-label="Archive" onClick={() => archive(selected.id)} size="icon" variant="ghost">
                        <ArchiveIcon />
                      </Button>
                      <Button aria-label="Mark as unread" onClick={() => toggleRead(selected.id)} size="icon" variant="ghost">
                        <MailIcon />
                      </Button>
                      <Button aria-label="Snooze" onClick={() => onSnooze?.(selected)} size="icon" variant="ghost">
                        <ClockIcon />
                      </Button>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
                    <div className="flex flex-wrap gap-1.5">
                      {selected.labels?.map((l) => (
                        <span className={cn("rounded-full px-2 py-0.5 font-medium text-xs", l.tone)} key={l.name}>
                          {l.name}
                        </span>
                      ))}
                    </div>
                    <h3 className="mt-3 text-balance font-semibold text-xl tracking-tight">{selected.subject}</h3>
                    <div className="mt-5 flex items-center gap-3">
                      <Avatar email={selected} size="size-10" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">
                          <span className="font-medium">{selected.from.name}</span>{" "}
                          <span className="text-muted-foreground">&lt;{selected.from.email}&gt;</span>
                        </p>
                        <p className="text-muted-foreground text-xs">To {me}</p>
                      </div>
                      <span className="hidden shrink-0 text-muted-foreground text-xs sm:block">{selected.date}</span>
                    </div>
                    <div className="mt-6 max-w-[62ch] space-y-4 text-pretty text-[0.9375rem]/7 text-foreground/90">
                      {selected.body.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                    {selected.attachment && (
                      <div className="mt-6 inline-flex items-center gap-3 rounded-xl border px-3 py-2.5">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                          <PaperclipIcon className="size-4" />
                        </span>
                        <span className="text-sm">
                          <span className="block font-medium">{selected.attachment.name}</span>
                          <span className="block text-muted-foreground text-xs">{selected.attachment.size}</span>
                        </span>
                      </div>
                    )}
                  </div>
                  <form
                    className="shrink-0 border-t p-3 sm:p-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!reply.trim()) return;
                      onReply?.(selected, reply.trim());
                      setSent(selected.from.name.split(" ")[0]);
                      setReply("");
                    }}
                  >
                    <div className="rounded-xl border bg-background shadow-xs/5 has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/24 dark:bg-input/32">
                      <label className="sr-only" htmlFor={`${uid}-reply`}>
                        Reply
                      </label>
                      <textarea
                        className="block max-h-32 min-h-16 w-full resize-none bg-transparent px-3 pt-2.5 text-sm outline-none placeholder:text-muted-foreground/72"
                        id={`${uid}-reply`}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
                        }}
                        placeholder={`Reply to ${selected.from.name.split(" ")[0]}…`}
                        value={reply}
                      />
                      <div className="flex items-center justify-between px-2 pb-2">
                        <span className="ps-1 text-muted-foreground text-xs" aria-live="polite">
                          <AnimatePresence initial={false} mode="wait">
                            <motion.span
                              animate={{ opacity: 1 }}
                              className="flex items-center gap-1.5"
                              exit={{ opacity: 0 }}
                              initial={{ opacity: 0 }}
                              key={sent ? "sent" : "hint"}
                              transition={{ duration: 0.15 }}
                            >
                              {sent ? (
                                <>
                                  <ReplyIcon className="size-3.5 text-success-foreground" />
                                  Sent to {sent}
                                </>
                              ) : (
                                <span className="hidden sm:inline">⌘ Enter to send</span>
                              )}
                            </motion.span>
                          </AnimatePresence>
                        </span>
                        <Button className="active:scale-[0.97]" disabled={!reply.trim()} size="sm" type="submit">
                          <SendIcon />
                          Send
                        </Button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <InboxIcon className="size-6" />
                </span>
                <p className="mt-3 font-medium text-sm">Nothing selected</p>
                <p className="mt-1 text-muted-foreground text-xs">Pick a message to read it here.</p>
              </div>
            )}
          </section>

      <AnimatePresence>
        {undo && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "absolute bottom-12 left-3 z-20 flex items-center gap-3 rounded-xl border bg-popover py-2 ps-3.5 pe-2 text-sm shadow-lg/10 md:w-[356px] max-md:right-3",
              mobileOpen && "max-md:top-[66px] max-md:bottom-auto",
            )}
            exit={{ opacity: 0, y: reduce ? 0 : 8, transition: { duration: 0.15 } }}
            initial={{ opacity: 0, y: reduce ? 0 : 8 }}
            role="status"
            transition={{ duration: 0.2, ease }}
          >
            <ArchiveIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">
              Archived <span className="text-muted-foreground">“{undo.email.subject}”</span>
            </span>
            <Button onClick={restore} size="sm" variant="ghost">
              Undo
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
