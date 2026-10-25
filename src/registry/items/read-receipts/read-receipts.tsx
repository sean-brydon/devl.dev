"use client";

import { ArrowUpIcon, CheckCheckIcon } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export interface ReceiptPerson {
  id: string;
  name: string;
  initials: string;
  avatarClassName?: string;
}

export interface ReceiptMessage {
  id: string;
  from: string;
  text: string;
}

export interface ReadReceiptsProps {
  title?: string;
  people: ReceiptPerson[];
  messages: ReceiptMessage[];
  readUpTo: Record<string, string>;
  onSend?: (text: string) => void;
  max?: number;
  className?: string;
}

const spring = { type: "spring", stiffness: 420, damping: 41 } as const;

function names(list: ReceiptPerson[]) {
  const first = list.map((p) => p.name.split(" ")[0]);
  if (first.length <= 2) return first.join(" and ");
  if (first.length === 3) return `${first[0]}, ${first[1]} and ${first[2]}`;
  return `${first.slice(0, 2).join(", ")} and ${first.length - 2} others`;
}

export function ReadReceipts({
  title = "design-crit",
  people,
  messages,
  readUpTo,
  onSend,
  max = 3,
  className,
}: ReadReceiptsProps) {
  const reduce = useSafeReducedMotion();
  const groupId = useId();
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const moved = useRef(new Map<string, number>());
  const prev = useRef<Record<string, string>>(readUpTo);

  for (const p of people) {
    if (prev.current[p.id] !== readUpTo[p.id]) moved.current.set(p.id, performance.now());
  }
  useEffect(() => {
    prev.current = readUpTo;
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages.length, reduce]);

  const byMessage = useMemo(() => {
    const map = new Map<string, ReceiptPerson[]>();
    for (const p of people) {
      const at = readUpTo[p.id];
      if (!at) continue;
      const list = map.get(at) ?? [];
      list.push(p);
      map.set(at, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (moved.current.get(b.id) ?? 0) - (moved.current.get(a.id) ?? 0));
    }
    return map;
  }, [people, readUpTo]);

  const lastMine = [...messages].reverse().find((m) => m.from === "me");
  const indexOf = (id: string | undefined) => (id ? messages.findIndex((m) => m.id === id) : -1);
  const lastMineIndex = indexOf(lastMine?.id);
  const seenLastMine = lastMine ? people.filter((p) => indexOf(readUpTo[p.id]) >= lastMineIndex).length : 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend?.(text);
    setDraft("");
  };

  return (
    <section
      aria-label={`#${title}`}
      className={cn("flex w-full max-w-[400px] flex-col rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h3 className="font-medium text-sm">
          <span className="text-muted-foreground">#</span>
          {title}
        </h3>
        <span className="text-muted-foreground text-xs tabular-nums">{people.length + 1} people</span>
      </header>

      <TooltipProvider delay={300}>
        <LayoutGroup id={groupId}>
          <div className="h-[340px] overflow-y-auto px-4 pt-4 [mask-image:linear-gradient(to_bottom,transparent,black_16px)]" ref={scrollRef}>
            <ol className="flex flex-col">
              {messages.map((m, i) => {
                const mine = m.from === "me";
                const author = people.find((p) => p.id === m.from);
                const prevFrom = messages[i - 1]?.from;
                const readers = byMessage.get(m.id) ?? [];
                const shown = readers.length > max ? readers.slice(0, max - 1) : readers;
                const extra = readers.length - shown.length;
                return (
                  <motion.li
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("relative flex flex-col pb-6", mine ? "items-end" : "items-start")}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    key={m.id}
                    transition={{ ...spring, opacity: { duration: 0.16 } }}
                  >
                    {!mine && author && prevFrom !== m.from && (
                      <span className="mb-1 ps-9 text-muted-foreground text-xs">{author.name.split(" ")[0]}</span>
                    )}
                    <div className={cn("flex max-w-[85%] items-end gap-2", mine && "flex-row-reverse")}>
                      {!mine &&
                        (author && messages[i + 1]?.from !== m.from ? (
                          <span
                            aria-hidden
                            className={cn(
                              "flex size-7 shrink-0 select-none items-center justify-center rounded-full font-medium text-[10px]",
                              author.avatarClassName ?? "bg-muted",
                            )}
                          >
                            {author.initials}
                          </span>
                        ) : (
                          <span className="w-7 shrink-0" />
                        ))}
                      <p
                        className={cn(
                          "text-pretty rounded-2xl px-3 py-2 text-sm",
                          mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted",
                        )}
                      >
                        {m.text}
                      </p>
                    </div>

                    <div className="absolute right-0 bottom-0.5 flex h-5 items-center gap-1.5">
                      {mine && m.id === lastMine?.id && seenLastMine === 0 && (
                        <span className="flex items-center gap-1 text-muted-foreground text-xs">
                          <CheckCheckIcon className="size-3" />
                          Delivered
                        </span>
                      )}
                      {readers.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <button
                                aria-label={`Seen by ${names(readers)}`}
                                className="flex cursor-default items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                type="button"
                              />
                            }
                          >
                            <AnimatePresence initial={false} mode="popLayout">
                              {shown.map((p, k) => (
                                <motion.span
                                  animate={{ opacity: 1, scale: 1 }}
                                  className={cn(
                                    "relative flex size-5 select-none items-center justify-center rounded-full font-semibold text-[9px] ring-2 ring-card",
                                    k > 0 && "-ms-1",
                                    p.avatarClassName ?? "bg-muted",
                                  )}
                                  exit={{ opacity: 0, scale: 0.6 }}
                                  initial={{ opacity: 0, scale: 0.6 }}
                                  key={p.id}
                                  layoutId={p.id}
                                  style={{ zIndex: max - k }}
                                  transition={reduce ? { duration: 0 } : spring}
                                >
                                  {p.initials.charAt(0)}
                                </motion.span>
                              ))}
                              {extra > 0 && (
                                <motion.span
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="relative -ms-1 flex h-5 min-w-6 items-center justify-center rounded-full bg-card px-1 font-medium text-[9px] text-muted-foreground tabular-nums ring-2 ring-card"
                                  exit={{ opacity: 0, scale: 0.6 }}
                                  initial={{ opacity: 0, scale: 0.6 }}
                                  key="extra"
                                  layout
                                  transition={reduce ? { duration: 0 } : spring}
                                >
                                  <span className="absolute inset-0 rounded-full bg-muted" />
                                  <span className="relative">+{extra}</span>
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </TooltipTrigger>
                          <TooltipPopup>Seen by {names(readers)}</TooltipPopup>
                        </Tooltip>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </LayoutGroup>
      </TooltipProvider>

      <form className="border-t p-3" onSubmit={submit}>
        <label className="sr-only" htmlFor={inputId}>
          Message #{title}
        </label>
        <div className="flex items-center gap-2 rounded-xl border bg-background ps-3 pe-1 transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24 dark:bg-input/32">
          <input
            autoComplete="off"
            className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/72"
            id={inputId}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message #${title}`}
            value={draft}
          />
          <button
            aria-label="Send"
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-primary text-primary-foreground outline-none transition-[opacity,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:cursor-default disabled:opacity-40"
            disabled={!draft.trim()}
            type="submit"
          >
            <ArrowUpIcon className="size-4" />
          </button>
        </div>
      </form>
    </section>
  );
}
