"use client";

import { ArrowLeftIcon, ArrowRightIcon, CopyIcon, GlobeIcon, ListXIcon, LockIcon, PinIcon, PinOffIcon, PlusIcon, RotateCwIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, Reorder, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

export type TabTone = "sky" | "violet" | "emerald" | "amber" | "rose" | "teal" | "neutral";

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  tone?: TabTone;
  mark?: string;
  pinned?: boolean;
  headline?: string;
}

export interface BrowserTabsProps {
  defaultTabs: BrowserTab[];
  defaultActiveId?: string;
  renderPage?: (tab: BrowserTab) => ReactNode;
  newTab?: () => Omit<BrowserTab, "id">;
  onChange?: (tabs: BrowserTab[], activeId: string | null) => void;
  className?: string;
}

const FAVICON: Record<TabTone, string> = {
  sky: "bg-sky-500 text-white",
  violet: "bg-violet-500 text-white",
  emerald: "bg-emerald-500 text-white",
  amber: "bg-amber-400 text-amber-950",
  rose: "bg-rose-500 text-white",
  teal: "bg-teal-500 text-white",
  neutral: "bg-neutral-400 text-white dark:bg-neutral-600",
};

const PAGE_TINT: Record<TabTone, string> = {
  sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  teal: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  neutral: "bg-muted text-muted-foreground",
};

const PINNED_W = 40;
const MIN_W = 104;
const MAX_W = 196;
const NEW_W = 36;

const pinnedFirst = (list: BrowserTab[]) => [...list.filter((t) => t.pinned), ...list.filter((t) => !t.pinned)];

let counter = 0;

