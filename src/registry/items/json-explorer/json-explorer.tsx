"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  ChevronUpIcon,
  CopyIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface JsonExplorerProps {
  data: JsonValue;
  rootName?: string;
  defaultDepth?: number;
  defaultExpanded?: string[];
  title?: string;
  onCopyPath?: (path: string) => void;
  className?: string;
}

type Kind = "object" | "array" | "string" | "number" | "boolean" | "null";

interface Node {
  id: string;
  key: string | number | null;
  path: string;
  depth: number;
  kind: Kind;
  value: JsonValue;
  parent: string | null;
  children: Node[];
}

const ROW = 28;
const INDENT = 16;

const kindOf = (v: JsonValue): Kind =>
  v === null ? "null" : Array.isArray(v) ? "array" : typeof v === "object" ? "object" : (typeof v as Kind);

const ident = /^[A-Za-z_$][\w$]*$/;

function build(value: JsonValue, rootName: string): Node {
  const make = (v: JsonValue, key: string | number | null, path: string, depth: number, parent: string | null): Node => {
    const kind = kindOf(v);
    const node: Node = { id: path, key, path, depth, kind, value: v, parent, children: [] };
    if (kind === "array") {
      node.children = (v as JsonValue[]).map((c, i) => make(c, i, `${path}[${i}]`, depth + 1, path));
    } else if (kind === "object") {
      node.children = Object.entries(v as Record<string, JsonValue>).map(([k, c]) =>
        make(c, k, ident.test(k) ? `${path}.${k}` : `${path}[${JSON.stringify(k)}]`, depth + 1, path),
      );
    }
    return node;
  };
  return make(value, null, rootName, 0, null);
}

function walk(node: Node, fn: (n: Node) => void) {
  fn(node);
  for (const c of node.children) walk(c, fn);
}

const isContainer = (n: Node) => n.kind === "object" || n.kind === "array";

const tone: Record<Kind, string> = {
  string: "text-emerald-700 dark:text-emerald-400",
  number: "text-amber-700 dark:text-amber-300",
  boolean: "text-violet-700 dark:text-violet-400",
  null: "text-rose-700 dark:text-rose-400 italic",
  object: "text-muted-foreground",
  array: "text-muted-foreground",
};

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const out: ReactNode[] = [];
  const lower = text.toLowerCase();
  let at = 0;
  let hit = lower.indexOf(query, at);
  while (hit !== -1) {
    if (hit > at) out.push(text.slice(at, hit));
    out.push(
      <mark className="rounded-[calc(var(--radius)*0.3)] bg-warning/30 text-inherit dark:bg-warning/35" key={hit}>
        {text.slice(hit, hit + query.length)}
      </mark>,
    );
    at = hit + query.length;
    hit = lower.indexOf(query, at);
  }
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}

function primitiveText(n: Node) {
  return n.kind === "string" ? JSON.stringify(n.value) : String(n.value);
}

function preview(n: Node) {
  if (n.kind === "array") {
    const items = n.children.slice(0, 3).map((c) => (isContainer(c) ? (c.kind === "array" ? "[…]" : "{…}") : primitiveText(c)));
    return `[${items.join(", ")}${n.children.length > 3 ? ", …" : ""}]`;
  }
  const keys = n.children.slice(0, 3).map((c) => String(c.key));
  return `{${keys.join(", ")}${n.children.length > 3 ? ", …" : ""}}`;
}

function useCopied() {
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 1400);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
    setCopied(text);
  };
  return [copied, copy] as const;
}

function SwapIcon({ done }: { done: boolean }) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        animate={{ opacity: 1, scale: 1 }}
        className={cn("grid place-items-center", done && "text-success-foreground")}
        exit={{ opacity: 0, scale: 0.6 }}
        initial={{ opacity: 0, scale: 0.6 }}
        key={done ? "y" : "n"}
        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
      >
        {done ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      </motion.span>
    </AnimatePresence>
  );
}

const iconBtn =
  "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-[color,background-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground";

