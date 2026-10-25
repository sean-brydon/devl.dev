"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { CheckIcon, LinkIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface FaqProps {
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  items: FaqItem[];
  categories?: string[];
  contact?: { title: string; text: string; label: string; href: string };
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;
const ALL = "All";

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Marked({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escape(q)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: stable split
          <mark className="rounded-[3px] bg-warning/25 px-px text-foreground [box-decoration-break:clone]" key={i}>
            {part}
          </mark>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: stable split
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function CopyLink({ id, question, variant }: { id: string; question: string; variant: "gutter" | "inline" }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async () => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#faq-${id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
    }
    window.history.replaceState(null, "", `#faq-${id}`);
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };
  const icon = (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.6, filter: "blur(2px)" }}
        initial={{ opacity: 0, scale: 0.6, filter: "blur(2px)" }}
        key={copied ? "y" : "n"}
        transition={{ duration: 0.16, ease }}
      >
        {copied ? <CheckIcon className="size-3.5 text-success-foreground" /> : <LinkIcon className="size-3.5" />}
      </motion.span>
    </AnimatePresence>
  );

  if (variant === "inline") {
    return (
      <button
        className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-muted-foreground text-xs outline-none transition-[background-color,color,translate,scale,rotate] duration-150 ease-out -ms-2 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
        onClick={copy}
        type="button"
      >
        {icon}
        <span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span>
      </button>
    );
  }

  return (
    <button
      aria-label={copied ? "Link copied" : `Copy link to “${question}”`}
      className={cn(
        "absolute top-[1.1rem] -left-10 hidden size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground opacity-0 outline-none transition-[opacity,background-color,color,translate,scale,rotate] duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.94] group-hover/item:opacity-100 xl:flex",
        copied && "opacity-100",
      )}
      onClick={copy}
      tabIndex={-1}
      type="button"
    >
      {icon}
    </button>
  );
}