export function BrowserTabs({ defaultTabs, defaultActiveId, renderPage, newTab, onChange, className }: BrowserTabsProps) {
  const reduce = useReducedMotion();
  const [tabs, setTabs] = useState(() => pinnedFirst(defaultTabs));
  const [active, setActive] = useState<string | null>(defaultActiveId ?? defaultTabs[0]?.id ?? null);
  const [menuTab, setMenuTab] = useState<string | null>(null);
  const [stripWidth, setStripWidth] = useState(0);
  // After closing with the mouse, widths hold still so the next close button lands under the pointer.
  const [frozen, setFrozen] = useState<number | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const stripRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLElement>());

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStripWidth(el.clientWidth));
    ro.observe(el);
    setStripWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const checkEdges = () => {
    const el = stripRef.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  };
  useEffect(() => {
    const t = window.setTimeout(checkEdges, 260);
    return () => clearTimeout(t);
  }, [tabs, stripWidth, frozen]);

  const commit = (next: BrowserTab[], nextActive: string | null = active) => {
    setTabs(next);
    setActive(nextActive);
    onChange?.(next, nextActive);
  };

  const pinnedCount = tabs.filter((t) => t.pinned).length;
  const looseCount = tabs.length - pinnedCount;
  const fit = looseCount ? Math.floor((stripWidth - pinnedCount * PINNED_W - NEW_W - 12) / looseCount) : MAX_W;
  const width = frozen ?? Math.max(MIN_W, Math.min(MAX_W, fit));

  const close = (id: string, byPointer = false) => {
    const i = tabs.findIndex((t) => t.id === id);
    if (i < 0) return;
    if (byPointer && !tabs[i].pinned) setFrozen(width);
    const next = tabs.filter((t) => t.id !== id);
    let nextActive = active;
    if (active === id) nextActive = next[Math.min(i, next.length - 1)]?.id ?? null;
    commit(next, nextActive);
    if (!byPointer && nextActive) requestAnimationFrame(() => tabRefs.current.get(nextActive)?.focus());
  };

  const open = () => {
    const base = newTab?.() ?? { title: "New Tab", url: "", tone: "neutral" as const, mark: "" };
    const tab = { ...base, id: `tab-${Date.now()}-${counter++}` };
    commit([...tabs, tab], tab.id);
    const el = stripRef.current;
    if (!el) return;
    const start = performance.now();
    const follow = () => {
      const end = el.scrollWidth - el.clientWidth;
      const done = reduce || performance.now() - start > 450;
      el.scrollLeft = done ? end : el.scrollLeft + (end - el.scrollLeft) * 0.3;
      if (!done) requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  };

  const togglePin = (id: string) => commit(pinnedFirst(tabs.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t))));
  const duplicate = (id: string) => {
    const i = tabs.findIndex((t) => t.id === id);
    if (i < 0) return;
    const copy = { ...tabs[i], id: `tab-${Date.now()}-${counter++}`, pinned: false };
    const next = [...tabs];
    next.splice(i + 1, 0, copy);
    commit(pinnedFirst(next), copy.id);
  };
  const closeOthers = (id: string) => commit(tabs.filter((t) => t.id === id || t.pinned), id);

  const move = (id: string, dir: -1 | 1) => {
    const i = tabs.findIndex((t) => t.id === id);
    const j = i + dir;
    if (j < 0 || j >= tabs.length || tabs[j].pinned !== tabs[i].pinned) return;
    const next = [...tabs];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  const onTabKey = (event: KeyboardEvent<HTMLElement>, tab: BrowserTab) => {
    const i = tabs.findIndex((t) => t.id === tab.id);
    if (event.altKey && event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      move(tab.id, event.key === "ArrowLeft" ? -1 : 1);
      requestAnimationFrame(() => tabRefs.current.get(tab.id)?.focus());
      return;
    }
    let next: BrowserTab | undefined;
    if (event.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
    else if (event.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (event.key === "Home") next = tabs[0];
    else if (event.key === "End") next = tabs[tabs.length - 1];
    else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      close(tab.id);
      return;
    }
    if (next) {
      event.preventDefault();
      setActive(next.id);
      tabRefs.current.get(next.id)?.focus();
      tabRefs.current.get(next.id)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };

  const current = tabs.find((t) => t.id === active) ?? null;
  const menuTarget = tabs.find((t) => t.id === menuTab);
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 520, damping: 42 };

  return (
    <div className={cn("flex w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border bg-card shadow-xs/5", className)}>
      <div className="flex items-end bg-muted pt-2 ps-3 pe-2">
        <div aria-hidden className="mb-[13px] me-2 flex shrink-0 gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="flex min-w-0 flex-1 items-end" ref={areaRef}>
          <ContextMenu>
            <ContextMenuTrigger className="relative min-w-0 shrink">
              <div
                className="flex min-w-0 items-end overflow-x-auto overflow-y-hidden pe-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                onPointerLeave={() => setFrozen(null)}
                onScroll={checkEdges}
                ref={stripRef}
                style={{
                  maskImage: `linear-gradient(to right, ${edges.left ? "transparent, black 20px" : "black, black"}, ${edges.right ? "black calc(100% - 20px), transparent" : "black, black"})`,
                }}
              >
                <Reorder.Group
                  aria-label="Tabs"
                  as="div"
                  axis="x"
                  className="flex shrink-0 items-end"
                  onReorder={(next: BrowserTab[]) => commit(pinnedFirst(next))}
                  role="tablist"
                  values={tabs}
                >
                  <AnimatePresence initial={false}>
                    {tabs.map((tab, i) => {
                      const isActive = tab.id === active;
                      const prevActive = tabs[i - 1]?.id === active;
                      return (
                        <Reorder.Item
                          animate={{ width: tab.pinned ? PINNED_W : width, opacity: 1 }}
                          as="div"
                          className={cn(
                            "group/tab relative flex h-[34px] shrink-0 cursor-default select-none items-center outline-none",
                            isActive ? "z-10" : "z-0",
                          )}
                          dragListener={stripWidth > 0}
                          exit={{ width: 0, opacity: 0, transition: { duration: reduce ? 0 : 0.16, ease: "easeOut" } }}
                          initial={reduce ? false : { width: 0, opacity: 0 }}
                          key={tab.id}
                          layout="position"
                          onAuxClick={(event) => {
                            if (event.button === 1) close(tab.id, true);
                          }}
                          onContextMenu={() => setMenuTab(tab.id)}
                          onPointerDown={(event) => {
                            if (event.button === 0) setActive(tab.id);
                          }}
                          role="presentation"
                          // Reorder.Item adds tabIndex 0 unless it is overridden; focus belongs to the inner tab
                          tabIndex={undefined}
                          transition={spring}
                          value={tab}
                          whileDrag={{ zIndex: 20 }}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "absolute top-2.5 left-0 h-3.5 w-px bg-border transition-opacity duration-150",
                              i === 0 || isActive || prevActive ? "opacity-0" : "opacity-100",
                            )}
                          />
                          <div
                            aria-keyshortcuts="Delete"
                            aria-label={tab.title}
                            aria-selected={isActive}
                            className={cn(
                              "relative mx-px flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-t-lg ps-2.5 pe-2 text-xs outline-none transition-colors duration-150",
                              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                              isActive
                                ? "bg-card text-foreground before:absolute before:-bottom-0 before:-left-2.5 before:size-2.5 before:bg-[radial-gradient(circle_at_0_0,transparent_10px,var(--color-card)_10.5px)] after:absolute after:-right-2.5 after:-bottom-0 after:size-2.5 after:bg-[radial-gradient(circle_at_100%_0,transparent_10px,var(--color-card)_10.5px)]"
                                : "text-muted-foreground [@media(hover:hover)]:group-hover/tab:text-foreground",
                              tab.pinned && "justify-center px-0",
                            )}
                            onKeyDown={(event) => onTabKey(event, tab)}
                            ref={(el: HTMLDivElement | null) => {
                              if (el) tabRefs.current.set(tab.id, el);
                              else tabRefs.current.delete(tab.id);
                            }}
                            role="tab"
                            tabIndex={isActive ? 0 : -1}
                            title={tab.title}
                          >
                            {!isActive && (
                              <span
                                aria-hidden
                                className="absolute inset-x-0.5 top-0.5 bottom-1 rounded-lg bg-foreground/0 transition-colors duration-150 [@media(hover:hover)]:group-hover/tab:bg-foreground/6"
                              />
                            )}
                            <Favicon tab={tab} />
                            {!tab.pinned && (
                              <>
                                <span className="relative min-w-0 flex-1 truncate">{tab.title}</span>
                                <span aria-hidden className="-me-1 size-5 shrink-0" />
                              </>
                            )}
                          </div>
                          {!tab.pinned && (
                            <button
                              aria-hidden
                              className={cn(
                                "absolute end-[5px] top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full before:absolute before:-inset-1.5 text-muted-foreground outline-none transition-[opacity,background-color] duration-150 hover:bg-foreground/10 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring",
                                isActive ? "opacity-100" : "opacity-0 group-hover/tab:opacity-100",
                              )}
                              onClick={(event) => {
                                event.stopPropagation();
                                close(tab.id, event.detail > 0);
                              }}
                              onPointerDown={(event) => event.stopPropagation()}
                              tabIndex={-1}
                              type="button"
                            >
                              <XIcon className="size-3" />
                            </button>
                          )}
                        </Reorder.Item>
                      );
                    })}
                  </AnimatePresence>
                </Reorder.Group>
              </div>
            </ContextMenuTrigger>
            <ContextMenuPopup className="min-w-44 transition-[scale,opacity] duration-150 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              {menuTarget && (
                <>
                  <ContextMenuItem onClick={() => togglePin(menuTarget.id)}>
                    {menuTarget.pinned ? <PinOffIcon /> : <PinIcon />}
                    {menuTarget.pinned ? "Unpin tab" : "Pin tab"}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => duplicate(menuTarget.id)}>
                    <CopyIcon />
                    Duplicate
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => close(menuTarget.id)}>
                    <XIcon />
                    Close tab
                    <ContextMenuShortcut>Del</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem disabled={tabs.length - pinnedCount <= (menuTarget.pinned ? 0 : 1)} onClick={() => closeOthers(menuTarget.id)}>
                    <ListXIcon />
                    Close other tabs
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuPopup>
          </ContextMenu>
          <motion.button
            aria-label="New tab"
            className="relative mb-[5px] ms-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-[background-color,color,scale] duration-150 hover:bg-foreground/8 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
            onClick={open}
            type="button"
          >
            <PlusIcon className="size-4" />
          </motion.button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        {[ArrowLeftIcon, ArrowRightIcon, RotateCwIcon].map((Icon, i) => (
          <span aria-hidden className={cn("flex size-7 items-center justify-center rounded-full text-muted-foreground", i === 1 && "opacity-40")} key={Icon.displayName ?? i}>
            <Icon className="size-3.5" />
          </span>
        ))}
        <div className="ms-1 flex h-7 min-w-0 flex-1 items-center gap-2 rounded-full bg-muted px-3 text-xs">
          {current?.url ? <LockIcon className="size-3 shrink-0 text-muted-foreground" /> : null}
          <span className="truncate">
            {current?.url ? (
              <>
                <span className="text-foreground">{current.url.split("/")[0]}</span>
                <span className="text-muted-foreground">{current.url.slice(current.url.split("/")[0].length)}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Search or type a URL</span>
            )}
          </span>
        </div>
      </div>

      <div className="relative h-52 overflow-hidden">
        {current ? (
          (renderPage ?? DefaultPage)(current)
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="font-medium text-sm">No tabs open</p>
            <button
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 font-medium text-sm shadow-xs/5 outline-none transition-[background-color,scale] hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
              onClick={open}
              type="button"
            >
              <PlusIcon className="size-4" />
              New tab
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Favicon({ tab }: { tab: BrowserTab }) {
  const mark = tab.mark ?? tab.title.charAt(0);
  if (!mark) return <GlobeIcon aria-hidden className="relative size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />;
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex size-4 shrink-0 items-center justify-center rounded-[calc(var(--radius)*0.4)] font-bold text-[9px] leading-none",
        FAVICON[tab.tone ?? "neutral"],
      )}
    >
      {mark}
    </span>
  );
}

function DefaultPage(tab: BrowserTab) {
  const tint = PAGE_TINT[tab.tone ?? "neutral"];
  if (!tab.url) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="flex h-9 w-64 max-w-[80%] items-center rounded-full border bg-background px-4 text-muted-foreground text-xs shadow-xs/5">Search the web</div>
        <div className="flex gap-3">
          {["S", "M", "D", "B"].map((l) => (
            <span className="flex size-9 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs" key={l}>
              {l}
            </span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <Favicon tab={tab} />
        <span className="font-semibold text-sm">{tab.title.split(" ")[0]}</span>
        <span className="ms-auto flex gap-3 text-muted-foreground text-xs">
          <span>Product</span>
          <span>Pricing</span>
          <span>Docs</span>
        </span>
      </div>
      <div className={cn("flex flex-1 flex-col justify-end gap-1.5 rounded-xl p-4", tint)}>
        <p className="text-balance font-semibold text-base text-foreground">{tab.headline ?? tab.title}</p>
        <div className="h-1.5 w-2/3 rounded-full bg-current opacity-25" />
        <div className="h-1.5 w-1/2 rounded-full bg-current opacity-25" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div className="h-8 rounded-lg bg-muted" key={i} />
        ))}
      </div>
    </div>
  );
}
