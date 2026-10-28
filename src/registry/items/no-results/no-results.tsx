"use client";

import { FileSpreadsheetIcon, FileTextIcon, ListFilterIcon, type LucideIcon, PencilRulerIcon, SearchIcon, SearchXIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Menu, MenuCheckboxItem, MenuGroup, MenuGroupLabel, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { cn } from "@/lib/utils";

export interface SearchItem {
  id: string;
  title: string;
  kind: string;
  owner: string;
  updated: string;
  days: number;
  tags?: string[];
}

export interface SearchFilter {
  id: string;
  label: string;
  test: (item: SearchItem) => boolean;
}

export interface NoResultsProps {
  items?: SearchItem[];
  filters?: SearchFilter[];
  defaultQuery?: string;
  defaultFilters?: string[];
  popular?: string[];
  placeholder?: string;
  kindIcons?: Record<string, LucideIcon>;
  onSelect?: (item: SearchItem) => void;
  className?: string;
}

const defaultIcons: Record<string, LucideIcon> = {
  Doc: FileTextIcon,
  Spec: PencilRulerIcon,
  Sheet: FileSpreadsheetIcon,
};

const ease = [0.23, 1, 0.32, 1] as const;
const spring = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 } as const;

function words(text: string) {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

function matches(item: SearchItem, tokens: string[]) {
  const vocab = words(`${item.title} ${item.tags?.join(" ") ?? ""}`);
  return tokens.every((t) => vocab.some((w) => w.startsWith(t)));
}

function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  if (!tokens.length) return <>{text}</>;
  const pattern = new RegExp(`\\b(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 ? (
          <mark className="rounded-xs bg-warning/24 text-foreground" key={`${part}-${i}`}>
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function NoResults({
  items = [],
  filters = [],
  defaultQuery = "",
  defaultFilters = [],
  popular = [],
  placeholder = "Search docs, specs and sheets",
  kindIcons = defaultIcons,
  onSelect,
  className,
}: NoResultsProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const [query, setQueryState] = useState(defaultQuery);
  const [springy, setSpringy] = useState(false);
  const [active, setActive] = useState<string[]>(defaultFilters);

  const tokens = useMemo(() => words(query), [query]);
  const applied = filters.filter((f) => active.includes(f.id));
  const byQuery = items.filter((item) => matches(item, tokens));
  const results = byQuery.filter((item) => applied.every((f) => f.test(item)));

  const suggestion = useMemo(() => {
    if (!tokens.length || byQuery.length) return null;
    const vocab = [...new Set(items.flatMap((i) => words(`${i.title} ${i.tags?.join(" ") ?? ""}`)))];
    let changed = false;
    const fixed = tokens.map((t) => {
      if (vocab.some((w) => w.startsWith(t))) return t;
      const limit = t.length <= 4 ? 1 : 2;
      let best: string | null = null;
      let bestScore = limit + 1;
      for (const w of vocab) {
        const d = distance(t, w);
        if (d < bestScore) {
          best = w;
          bestScore = d;
        }
      }
      if (best) changed = true;
      return best ?? t;
    });
    const candidate = fixed.join(" ");
    return changed && items.some((i) => matches(i, fixed)) ? candidate : null;
  }, [tokens, byQuery.length, items]);

  const unblock = useMemo(() => {
    if (results.length || !byQuery.length) return null;
    return applied
      .map((f) => ({
        filter: f,
        count: byQuery.filter((item) => applied.every((g) => g.id === f.id || g.test(item))).length,
      }))
      .sort((a, b) => b.count - a.count)[0];
  }, [results.length, byQuery, applied]);

  const type = (next: string) => {
    setSpringy(false);
    setQueryState(next);
  };
  const jump = (next: string) => {
    setSpringy(true);
    setQueryState(next);
  };
  const toggle = (id: string, on: boolean) => {
    setSpringy(true);
    setActive((list) => (on ? [...list, id] : list.filter((x) => x !== id)));
  };
  const clearAll = () => {
    jump("");
    setActive([]);
  };
  const empty = results.length === 0;
  const settle = !springy || reduce;
  const swap = { duration: settle ? 0.1 : 0.18, ease };
  const hidden = byQuery.length - results.length;

  return (
    <div className={cn("w-full max-w-136 overflow-hidden rounded-2xl border bg-card text-foreground shadow-xs/5", className)}>
      <div className="flex flex-col gap-2.5 p-3">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            aria-controls={`${uid}-results`}
            aria-label="Search"
            onChange={(e) => type(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.preventDefault();
                type("");
              }
            }}
            placeholder={placeholder}
            type="search"
            value={query}
          />
          {query && (
            <InputGroupAddon align="inline-end">
              <Button aria-label="Clear search" onClick={() => type("")} size="icon-xs" variant="ghost">
                <XIcon />
              </Button>
            </InputGroupAddon>
          )}
        </InputGroup>

        <div className="flex min-h-7 flex-wrap items-center gap-1.5">
          <Menu>
            <MenuTrigger render={<Button className="text-muted-foreground" size="xs" variant="ghost" />}>
              <ListFilterIcon />
              Filter
            </MenuTrigger>
            <MenuPopup align="start" className="min-w-52">
              <MenuGroup>
                <MenuGroupLabel>Narrow results</MenuGroupLabel>
                {filters.map((f) => (
                  <MenuCheckboxItem checked={active.includes(f.id)} key={f.id} onCheckedChange={(on) => toggle(f.id, on)}>
                    {f.label}
                  </MenuCheckboxItem>
                ))}
              </MenuGroup>
            </MenuPopup>
          </Menu>
          <AnimatePresence initial={false} mode="popLayout">
            {applied.map((f) => (
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex h-7 items-center gap-1 rounded-full border bg-background ps-2.5 pe-1 text-xs shadow-xs/5 sm:h-6"
                exit={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
                key={f.id}
                layout={reduce ? false : "position"}
                transition={spring}
              >
                {f.label}
                <button
                  aria-label={`Remove filter ${f.label}`}
                  className="relative flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors after:absolute after:-inset-1.5 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:size-4"
                  onClick={() => toggle(f.id, false)}
                  type="button"
                >
                  <XIcon aria-hidden className="size-3" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          {(applied.length > 0 || query) && (
            <motion.span layout={reduce ? false : "position"} transition={spring}>
              <Button className="text-muted-foreground" onClick={clearAll} size="xs" variant="ghost">
                Clear all
              </Button>
            </motion.span>
          )}
        </div>
      </div>

      <div className="relative grid h-88 border-t" id={`${uid}-results`}>
        <AnimatePresence initial={false}>
          {empty ? (
            <motion.div
              animate={{ opacity: 1 }}
              className="col-start-1 row-start-1 flex flex-col items-center justify-center overflow-y-auto px-6 py-6 text-center"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="empty"
              transition={swap}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-card shadow-xs/5">
                <SearchXIcon aria-hidden className="size-5" />
              </div>
              <h3 className="mt-4 max-w-full text-balance font-semibold text-base" role="status">
                {query ? (
                  <>
                    No results for <span className="break-words">&ldquo;{query.trim()}&rdquo;</span>
                  </>
                ) : (
                  "Nothing matches these filters"
                )}
              </h3>
              <p className="mt-1 max-w-88 text-pretty text-muted-foreground text-sm">
                {suggestion ? (
                  <>
                    Did you mean{" "}
                    <button
                      className="rounded-xs font-medium text-foreground underline decoration-foreground/30 underline-offset-4 outline-none transition-colors hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => jump(suggestion)}
                      type="button"
                    >
                      {suggestion}
                    </button>
                    ?
                  </>
                ) : unblock ? (
                  <>
                    {hidden === 1 ? "1 match is" : `${hidden} matches are`} hidden by your filters.
                  </>
                ) : (
                  "Check the spelling, or try a broader word."
                )}
              </p>
              {unblock && (
                <Button className="mt-3 active:scale-[0.97]" onClick={() => toggle(unblock.filter.id, false)} size="sm" variant="outline">
                  <XIcon />
                  Remove &ldquo;{unblock.filter.label}&rdquo;
                </Button>
              )}
              {popular.length > 0 && (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <span className="text-muted-foreground text-xs">Popular searches</span>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {popular.map((term) => (
                      <button
                        className="inline-flex h-7 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs outline-none transition-[background-color,scale] duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] sm:h-6"
                        key={term}
                        onClick={() => {
                          jump(term);
                          setActive([]);
                        }}
                        type="button"
                      >
                        <SearchIcon aria-hidden className="size-3 text-muted-foreground" />
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.ul
              animate={{ opacity: 1 }}
              aria-label="Results"
              className="col-start-1 row-start-1 flex flex-col gap-0.5 overflow-y-auto p-1.5"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="list"
              transition={swap}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {results.map((item, i) => {
                  const Icon = kindIcons[item.kind] ?? FileTextIcon;
                  return (
                    <motion.li
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={settle ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                      initial={settle ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
                      key={item.id}
                      layout={settle ? false : "position"}
                      transition={settle ? { duration: 0.1, ease } : { ...spring, delay: Math.min(i, 6) * 0.03 }}
                    >
                      <button
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => onSelect?.(item)}
                        type="button"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
                          <Icon aria-hidden className="size-4" />
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-sm">
                            <Highlight text={item.title} tokens={tokens} />
                          </span>
                          <span className="truncate text-muted-foreground text-xs">
                            {item.kind} · {item.owner} · {item.updated}
                          </span>
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <div className="flex h-9 items-center justify-between gap-3 border-t px-3 text-muted-foreground text-xs">
        <span aria-live="polite" className="tabular-nums">
          {results.length === 1 ? "1 result" : `${results.length} results`}
          {hidden > 0 && ` · ${hidden} hidden by filters`}
        </span>
        <span className="hidden sm:inline">Esc clears the search</span>
      </div>
    </div>
  );
}
