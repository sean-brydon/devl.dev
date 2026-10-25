"use client";

import { ChevronDownIcon, ListFilterIcon, SearchIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type ReactNode, useId, useMemo, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface FacetOption {
  value: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export interface FacetGroup {
  id: string;
  label: string;
  options: FacetOption[];
  defaultOpen?: boolean;
}

export type FacetValue = Record<string, string[]>;

export interface FacetsProps {
  groups: FacetGroup[];
  value?: FacetValue;
  defaultValue?: FacetValue;
  onValueChange?: (value: FacetValue) => void;
  summary?: (value: FacetValue) => ReactNode;
  className?: string;
}

export function Facets({ groups, value: valueProp, defaultValue = {}, onValueChange, summary, className }: FacetsProps) {
  const [inner, setInner] = useState<FacetValue>(defaultValue);
  const value = valueProp ?? inner;
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g, i) => [g.id, g.defaultOpen ?? i === 0])),
  );
  const [query, setQuery] = useState("");
  const reduce = useReducedMotion();
  const baseId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const commit = (next: FacetValue) => {
    if (valueProp === undefined) setInner(next);
    onValueChange?.(next);
  };

  const toggle = (group: string, option: string, on: boolean) => {
    const current = value[group] ?? [];
    commit({ ...value, [group]: on ? [...current, option] : current.filter((v) => v !== option) });
  };

  const chips = groups.flatMap((g) =>
    (value[g.id] ?? []).map((v) => ({ group: g, option: g.options.find((o) => o.value === v) })),
  );
  const total = chips.length;

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      groups
        .map((g) => ({ ...g, options: q ? g.options.filter((o) => o.label.toLowerCase().includes(q)) : g.options }))
        .filter((g) => g.options.length > 0),
    [groups, q],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const rows = [...(panelRef.current?.querySelectorAll<HTMLElement>("[data-filter-row]") ?? [])];
    const index = rows.indexOf(document.activeElement as HTMLElement);
    if (index === -1 && event.key !== "ArrowDown") return;
    event.preventDefault();
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? rows.length - 1 : event.key === "ArrowDown" ? Math.min(index + 1, rows.length - 1) : Math.max(index - 1, 0);
    rows[next]?.focus();
  };

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 34 };

  return (
    <div className={cn("grid w-full max-w-sm gap-3", className)}>
      <div className="flex min-h-8 flex-wrap items-center gap-1.5">
        <span className="me-1 inline-flex items-center gap-1.5 font-medium text-sm">
          <ListFilterIcon className="size-4 text-muted-foreground" />
          Filters
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[11px] tabular-nums",
                total ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
              exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.1 } }}
              initial={reduce ? false : { scale: 0.8, opacity: 0 }}
              key={total}
              transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            >
              {total}
            </motion.span>
          </AnimatePresence>
        </span>
        <AnimatePresence initial={false} mode="popLayout">
          {chips.map(({ group, option }) =>
            option ? (
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex h-7 items-center gap-1 rounded-full border bg-card ps-2.5 pe-1 text-xs shadow-xs/5"
                exit={{ opacity: 0, scale: 0.7 }}
                initial={reduce ? false : { opacity: 0, scale: 0.7 }}
                key={`${group.id}:${option.value}`}
                layout={!reduce}
                transition={spring}
              >
                <span className="text-muted-foreground">{group.label}:</span>
                <span className="font-medium">{option.label}</span>
                <button
                  aria-label={`Remove ${group.label} ${option.label}`}
                  className="relative ms-0.5 flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none after:absolute after:-inset-1.5 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => toggle(group.id, option.value, false)}
                  type="button"
                >
                  <XIcon className="size-3" />
                </button>
              </motion.span>
            ) : null,
          )}
          {total > 0 && (
            <motion.button
              animate={{ opacity: 1 }}
              className="h-7 cursor-pointer rounded-full px-2 font-medium text-muted-foreground text-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="clear"
              layout={!reduce}
              onClick={() => commit({})}
              transition={spring}
              type="button"
            >
              Clear all
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      {summary && <div className="-mt-1 text-muted-foreground text-xs">{summary(value)}</div>}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-xs/5" onKeyDown={onKeyDown} ref={panelRef}>
        <label className="flex items-center gap-2 border-b px-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            aria-label="Search filters"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/72"
            data-filter-row
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search filters…"
            value={query}
          />
        </label>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {visible.length === 0 && <p className="px-3 py-6 text-center text-muted-foreground text-sm">No filters match “{query}”.</p>}
          {visible.map((group) => {
            const expanded = q ? true : open[group.id];
            const selected = value[group.id]?.length ?? 0;
            const panelId = `${baseId}-${group.id}`;
            return (
              <div className="not-first:mt-0.5" key={group.id}>
                <button
                  aria-controls={panelId}
                  aria-expanded={expanded}
                  className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-start font-medium text-sm outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  data-filter-row
                  onClick={() => setOpen((o) => ({ ...o, [group.id]: !expanded }))}
                  type="button"
                >
                  <motion.span animate={{ rotate: expanded ? 0 : -90 }} className="flex text-muted-foreground" transition={spring}>
                    <ChevronDownIcon className="size-4" />
                  </motion.span>
                  <span className="flex-1">{group.label}</span>
                  {selected > 0 && (
                    <span className="rounded-full bg-accent px-1.5 font-mono text-[11px] text-muted-foreground tabular-nums">
                      {selected}
                    </span>
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      animate={{ height: "auto", opacity: 1 }}
                      className="overflow-hidden"
                      exit={{ height: 0, opacity: 0 }}
                      id={panelId}
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      role="group"
                      aria-label={group.label}
                      transition={spring}
                    >
                      <div className="grid gap-px pb-1 ps-6">
                        {group.options.map((option) => {
                          const checked = value[group.id]?.includes(option.value) ?? false;
                          return (
                            <label
                              className="flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm hover:bg-accent has-focus-visible:bg-accent"
                              key={option.value}
                            >
                              <Checkbox
                                checked={checked}
                                data-filter-row
                                onCheckedChange={(on) => toggle(group.id, option.value, on)}
                              />
                              {option.icon && <span className="flex shrink-0">{option.icon}</span>}
                              <span className={cn("flex-1 truncate", checked && "font-medium")}>{option.label}</span>
                              {option.count !== undefined && (
                                <span className="text-muted-foreground text-xs tabular-nums">{option.count}</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
