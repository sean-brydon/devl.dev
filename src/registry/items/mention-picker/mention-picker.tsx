"use client";

import { ArrowUpIcon, AtSignIcon, FileTextIcon, HashIcon, ImageIcon, PresentationIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export type MentionKind = "person" | "file" | "channel";

export interface MentionPerson {
  id: string;
  name: string;
  initials: string;
  role?: string;
  status?: "online" | "away" | "offline";
  avatarClassName?: string;
}

export interface MentionFile {
  id: string;
  name: string;
  location?: string;
  type?: "doc" | "image" | "slides";
}

export interface MentionChannel {
  id: string;
  name: string;
  members?: number;
}

export type MessageSegment =
  | { type: "text"; text: string }
  | { type: "mention"; kind: MentionKind; id: string; label: string };

export interface MentionMessage {
  id: string;
  author: MentionPerson;
  time: string;
  segments: MessageSegment[];
}

export interface MentionPickerProps {
  channel?: string;
  people?: MentionPerson[];
  files?: MentionFile[];
  channels?: MentionChannel[];
  messages?: MentionMessage[];
  currentUser?: MentionPerson;
  onSend?: (segments: MessageSegment[]) => void;
  className?: string;
}

interface Option {
  kind: MentionKind;
  id: string;
  label: string;
  sub?: string;
  person?: MentionPerson;
  file?: MentionFile;
}

interface Trigger {
  node: Text;
  start: number;
  query: string;
  x: number;
  bottom: number;
  maxHeight: number;
}

const tokenStyles: Record<MentionKind, string> = {
  person: "bg-info/12 text-info-foreground",
  file: "bg-muted text-foreground ring-1 ring-border ring-inset",
  channel: "bg-muted text-foreground",
};

const TOKEN_BASE =
  "mx-px inline-flex select-all items-center gap-1 whitespace-nowrap rounded-md px-1 align-baseline font-medium leading-[1.35]";

const fileSvg =
  '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.7;flex-shrink:0"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>';

function tokenText(kind: MentionKind, label: string) {
  return kind === "person" ? `@${label}` : kind === "channel" ? `#${label}` : label;
}

const statusDot: Record<NonNullable<MentionPerson["status"]>, string> = {
  online: "bg-success",
  away: "bg-warning",
  offline: "bg-muted-foreground/40",
};

function Avatar({ person, size = 7 }: { person: MentionPerson; size?: 6 | 7 | 8 }) {
  return (
    <span className="relative shrink-0">
      <span
        className={cn(
          "flex select-none items-center justify-center rounded-full font-medium",
          size === 8 ? "size-8 text-xs" : size === 7 ? "size-7 text-[10px]" : "size-6 text-[10px]",
          person.avatarClassName ?? "bg-muted text-foreground",
        )}
      >
        {person.initials}
      </span>
      {person.status && (
        <span
          className={cn("absolute -end-px -bottom-px size-2.5 rounded-full ring-2 ring-popover", statusDot[person.status])}
        />
      )}
    </span>
  );
}

function FileGlyph({ type }: { type?: MentionFile["type"] }) {
  const Icon = type === "image" ? ImageIcon : type === "slides" ? PresentationIcon : FileTextIcon;
  const tone =
    type === "image"
      ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
      : type === "slides"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300";
  return (
    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", tone)}>
      <Icon className="size-3.5" />
    </span>
  );
}

export function MentionToken({ kind, label }: { kind: MentionKind; label: string }) {
  return (
    <span className={cn(TOKEN_BASE, tokenStyles[kind])}>
      {kind === "file" && <FileTextIcon aria-hidden className="size-3 shrink-0 opacity-70" />}
      {tokenText(kind, label)}
    </span>
  );
}

function serialize(root: HTMLElement): MessageSegment[] {
  const out: MessageSegment[] = [];
  const pushText = (t: string) => {
    if (!t) return;
    const last = out[out.length - 1];
    if (last?.type === "text") last.text += t;
    else out.push({ type: "text", text: t });
  };
  const walk = (node: Node, top: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) return pushText((node.textContent ?? "").replace(/ /g, " "));
    if (!(node instanceof HTMLElement)) return;
    if (node.dataset.kind) {
      out.push({ type: "mention", kind: node.dataset.kind as MentionKind, id: node.dataset.id ?? "", label: node.dataset.label ?? "" });
      return;
    }
    if (node.tagName === "BR") return pushText("\n");
    if (!top && node.tagName === "DIV") pushText("\n");
    for (const child of node.childNodes) walk(child, false);
  };
  for (const child of root.childNodes) walk(child, false);
  const first = out[0];
  if (first?.type === "text") first.text = first.text.replace(/^\s+/, "");
  const last = out[out.length - 1];
  if (last?.type === "text") last.text = last.text.replace(/\s+$/, "");
  return out.filter((s) => s.type !== "text" || s.text);
}

