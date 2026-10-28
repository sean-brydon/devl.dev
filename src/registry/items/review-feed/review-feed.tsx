"use client";

import { ArrowUpIcon, CheckCheckIcon, CornerDownLeftIcon, ListTodoIcon, SparklesIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type ReviewTone = "info" | "success" | "warning" | "destructive" | "muted";

export interface ReviewComment {
  id: string;
  author: string;
  initials: string;
  tone?: ReviewTone;
  time: string;
  body: string;
  anchor?: string;
  resolved?: boolean;
}

export interface ReviewFeedProps {
  comments: ReviewComment[];
  currentUser?: { name: string; initials: string; tone?: ReviewTone };
  summary?: string;
  className?: string;
}

type Filter = "all" | "open" | "resolved";

type Result = { id: number; kind: "summary" | "tasks"; title: string; body: string[] };

const toneClass: Record<ReviewTone, string> = {
  info: "bg-info/12 text-info-foreground",
  success: "bg-success/12 text-success-foreground",
  warning: "bg-warning/14 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive-foreground",
  muted: "bg-muted text-foreground",
};

const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

const COMMANDS = [
  { id: "summarize", label: "/summarize", hint: "Summarize open comments", icon: SparklesIcon },
  { id: "tasks", label: "/tasks", hint: "Turn open comments into tasks", icon: ListTodoIcon },
  { id: "resolve-all", label: "/resolve-all", hint: "Resolve every open comment", icon: CheckCheckIcon },
] as const;

function Count({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const prev = useRef(value);
  const dir = value >= prev.current ? 1 : -1;
  useEffect(() => {
    prev.current = value;
  }, [value]);
  return (
    <span className="relative inline-flex h-4 min-w-[1ch] justify-center overflow-hidden tabular-nums">
      <AnimatePresence custom={dir} initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          custom={dir}
          exit={reduce ? { opacity: 0 } : { y: `${-dir * 100}%`, opacity: 0 }}
          initial={reduce ? { opacity: 0 } : { y: `${dir * 100}%`, opacity: 0 }}
          key={value}
          transition={spring}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function FilterTabs({
  value,
  onChange,
  options,
}: {
  value: Filter;
  onChange: (v: Filter) => void;
  options: { value: Filter; label: string; count: number }[];
}) {
  return (
    <Tabs onValueChange={(v) => onChange(v as Filter)} value={value}>
      <TabsList aria-label="Filter comments" className="text-muted-foreground" size="sm">
        {options.map((o) => (
          <TabsTab className="gap-1 px-2 text-xs sm:text-xs" key={o.value} value={o.value}>
            {o.label}
            <span className="text-muted-foreground">
              <Count value={o.count} />
            </span>
          </TabsTab>
        ))}
      </TabsList>
    </Tabs>
  );
}

function ResolveButton({ resolved, onToggle, label }: { resolved: boolean; onToggle: () => void; label: string }) {
  const reduce = useReducedMotion();
  const [burst, setBurst] = useState(0);
  return (
    <button
      aria-label={resolved ? `Reopen comment by ${label}` : `Resolve comment by ${label}`}
      aria-pressed={resolved}
      className="group/resolve relative flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none transition-[scale] duration-150 ease-out after:absolute after:-inset-0.5 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.92]"
      onClick={() => {
        if (!resolved) setBurst((b) => b + 1);
        onToggle();
      }}
      title={resolved ? "Reopen" : "Resolve"}
      type="button"
    >
      {!reduce && burst > 0 && (
        <span aria-hidden className="pointer-events-none absolute inset-0" key={burst}>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <motion.span
                animate={{ x: Math.cos(a) * 16, y: Math.sin(a) * 16, scale: 0, opacity: 0 }}
                className="absolute top-1/2 left-1/2 -mt-[2px] -ml-[2px] size-1 rounded-full bg-success"
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                key={i}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              />
            );
          })}
        </span>
      )}
      <motion.span
        animate={resolved && !reduce ? { scale: [0.8, 1.12, 1] } : { scale: 1 }}
        className={cn(
          "flex size-5 items-center justify-center rounded-full border transition-colors duration-200",
          resolved
            ? "border-success bg-success text-white"
            : "border-input text-transparent group-hover/resolve:border-success/60 group-hover/resolve:text-success/60",
        )}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        <svg aria-hidden className="size-3" fill="none" viewBox="0 0 16 16">
          <motion.path
            animate={{ pathLength: resolved ? [0, 1] : 1 }}
            d="M3.5 8.5l3 3 6-7"
            initial={false}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.4}
            transition={reduce ? { duration: 0 } : { duration: 0.3, delay: 0.08 }}
          />
        </svg>
      </motion.span>
    </button>
  );
}

