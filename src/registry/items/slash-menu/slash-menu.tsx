"use client";

import {
  CheckIcon,
  CodeIcon,
  Heading2Icon,
  LightbulbIcon,
  ListIcon,
  type LucideIcon,
  MinusIcon,
  QuoteIcon,
  SquareCheckIcon,
  TypeIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ChangeEvent, type KeyboardEvent, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export type BlockType = "text" | "heading" | "todo" | "bullet" | "quote" | "callout" | "code" | "divider";

export interface SlashBlock {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
}

export interface SlashCommand {
  type: BlockType;
  label: string;
  hint: string;
  icon: LucideIcon;
  group: string;
  aliases?: string[];
}

export interface SlashMenuProps {
  title?: string;
  defaultBlocks?: SlashBlock[];
  commands?: SlashCommand[];
  onChange?: (blocks: SlashBlock[]) => void;
  className?: string;
}

export const defaultCommands: SlashCommand[] = [
  { type: "text", label: "Text", hint: "Plain paragraph", icon: TypeIcon, group: "Basic", aliases: ["paragraph", "p"] },
  { type: "heading", label: "Heading", hint: "Section title", icon: Heading2Icon, group: "Basic", aliases: ["h2", "title"] },
  { type: "todo", label: "To-do", hint: "Track a task", icon: SquareCheckIcon, group: "Basic", aliases: ["task", "checkbox", "check"] },
  { type: "bullet", label: "Bulleted list", hint: "Simple list", icon: ListIcon, group: "Basic", aliases: ["ul", "list"] },
  { type: "quote", label: "Quote", hint: "Pull out a line", icon: QuoteIcon, group: "Blocks", aliases: ["blockquote"] },
  { type: "callout", label: "Callout", hint: "Make it stand out", icon: LightbulbIcon, group: "Blocks", aliases: ["note", "tip", "info"] },
  { type: "code", label: "Code", hint: "Monospace snippet", icon: CodeIcon, group: "Blocks", aliases: ["snippet", "pre"] },
  { type: "divider", label: "Divider", hint: "Separate sections", icon: MinusIcon, group: "Blocks", aliases: ["hr", "line", "rule"] },
];

const placeholders: Record<BlockType, string> = {
  text: "Type / for blocks",
  heading: "Heading",
  todo: "To-do",
  bullet: "List item",
  quote: "Quote",
  callout: "Something worth noticing",
  code: "// code",
  divider: "",
};

let counter = 0;
const newId = () => `b${Date.now().toString(36)}${counter++}`;

const MENU_HEIGHT = 300;

function caretPoint(el: HTMLTextAreaElement, index: number) {
  const style = getComputedStyle(el);
  const mirror = document.createElement("div");
  for (const prop of [
    "boxSizing",
    "width",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderLeftWidth",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "letterSpacing",
    "lineHeight",
    "textTransform",
    "wordSpacing",
    "tabSize",
  ] as const) {
    mirror.style[prop] = style[prop];
  }
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  mirror.textContent = el.value.slice(0, index);
  const marker = document.createElement("span");
  marker.textContent = "​";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const point = {
    left: marker.offsetLeft,
    top: marker.offsetTop,
    height: Number.parseFloat(style.lineHeight) || marker.offsetHeight,
  };
  mirror.remove();
  return point;
}

function rank(cmd: SlashCommand, q: string) {
  if (!q) return 1;
  const label = cmd.label.toLowerCase();
  if (label.startsWith(q)) return 3;
  if (cmd.aliases?.some((a) => a.startsWith(q))) return 2;
  if (label.includes(q)) return 1;
  return 0;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLowerCase().indexOf(query) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-foreground underline decoration-foreground/30 underline-offset-2">{text.slice(i, i + query.length)}</span>
      {text.slice(i + query.length)}
    </>
  );
}

interface MenuState {
  blockId: string;
  slash: number;
  query: string;
  x: number;
  y: number;
  above: boolean;
}

