"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import {
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

const COLORS = {
  violet: { chip: "bg-violet-500/12 text-violet-700 ring-violet-500/20 dark:text-violet-300", dot: "bg-violet-500" },
  sky: { chip: "bg-sky-500/12 text-sky-700 ring-sky-500/20 dark:text-sky-300", dot: "bg-sky-500" },
  amber: { chip: "bg-amber-500/14 text-amber-800 ring-amber-500/24 dark:text-amber-300", dot: "bg-amber-500" },
  rose: { chip: "bg-rose-500/12 text-rose-700 ring-rose-500/20 dark:text-rose-300", dot: "bg-rose-500" },
  emerald: { chip: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300", dot: "bg-emerald-500" },
  neutral: { chip: "bg-muted text-foreground ring-border", dot: "bg-muted-foreground" },
} as const;

export type TagColor = keyof typeof COLORS;

export interface TagGroup {
  id: string;
  label: string;
  color: TagColor;
  options: string[];
}

export interface Tag {
  value: string;
  group?: string;
}

export interface TagInputProps {
  value?: Tag[];
  defaultValue?: Tag[];
  onValueChange?: (tags: Tag[]) => void;
  groups?: TagGroup[];
  label?: ReactNode;
  placeholder?: string;
  allowCustom?: boolean;
  max?: number;
  className?: string;
}

const normalise = (s: string) => s.trim().replace(/\s+/g, " ");
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function TagInput({
  value: valueProp,
  defaultValue = [],
  onValueChange,
  groups = [],
  label = "Tags",
  placeholder = "Add a tag…",
  allowCustom = true,
  max,
  className,
}: TagInputProps) {
  const [inner, setInner] = useState<Tag[]>(defaultValue);
  const tags = valueProp ?? inner;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [shaking, setShaking] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const id = useId();
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const full = max !== undefined && tags.length >= max;

  const groupOf = (tag: Tag) => groups.find((g) => g.id === tag.group);
  const findOption = (text: string) => {
    for (const g of groups) {
      const hit = g.options.find((o) => same(o, text));
      if (hit) return { value: hit, group: g.id };
    }
    return null;
  };

  const q = normalise(query);
  const sections = useMemo(() => {
    const taken = (o: string) => tags.some((t) => same(t.value, o));
    return groups
      .map((g) => {
        const options = g.options
          .filter((o) => !taken(o) && (!q || o.toLowerCase().includes(q.toLowerCase())))
          .sort((a, b) => Number(!a.toLowerCase().startsWith(q.toLowerCase())) - Number(!b.toLowerCase().startsWith(q.toLowerCase())));
        return { group: g, options };
      })
      .filter((s) => s.options.length);
  }, [groups, tags, q]);

  const exact = q ? findOption(q) : null;
  const canCreate = allowCustom && q.length > 0 && !exact && !tags.some((t) => same(t.value, q));
  const flat = [
    ...sections.flatMap((s) => s.options.map((o) => ({ value: o, group: s.group.id }) as Tag)),
    ...(canCreate ? [{ value: q } as Tag] : []),
  ];
  const showList = open && !full && flat.length > 0;

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);
  useEffect(() => {
    if (!shaking) return;
    const t = window.setTimeout(() => setShaking(null), 400);
    return () => window.clearTimeout(t);
  }, [shaking]);

  const commit = (next: Tag[]) => {
    if (valueProp === undefined) setInner(next);
    onValueChange?.(next);
  };

  const add = (incoming: Tag[]) => {
    let next = tags;
    for (const raw of incoming) {
      const text = normalise(raw.value);
      if (!text) continue;
      const existing = next.find((t) => same(t.value, text));
      if (existing) {
        setShaking(existing.value);
        continue;
      }
      if (max !== undefined && next.length >= max) break;
      const known = raw.group ? { value: text, group: raw.group } : findOption(text);
      if (!known && !allowCustom) continue;
      next = [...next, known ?? { value: text }];
    }
    if (next !== tags) commit(next);
    setQuery("");
  };

  const remove = (tag: Tag) => {
    commit(tags.filter((t) => t !== tag));
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (flat.length) setActive((a) => (a + (event.key === "ArrowDown" ? 1 : -1) + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (showList && flat[active]) add([flat[active]]);
      else if (q) add([{ value: q }]);
    } else if (event.key === "Tab" && q && showList && flat[active]) {
      event.preventDefault();
      add([flat[active]]);
    } else if (event.key === "," || event.key === ";") {
      event.preventDefault();
      if (q) add([exact ?? { value: q }]);
    } else if (event.key === "Backspace" && !query && tags.length) {
      event.preventDefault();
      const last = tags[tags.length - 1];
      commit(tags.slice(0, -1));
      setQuery(last.value);
      setOpen(true);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (!/[,;\n\t]/.test(text)) return;
    event.preventDefault();
    add(text.split(/[,;\n\t]+/).map((value) => ({ value })));
  };

  let index = -1;
  const option = (tag: Tag, content: ReactNode) => {
    index += 1;
    const i = index;
    return (
      <div
        aria-selected={i === active}
        className="flex h-8 cursor-pointer select-none items-center gap-2 rounded-lg px-2 text-sm data-[active=true]:bg-accent"
        data-active={i === active}
        data-index={i}
        id={`${id}-opt-${i}`}
        key={`${tag.group ?? "new"}-${tag.value}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => add([tag])}
        onMouseMove={() => setActive(i)}
        role="option"
      >
        {content}
      </div>
    );
  };

  return (
    <div className={cn("relative grid w-full gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label className="font-medium text-sm" htmlFor={`${id}-input`}>
          {label}
        </label>
        {max !== undefined && (
          <span className={cn("text-muted-foreground text-xs tabular-nums", full && "text-warning-foreground")}>
            {tags.length}/{max}
          </span>
        )}
      </div>
      <div className="relative">
      <div
        className="flex min-h-9 w-full cursor-text flex-wrap items-center gap-1 rounded-lg border border-input bg-background not-dark:bg-clip-padding p-1 shadow-xs/5 ring-ring/24 transition-shadow focus-within:border-ring focus-within:ring-[3px] dark:bg-input/32"
        onClick={() => inputRef.current?.focus()}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {tags.map((tag) => (
            <Chip
              color={groupOf(tag)?.color ?? "neutral"}
              key={tag.value.toLowerCase()}
              onRemove={() => remove(tag)}
              reduce={!!reduce}
              shake={shaking === tag.value}
              tag={tag}
            />
          ))}
        </AnimatePresence>
        <input
          aria-activedescendant={showList ? `${id}-opt-${active}` : undefined}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-describedby={hintId}
          aria-expanded={showList}
          autoComplete="off"
          className="h-7 min-w-12 flex-1 bg-transparent px-1.5 text-base outline-none placeholder:text-muted-foreground/72 disabled:cursor-not-allowed sm:text-sm"
          id={`${id}-input`}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={full ? "Limit reached" : tags.length ? "" : placeholder}
          ref={inputRef}
          role="combobox"
          value={query}
        />
      </div>
      <AnimatePresence>
        {showList && (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 origin-top overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg/5"
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
            id={listId}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -4 }}
            ref={listRef}
            role="listbox"
            transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
          >
            {sections.map(({ group, options }) => (
              <div key={group.id} role="presentation">
                <div className="px-2 pt-1.5 pb-1 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">{group.label}</div>
                {options.map((o) =>
                  option(
                    { value: o, group: group.id },
                    <>
                      <span className={cn("size-2 shrink-0 rounded-full", COLORS[group.color].dot)} />
                      <Highlight query={q} text={o} />
                    </>,
                  ),
                )}
              </div>
            ))}
            {canCreate && (
              <div className={cn(sections.length > 0 && "mt-1 border-t pt-1")} role="presentation">
                {option(
                  { value: q },
                  <>
                    <PlusIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      Create <span className="font-medium">“{q}”</span>
                    </span>
                  </>,
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      <p className="text-pretty text-muted-foreground text-xs" id={hintId}>
        Enter or comma adds, Backspace edits the last. Paste a list to add many.
      </p>
    </div>
  );
}

function Chip({
  tag,
  color,
  shake,
  reduce,
  onRemove,
}: {
  tag: Tag;
  color: TagColor;
  shake: boolean;
  reduce: boolean;
  onRemove: () => void;
}) {
  const controls = useAnimationControls();
  useEffect(() => {
    if (shake && !reduce) controls.start({ x: [0, -4, 4, -2, 0], transition: { duration: 0.32 } });
  }, [shake, reduce, controls]);

  return (
    <motion.span
      animate={{ opacity: 1, scale: 1 }}
      className={cn("inline-flex h-7 max-w-full items-center gap-1 rounded-[calc(var(--radius-lg)-5px)] pr-1 pl-2 font-medium text-xs ring-1 ring-inset", COLORS[color].chip)}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      layout={!reduce}
      transition={{ type: "spring", stiffness: 600, damping: 38 }}
    >
      <motion.span animate={controls} className="truncate">
        {tag.value}
      </motion.span>
      <button
        aria-label={`Remove ${tag.value}`}
        className="relative flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm opacity-60 outline-none transition-opacity after:absolute after:-inset-1.5 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        type="button"
      >
        <XIcon className="size-3" />
      </button>
    </motion.span>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at < 0) return <span className="truncate">{text}</span>;
  return (
    <span className="truncate">
      {text.slice(0, at)}
      <span className="font-semibold">{text.slice(at, at + query.length)}</span>
      {text.slice(at + query.length)}
    </span>
  );
}