export function JsonExplorer({
  data,
  rootName = "data",
  defaultDepth = 1,
  defaultExpanded = [],
  title,
  onCopyPath,
  className,
}: JsonExplorerProps) {
  const reduce = useReducedMotion();
  const root = useMemo(() => build(data, rootName), [data, rootName]);
  const index = useMemo(() => {
    const map = new Map<string, Node>();
    walk(root, (n) => map.set(n.id, n));
    return map;
  }, [root]);

  const [expanded, setExpanded] = useState(() => {
    const set = new Set<string>(defaultExpanded);
    walk(root, (n) => isContainer(n) && n.depth < defaultDepth && set.add(n.id));
    return set;
  });
  const [selected, setSelected] = useState<string>(root.id);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [copied, copy] = useCopied();
  const saved = useRef<Set<string> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!q) return [] as string[];
    const out: string[] = [];
    walk(root, (n) => {
      if (n === root) return;
      const keyHit = n.key !== null && String(n.key).toLowerCase().includes(q);
      const valueHit = !isContainer(n) && primitiveText(n).toLowerCase().includes(q);
      if (keyHit || valueHit) out.push(n.id);
    });
    return out;
  }, [q, root]);
  const matchSet = useMemo(() => new Set(matches), [matches]);
  const activeId = matches[Math.min(active, matches.length - 1)];

  useEffect(() => {
    if (!q) {
      if (saved.current) {
        setExpanded(saved.current);
        saved.current = null;
      }
      return;
    }
    setExpanded((prev) => {
      if (!saved.current) saved.current = prev;
      const next = new Set<string>([root.id]);
      for (const id of matches) {
        let p = index.get(id)?.parent;
        while (p) {
          next.add(p);
          p = index.get(p)?.parent ?? null;
        }
      }
      return next;
    });
    setActive(0);
  }, [q, matches, index, root.id]);

  const rows = useMemo(() => {
    const out: Node[] = [];
    const visit = (n: Node) => {
      out.push(n);
      if (isContainer(n) && expanded.has(n.id)) n.children.forEach(visit);
    };
    visit(root);
    return out;
  }, [root, expanded]);

  const scrollTo = (id: string) => {
    const list = listRef.current;
    const i = rows.findIndex((r) => r.id === id);
    if (!list || i < 0) return;
    const top = i * ROW;
    if (top < list.scrollTop) list.scrollTop = top - ROW;
    else if (top + ROW > list.scrollTop + list.clientHeight) list.scrollTop = top + 2 * ROW - list.clientHeight;
  };

  useEffect(() => {
    if (activeId) {
      setSelected(activeId);
      requestAnimationFrame(() => scrollTo(activeId));
    }
  }, [activeId, rows.length]);

  const toggle = (id: string, open?: boolean) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open ?? !next.has(id)) next.add(id);
      else next.delete(id);
      return next;
    });

  const focusRow = (id: string) => {
    setSelected(id);
    scrollTo(id);
    requestAnimationFrame(() => rowRefs.current.get(id)?.focus());
  };

  const copyPath = (path: string) => {
    copy(path);
    onCopyPath?.(path);
  };

  const onKey = (e: KeyboardEvent, n: Node) => {
    const i = rows.findIndex((r) => r.id === n.id);
    if (e.key === "ArrowDown" && rows[i + 1]) focusRow(rows[i + 1].id);
    else if (e.key === "ArrowUp" && rows[i - 1]) focusRow(rows[i - 1].id);
    else if (e.key === "ArrowRight" && isContainer(n)) {
      if (!expanded.has(n.id)) toggle(n.id, true);
      else if (n.children[0]) focusRow(n.children[0].id);
    } else if (e.key === "ArrowLeft") {
      if (isContainer(n) && expanded.has(n.id)) toggle(n.id, false);
      else if (n.parent) focusRow(n.parent);
    } else if ((e.key === "Enter" || e.key === " ") && isContainer(n)) toggle(n.id);
    else if (e.key === "c" && (e.metaKey || e.ctrlKey) && !window.getSelection()?.toString()) copyPath(n.path);
    else return;
    e.preventDefault();
  };

  const step = (dir: 1 | -1) => {
    if (!matches.length) return;
    setActive((a) => (a + dir + matches.length) % matches.length);
  };

  const allIds = useMemo(() => {
    const ids: string[] = [];
    walk(root, (n) => isContainer(n) && ids.push(n.id));
    return ids;
  }, [root]);
  const allOpen = allIds.every((id) => expanded.has(id));
  const sel = index.get(selected) ?? root;
  const count = root.children.length;

  return (
    <TooltipProvider delay={500}>
      <div className={cn("flex w-full min-w-0 max-w-[460px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5", className)}>
        <div className="flex items-center gap-1 border-b p-2">
          <InputGroup className="h-8 min-w-0 flex-1">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search keys and values"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "ArrowDown") {
                  e.preventDefault();
                  step(e.shiftKey ? -1 : 1);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  step(-1);
                } else if (e.key === "Escape") setQuery("");
              }}
              placeholder={title ? `Search ${title}` : "Search keys and values"}
              size="sm"
              value={query}
            />
            {q && (
              <InputGroupAddon align="inline-end">
                <span
                  aria-live="polite"
                  className={cn("font-mono text-xs tabular-nums", matches.length ? "text-muted-foreground" : "text-destructive-foreground")}
                >
                  {matches.length ? `${Math.min(active, matches.length - 1) + 1}/${matches.length}` : "0/0"}
                </span>
                <button aria-label="Clear search" className={cn(iconBtn, "size-6 rounded-md")} onClick={() => setQuery("")} type="button">
                  <XIcon className="size-3.5" />
                </button>
              </InputGroupAddon>
            )}
          </InputGroup>
          <div className="flex items-center">
            <button aria-label="Previous match" className={iconBtn} disabled={!matches.length} onClick={() => step(-1)} type="button">
              <ChevronUpIcon className="size-4" />
            </button>
            <button aria-label="Next match" className={iconBtn} disabled={!matches.length} onClick={() => step(1)} type="button">
              <ChevronDownIcon className="size-4" />
            </button>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    aria-label={allOpen ? "Collapse all" : "Expand all"}
                    className={iconBtn}
                    onClick={() => setExpanded(allOpen ? new Set([root.id]) : new Set(allIds))}
                    type="button"
                  />
                }
              >
                {allOpen ? <ChevronsDownUpIcon className="size-4" /> : <ChevronsUpDownIcon className="size-4" />}
              </TooltipTrigger>
              <TooltipPopup>{allOpen ? "Collapse all" : "Expand all"}</TooltipPopup>
            </Tooltip>
          </div>
        </div>

        <div
          aria-label={title ?? "JSON"}
          className="relative h-[336px] overflow-auto py-1.5 font-mono text-[12.5px] [scrollbar-width:thin]"
          ref={listRef}
          role="tree"
        >
          {!(q && !matches.length) && rows.map((n) => {
            const open = expanded.has(n.id);
            const container = isContainer(n);
            const isSel = n.id === selected;
            const isActive = n.id === activeId;
            const hit = matchSet.has(n.id);
            const isRoot = n === root;
            return (
              <motion.div
                animate={{ opacity: q && !hit && !container ? 0.55 : 1 }}
                aria-expanded={container ? open : undefined}
                aria-level={n.depth + 1}
                aria-selected={isSel}
                className={cn(
                  "group/row relative flex h-7 cursor-default items-center gap-1 pe-1.5 outline-none",
                  isSel ? "bg-accent" : "[@media(hover:hover)]:hover:bg-accent/50",
                  isActive && "bg-warning/10 shadow-[inset_2px_0_0_var(--color-warning)]",
                  "focus-visible:shadow-[inset_0_0_0_2px_var(--color-ring)]",
                )}
                initial={false}
                key={n.id}
                onClick={() => {
                  setSelected(n.id);
                  if (container) toggle(n.id);
                }}
                onKeyDown={(e) => onKey(e, n)}
                ref={(el: HTMLDivElement | null) => {
                  if (el) rowRefs.current.set(n.id, el);
                  else rowRefs.current.delete(n.id);
                }}
                role="treeitem"
                style={{ paddingInlineStart: 8 + n.depth * INDENT }}
                tabIndex={isSel ? 0 : -1}
                transition={{ duration: 0.15 }}
              >
                {Array.from({ length: n.depth }, (_, d) => (
                  <span aria-hidden className="absolute inset-y-0 w-px bg-border" key={d} style={{ left: 8 + d * INDENT + 7 }} />
                ))}
                <span className="grid size-4 shrink-0 place-items-center text-muted-foreground">
                  {container && (
                    <motion.span
                      animate={{ rotate: open ? 90 : 0 }}
                      className="grid place-items-center"
                      transition={reduce ? { duration: 0 } : { duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                    >
                      <ChevronRightIcon className="size-3.5" />
                    </motion.span>
                  )}
                </span>
                {isRoot ? (
                  <span className="shrink-0 text-foreground">{rootName}</span>
                ) : (
                  <span className="shrink-0">
                    <span className={typeof n.key === "number" ? "text-muted-foreground" : "text-sky-700 dark:text-sky-300"}>
                      <Highlight query={q} text={String(n.key)} />
                    </span>
                    <span className="text-muted-foreground">:</span>
                  </span>
                )}
                {container ? (
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    {!open && <span className="truncate text-muted-foreground">{preview(n)}</span>}
                    <span className="shrink-0 rounded-full bg-muted px-1.5 font-sans text-[10.5px] text-muted-foreground tabular-nums leading-4">
                      {n.children.length} {n.kind === "array" ? (n.children.length === 1 ? "item" : "items") : n.children.length === 1 ? "key" : "keys"}
                    </span>
                  </span>
                ) : (
                  <span className={cn("min-w-0 flex-1 truncate", tone[n.kind])}>
                    <Highlight query={q} text={primitiveText(n)} />
                  </span>
                )}
                <button
                  aria-label={`Copy path ${n.path}`}
                  className={cn(
                    iconBtn,
                    "size-6 rounded-md opacity-0 focus-visible:opacity-100 group-focus-within/row:opacity-100 [@media(hover:hover)]:group-hover/row:opacity-100",
                    (isSel || copied === n.path) && "opacity-100",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    copyPath(n.path);
                  }}
                  tabIndex={-1}
                  type="button"
                >
                  <SwapIcon done={copied === n.path} />
                </button>
              </motion.div>
            );
          })}
          {q && !matches.length && (
            <div className="absolute inset-x-0 top-28 px-6 text-center font-sans">
              <p className="font-medium text-sm">Nothing matches “{query.trim()}”</p>
              <p className="mt-1 text-muted-foreground text-xs">Keys and values are searched, case-insensitive.</p>
            </div>
          )}
        </div>

        <div className="flex h-10 items-center gap-2 border-t ps-3 pe-1.5">
          <span
            className={cn(
              "shrink-0 rounded-md px-1.5 font-medium text-[10.5px] uppercase leading-5 tracking-wide",
              sel.kind === "string" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              sel.kind === "number" && "bg-amber-500/10 text-amber-700 dark:text-amber-300",
              sel.kind === "boolean" && "bg-violet-500/10 text-violet-700 dark:text-violet-400",
              sel.kind === "null" && "bg-rose-500/10 text-rose-700 dark:text-rose-400",
              isContainer(sel) && "bg-muted text-muted-foreground",
            )}
          >
            {sel.kind}
          </span>
          <code className="min-w-0 flex-1 truncate font-mono text-xs" title={sel.path}>
            {sel === root ? (
              <span className="text-muted-foreground">
                {rootName} · {count} {root.kind === "array" ? "items" : "keys"}
              </span>
            ) : (
              sel.path
            )}
          </code>
          <button
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-muted-foreground text-xs outline-none transition-[color,background-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground"
            onClick={() => copyPath(sel.path)}
            type="button"
          >
            <SwapIcon done={copied === sel.path} />
            <span className="w-16 text-start">{copied === sel.path ? "Copied" : "Copy path"}</span>
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
}