function ResultCard({ result, onClose }: { result: Result; onClose: () => void }) {
  const reduce = useReducedMotion();
  const words = useMemo(() => result.body.map((line) => line.split(" ")), [result.body]);
  const total = words.reduce((n, w) => n + w.length, 0);
  const [shown, setShown] = useState(reduce ? total : 0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setShown((s) => (s >= total ? s : s + 1)), 28);
    return () => clearInterval(t);
  }, [total, reduce]);

  let counter = 0;
  return (
    <div className="relative overflow-hidden rounded-xl border bg-muted/40 p-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {result.kind === "summary" ? <SparklesIcon className="size-3" /> : <ListTodoIcon className="size-3" />}
        </span>
        <span className="font-medium">{result.title}</span>
        <button
          aria-label="Dismiss result"
          className="relative ms-auto flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-[color,background-color,scale] duration-150 ease-out after:absolute after:-inset-1 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
          onClick={onClose}
          type="button"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
      <div aria-live="polite" className="mt-2 space-y-1.5 text-sm leading-relaxed">
        {words.map((line, li) => (
          <p className={cn(line.length > 0 && words.length > 1 && "flex gap-2")} key={li}>
            {words.length > 1 && (
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
            )}
            <span>
              {line.map((w, wi) => {
                const visible = counter++ < shown;
                return (
                  <motion.span
                    animate={{ opacity: visible ? 1 : 0, filter: visible ? "blur(0px)" : "blur(4px)" }}
                    initial={false}
                    key={wi}
                    transition={{ duration: 0.25 }}
                  >
                    {w}{" "}
                  </motion.span>
                );
              })}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

function CommentRow({
  comment: c,
  resolved,
  onToggle,
  ref,
}: {
  comment: ReviewComment;
  resolved: boolean;
  onToggle: () => void;
  ref?: Ref<HTMLElement>;
}) {
  const reduce = useReducedMotion();
  const present = useIsPresent();
  return (
    <motion.article
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "group/comment flex gap-3 rounded-xl p-2.5 transition-colors hover:bg-accent/60",
        resolved && "text-muted-foreground",
        !present && "pointer-events-none",
      )}
      exit={
        reduce
          ? { opacity: 0, transition: { duration: 0.15 } }
          : { opacity: 0, scale: 0.98, x: 12, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }
      }
      initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
      layout={!reduce}
      ref={ref}
      transition={spring}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full font-medium text-[11px] transition-opacity",
          toneClass[c.tone ?? "muted"],
          resolved && "opacity-50",
        )}
      >
        {c.initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex h-7 items-center gap-2">
          <span className={cn("truncate font-medium text-sm transition-colors", !resolved && "text-foreground")}>
            {c.author}
          </span>
          <span className="shrink-0 text-muted-foreground text-xs">{c.time}</span>
          <span className="ms-auto -me-1">
            <ResolveButton
              label={c.author}
              onToggle={() => {
                if (present) onToggle();
              }}
              resolved={resolved}
            />
          </span>
        </div>
        {c.anchor && (
          <span className="flex w-fit max-w-full items-center gap-1.5 truncate text-muted-foreground text-xs">
            <span aria-hidden className="h-3 w-0.5 shrink-0 rounded-full bg-warning" />
            <span className="truncate">{c.anchor}</span>
          </span>
        )}
        <p className="mt-1 text-pretty text-sm leading-relaxed transition-colors">{c.body}</p>
      </div>
    </motion.article>
  );
}

export function ReviewFeed({
  comments: initial,
  currentUser = { name: "You", initials: "YO", tone: "muted" },
  summary,
  className,
}: ReviewFeedProps) {
  const reduce = useReducedMotion();
  const listboxId = useId();
  const inputId = useId();
  const [comments, setComments] = useState(initial);
  const [filter, setFilter] = useState<Filter>("open");
  const [draft, setDraft] = useState("");
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const open = comments.filter((c) => !c.resolved);
  const counts = { all: comments.length, open: open.length, resolved: comments.length - open.length };
  const visible = comments.filter((c) => filter === "all" || (filter === "open" ? !c.resolved : c.resolved));

  const slash = draft.startsWith("/") && !draft.includes(" ");
  const matches = slash ? COMMANDS.filter((c) => c.label.startsWith(draft.toLowerCase())) : [];
  const menuOpen = matches.length > 0;

  const [settling, setSettling] = useState<string[]>([]);
  const settlingRef = useRef(new Set<string>());
  const commentsRef = useRef(comments);
  commentsRef.current = comments;

  const setResolved = (id: string, resolved: boolean) =>
    setComments((cs) => cs.map((c) => (c.id === id ? { ...c, resolved } : c)));

  const resolveSoon = (id: string, delay = 0) => {
    if (settlingRef.current.has(id)) return;
    settlingRef.current.add(id);
    const start = () => {
      setSettling((s) => [...s, id]);
      timers.current.push(
        setTimeout(
          () => {
            setResolved(id, true);
            settlingRef.current.delete(id);
            setSettling((s) => s.filter((x) => x !== id));
          },
          reduce ? 0 : 650,
        ),
      );
    };
    if (delay) timers.current.push(setTimeout(start, delay));
    else start();
  };

  const toggleRow = (id: string) => {
    if (settlingRef.current.has(id)) return;
    const current = commentsRef.current.find((c) => c.id === id);
    if (!current) return;
    if (current.resolved) setResolved(id, false);
    else resolveSoon(id);
  };

  const run = (cmd: (typeof COMMANDS)[number]["id"]) => {
    setDraft("");
    setActive(0);
    if (cmd === "resolve-all") {
      open.forEach((c, i) => resolveSoon(c.id, reduce ? 0 : i * 160));
      return;
    }
    const body =
      cmd === "summarize"
        ? summary
          ? [summary]
          : open.length
            ? open.map((c) => `${c.author.split(" ")[0]} on ${c.anchor ?? "the doc"}: ${c.body.split(/(?<=[.?!])\s/)[0]}`)
            : ["Nothing open. Every comment is resolved."]
        : open.length
          ? open.map((c) => `${c.anchor ? `${c.anchor}: ` : ""}${c.body}`)
          : ["No open comments to turn into tasks."];
    const title =
      cmd === "summarize" ? `Summary of ${open.length} open` : `${open.length} task${open.length === 1 ? "" : "s"} drafted`;
    const result: Result = { id: Date.now(), kind: cmd === "summarize" ? "summary" : "tasks", title, body };
    setResults((r) => [result, ...r].slice(0, 2));
  };

  const submit = () => {
    if (menuOpen) return run(matches[Math.min(active, matches.length - 1)].id);
    const body = draft.trim();
    if (!body) return;
    setComments((cs) => [
      ...cs,
      { id: `n-${Date.now()}`, author: currentUser.name, initials: currentUser.initials, tone: currentUser.tone, time: "now", body },
    ]);
    setDraft("");
    if (filter === "resolved") setFilter("open");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (menuOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length);
    } else if (menuOpen && e.key === "Tab") {
      e.preventDefault();
      setDraft(matches[Math.min(active, matches.length - 1)].label);
    } else if (e.key === "Escape" && draft) {
      setDraft("");
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  let empty: ReactNode = null;
  if (visible.length === 0) {
    empty = (
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="my-auto flex flex-col items-center gap-2 pb-6 text-center"
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        key="empty"
        transition={spring}
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-success/12 text-success-foreground">
          <CheckCheckIcon className="size-4" />
        </span>
        <p className="font-medium text-sm">{filter === "resolved" ? "Nothing resolved yet" : "All clear"}</p>
        <p className="text-muted-foreground text-xs">
          {filter === "resolved" ? "Resolved comments land here." : "Every comment is resolved."}
        </p>
      </motion.div>
    );
  }

  return (
    <section
      aria-label="Comments"
      className={cn(
        "flex w-full max-w-[400px] flex-col rounded-2xl border bg-card text-card-foreground shadow-xs/5",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="font-medium text-sm">Comments</h2>
        <FilterTabs
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "open", label: "Open", count: counts.open },
            { value: "resolved", label: "Resolved", count: counts.resolved },
          ]}
          value={filter}
        />
      </header>

      <div
        className="flex h-[340px] flex-col gap-1 overflow-y-auto p-2 [mask-image:linear-gradient(to_bottom,black_calc(100%-20px),transparent)]"
        role="tabpanel"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {results.map((r) => (
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              initial={reduce ? false : { opacity: 0, y: -8, scale: 0.98 }}
              key={r.id}
              layout={!reduce}
              transition={spring}
            >
              <ResultCard onClose={() => setResults((rs) => rs.filter((x) => x.id !== r.id))} result={r} />
            </motion.div>
          ))}
          {visible.map((c) => (
            <CommentRow
              comment={c}
              key={c.id}
              onToggle={() => toggleRow(c.id)}
              resolved={!!c.resolved || settling.includes(c.id)}
            />
          ))}
          {empty}
        </AnimatePresence>
      </div>

      <div className="relative border-t p-3">
        <AnimatePresence>
          {menuOpen && (
            <motion.ul
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute inset-x-3 bottom-full z-10 mb-1 rounded-xl border bg-popover p-1 text-popover-foreground shadow-md/5"
              exit={{ opacity: 0, y: 4, scale: 0.98, transition: { duration: 0.12 } }}
              id={listboxId}
              initial={reduce ? false : { opacity: 0, y: 6, scale: 0.98 }}
              role="listbox"
              style={{ transformOrigin: "16px 100%" }}
              transition={spring}
            >
              {matches.map((m, i) => {
                const Icon = m.icon;
                const selected = i === Math.min(active, matches.length - 1);
                return (
                  <li
                    aria-selected={selected}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm",
                      selected && "bg-accent",
                    )}
                    id={`${listboxId}-${m.id}`}
                    key={m.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      run(m.id);
                    }}
                    onMouseEnter={() => setActive(i)}
                    role="option"
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="font-medium font-mono text-xs">{m.label}</span>
                    <span className="truncate text-muted-foreground text-xs">{m.hint}</span>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
        <label className="sr-only" htmlFor={inputId}>
          Add a comment
        </label>
        <div className="flex items-center gap-2 rounded-full border bg-background ps-3.5 pe-1 transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24 dark:bg-input/32">
          <input
            aria-activedescendant={menuOpen ? `${listboxId}-${matches[Math.min(active, matches.length - 1)].id}` : undefined}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={menuOpen}
            autoComplete="off"
            className={cn(
              "h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/72",
              slash && "font-mono",
            )}
            id={inputId}
            onChange={(e) => {
              setDraft(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Comment, or type / for commands"
            role="combobox"
            value={draft}
          />
          <motion.button
            animate={{ scale: draft.trim() ? 1 : 0.85, opacity: draft.trim() ? 1 : 0.4 }}
            aria-label={menuOpen ? "Run command" : "Post comment"}
            className="relative flex size-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground outline-none transition-[scale] duration-150 ease-out after:absolute after:-inset-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[0.97] disabled:cursor-default"
            disabled={!draft.trim()}
            onClick={submit}
            transition={reduce ? { duration: 0 } : spring}
            type="button"
          >
            {slash ? <CornerDownLeftIcon className="size-3.5" /> : <ArrowUpIcon className="size-3.5" />}
          </motion.button>
        </div>
      </div>
    </section>
  );
}