export function SlashMenu({
  title = "Offsite, Lisbon",
  defaultBlocks,
  commands = defaultCommands,
  onChange,
  className,
}: SlashMenuProps) {
  const reduce = useReducedMotionAfterMount();
  const listId = useId();
  const [blocks, setBlocks] = useState<SlashBlock[]>(
    () => defaultBlocks ?? [{ id: newId(), type: "text", text: "" }],
  );
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [active, setActive] = useState(0);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLTextAreaElement>());
  const wrapRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<{ id: string; at: number | "end" } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(flashTimer.current), []);
  useEffect(() => onChange?.(blocks), [blocks, onChange]);

  useLayoutEffect(() => {
    const req = pendingFocus.current;
    if (!req) return;
    const el = refs.current.get(req.id);
    if (!el) return;
    pendingFocus.current = null;
    el.focus();
    const at = req.at === "end" ? el.value.length : req.at;
    el.setSelectionRange(at, at);
  });

  const results = useMemo(() => {
    if (!menu) return [];
    const q = menu.query.toLowerCase();
    return commands
      .map((c, i) => ({ c, score: rank(c, q), i }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .map((r) => r.c);
  }, [menu, commands]);

  const groups = useMemo(() => {
    if (menu?.query) return [{ name: "Best match", items: results }];
    const out: { name: string; items: SlashCommand[] }[] = [];
    for (const c of results) {
      const g = out.find((x) => x.name === c.group);
      if (g) g.items.push(c);
      else out.push({ name: c.group, items: [c] });
    }
    return out;
  }, [results, menu?.query]);

  const activeOptionId = menu && results[active] ? `${listId}-${results[active].type}` : undefined;
  useEffect(() => {
    if (activeOptionId) document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
  }, [activeOptionId]);

  const update = (id: string, patch: Partial<SlashBlock>) =>
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const flash = (id: string) => {
    setFlashId(id);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashId(null), 700);
  };

  const detectSlash = (block: SlashBlock, el: HTMLTextAreaElement) => {
    const caret = el.selectionStart;
    const before = el.value.slice(0, caret);
    const m = /(^|\s)\/([\p{L}\d-]{0,24})$/u.exec(before);
    if (!m || block.type === "code") {
      setMenu(null);
      return;
    }
    const slash = caret - m[2].length - 1;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const p = caretPoint(el, slash);
    const elRect = el.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const x = Math.min(elRect.left - wrapRect.left + p.left - 8, wrap.clientWidth - 248);
    const top = elRect.top - wrapRect.top + p.top - el.scrollTop;
    const above = top + p.height + MENU_HEIGHT > wrap.clientHeight + 120 && top > MENU_HEIGHT;
    setMenu((prev) => {
      if (prev?.query !== m[2]) setActive(0);
      return { blockId: block.id, slash, query: m[2], x: Math.max(0, x), y: above ? top - 6 : top + p.height + 6, above };
    });
  };

  const onInput = (block: SlashBlock, e: ChangeEvent<HTMLTextAreaElement>) => {
    update(block.id, { text: e.target.value });
    detectSlash(block, e.target);
  };

  const apply = (cmd: SlashCommand) => {
    if (!menu) return;
    const block = blocks.find((b) => b.id === menu.blockId);
    const el = refs.current.get(menu.blockId);
    if (!block || !el) return;
    const caret = el.selectionStart;
    const rest = (block.text.slice(0, menu.slash) + block.text.slice(caret)).replace(/\s+$/, "");
    const index = blocks.findIndex((b) => b.id === block.id);
    setMenu(null);

    setBlocks((bs) => {
      const next = [...bs];
      if (cmd.type === "divider") {
        const after = { id: newId(), type: "text" as const, text: "" };
        const divider = { id: newId(), type: "divider" as const, text: "" };
        if (rest.trim()) next.splice(index, 1, { ...block, text: rest }, divider, after);
        else next.splice(index, 1, divider, after);
        pendingFocus.current = { id: after.id, at: 0 };
        flash(divider.id);
        return next;
      }
      if (!rest.trim()) {
        next[index] = { ...block, type: cmd.type, text: "", checked: false };
        pendingFocus.current = { id: block.id, at: 0 };
        flash(block.id);
      } else {
        const created = { id: newId(), type: cmd.type, text: "" };
        next.splice(index, 1, { ...block, text: rest }, created);
        pendingFocus.current = { id: created.id, at: 0 };
        flash(created.id);
      }
      return next;
    });
  };

  const focusBlock = (i: number, at: number | "end") => {
    const target = blocks.slice(0, i + 1).reverse().find((b) => b.type !== "divider");
    const forward = blocks.slice(i).find((b) => b.type !== "divider");
    const pick = at === "end" ? target : forward;
    if (!pick) return;
    pendingFocus.current = { id: pick.id, at };
    setFocusedId(pick.id);
  };

  const onKeyDown = (block: SlashBlock, e: KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const index = blocks.findIndex((b) => b.id === block.id);

    if (menu && menu.blockId === block.id) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!results.length) return;
        setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
        return;
      }
      if ((e.key === "Enter" || e.key === "Tab") && results.length) {
        e.preventDefault();
        apply(results[active] ?? results[0]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMenu(null);
        return;
      }
    }

    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    const atEnd = el.selectionStart === el.value.length;

    if (e.key === "Enter" && !e.shiftKey && block.type !== "code") {
      e.preventDefault();
      const listy = block.type === "todo" || block.type === "bullet";
      if (listy && !block.text.trim()) {
        update(block.id, { type: "text" });
        return;
      }
      const head = el.value.slice(0, el.selectionStart);
      const tail = el.value.slice(el.selectionEnd);
      const created: SlashBlock = { id: newId(), type: listy ? block.type : "text", text: tail };
      setBlocks((bs) => {
        const next = [...bs];
        next.splice(index, 1, { ...block, text: head }, created);
        return next;
      });
      pendingFocus.current = { id: created.id, at: 0 };
      return;
    }

    if (e.key === "Backspace" && atStart) {
      if (block.type !== "text") {
        e.preventDefault();
        update(block.id, { type: "text" });
        return;
      }
      if (index > 0) {
        e.preventDefault();
        const prev = blocks[index - 1];
        if (prev.type === "divider") {
          setBlocks((bs) => bs.filter((b) => b.id !== prev.id));
          pendingFocus.current = { id: block.id, at: 0 };
          return;
        }
        const join = prev.text.length;
        setBlocks((bs) =>
          bs.filter((b) => b.id !== block.id).map((b) => (b.id === prev.id ? { ...b, text: b.text + block.text } : b)),
        );
        pendingFocus.current = { id: prev.id, at: join };
      }
      return;
    }

    if (e.key === "ArrowUp" && atStart && index > 0) {
      e.preventDefault();
      focusBlock(index - 1, "end");
    } else if (e.key === "ArrowDown" && atEnd && index < blocks.length - 1) {
      e.preventDefault();
      focusBlock(index + 1, 0);
    }
  };

  const lastEmpty = blocks[blocks.length - 1];

  return (
    <section
      aria-label={title}
      className={cn("relative w-full max-w-[460px] rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex items-baseline justify-between gap-3 px-5 pt-5">
        <h3 className="text-balance font-semibold text-lg tracking-tight">{title}</h3>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
          {blocks.length} blocks
        </span>
      </header>

      <div className="relative min-h-64 px-5 pt-3 pb-5" ref={wrapRef}>
        <motion.div className="flex flex-col gap-1" layout="position">
          <AnimatePresence initial={false}>
            {blocks.map((block, i) => (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.12 } }}
                initial={reduce ? false : { opacity: 0, height: 0 }}
                key={block.id}
                transition={{ type: "spring", stiffness: 520, damping: 40, opacity: { duration: 0.14 } }}
              >
                <Block
                  block={block}
                  flash={flashId === block.id}
                  focused={focusedId === block.id}
                  menuOpen={menu?.blockId === block.id}
                  menuProps={{
                    listId,
                    activeId: menu?.blockId === block.id && results[active] ? `${listId}-${results[active].type}` : undefined,
                  }}
                  onBlur={() => {
                    setFocusedId((f) => (f === block.id ? null : f));
                    setMenu((m) => (m?.blockId === block.id ? null : m));
                  }}
                  onChange={(e) => onInput(block, e)}
                  onFocus={() => setFocusedId(block.id)}
                  onKeyDown={(e) => onKeyDown(block, e)}
                  onSelect={(e) => menu?.blockId === block.id && detectSlash(block, e.currentTarget)}
                  onToggle={() => update(block.id, { checked: !block.checked })}
                  placeholderAlways={block === lastEmpty && block.type === "text" && !block.text && i > 0}
                  register={(el) => {
                    if (el) refs.current.set(block.id, el);
                    else refs.current.delete(block.id);
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {menu && (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute z-20 w-60 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg/5"
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: menu.above ? 4 : -4 }}
              key="menu"
              onMouseDown={(e) => e.preventDefault()}
              style={{
                left: menu.x,
                top: menu.above ? undefined : menu.y,
                bottom: menu.above ? `calc(100% - ${menu.y}px)` : undefined,
                transformOrigin: menu.above ? "8px 100%" : "8px 0",
              }}
              transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
            >
              <div aria-label="Insert a block" className="max-h-[300px] overflow-y-auto p-1" id={listId} role="listbox">
                {results.length === 0 ? (
                  <div className="px-3 py-6 text-center">
                    <p className="text-sm">No blocks for “{menu.query}”</p>
                    <p className="mt-0.5 text-muted-foreground text-xs">Keep typing, or press Esc</p>
                  </div>
                ) : (
                  groups.map((g) => (
                    <div key={g.name} role="presentation">
                      <div className="px-2 pt-1.5 pb-1 font-medium text-muted-foreground text-xs">{g.name}</div>
                      {g.items.map((c) => {
                        const idx = results.indexOf(c);
                        const on = idx === active;
                        const Icon = c.icon;
                        return (
                          <div
                            aria-selected={on}
                            className={cn(
                              "relative flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5",
                              on ? "bg-accent" : "",
                            )}
                            id={`${listId}-${c.type}`}
                            key={c.type}
                            onClick={() => apply(c)}
                            onMouseMove={() => idx !== active && setActive(idx)}
                            role="option"
                            tabIndex={-1}
                          >
                            <span
                              className={cn(
                                "flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-xs/5 transition-colors dark:bg-input/32",
                                on && "text-foreground",
                              )}
                            >
                              <Icon className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-foreground/90">
                                <Highlight query={menu.query.toLowerCase()} text={c.label} />
                              </span>
                              <span className="block truncate text-muted-foreground text-xs">{c.hint}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center gap-3 border-t px-3 py-1.5 text-muted-foreground text-xs">
                <span>
                  <Key>↑</Key>
                  <Key>↓</Key> move
                </span>
                <span>
                  <Key>↵</Key> insert
                </span>
                <span className="ms-auto">
                  <Key>esc</Key>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="me-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded border bg-background px-1 font-sans text-[10px] text-muted-foreground dark:bg-input/32">
      {children}
    </kbd>
  );
}

interface BlockProps {
  block: SlashBlock;
  focused: boolean;
  flash: boolean;
  menuOpen: boolean;
  menuProps: { listId: string; activeId?: string };
  placeholderAlways: boolean;
  register: (el: HTMLTextAreaElement | null) => void;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSelect: (e: React.SyntheticEvent<HTMLTextAreaElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  onToggle: () => void;
}

function Block({
  block,
  focused,
  flash,
  menuOpen,
  menuProps,
  placeholderAlways,
  register,
  onChange,
  onKeyDown,
  onSelect,
  onFocus,
  onBlur,
  onToggle,
}: BlockProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [block.text, block.type]);

  const flashClass = cn(
    "rounded-lg transition-[background-color,box-shadow] duration-500 ease-out",
    flash && "bg-info/10 duration-0",
  );

  if (block.type === "divider") {
    return (
      <div className={cn("py-3", flashClass)} role="separator">
        <div className="h-px bg-border" />
      </div>
    );
  }

  const showPlaceholder = !block.text && (focused || placeholderAlways || block.type !== "text");
  const area = (
    <textarea
      aria-activedescendant={menuOpen ? menuProps.activeId : undefined}
      aria-autocomplete="list"
      aria-controls={menuOpen ? menuProps.listId : undefined}
      aria-label={`${block.type === "text" ? "Paragraph" : block.type} block`}
      className={cn(
        "block w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-muted-foreground/60",
        block.type === "heading" && "font-semibold text-base tracking-tight",
        block.type === "code" ? "font-mono text-xs leading-relaxed" : "text-sm leading-6",
        block.type === "todo" && block.checked && "text-muted-foreground line-through decoration-muted-foreground/50",
        block.type === "quote" && "text-foreground/80 italic",
      )}
      onBlur={onBlur}
      onChange={onChange}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onSelect={onSelect}
      placeholder={showPlaceholder ? placeholders[block.type] : undefined}
      ref={(el) => {
        ref.current = el;
        register(el);
      }}
      rows={1}
      spellCheck={block.type !== "code"}
      value={block.text}
    />
  );

  // One stable tree for every type, so the textarea keeps focus when a block changes type.
  const t = block.type;
  const leading =
    t === "todo" ? (
      <button
        aria-checked={!!block.checked}
        aria-label="Done"
        className={cn(
          "relative mt-[3px] flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[calc(var(--radius)*0.5)] border outline-none transition-[background-color,border-color,scale] duration-150 before:absolute before:-inset-2 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.92]",
          block.checked ? "border-primary bg-primary text-primary-foreground" : "border-foreground/20 bg-background dark:bg-input/32",
        )}
        onClick={onToggle}
        role="checkbox"
        type="button"
      >
        {block.checked && <CheckIcon className="size-3" strokeWidth={3} />}
      </button>
    ) : t === "bullet" ? (
      <span aria-hidden className="ms-1.5 me-0.5 mt-[10px] size-[5px] shrink-0 rounded-full bg-foreground/70" />
    ) : t === "callout" ? (
      <LightbulbIcon aria-hidden className="mt-[3px] size-4 shrink-0 text-warning-foreground" />
    ) : null;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5",
        flashClass,
        t === "heading" && "pt-3 pb-0.5",
        t === "quote" && "my-1 rounded-s-none border-foreground/20 border-s-2 ps-3",
        t === "callout" && cn("my-1 rounded-xl bg-warning/10 px-3 py-2.5", flash && "bg-warning/20"),
        t === "code" && cn("my-1 rounded-xl border bg-muted/60 px-3 py-2.5", flash && "bg-info/8"),
      )}
    >
      {leading}
      {area}
    </div>
  );
}
