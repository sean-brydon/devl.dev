"use client";

import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  CornerDownLeftIcon,
  type LucideIcon,
  PlugIcon,
  RefreshCwIcon,
  SearchIcon,
  SearchXIcon,
  Settings2Icon,
  UnplugIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export type ConnectorTone = "orange" | "teal" | "violet" | "rose" | "info" | "success" | "warning";

export interface ConnectorConnection {
  account: string;
  connectedBy: string;
  connectedAt: string;
  scopes: string[];
  lastSync: string;
  records: number;
  history: number[];
  health: "healthy" | "degraded";
}

export interface Connector {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: LucideIcon;
  tone?: ConnectorTone;
  connection?: ConnectorConnection;
  permissions?: string[];
  auth?: string;
  direction?: "One-way" | "Two-way";
}

export interface ConnectorSearchProps {
  connectors: Connector[];
  defaultOpenId?: string;
  onConnect?: (id: string) => void;
  onDisconnect?: (id: string) => void;
  onOpenSettings?: (id: string) => void;
  className?: string;
}

const press = "transition-[scale,box-shadow,background-color] duration-150 ease-out active:scale-[0.97]";

const toneClass: Record<ConnectorTone, string> = {
  orange: "bg-orange-500 text-white",
  teal: "bg-teal-600 text-white",
  violet: "bg-violet-500 text-white",
  rose: "bg-rose-500 text-white",
  info: "bg-info text-white",
  success: "bg-success text-white",
  warning: "bg-warning text-black/80",
};

function ServiceIcon({ item, size = "sm" }: { item: Connector; size?: "sm" | "lg" }) {
  const Icon = item.icon;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center shadow-xs/5",
        toneClass[item.tone ?? "info"],
        size === "sm" ? "size-7 rounded-lg" : "size-10 rounded-xl",
      )}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-5"} strokeWidth={2.25} />
    </span>
  );
}

function SyncBars({ values, reduce }: { values: number[]; reduce: boolean | null }) {
  const max = Math.max(...values, 1);
  return (
    <svg aria-hidden className="h-7 w-full" preserveAspectRatio="none" viewBox={`0 0 ${values.length * 6} 28`}>
      {values.map((v, i) => {
        const h = Math.max(2, (v / max) * 26);
        return (
          <motion.rect
            animate={{ height: h, y: 28 - h }}
            className={i === values.length - 1 ? "fill-foreground" : "fill-foreground/20"}
            initial={reduce ? false : { height: 0, y: 28 }}
            key={i}
            rx={1}
            transition={{ type: "spring", stiffness: 260, damping: 26, delay: reduce ? 0 : i * 0.02 }}
            width={4}
            x={i * 6 + 1}
          />
        );
      })}
    </svg>
  );
}

function Tile({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-3 dark:bg-input/16", className)}>
      <p className="font-medium text-muted-foreground text-xs">{label}</p>
      {children}
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">{k}</span>
      <span className={cn("truncate text-right font-medium", mono && "font-mono tabular-nums")}>{v}</span>
    </div>
  );
}