export function Faq({
  eyebrow = "FAQ",
  title = "Questions, answered",
  description,
  items,
  categories: categoriesProp,
  contact,
  className,
}: FaqProps) {
  const reduce = useReducedMotionSafe();
  const searchId = useId();
  const pillId = useId();
  const categories = useMemo(
    () => [ALL, ...(categoriesProp ?? Array.from(new Set(items.map((i) => i.category))))],
    [categoriesProp, items],
  );
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const match = window.location.hash.match(/^#faq-(.+)$/);
    if (!match) return;
    const id = decodeURIComponent(match[1]);
    if (!items.some((i) => i.id === id)) return;
    setOpen([id]);
    requestAnimationFrame(() =>
      listRef.current?.querySelector(`[data-faq="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }),
    );
  }, [items, reduce]);

  const q = query.trim().toLowerCase();
  const visible = items.filter(
    (i) =>
      (category === ALL || i.category === category) &&
      (!q || i.question.toLowerCase().includes(q) || i.answer.toLowerCase().includes(q)),
  );
  const counts = (c: string) =>
    items.filter((i) => (c === ALL || i.category === c) && (!q || `${i.question} ${i.answer}`.toLowerCase().includes(q))).length;

  return (
    <MotionConfig reducedMotion="user">
      <section className={cn("mx-auto w-full max-w-[1100px]", className)}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:gap-16">
          <div className="min-w-0 lg:sticky lg:top-8 lg:self-start">
            {eyebrow && <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">{eyebrow}</p>}
            <h2 className="mt-2 text-balance font-heading font-semibold text-3xl tracking-tight sm:text-4xl">{title}</h2>
            {description && <p className="mt-3 text-pretty text-muted-foreground text-sm leading-relaxed">{description}</p>}

            <div className="relative mt-7">
              <label className="sr-only" htmlFor={searchId}>
                Search questions
              </label>
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-10 w-full rounded-lg border bg-background ps-9 pe-9 text-base shadow-xs/5 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/24 sm:h-9 sm:text-sm dark:bg-input/32 [&::-webkit-search-cancel-button]:appearance-none"
                id={searchId}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                placeholder="Search questions"
                type="search"
                value={query}
              />
              {query && (
                <button
                  aria-label="Clear search"
                  className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setQuery("")}
                  type="button"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>

            <div
              aria-label="Categories"
              className="-mx-4 mt-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:mt-5 lg:flex-col lg:overflow-visible lg:px-0"
              role="group"
            >
              {categories.map((c) => {
                const on = c === category;
                const n = counts(c);
                return (
                  <button
                    aria-pressed={on}
                    className={cn(
                      "relative flex h-8 shrink-0 cursor-pointer items-center justify-between gap-3 rounded-full px-3 text-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring lg:h-9 lg:rounded-lg",
                      on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      n === 0 && !on && "opacity-50",
                    )}
                    key={c}
                    onClick={() => setCategory(c)}
                    type="button"
                  >
                    {on && (
                      <motion.span
                        className="absolute inset-0 rounded-full bg-accent lg:rounded-lg"
                        layoutId={pillId}
                        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                      />
                    )}
                    <span className="relative font-medium">{c}</span>
                    <span className="relative font-mono text-muted-foreground text-xs tabular-nums">{n}</span>
                  </button>
                );
              })}
            </div>

            {contact && (
              <div className="mt-8 hidden rounded-2xl border bg-card p-5 shadow-xs/5 lg:block">
                <p className="font-medium text-sm">{contact.title}</p>
                <p className="mt-1 text-muted-foreground text-sm leading-relaxed">{contact.text}</p>
                <Button
                  className="mt-4 transition-[box-shadow,translate,scale,rotate] duration-150 ease-out active:scale-[0.97]"
                  render={<a href={contact.href} />}
                  size="sm"
                  variant="outline"
                >
                  {contact.label}
                </Button>
              </div>
            )}
          </div>

          <div className="min-w-0" ref={listRef}>
            <AccordionPrimitive.Root
              className={cn(category !== ALL && "border-t")}
              multiple={false}
              onValueChange={(v) => setOpen(v as string[])}
              value={open}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {visible.map((item, index) => (
                  <motion.div
                    animate={{ opacity: 1 }}
                    data-faq={item.id}
                    exit={{ opacity: 0 }}
                    id={`faq-${item.id}`}
                    initial={{ opacity: 0 }}
                    key={item.id}
                    layout="position"
                    transition={{ duration: 0.2, ease }}
                  >
                    {category === ALL && visible[index - 1]?.category !== item.category && (
                      <p
                        className={cn(
                          "border-b pb-3 font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-wider",
                          index > 0 && "pt-10",
                        )}
                      >
                        {item.category}
                      </p>
                    )}
                    <AccordionPrimitive.Item className="group/item relative scroll-mt-24 border-b" value={item.id}>
                      <AccordionPrimitive.Header className="flex items-start gap-2">
                        <AccordionPrimitive.Trigger className="group/trigger flex flex-1 cursor-pointer items-start gap-4 rounded-md py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <span className="flex-1">
                            <span className="block text-pretty font-medium text-[0.9375rem] leading-snug">
                              <Marked query={query} text={item.question} />
                            </span>
                          </span>
                          <span className="flex size-6 shrink-0 items-center justify-center self-center rounded-full border bg-background text-muted-foreground transition-[translate,scale,rotate,background-color,color] duration-200 ease-out group-hover/trigger:text-foreground group-data-[panel-open]/trigger:rotate-45 group-data-[panel-open]/trigger:bg-primary group-data-[panel-open]/trigger:text-primary-foreground group-data-[panel-open]/trigger:border-primary">
                            <PlusIcon className="size-3.5" />
                          </span>
                        </AccordionPrimitive.Trigger>
                        <CopyLink id={item.id} question={item.question} variant="gutter" />
                      </AccordionPrimitive.Header>
                      <AccordionPrimitive.Panel className="h-(--accordion-panel-height) overflow-hidden transition-[height,opacity] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] data-ending-style:h-0 data-starting-style:h-0 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none">
                        <div className="pe-10 pb-5">
                          <p className="max-w-prose whitespace-pre-line text-pretty text-muted-foreground text-sm leading-relaxed">
                            <Marked query={query} text={item.answer} />
                          </p>
                          <div className="mt-3">
                            <CopyLink id={item.id} question={item.question} variant="inline" />
                          </div>
                        </div>
                      </AccordionPrimitive.Panel>
                    </AccordionPrimitive.Item>
                  </motion.div>
                ))}
              </AnimatePresence>
            </AccordionPrimitive.Root>

            <AnimatePresence initial={false}>
              {visible.length === 0 && (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2, ease }}
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <SearchIcon className="size-4" />
                  </span>
                  <p className="mt-4 font-medium text-sm">
                    Nothing for “{query.trim()}”{category !== ALL && ` in ${category}`}
                  </p>
                  <p className="mt-1 max-w-xs text-muted-foreground text-sm">
                    Try a different word, or ask us directly. A human replies within a few hours.
                  </p>
                  <div className="mt-5 flex gap-2">
                    <Button onClick={() => { setQuery(""); setCategory(ALL); }} size="sm" variant="outline">
                      Clear search
                    </Button>
                    {contact && (
                      <Button render={<a href={contact.href} />} size="sm">
                        {contact.label}
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {contact && (
              <p className="mt-6 text-muted-foreground text-sm lg:hidden">
                {contact.title}{" "}
                <a className="font-medium text-foreground underline underline-offset-4" href={contact.href}>
                  {contact.label}
                </a>
              </p>
            )}
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