export function MentionPicker({
  channel = "launch",
  people = [],
  files = [],
  channels = [],
  messages: initialMessages = [],
  currentUser = { id: "me", name: "You", initials: "YO" },
  onSend,
  className,
}: MentionPickerProps) {
  const reduce = useSafeReducedMotion();
  const listId = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [active, setActive] = useState(0);
  const [empty, setEmpty] = useState(true);
  const [messages, setMessages] = useState(initialMessages);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages, reduce]);

  const groups = useMemo(() => {
    if (!trigger) return [];
    const q = trigger.query.toLowerCase();
    const hit = (s: string) => !q || s.toLowerCase().split(/[\s._-]+/).some((w) => w.startsWith(q)) || s.toLowerCase().startsWith(q);
    const ppl: Option[] = people
      .filter((p) => hit(p.name))
      .slice(0, q ? 5 : 4)
      .map((p) => ({ kind: "person", id: p.id, label: p.name, sub: p.role, person: p }));
    const fls: Option[] = files
      .filter((f) => hit(f.name))
      .slice(0, 3)
      .map((f) => ({ kind: "file", id: f.id, label: f.name, sub: f.location, file: f }));
    const chs: Option[] = channels
      .filter((c) => hit(c.name))
      .slice(0, 3)
      .map((c) => ({ kind: "channel", id: c.id, label: c.name, sub: c.members ? `${c.members} members` : undefined }));
    return [
      { name: "People", items: ppl },
      { name: "Files", items: fls },
      { name: "Channels", items: chs },
    ].filter((g) => g.items.length);
  }, [trigger, people, files, channels]);
  const flat = groups.flatMap((g) => g.items);
  const activeOptionId = trigger && flat[active] ? `${listId}-${flat[active].kind}-${flat[active].id}` : undefined;

  useEffect(() => {
    if (activeOptionId) document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
  }, [activeOptionId]);

  const readTrigger = () => {
    const editor = editorRef.current;
    const card = cardRef.current;
    const sel = window.getSelection();
    if (!editor || !card || !sel || !sel.rangeCount || !sel.isCollapsed) return setTrigger(null);
    const node = sel.anchorNode;
    if (!node || node.nodeType !== Node.TEXT_NODE || !editor.contains(node)) return setTrigger(null);
    const before = (node.textContent ?? "").slice(0, sel.anchorOffset);
    const m = /(^|[\s ])@([\p{L}\d._-]{0,24})$/u.exec(before);
    if (!m) return setTrigger(null);
    const start = sel.anchorOffset - m[2].length - 1;
    const r = document.createRange();
    r.setStart(node, start);
    r.setEnd(node, start + 1);
    const rect = r.getBoundingClientRect();
    const box = card.getBoundingClientRect();
    const x = Math.max(8, Math.min(rect.left - box.left - 10, box.width - 280 - 8));
    setTrigger((prev) => {
      if (prev?.query !== m[2]) setActive(0);
      return {
        node: node as Text,
        start,
        query: m[2],
        x,
        bottom: box.bottom - rect.top + 8,
        maxHeight: Math.max(150, Math.min(300, rect.top - box.top - 4)),
      };
    });
  };

  const syncEmpty = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const isEmpty = !editor.textContent?.trim() && !editor.querySelector("[data-kind]");
    setEmpty(isEmpty);
    if (isEmpty && editor.innerHTML !== "") editor.innerHTML = "";
  };

  const insert = (opt: Option) => {
    const editor = editorRef.current;
    if (!editor || !trigger) return;
    const { node, start } = trigger;
    const end = Math.min(node.length, start + 1 + trigger.query.length);
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    range.deleteContents();

    const token = document.createElement("span");
    token.contentEditable = "false";
    token.dataset.kind = opt.kind;
    token.dataset.id = opt.id;
    token.dataset.label = opt.label;
    token.className = cn(TOKEN_BASE, tokenStyles[opt.kind]);
    token.innerHTML = opt.kind === "file" ? fileSvg : "";
    token.append(tokenText(opt.kind, opt.label));
    const space = document.createTextNode(" ");
    range.insertNode(space);
    range.insertNode(token);

    const sel = window.getSelection();
    const caret = document.createRange();
    caret.setStart(space, 1);
    caret.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(caret);
    editor.focus();
    if (!reduce) {
      token.animate(
        [
          { transform: "scale(0.9)", opacity: 0.4 },
          { transform: "scale(1)", opacity: 1 },
        ],
        { duration: 200, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
      );
    }
    setTrigger(null);
    syncEmpty();
  };

  const send = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const segments = serialize(editor);
    if (!segments.length) return;
    onSend?.(segments);
    setMessages((m) => [...m, { id: `m-${Date.now()}`, author: currentUser, time: "now", segments }]);
    editor.innerHTML = "";
    setEmpty(true);
    setTrigger(null);
    editor.focus();
  };

  const openPicker = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (!sel) return;
    if (!sel.rangeCount || !editor.contains(sel.anchorNode)) {
      const r = document.createRange();
      r.selectNodeContents(editor);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    const before = sel.anchorNode?.nodeType === Node.TEXT_NODE ? (sel.anchorNode.textContent ?? "").slice(0, sel.anchorOffset) : "";
    document.execCommand("insertText", false, before && !/\s$/.test(before) ? " @" : "@");
    syncEmpty();
    readTrigger();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (trigger) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (flat.length) setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + flat.length) % flat.length);
        return;
      }
      if ((e.key === "Enter" || e.key === "Tab") && flat.length) {
        e.preventDefault();
        insert(flat[active] ?? flat[0]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setTrigger(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <section
      aria-label={`#${channel}`}
      className={cn("relative flex w-full max-w-[440px] flex-col rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
      ref={cardRef}
    >
      <header className="flex items-center gap-1.5 border-b px-4 py-3">
        <HashIcon className="size-4 text-muted-foreground" />
        <h3 className="font-medium text-sm">{channel}</h3>
        <span className="ms-auto text-muted-foreground text-xs tabular-nums">{people.length + 1} members</span>
      </header>

      <div className="flex h-64 flex-col gap-4 overflow-y-auto px-4 py-4" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2.5"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              key={m.id}
              transition={{ type: "spring", stiffness: 480, damping: 36, opacity: { duration: 0.16 } }}
            >
              <Avatar person={{ ...m.author, status: undefined }} size={8} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm">{m.author.name}</span>
                  <span className="text-muted-foreground text-xs">{m.time}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-pretty text-sm leading-relaxed">
                  {m.segments.map((s, i) =>
                    s.type === "text" ? (
                      <span key={i}>{s.text}</span>
                    ) : (
                      <MentionToken key={i} kind={s.kind} label={s.label} />
                    ),
                  )}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-3 pt-0">
        <div className="rounded-xl border bg-background transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24 dark:bg-input/32">
          <div className="relative">
            {empty && (
              <span aria-hidden className="pointer-events-none absolute top-2.5 left-3 text-muted-foreground/72 text-sm">
                Message #{channel}, type @ to mention
              </span>
            )}
            <div
              aria-activedescendant={trigger && flat[active] ? `${listId}-${flat[active].kind}-${flat[active].id}` : undefined}
              aria-autocomplete="list"
              aria-controls={trigger ? listId : undefined}
              aria-expanded={!!trigger}
              aria-label={`Message #${channel}`}
              aria-multiline="true"
              className="max-h-32 min-h-11 overflow-y-auto whitespace-pre-wrap break-words px-3 py-2.5 text-sm leading-relaxed outline-none"
              contentEditable
              onBlur={() => setTrigger(null)}
              onInput={() => {
                syncEmpty();
                readTrigger();
              }}
              onKeyDown={onKeyDown}
              onKeyUp={(e) => (e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End") && !trigger && readTrigger()}
              onMouseUp={readTrigger}
              onPaste={(e) => {
                e.preventDefault();
                document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
              }}
              ref={editorRef}
              role="textbox"
              spellCheck
              suppressContentEditableWarning
              tabIndex={0}
            />
          </div>
          <div className="flex items-center justify-between px-1.5 pb-1.5">
            <button
              aria-label="Mention someone"
              className="relative flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors before:absolute before:-inset-0.5 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              onClick={openPicker}
              onMouseDown={(e) => e.preventDefault()}
              type="button"
            >
              <AtSignIcon className="size-4" />
            </button>
            <button
              aria-label="Send"
              className="flex size-7 cursor-pointer items-center justify-center rounded-lg bg-primary text-primary-foreground outline-none transition-[opacity,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:cursor-default disabled:opacity-40"
              disabled={empty}
              onClick={send}
              onMouseDown={(e) => e.preventDefault()}
              type="button"
            >
              <ArrowUpIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {trigger && (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute z-20 w-[280px] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg/5"
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 4 }}
            onMouseDown={(e) => e.preventDefault()}
            style={{ left: trigger.x, bottom: trigger.bottom, transformOrigin: "bottom left" }}
            transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
          >
            <div
              aria-label="Mention"
              className="overflow-y-auto overscroll-contain p-1"
              id={listId}
              role="listbox"
              style={{ maxHeight: trigger.maxHeight }}
            >
              {flat.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-sm">Nothing matches “{trigger.query}”</p>
                  <p className="mt-0.5 text-muted-foreground text-xs">Try a first name, a file or a channel</p>
                </div>
              ) : (
                groups.map((g) => (
                  <div key={g.name} role="presentation">
                    <div className="px-2 pt-1.5 pb-1 font-medium text-muted-foreground text-xs">{g.name}</div>
                    {g.items.map((o) => {
                      const idx = flat.indexOf(o);
                      const on = idx === active;
                      return (
                        <div
                          aria-selected={on}
                          className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5", on && "bg-accent")}
                          id={`${listId}-${o.kind}-${o.id}`}
                          key={`${o.kind}-${o.id}`}
                          onClick={() => insert(o)}
                          onMouseMove={() => idx !== active && setActive(idx)}
                          role="option"
                          tabIndex={-1}
                        >
                          {o.person ? (
                            <Avatar person={o.person} />
                          ) : o.kind === "file" ? (
                            <FileGlyph type={o.file?.type} />
                          ) : (
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                              <HashIcon className="size-3.5" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1 truncate text-sm">{o.label}</span>
                          {o.sub && <span className="max-w-[45%] shrink-0 truncate text-muted-foreground text-xs">{o.sub}</span>}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
