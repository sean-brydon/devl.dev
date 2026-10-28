"use client";

import { ChevronRightIcon, CircleCheckIcon, CornerDownLeftIcon, HistoryIcon, SearchIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export interface LauncherAction {
  id: string;
  label: string;
  icon?: ReactNode;
  group?: string;
  shortcut?: string[];
  keywords?: string[];
  page?: string;
  done?: string;
  onSelect?: () => void;
}

export interface LauncherPage {
  title: string;
  placeholder?: string;
  actions: LauncherAction[];
}

export interface LauncherProps {
  actions: LauncherAction[];
  pages?: Record<string, LauncherPage>;
  defaultRecent?: string[];
  recentLimit?: number;
  placeholder?: string;
  triggerLabel?: string;
  defaultOpen?: boolean;
  className?: string;
}

type Section = { title: string; items: LauncherAction[] };

function scrollListOnly(list: HTMLElement, el: HTMLElement) {
  const top = el.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
  if (top < list.scrollTop) list.scrollTop = top - 6;
  else if (top + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + el.offsetHeight - list.clientHeight + 6;
}

function score(action: LauncherAction, q: string) {
  const label = action.label.toLowerCase();
  if (label.startsWith(q)) return 3;
  if (label.split(/\s+/).some((w) => w.startsWith(q))) return 2;
  if (label.includes(q) || action.keywords?.some((k) => k.toLowerCase().includes(q))) return 1;
  return 0;
}

function useThemeRadius(scale: number) {
  const probe = useRef<HTMLSpanElement>(null);
  const [radius, setRadius] = useState(scale * 10);
  useLayoutEffect(() => {
    const el = probe.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setRadius(el.offsetWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const marker = (
    <span
      aria-hidden
      className="pointer-events-none invisible absolute h-0"
      ref={probe}
      style={{ width: `calc(var(--radius) * ${scale})` }}
    />
  );
  return [radius, marker] as const;
}

export function Launcher({
  actions,
  pages = {},
  defaultRecent = [],
  recentLimit = 3,
  placeholder = "Type a command or search…",
  triggerLabel = "Search or jump to…",
  defaultOpen = false,
  className,
}: LauncherProps) {
  const [radius, radiusProbe] = useThemeRadius(1);
  const [open, setOpen] = useState(defaultOpen);
  const [page, setPage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState(defaultRecent);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);
  const reduce = useReducedMotion();
  const baseId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const all = useMemo(() => {
    const map = new Map<string, LauncherAction>();
    for (const a of actions) map.set(a.id, a);
    for (const p of Object.values(pages)) for (const a of p.actions) map.set(a.id, a);
    return map;
  }, [actions, pages]);

  const sections: Section[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = page ? (pages[page]?.actions ?? []) : actions;
    if (q) {
      const hits = source
        .map((a) => ({ a, s: score(a, q) }))
        .filter((x) => x.s > 0)
        .sort((x, y) => y.s - x.s)
        .map((x) => x.a);
      return hits.length ? [{ title: page ? (pages[page]?.title ?? "Results") : "Results", items: hits }] : [];
    }
    if (page) return [{ title: pages[page]?.title ?? "", items: source }];
    const out: Section[] = [];
    const recents = recent.map((id) => all.get(id)).filter((a): a is LauncherAction => !!a);
    if (recents.length) out.push({ title: "Recent", items: recents });
    for (const a of source) {
      const title = a.group ?? "Actions";
      const section = out.find((s) => s.title === title && s.title !== "Recent");
      if (section) section.items.push(a);
      else out.push({ title, items: [a] });
    }
    return out;
  }, [query, page, pages, actions, recent, all]);

  const flat = sections.flatMap((s) => s.items.map((item) => ({ item, section: s.title })));
  const current = flat[Math.min(active, flat.length - 1)];
  const optionId = (section: string, id: string) => `${baseId}-${section}-${id}`.replace(/[^a-zA-Z0-9_-]/g, "");

  useEffect(() => setActive(0), [query, page]);

  useEffect(() => {
    const list = listRef.current;
    if (!current || !list) return;
    const el = list.querySelector<HTMLElement>(`#${CSS.escape(optionId(current.section, current.item.id))}`);
    if (el) scrollListOnly(list, el);
  }, [active, current?.item.id]);

  const [height, setHeight] = useState<number | "auto">("auto");
  const [more, setMore] = useState(false);
  const checkMore = () => {
    const el = listRef.current;
    if (el) setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  };
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setHeight(Math.min(el.scrollHeight, 296));
      checkMore();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  const focusOnOpen = useRef(false);
  const show = () => {
    focusOnOpen.current = true;
    setOpen(true);
    setLastRun(null);
  };
  useEffect(() => {
    if (open && focusOnOpen.current) {
      focusOnOpen.current = false;
      inputRef.current?.focus();
    }
  }, [open]);
  const close = () => {
    setOpen(false);
    setPage(null);
    setQuery("");
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const goTo = (next: string | null) => {
    setDirection(next ? 1 : -1);
    setPage(next);
    setQuery("");
    inputRef.current?.focus();
  };

  const run = (action: LauncherAction) => {
    if (action.page) return goTo(action.page);
    action.onSelect?.();
    setRecent((list) => [action.id, ...list.filter((id) => id !== action.id)].slice(0, recentLimit));
    setLastRun(action.done ?? action.label);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLastRun(null), 2600);
    close();
  };

  const onInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    const n = flat.length;
    if (event.key === "ArrowDown" && n) {
      event.preventDefault();
      setActive((i) => (i + 1) % n);
    } else if (event.key === "ArrowUp" && n) {
      event.preventDefault();
      setActive((i) => (i - 1 + n) % n);
    } else if (event.key === "Home" && n) {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End" && n) {
      event.preventDefault();
      setActive(n - 1);
    } else if (event.key === "Enter" && current) {
      event.preventDefault();
      run(current.item);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (page) goTo(null);
      else close();
    } else if (event.key === "Backspace" && !query && page) {
      event.preventDefault();
      goTo(null);
    }
  };

  const onWrapperKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (open) close();
      else show();
    }
  };

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 36 };
  const pageTitle = page ? pages[page]?.title : null;

  return (
    <div className={cn("relative w-full max-w-md", className)} onKeyDown={onWrapperKey}>
      {radiusProbe}
      <AnimatePresence initial={false} mode="popLayout">
        {open ? (
          <motion.div
            className="overflow-hidden border bg-popover text-popover-foreground shadow-lg/5"
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            key="panel"
            layoutId={`${baseId}-shell`}
            style={{ borderRadius: radius * 1.6 }}
            transition={spring}
          >
            <motion.div animate={{ opacity: 1 }} initial={reduce ? false : { opacity: 0 }} transition={{ delay: 0.06 }}>
              <div className="flex items-center gap-2 border-b px-3">
                <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
                <AnimatePresence initial={false} mode="popLayout">
                  {pageTitle && (
                    <motion.button
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 font-medium text-xs outline-none hover:bg-accent/80"
                      exit={{ opacity: 0, scale: 0.8 }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      key={pageTitle}
                      onClick={() => goTo(null)}
                      title="Back (Backspace)"
                      type="button"
                    >
                      {pageTitle}
                      <ChevronRightIcon className="size-3 text-muted-foreground" />
                    </motion.button>
                  )}
                </AnimatePresence>
                <input
                  aria-activedescendant={current ? optionId(current.section, current.item.id) : undefined}
                  aria-autocomplete="list"
                  aria-controls={`${baseId}-list`}
                  aria-expanded
                  aria-label="Command"
                  className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/72"
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onInputKey}
                  placeholder={page ? (pages[page]?.placeholder ?? "Search…") : placeholder}
                  ref={inputRef}
                  role="combobox"
                  value={query}
                />
                <Kbd>esc</Kbd>
              </div>

              <motion.div animate={{ height }} className="overflow-hidden" initial={false} transition={spring}>
                <div
                  className={cn(
                    "max-h-74 overflow-y-auto overscroll-contain",
                    more && "mask-[linear-gradient(to_bottom,black_calc(100%-32px),transparent)]",
                  )}
                  onScroll={checkMore}
                  ref={listRef}
                >
                  <AnimatePresence custom={direction} initial={false} mode="popLayout">
                    <motion.div
                      animate={{ x: 0, opacity: 1 }}
                      custom={direction}
                      exit={{ x: reduce ? 0 : -24 * direction, opacity: 0, transition: { duration: 0.12 } }}
                      id={`${baseId}-list`}
                      initial={reduce ? false : { x: 24 * direction, opacity: 0 }}
                      key={page ?? "root"}
                      role="listbox"
                      className="p-1.5"
                      transition={spring}
                    >
                      {sections.length === 0 && (
                        <p className="px-3 py-8 text-center text-muted-foreground text-sm">
                          Nothing for “{query}”.
                        </p>
                      )}
                      {sections.map((section) => (
                        <div aria-label={section.title} className="not-first:mt-1.5" key={section.title} role="group">
                          <div className="flex items-center gap-1.5 px-2 py-1.5 font-medium text-muted-foreground text-xs">
                            {section.title === "Recent" && <HistoryIcon className="size-3" />}
                            {section.title}
                          </div>
                          {section.items.map((item) => {
                            const isActive = current?.item.id === item.id && current.section === section.title;
                            const index = flat.findIndex((f) => f.item.id === item.id && f.section === section.title);
                            return (
                              <div
                                aria-selected={isActive}
                                className={cn(
                                  "relative flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-lg px-2 text-sm [&_svg:not([class*='size-'])]:size-4",
                                  isActive ? "text-foreground" : "text-foreground/80",
                                )}
                                id={optionId(section.title, item.id)}
                                key={item.id}
                                onClick={() => run(item)}
                                onMouseMove={() => index !== active && setActive(index)}
                                role="option"
                                tabIndex={-1}
                              >
                                {isActive && (
                                  <motion.span
                                    className="absolute inset-0 rounded-lg bg-accent"
                                    layoutId={`${baseId}-glide`}
                                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 40 }}
                                  />
                                )}
                                <span className="relative flex shrink-0 text-muted-foreground">{item.icon}</span>
                                <span className="relative min-w-0 flex-1 truncate">{item.label}</span>
                                {item.page ? (
                                  <ChevronRightIcon className="relative size-4 text-muted-foreground" />
                                ) : (
                                  item.shortcut && (
                                    <KbdGroup className="relative">
                                      {item.shortcut.map((k) => (
                                        <Kbd className="bg-background ring-1 ring-border" key={k}>
                                          {k}
                                        </Kbd>
                                      ))}
                                    </KbdGroup>
                                  )
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>

              <div className="flex items-center gap-3 border-t px-3 py-2 text-muted-foreground text-xs">
                <span className="flex items-center gap-1">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>
                    <CornerDownLeftIcon />
                  </Kbd>
                  {current?.item.page ? "open" : "run"}
                </span>
                <span className="ms-auto flex items-center gap-1">
                  <Kbd>{page ? "⌫" : "esc"}</Kbd>
                  {page ? "back" : "close"}
                </span>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.button
            className="flex h-10 w-full cursor-pointer items-center gap-2 border bg-popover px-3 text-muted-foreground text-sm shadow-xs/5 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            key="trigger"
            layoutId={`${baseId}-shell`}
            onClick={show}
            ref={triggerRef}
            style={{ borderRadius: radius * 1.2 }}
            transition={spring}
            type="button"
          >
            <SearchIcon className="size-4" />
            <span className="flex-1 text-start">{triggerLabel}</span>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {lastRun && !open && (
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            aria-live="polite"
            className="mt-3 flex items-center justify-center gap-1.5 text-muted-foreground text-xs"
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: 6 }}
          >
            <CircleCheckIcon className="size-3.5 text-success" />
            {lastRun}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
