"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  InfoIcon,
  LightbulbIcon,
  MenuIcon,
  SearchIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, useScroll } from "motion/react";
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DocsNavGroup {
  label: string;
  items: { label: string; href: string; badge?: string }[];
}

export interface DocsSection {
  id: string;
  title: string;
  level?: 2 | 3;
  content: ReactNode;
}

export interface DocsPageLink {
  label: string;
  href: string;
}

export interface DocsLayoutProps {
  product?: string;
  nav: DocsNavGroup[];
  currentHref: string;
  breadcrumbs?: string[];
  title: string;
  lead?: string;
  meta?: string;
  sections: DocsSection[];
  prev?: DocsPageLink;
  next?: DocsPageLink;
  onNavigate?: (href: string) => void;
  onSearch?: () => void;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;

const CALLOUT = {
  note: { icon: InfoIcon, box: "border-info/25 bg-info/6 dark:bg-info/10", icon_: "text-info-foreground" },
  tip: { icon: LightbulbIcon, box: "border-success/25 bg-success/6 dark:bg-success/10", icon_: "text-success-foreground" },
  warning: { icon: TriangleAlertIcon, box: "border-warning/30 bg-warning/8 dark:bg-warning/10", icon_: "text-warning-foreground" },
};

export function DocsCallout({ tone = "note", title, children }: { tone?: keyof typeof CALLOUT; title?: string; children: ReactNode }) {
  const c = CALLOUT[tone];
  return (
    <div className={cn("my-5 flex gap-3 rounded-xl border p-3.5 text-sm", c.box)}>
      <c.icon className={cn("mt-0.5 size-4 shrink-0", c.icon_)} />
      <div className="min-w-0 text-pretty">
        {title && <div className="font-medium">{title}</div>}
        <div className={cn("text-foreground/80", title && "mt-0.5")}>{children}</div>
      </div>
    </div>
  );
}

const KEYWORDS = new Set([
  "const", "let", "var", "await", "async", "function", "return", "import", "from", "export", "if", "else", "new", "throw", "true", "false", "null",
]);

function highlight(line: string, lang: string) {
  const out: ReactNode[] = [];
  const re = /(\/\/.*$|#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+\b)|(\s-{1,2}[A-Za-z-]+)|([A-Za-z_$][\w$]*)(?=\()|([A-Za-z_$][\w$]*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const [text, comment, str, num, flag, fn, word] = m;
    let cls = "";
    if (comment && (lang !== "bash" || comment.startsWith("#"))) cls = "text-muted-foreground italic";
    else if (str) cls = "text-emerald-700 dark:text-emerald-300";
    else if (num) cls = "text-amber-700 dark:text-amber-300";
    else if (flag && lang === "bash") cls = "text-violet-700 dark:text-violet-300";
    else if (fn) cls = "text-sky-700 dark:text-sky-300";
    else if (word && KEYWORDS.has(word)) cls = "text-violet-700 dark:text-violet-300";
    else if (word && lang === "bash" && m.index === 0) cls = "text-sky-700 dark:text-sky-300";
    out.push(cls ? <span className={cls} key={k++}>{text}</span> : text);
    last = m.index + text.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function DocsCode({ tabs, caption }: { tabs: { label: string; lang: string; code: string }[]; caption?: string }) {
  const reduce = useReducedMotion();
  const layoutId = useId();
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  const current = tabs[tab];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.code);
    } catch {}
    setCopied(true);
  };
  return (
    <figure className="my-5 overflow-hidden rounded-xl border bg-muted/40">
      <div className="flex items-center gap-1 border-b bg-muted/40 py-1 ps-1.5 pe-1">
        <div className="flex min-w-0 flex-1 items-center gap-0.5" role="tablist">
          {tabs.length > 1 ? (
            tabs.map((t, i) => (
              <button
                aria-selected={i === tab}
                className={cn(
                  "relative h-7 cursor-pointer rounded-md px-2.5 font-medium text-xs outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                  i === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                key={t.label}
                onClick={() => setTab(i)}
                role="tab"
                type="button"
              >
                {i === tab && (
                  <motion.span
                    className="absolute inset-0 rounded-md bg-background shadow-xs/5 dark:bg-accent"
                    layoutId={layoutId}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="relative">{t.label}</span>
              </button>
            ))
          ) : (
            <span className="px-2 font-medium text-muted-foreground text-xs">{caption ?? current.label}</span>
          )}
        </div>
        <Button aria-label={copied ? "Copied" : "Copy code"} className="text-muted-foreground" onClick={copy} size="icon-sm" variant="ghost">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              className="flex"
              exit={{ opacity: 0, scale: 0.6 }}
              initial={{ opacity: 0, scale: 0.6 }}
              key={copied ? "y" : "n"}
              transition={{ duration: 0.14, ease }}
            >
              {copied ? <CheckIcon className="text-success-foreground" /> : <CopyIcon />}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[0.8125rem] leading-6">
        <code>
          {current.code.split("\n").map((line, i) => (
            <span className="block min-h-6" key={i}>
              {highlight(line, current.lang)}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

function Sidebar({
  nav,
  currentHref,
  onNavigate,
  onSearch,
  product,
}: {
  nav: DocsNavGroup[];
  currentHref: string;
  onNavigate?: (href: string) => void;
  onSearch?: () => void;
  product: string;
}) {
  return (
    <nav aria-label={`${product} docs`} className="space-y-5 p-3">
      <button
        className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg border bg-background px-2.5 text-muted-foreground text-sm shadow-xs/5 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/32"
        onClick={onSearch}
        type="button"
      >
        <SearchIcon className="size-3.5" />
        Search docs
      </button>
      {nav.map((g) => (
        <div key={g.label}>
          <p className="px-2.5 font-medium text-muted-foreground text-xs">{g.label}</p>
          <ul className="mt-1.5 space-y-px">
            {g.items.map((item) => {
              const active = item.href === currentHref;
              return (
                <li key={item.href}>
                  <a
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-8 items-center justify-between gap-2 rounded-lg px-2.5 text-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate?.(item.href);
                    }}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="shrink-0 rounded-full bg-info/10 px-1.5 py-px font-medium text-[0.625rem] text-info-foreground">
                        {item.badge}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DocsLayout({
  product = "Relay",
  nav,
  currentHref,
  breadcrumbs = [],
  title,
  lead,
  meta,
  sections,
  prev,
  next,
  onNavigate,
  onSearch,
  className,
}: DocsLayoutProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(sections[0]?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });

  const sync = useCallback(() => {
    const root = scrollRef.current;
    if (!root) return;
    const top = root.getBoundingClientRect().top;
    let current = sections[0]?.id;
    for (const s of sections) {
      const el = root.querySelector<HTMLElement>(`[data-docs-id="${s.id}"]`);
      if (el && el.getBoundingClientRect().top - top <= 96) current = s.id;
    }
    if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) current = sections[sections.length - 1]?.id;
    setActive(current);
  }, [sections]);

  useEffect(() => {
    sync();
  }, [sync]);

  const jump = (id: string) => {
    const root = scrollRef.current;
    const el = root?.querySelector<HTMLElement>(`[data-docs-id="${id}"]`);
    if (!root || !el) return;
    const y = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 24;
    root.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    setTocOpen(false);
  };

  const activeIndex = Math.max(0, sections.findIndex((s) => s.id === active));

  return (
    <div
      className={cn(
        "relative mx-auto flex h-[760px] w-full max-w-[1100px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5",
        className,
      )}
    >
      <aside className="hidden w-60 shrink-0 overflow-y-auto border-r bg-muted/30 md:block">
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <svg aria-hidden className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 14 14">
              <path d="M2 7h7M6.5 3.5 10 7l-3.5 3.5M12 3v8" />
            </svg>
          </span>
          <span className="font-semibold text-sm tracking-tight">{product}</span>
          <span className="rounded-md border px-1.5 py-px text-[0.625rem] text-muted-foreground">Docs</span>
        </div>
        <Sidebar currentHref={currentHref} nav={nav} onNavigate={onNavigate} onSearch={onSearch} product={product} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-3 md:hidden">
          <Button aria-expanded={menuOpen} aria-label="Open navigation" onClick={() => setMenuOpen(true)} size="icon" variant="ghost">
            <MenuIcon />
          </Button>
          <span className="font-semibold text-sm tracking-tight">{product}</span>
          <span className="rounded-md border px-1.5 py-px text-[0.625rem] text-muted-foreground">Docs</span>
        </div>

        <div className="relative h-0.5 shrink-0 bg-transparent">
          <motion.div
            aria-hidden
            className="absolute inset-0 origin-left bg-foreground/70"
            style={{ scaleX: scrollYProgress }}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto" onScroll={sync} ref={scrollRef}>
          <div className="mx-auto flex max-w-[960px] gap-10 px-5 py-8 sm:px-10 sm:py-10">
            <article className="min-w-0 max-w-[640px] flex-1">
              {breadcrumbs.length > 0 && (
                <ol className="flex flex-wrap items-center gap-1 text-muted-foreground text-xs">
                  {breadcrumbs.map((b, i) => (
                    <li className="flex items-center gap-1" key={b}>
                      {i > 0 && <ChevronRightIcon className="size-3" />}
                      <span className={cn(i === breadcrumbs.length - 1 && "text-foreground")}>{b}</span>
                    </li>
                  ))}
                </ol>
              )}
              <h1 className="mt-3 text-balance font-semibold text-3xl tracking-tight">{title}</h1>
              {lead && <p className="mt-3 text-pretty text-lg/7 text-muted-foreground">{lead}</p>}
              {meta && <p className="mt-4 text-muted-foreground text-xs">{meta}</p>}

              <div className="mt-6 lg:hidden">
                <button
                  aria-controls={`${uid}-toc-m`}
                  aria-expanded={tocOpen}
                  className="flex h-10 w-full cursor-pointer items-center justify-between rounded-xl border px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setTocOpen((o) => !o)}
                  type="button"
                >
                  <span className="text-muted-foreground">
                    On this page: <span className="text-foreground">{sections[activeIndex]?.title}</span>
                  </span>
                  <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform duration-200", tocOpen && "rotate-180")} />
                </button>
                <AnimatePresence initial={false}>
                  {tocOpen && (
                    <motion.div
                      animate={{ height: "auto", opacity: 1 }}
                      className="overflow-hidden"
                      exit={{ height: 0, opacity: 0 }}
                      id={`${uid}-toc-m`}
                      initial={{ height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.2, ease }}
                    >
                      <ul className="pt-2 pb-1">
                        {sections.map((s) => (
                          <li key={s.id}>
                            <button
                              className={cn(
                                "w-full cursor-pointer rounded-lg py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                s.level === 3 ? "ps-6" : "ps-3",
                                s.id === active ? "font-medium text-foreground" : "text-muted-foreground",
                              )}
                              onClick={() => jump(s.id)}
                              type="button"
                            >
                              {s.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="text-[0.9375rem]/7 text-foreground/90 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:decoration-foreground/25 [&_a]:underline-offset-4 [&_code:not(pre_code)]:rounded-md [&_code:not(pre_code)]:bg-muted [&_code:not(pre_code)]:px-1.5 [&_code:not(pre_code)]:py-0.5 [&_code:not(pre_code)]:font-mono [&_code:not(pre_code)]:text-[0.8125rem] [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:mt-4 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:ps-5">
                {sections.map((s) => {
                  const H = s.level === 3 ? "h3" : "h2";
                  return (
                    <section aria-labelledby={`${uid}-${s.id}`} data-docs-id={s.id} key={s.id}>
                      <H
                        className={cn(
                          "group scroll-mt-6 text-balance font-semibold text-foreground tracking-tight",
                          s.level === 3 ? "mt-8 text-base" : "mt-12 text-xl",
                        )}
                        id={`${uid}-${s.id}`}
                      >
                        {s.title}
                      </H>
                      {s.content}
                    </section>
                  );
                })}
              </div>

              <div className="mt-12 flex flex-col items-start justify-between gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center">
                <AnimatePresence initial={false} mode="wait">
                  {feedback ? (
                    <motion.p
                      animate={{ opacity: 1, y: 0 }}
                      className="flex min-h-7 items-center gap-2 text-sm"
                      initial={{ opacity: 0, y: 4 }}
                      key="thanks"
                      transition={{ duration: 0.18, ease }}
                    >
                      <CheckIcon className="size-4 text-success-foreground" />
                      {feedback === "yes" ? "Thanks! Glad it helped." : "Thanks. We’ll use this to improve the page."}
                    </motion.p>
                  ) : (
                    <motion.div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" exit={{ opacity: 0 }} key="ask">
                      <p className="text-sm">Was this page helpful?</p>
                      <div className="flex gap-2">
                        <Button onClick={() => setFeedback("yes")} size="sm" variant="outline">
                          <ThumbsUpIcon />
                          Yes
                        </Button>
                        <Button onClick={() => setFeedback("no")} size="sm" variant="outline">
                          <ThumbsDownIcon />
                          No
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {(prev || next) && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[prev, next].map((link, i) =>
                    link ? (
                      <a
                        className={cn(
                          "group flex flex-col gap-1 rounded-xl border p-4 outline-none transition-[border-color,scale] duration-150 hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
                          i === 1 && "sm:items-end sm:text-right",
                        )}
                        href={link.href}
                        key={link.href}
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate?.(link.href);
                        }}
                      >
                        <span className="flex items-center gap-1 text-muted-foreground text-xs">
                          {i === 0 && <ArrowLeftIcon className="size-3 transition-transform duration-200 group-hover:-translate-x-0.5" />}
                          {i === 0 ? "Previous" : "Next"}
                          {i === 1 && <ArrowRightIcon className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />}
                        </span>
                        <span className="font-medium text-sm">{link.label}</span>
                      </a>
                    ) : (
                      <span key={i} />
                    ),
                  )}
                </div>
              )}
            </article>

            <aside className="hidden w-48 shrink-0 lg:block">
              <div className="sticky top-8">
                <p className="font-medium text-xs">On this page</p>
                <div className="relative mt-3">
                  <span aria-hidden className="absolute inset-y-0 left-0 w-px bg-border" />
                  <motion.span
                    animate={{ y: activeIndex * 32 }}
                    aria-hidden
                    className="absolute top-0 left-0 h-8 w-px bg-foreground"
                    initial={false}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
                  />
                  <ul>
                    {sections.map((s) => (
                      <li key={s.id}>
                        <button
                          aria-current={s.id === active ? "location" : undefined}
                          className={cn(
                            "flex h-8 w-full cursor-pointer items-center truncate rounded-e-md text-left text-[0.8125rem] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                            s.level === 3 ? "ps-7" : "ps-4",
                            s.id === active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                          )}
                          onClick={() => jump(s.id)}
                          type="button"
                        >
                          <span className="truncate">{s.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              animate={{ opacity: 1 }}
              aria-label="Close navigation"
              className="absolute inset-0 z-20 cursor-default bg-black/30 md:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              transition={{ duration: 0.2 }}
              type="button"
            />
            <motion.div
              animate={{ x: 0 }}
              aria-label="Navigation"
              aria-modal
              className="absolute inset-y-0 left-0 z-30 w-[min(280px,85%)] overflow-y-auto border-r bg-card shadow-lg/10 md:hidden"
              exit={{ x: reduce ? 0 : "-100%", opacity: reduce ? 0 : 1 }}
              initial={{ x: reduce ? 0 : "-100%" }}
              onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}
              role="dialog"
              transition={{ duration: reduce ? 0 : 0.26, ease }}
            >
              <div className="flex h-14 items-center justify-between border-b ps-5 pe-2">
                <span className="font-semibold text-sm tracking-tight">{product} Docs</span>
                <Button aria-label="Close navigation" autoFocus onClick={() => setMenuOpen(false)} size="icon" variant="ghost">
                  <XIcon />
                </Button>
              </div>
              <Sidebar
                currentHref={currentHref}
                nav={nav}
                onNavigate={(href) => {
                  setMenuOpen(false);
                  onNavigate?.(href);
                }}
                onSearch={() => {
                  setMenuOpen(false);
                  onSearch?.();
                }}
                product={product}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