function useThemeRadius(scale: number) {
  const probe = useRef<HTMLSpanElement>(null);
  const [radius, setRadius] = useState(scale * 10);
  useLayoutEffect(() => {
    const el = probe.current;
    if (!el) return;
    const read = () => setRadius(el.offsetWidth);
    read();
    const observer = new ResizeObserver(read);
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

export function ConnectorSearch({
  connectors,
  defaultOpenId,
  onConnect,
  onDisconnect,
  onOpenSettings,
  className,
}: ConnectorSearchProps) {
  const [radius, radiusProbe] = useThemeRadius(1.6);
  const reduce = useReducedMotion();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(connectors);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [openId, setOpenId] = useState<string | undefined>(defaultOpenId);
  const [connecting, setConnecting] = useState<string | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of pending) clearTimeout(t);
    };
  }, []);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hits = items.filter((i) =>
      q ? `${i.name} ${i.category} ${i.description}`.toLowerCase().includes(q) : true,
    );
    return [
      { label: "Connected", items: hits.filter((i) => i.connection) },
      { label: "Available", items: hits.filter((i) => !i.connection) },
    ].filter((g) => g.items.length);
  }, [items, query]);
  const flat = groups.flatMap((g) => g.items);
  const activeIndex = Math.min(active, Math.max(flat.length - 1, 0));
  const open = items.find((i) => i.id === openId);
  const listRef = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(false);
  const measureEnd = () => {
    const el = listRef.current;
    if (el) setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
  };
  useEffect(measureEnd, [query, openId, items]);
  const activeId = flat[activeIndex]?.id;

  useEffect(() => {
    if (!activeId || openId) return;
    document.getElementById(`${listId}-${activeId}`)?.scrollIntoView({ block: "nearest" });
  }, [activeId, listId, openId]);

  const openItem = (id: string) => {
    setOpenId(id);
    requestAnimationFrame(() => detailRef.current?.focus());
  };
  const back = () => {
    setOpenId(undefined);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const connect = (id: string) => {
    setConnecting(id);
    later(() => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                connection: {
                  account: "northwind-ops",
                  connectedBy: "You",
                  connectedAt: "Just now",
                  scopes: (i.permissions ?? ["read"]).slice(0, 3),
                  lastSync: "Syncing…",
                  records: 0,
                  history: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                  health: "healthy",
                },
              }
            : i,
        ),
      );
      setConnecting(null);
      onConnect?.(id);
      requestAnimationFrame(() => detailRef.current?.focus());
      later(() => {
        setItems((prev) =>
          prev.map((i) =>
            i.id === id && i.connection
              ? {
                  ...i,
                  connection: {
                    ...i.connection,
                    lastSync: "Just now",
                    records: 214,
                    history: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 214],
                  },
                }
              : i,
          ),
        );
      }, 1600);
    }, 1100);
  };

  const [syncing, setSyncing] = useState<string | null>(null);
  const syncNow = (id: string) => {
    setSyncing(id);
    later(() => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id && i.connection
            ? {
                ...i,
                connection: {
                  ...i.connection,
                  lastSync: "Just now",
                  health: "healthy",
                  records: i.connection.records + 37,
                  history: [...i.connection.history.slice(1), Math.max(...i.connection.history, 40)],
                },
              }
            : i,
        ),
      );
      setSyncing(null);
      requestAnimationFrame(() => detailRef.current?.focus());
    }, 1200);
  };

  const disconnect = (id: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, permissions: i.permissions ?? i.connection?.scopes, connection: undefined } : i,
      ),
    );
    requestAnimationFrame(() => detailRef.current?.focus());
    onDisconnect?.(id);
  };

  const onListKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (flat.length ? (Math.min(a, flat.length - 1) + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (flat.length ? (Math.min(a, flat.length - 1) - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter" && flat[activeIndex]) {
      e.preventDefault();
      openItem(flat[activeIndex].id);
    } else if (e.key === "Escape" && query) {
      e.preventDefault();
      setQuery("");
    }
  };

  const onDetailKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" || (e.key === "Backspace" && e.target === e.currentTarget)) {
      e.preventDefault();
      back();
    }
  };

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 520, damping: 42 };
  const enter = reduce ? { duration: 0 } : { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const };
  const leave = reduce ? { duration: 0 } : { duration: 0.1, ease: "easeOut" as const };
  const slide = reduce ? 0 : 12;

  return (
    <motion.div
      className={cn(
        "w-full max-w-[440px] overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-xs/5",
        className,
      )}
      layout
      style={{ borderRadius: radius }}
      transition={spring}
    >
      {radiusProbe}
      <motion.div className="flex h-12 items-center gap-2 border-b px-3" layout="position" transition={spring}>
        {open ? (
          <>
            <Button aria-label="Back to connectors" onClick={back} size="icon-sm" variant="ghost">
              <ArrowLeftIcon />
            </Button>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
              <button
                className="-mx-1 shrink-0 cursor-pointer rounded-md px-1 py-1.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                onClick={back}
                type="button"
              >
                Connectors
              </button>
              <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
              <span className="truncate font-medium">{open.name}</span>
            </nav>
          </>
        ) : (
          <>
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <input
              aria-activedescendant={flat[activeIndex] ? `${listId}-${flat[activeIndex].id}` : undefined}
              aria-controls={listId}
              aria-expanded
              aria-label="Search connectors"
              autoComplete="off"
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/72"
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onListKey}
              placeholder="Search connectors…"
              ref={inputRef}
              role="combobox"
              value={query}
            />
            <Badge className="shrink-0" size="sm" variant="outline">
              {items.filter((i) => i.connection).length} connected
            </Badge>
          </>
        )}
      </motion.div>

      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.div
            animate={{ opacity: 1, x: 0, transition: enter }}
            aria-label={`${open.name} details`}
            className="flex flex-col gap-4 p-4 outline-none"
            exit={{ opacity: 0, transition: leave }}
            initial={{ opacity: 0, x: slide }}
            key={`detail-${open.id}`}
            onKeyDown={onDetailKey}
            ref={detailRef}
            role="region"
            tabIndex={-1}
          >
            <div className="flex items-center gap-3">
              <ServiceIcon item={open} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-medium text-sm">{open.name}</h3>
                  <AnimatePresence initial={false} mode="popLayout">
                    {open.connection ? (
                      <motion.span
                        animate={{ opacity: 1, scale: 1 }}
                        initial={{ opacity: 0, scale: 0.95 }}
                        key="on"
                        transition={enter}
                      >
                        <Badge size="sm" variant={open.connection.health === "healthy" ? "success" : "warning"}>
                          {open.connection.health === "healthy" ? "Connected" : "Needs attention"}
                        </Badge>
                      </motion.span>
                    ) : (
                      <motion.span animate={{ opacity: 1 }} initial={{ opacity: 0 }} key="off" transition={enter}>
                        <Badge size="sm" variant="secondary">
                          Not connected
                        </Badge>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <p className="truncate text-muted-foreground text-xs">{open.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
              {open.connection ? (
                <>
                  <Tile label="Connection">
                    <div className="flex flex-col gap-1.5">
                      <Row k="Account" mono v={open.connection.account} />
                      <Row k="By" v={open.connection.connectedBy} />
                      <Row k="Since" v={open.connection.connectedAt} />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {open.connection.scopes.map((s) => (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground" key={s}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </Tile>
                  <Tile label="Sync">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-lg tabular-nums leading-none">
                        {open.connection.records.toLocaleString("en-US")}
                      </span>
                      <span className="text-muted-foreground text-xs">records / 24h</span>
                    </div>
                    <SyncBars reduce={reduce} values={open.connection.history} />
                    <div className="flex items-center gap-1.5 text-xs">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          open.connection.health === "healthy" ? "bg-success" : "bg-warning",
                        )}
                      />
                      <span className="text-muted-foreground">Last sync</span>
                      <span className="ms-auto font-medium tabular-nums">{open.connection.lastSync}</span>
                    </div>
                  </Tile>
                </>
              ) : (
                <>
                  <Tile label="About">
                    <div className="flex flex-col gap-1.5">
                      <Row k="Category" v={open.category} />
                      <Row k="Sign-in" v={open.auth ?? "OAuth"} />
                      <Row k="Sync" v={open.direction ?? "One-way"} />
                    </div>
                    <p className="mt-auto text-muted-foreground text-xs">Takes about a minute. You can disconnect any time.</p>
                  </Tile>
                  <Tile label="It will ask for">
                    <ul className="flex flex-col gap-1.5">
                      {(open.permissions ?? []).map((p) => (
                        <li className="flex items-center gap-1.5 text-xs" key={p}>
                          <CheckIcon className="size-3 shrink-0 text-success" strokeWidth={3} />
                          <span className="truncate font-mono text-[11px]">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </Tile>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {open.connection ? (
                <>
                  <Button className={cn("flex-1", press)} onClick={() => onOpenSettings?.(open.id)} variant="outline">
                    <Settings2Icon />
                    Settings
                  </Button>
                  <Button
                    className={cn("flex-1", press)}
                    loading={syncing === open.id}
                    onClick={() => syncNow(open.id)}
                    variant="outline"
                  >
                    <RefreshCwIcon />
                    Sync now
                  </Button>
                  <Button
                    aria-label={`Disconnect ${open.name}`}
                    className={press}
                    onClick={() => disconnect(open.id)}
                    size="icon"
                    variant="destructive-outline"
                  >
                    <UnplugIcon />
                  </Button>
                </>
              ) : (
                <Button
                  className={cn("flex-1", press)}
                  loading={connecting === open.id}
                  onClick={() => connect(open.id)}
                >
                  <PlugIcon />
                  Connect {open.name}
                </Button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1, x: 0, transition: enter }}
            exit={{ opacity: 0, transition: leave }}
            initial={{ opacity: 0, x: -slide }}
            key="list"
          >
            <div
              aria-label="Connectors"
              className={cn(
                "max-h-[292px] scroll-py-1.5 overflow-y-auto p-1.5 transition-[mask-size]",
                !atEnd && "mask-b-from-[calc(100%-2.5rem)]",
              )}
              id={listId}
              onScroll={measureEnd}
              ref={listRef}
              role="listbox"
            >
              {groups.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <SearchXIcon className="size-5 text-muted-foreground" />
                  <p className="text-sm">No connectors match “{query}”</p>
                  <p className="text-muted-foreground text-xs">Try a category, like “mail” or “storage”.</p>
                </div>
              )}
              {groups.map((g) => (
                <div className="not-first:mt-1.5" key={g.label} role="group" aria-label={g.label}>
                  <p className="px-2 pt-1.5 pb-1 font-medium text-muted-foreground text-xs">{g.label}</p>
                  {g.items.map((item) => {
                    const idx = flat.indexOf(item);
                    const isActive = idx === activeIndex;
                    return (
                      <div
                        aria-selected={isActive}
                        className={cn(
                          "relative flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5",
                          isActive && "bg-accent",
                        )}
                        id={`${listId}-${item.id}`}
                        key={item.id}
                        onClick={() => openItem(item.id)}
                        onMouseMove={() => idx !== activeIndex && setActive(idx)}
                        role="option"
                      >
                        <ServiceIcon item={item} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-sm">{item.name}</span>
                          <span className="block truncate text-muted-foreground text-xs">{item.category}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {item.connection ? (
                            <span className="flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  item.connection.health === "healthy" ? "bg-success" : "bg-warning",
                                )}
                              />
                              {item.connection.lastSync}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">Connect</span>
                          )}
                          <Kbd className={cn(isActive ? "opacity-100" : "opacity-0")}>
                            <CornerDownLeftIcon />
                          </Kbd>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="flex h-10 items-center gap-3 border-t bg-muted/40 px-3 text-muted-foreground text-xs"
        layout="position"
        transition={spring}
      >
        {open ? (
          <span className="flex items-center gap-1.5">
            <Kbd>Esc</Kbd> Back
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> Move
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>
                <CornerDownLeftIcon />
              </Kbd>
              Open
            </span>
          </>
        )}
        <span className="ms-auto tabular-nums">{items.length} services</span>
      </motion.div>
    </motion.div>
  );
}
