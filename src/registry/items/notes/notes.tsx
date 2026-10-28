"use client";

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  FolderIcon,
  Heading1Icon,
  Heading2Icon,
  ListChecksIcon,
  ListIcon,
  NotebookPenIcon,
  PilcrowIcon,
  PinIcon,
  RotateCcwIcon,
  SearchIcon,
  SquarePenIcon,
  Trash2Icon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@/components/ui/menu";

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export type NoteBlockType = "h1" | "h2" | "p" | "todo" | "bullet";

export interface NoteBlock {
  id: string;
  type: NoteBlockType;
  text: string;
  done?: boolean;
}

export type NoteFolderTone = "amber" | "sky" | "rose" | "emerald" | "violet";

export interface NoteFolder {
  id: string;
  name: string;
  tone: NoteFolderTone;
}

export interface Note {
  id: string;
  title: string;
  folderId: string;
  updatedAt: string;
  pinned?: boolean;
  deleted?: boolean;
  blocks: NoteBlock[];
}

export interface NotesProps {
  className?: string;
  folders?: NoteFolder[];
  notes?: Note[];
  now?: string;
  initialNoteId?: string;
}

const easeOut = [0.23, 1, 0.32, 1] as const;
const spring = { type: "spring", stiffness: 520, damping: 46, mass: 1 } as const;
const press = "transition-[color,background-color,box-shadow,scale] duration-150 ease-out active:scale-[0.97]";
const ring = "outline-none focus-visible:ring-2 focus-visible:ring-ring";
const menuPop =
  "transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100";

const tones: Record<NoteFolderTone, string> = {
  amber: "bg-amber-500 dark:bg-amber-400",
  sky: "bg-sky-500 dark:bg-sky-400",
  rose: "bg-rose-500 dark:bg-rose-400",
  emerald: "bg-emerald-500 dark:bg-emerald-400",
  violet: "bg-violet-500 dark:bg-violet-400",
};

const defaultFolders: NoteFolder[] = [
  { id: "personal", name: "Personal", tone: "amber" },
  { id: "work", name: "Work", tone: "sky" },
  { id: "recipes", name: "Recipes", tone: "rose" },
  { id: "travel", name: "Travel", tone: "emerald" },
];

let seed = 0;
const b = (type: NoteBlockType, text: string, done?: boolean): NoteBlock => ({ id: `b${++seed}`, type, text, done });

const defaultNotes: Note[] = [
  {
    id: "n1",
    title: "Lisbon in May",
    folderId: "travel",
    updatedAt: "2026-10-24T09:41:00",
    pinned: true,
    blocks: [
      b("p", "Five nights, flying in on the 14th. Staying in Príncipe Real, ten minutes up the hill from Bairro Alto."),
      b("h2", "Before we go"),
      b("todo", "Renew passport", true),
      b("todo", "Book the 28 tram early, before the queues", true),
      b("todo", "Pack a travel adapter (type F)"),
      b("todo", "Download offline maps for Sintra"),
      b("h2", "Eat"),
      b("bullet", "Custard tarts warm from the oven, first morning"),
      b("bullet", "Grilled sardines somewhere in Alfama"),
      b("bullet", "Ask Rui for the tasca with no sign on the door"),
      b("h2", "Maybe"),
      b("p", "Day trip to Cascais if the weather holds. Train from Cais do Sodré, 40 minutes."),
    ],
  },
  {
    id: "n2",
    title: "Q4 planning",
    folderId: "work",
    updatedAt: "2026-10-23T16:20:00",
    pinned: true,
    blocks: [
      b("p", "Three bets for the quarter. Everything else waits for January."),
      b("h2", "Bets"),
      b("bullet", "Self-serve onboarding: cut time to first project under 5 minutes"),
      b("bullet", "Usage-based billing for teams over 50 seats"),
      b("bullet", "Kill the legacy export pipeline"),
      b("h2", "Owners"),
      b("todo", "Confirm onboarding owner with Mara", true),
      b("todo", "Draft billing RFC by Nov 3"),
      b("todo", "Get export deprecation date into the changelog"),
    ],
  },
  {
    id: "n3",
    title: "Weekend sourdough",
    folderId: "recipes",
    updatedAt: "2026-10-22T08:05:00",
    blocks: [
      b("p", "500g flour (80% bread, 20% whole wheat), 375g water, 100g starter, 10g salt."),
      b("h2", "Schedule"),
      b("todo", "Fri 9pm: feed starter", true),
      b("todo", "Sat 9am: mix, rest 1 hour", true),
      b("todo", "Sat 10am to 2pm: four sets of folds", true),
      b("todo", "Shape, then cold proof overnight"),
      b("todo", "Sun 8am: bake 250°C, 20 min lid on, 25 off"),
    ],
  },
  {
    id: "n4",
    title: "1:1 with Mara",
    folderId: "work",
    updatedAt: "2026-10-21T11:30:00",
    blocks: [
      b("h2", "Her topics"),
      b("bullet", "Wants more ownership of the design system"),
      b("bullet", "Feeling stretched across two squads"),
      b("h2", "Mine"),
      b("bullet", "Promo packet timeline: draft due before the end of the month"),
      b("todo", "Move her off the billing squad after the RFC lands"),
    ],
  },
  {
    id: "n5",
    title: "Gift ideas",
    folderId: "personal",
    updatedAt: "2026-10-18T19:12:00",
    blocks: [
      b("todo", "Dad: the hiking poles he keeps borrowing"),
      b("todo", "Ines: pottery class voucher", true),
      b("todo", "Sam: that out-of-print photo book (check secondhand)"),
      b("p", "Budget around €60 each. Order before Dec 10 for shipping."),
    ],
  },
  {
    id: "n6",
    title: "Reading list",
    folderId: "personal",
    updatedAt: "2026-10-12T22:40:00",
    blocks: [
      b("p", "Slowly working through the pile on the nightstand."),
      b("bullet", "The one about lighthouse keepers Jo recommended"),
      b("bullet", "Something short and funny for the flight"),
      b("bullet", "Finish the essay collection (stuck on chapter 6)"),
    ],
  },
  {
    id: "n7",
    title: "Apartment move",
    folderId: "personal",
    updatedAt: "2026-09-30T10:00:00",
    blocks: [
      b("todo", "Give notice to landlord", true),
      b("todo", "Book van for the 2nd", true),
      b("todo", "Forward mail"),
      b("todo", "Measure the alcove for the bookshelf"),
    ],
  },
];

function relDate(iso: string, nowIso: string) {
  const d = new Date(iso);
  const now = new Date(nowIso);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  const hm = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`;
  if (diff <= 0) return { short: hm, long: `today at ${hm}` };
  if (diff === 1) return { short: "Yesterday", long: `yesterday at ${hm}` };
  if (diff < 7) {
    const wd = d.toLocaleDateString("en-US", { weekday: "long" });
    return { short: wd, long: `${wd} at ${hm}` };
  }
  const md = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { short: md, long: md };
}

function preview(n: Note) {
  return n.blocks
    .filter((x) => x.text.trim())
    .map((x) => x.text)
    .join(" · ");
}

function todoStats(n: Note) {
  const todos = n.blocks.filter((x) => x.type === "todo");
  return { done: todos.filter((x) => x.done).length, total: todos.length };
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[calc(var(--radius)*0.3)] bg-warning/30 text-foreground">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

function excerpt(text: string, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q);
  if (i < 30) return text;
  const from = text.lastIndexOf(" ", i - 16);
  return `…${text.slice(from > 0 ? from + 1 : i - 16)}`;
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 5.5;
  const c = 2 * Math.PI * r;
  const reduce = useReducedMotionSafe();
  return (
    <svg aria-hidden className="size-3.5 -rotate-90" viewBox="0 0 14 14">
      <circle className="fill-none stroke-border" cx="7" cy="7" r={r} strokeWidth="2" />
      <motion.circle
        animate={{ strokeDashoffset: c * (1 - done / Math.max(1, total)) }}
        className={cn("fill-none", done === total ? "stroke-success" : "stroke-foreground/70")}
        cx="7"
        cy="7"
        initial={false}
        r={r}
        strokeDasharray={c}
        strokeLinecap="round"
        strokeWidth="2"
        transition={reduce ? { duration: 0 } : { duration: 0.35, ease: easeOut }}
      />
    </svg>
  );
}

function AutoText({
  value,
  className,
  inputRef,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string; inputRef?: (el: HTMLTextAreaElement | null) => void }) {
  const local = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = local.current;
    if (!el || (typeof CSS !== "undefined" && CSS.supports("field-sizing", "content"))) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      className={cn(
        "block w-full resize-none overflow-hidden bg-transparent outline-none [field-sizing:content] placeholder:text-muted-foreground/60",
        className,
      )}
      ref={(el) => {
        local.current = el;
        inputRef?.(el);
      }}
      rows={1}
      value={value}
      {...props}
    />
  );
}

function CheckBox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  const reduce = useReducedMotionSafe();
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={cn(
        "relative mt-[5px] flex size-4.5 shrink-0 cursor-pointer items-center justify-center rounded-[calc(var(--radius)*0.5)] border transition-[background-color,border-color,scale] duration-150 ease-out after:absolute after:-inset-2.5 after:content-[''] active:scale-[0.92]",
        ring,
        "focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:border-foreground/40 dark:bg-input/32",
      )}
      onClick={onToggle}
      role="checkbox"
      type="button"
    >
      <svg aria-hidden className="size-3" fill="none" viewBox="0 0 12 12">
        <motion.path
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          d="M2.5 6.2 5 8.6l4.5-5"
          initial={false}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          transition={reduce ? { duration: 0 } : { duration: 0.18, ease: easeOut }}
        />
      </svg>
    </button>
  );
}

const blockStyles: Record<NoteBlockType, string> = {
  h1: "font-heading font-semibold text-xl leading-8 tracking-tight",
  h2: "font-heading font-semibold text-base leading-7 tracking-tight",
  p: "text-[15px] leading-7",
  todo: "text-[15px] leading-7",
  bullet: "text-[15px] leading-7",
};

const blockTypes: { value: NoteBlockType; label: string; icon: ReactNode }[] = [
  { value: "h1", label: "Heading", icon: <Heading1Icon /> },
  { value: "h2", label: "Subheading", icon: <Heading2Icon /> },
  { value: "p", label: "Text", icon: <PilcrowIcon /> },
  { value: "todo", label: "Checklist", icon: <ListChecksIcon /> },
  { value: "bullet", label: "Bullets", icon: <ListIcon /> },
];

type Pending = { id: string; at: "start" | "end" } | null;

export function Notes({
  className,
  folders = defaultFolders,
  notes: initialNotes = defaultNotes,
  now = "2026-10-24T10:00:00",
  initialNoteId = "n1",
}: NotesProps) {
  const reduce = useReducedMotionSafe();
  const [notes, setNotes] = useState(initialNotes);
  const [folder, setFolder] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialNoteId);
  const [query, setQuery] = useState("");
  const [focusedBlock, setFocusedBlock] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "editor">("list");
  const [undo, setUndo] = useState<{ id: string } | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const blockRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const counter = useRef(0);
  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);
  const uid = (p: string) => {
    counter.current += 1;
    return `${p}${Date.now().toString(36)}${counter.current}`;
  };

  useEffect(() => {
    if (!pending) return;
    const el = pending.id === "title" ? titleRef.current : blockRefs.current.get(pending.id);
    if (el) {
      el.focus();
      const pos = pending.at === "end" ? el.value.length : 0;
      el.setSelectionRange(pos, pos);
    }
    setPending(null);
  }, [pending]);

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(t);
  }, [undo]);

  const live = notes.filter((n) => !n.deleted);
  const inFolder = (n: Note) => (folder === "trash" ? n.deleted : !n.deleted && (folder === "all" || n.folderId === folder));
  const q = query.trim().toLowerCase();
  const matches = (n: Note) => !q || n.title.toLowerCase().includes(q) || preview(n).toLowerCase().includes(q);
  const visible = notes
    .filter((n) => inFolder(n) && matches(n))
    .sort((a, b2) => b2.updatedAt.localeCompare(a.updatedAt));
  const pinned = folder === "trash" ? [] : visible.filter((n) => n.pinned);
  const rest = folder === "trash" ? visible : visible.filter((n) => !n.pinned);
  const note = notes.find((n) => n.id === selectedId) ?? null;
  const folderName = (id: string) =>
    id === "all" ? "All notes" : id === "trash" ? "Recently deleted" : (folders.find((f) => f.id === id)?.name ?? "Notes");

  const touch = (id: string, patch: (n: Note) => Partial<Note>) =>
    setNotes((all) => all.map((n) => (n.id === id ? { ...n, ...patch(n), updatedAt: stamp() } : n)));
  const stamp = () => {
    const d = new Date(new Date(now).getTime() + (Date.now() - mountedAt.current));
    const pad = (x: number) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  };

  const setBlocks = (fn: (blocks: NoteBlock[]) => NoteBlock[]) => {
    if (!note) return;
    touch(note.id, (n) => ({ blocks: fn(n.blocks) }));
  };
  const patchBlock = (id: string, patch: Partial<NoteBlock>) =>
    setBlocks((bs) => bs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const open = (id: string) => {
    setSelectedId(id);
    setView("editor");
  };

  const newNote = () => {
    const id = uid("n");
    const folderId = folder === "all" || folder === "trash" ? (folders[0]?.id ?? "personal") : folder;
    setNotes((all) => [{ id, title: "", folderId, updatedAt: stamp(), blocks: [{ id: uid("b"), type: "p", text: "" }] }, ...all]);
    if (folder === "trash") setFolder("all");
    setQuery("");
    setSelectedId(id);
    setView("editor");
    setPending({ id: "title", at: "end" });
  };

  const removeNote = (id: string) => {
    setNotes((all) => all.map((n) => (n.id === id ? { ...n, deleted: true, pinned: false } : n)));
    setUndo({ id });
    const next = visible.filter((n) => n.id !== id)[0];
    setSelectedId(next?.id ?? null);
    setView("list");
  };

  const restore = (id: string) => {
    setNotes((all) => all.map((n) => (n.id === id ? { ...n, deleted: false } : n)));
    setUndo(null);
  };

  const convert = (id: string, type: NoteBlockType) => {
    patchBlock(id, { type, done: type === "todo" ? false : undefined });
    setPending({ id, at: "end" });
  };

  const onBlockKey = (e: KeyboardEvent<HTMLTextAreaElement>, block: NoteBlock, index: number) => {
    if (!note) return;
    const el = e.currentTarget;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const listy = block.type === "todo" || block.type === "bullet";
      if (listy && !block.text.trim()) {
        convert(block.id, "p");
        return;
      }
      const before = block.text.slice(0, el.selectionStart);
      const after = block.text.slice(el.selectionEnd);
      const id = uid("b");
      const type: NoteBlockType = listy ? block.type : "p";
      setBlocks((bs) => {
        const copy = bs.map((x) => (x.id === block.id ? { ...x, text: before } : x));
        copy.splice(index + 1, 0, { id, type, text: after, done: type === "todo" ? false : undefined });
        return copy;
      });
      setPending({ id, at: "start" });
    } else if (e.key === "Backspace" && el.selectionStart === 0 && el.selectionEnd === 0) {
      if (block.type !== "p") {
        e.preventDefault();
        convert(block.id, "p");
        return;
      }
      if (index === 0) {
        if (!block.text) {
          e.preventDefault();
          setPending({ id: "title", at: "end" });
        }
        return;
      }
      e.preventDefault();
      const prev = note.blocks[index - 1];
      const caret = prev.text.length;
      setBlocks((bs) => bs.filter((x) => x.id !== block.id).map((x) => (x.id === prev.id ? { ...x, text: x.text + block.text } : x)));
      requestAnimationFrame(() => {
        const p = blockRefs.current.get(prev.id);
        if (p) {
          p.focus();
          p.setSelectionRange(caret, caret);
        }
      });
    } else if (e.key === "ArrowUp" && el.selectionStart === 0 && index > 0) {
      e.preventDefault();
      setPending({ id: note.blocks[index - 1].id, at: "end" });
    } else if (e.key === "ArrowDown" && el.selectionStart === el.value.length && index < note.blocks.length - 1) {
      e.preventDefault();
      setPending({ id: note.blocks[index + 1].id, at: "start" });
    }
  };

  const onBlockChange = (block: NoteBlock, text: string) => {
    const shortcuts: [string, NoteBlockType][] = [
      ["## ", "h2"],
      ["# ", "h1"],
      ["- ", "bullet"],
      ["* ", "bullet"],
      ["[] ", "todo"],
      ["[ ] ", "todo"],
    ];
    if (block.type === "p") {
      const hit = shortcuts.find(([s]) => text.startsWith(s));
      if (hit) {
        patchBlock(block.id, { type: hit[1], text: text.slice(hit[0].length), done: hit[1] === "todo" ? false : undefined });
        return;
      }
    }
    patchBlock(block.id, { text });
  };

  const focusedType = note?.blocks.find((x) => x.id === focusedBlock)?.type;
  const stats = note ? todoStats(note) : { done: 0, total: 0 };
  const words = note ? `${note.title} ${preview(note)}`.split(/\s+/).filter((w) => /\w/.test(w)).length : 0;

  const folderList = (
    <nav aria-label="Folders" className="flex flex-col gap-0.5">
      {[
        { id: "all", name: "All notes", icon: <NotebookPenIcon />, count: live.length },
        ...folders.map((f) => ({
          id: f.id,
          name: f.name,
          icon: <span className={cn("size-2 rounded-full", tones[f.tone])} />,
          count: live.filter((n) => n.folderId === f.id).length,
        })),
        { id: "trash", name: "Recently deleted", icon: <Trash2Icon />, count: notes.length - live.length },
      ].map((f) => {
        const active = folder === f.id;
        return (
          <button
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left [&_svg]:size-4 [&_svg]:opacity-80",
              ring,
              press,
              active ? "font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              f.id === "trash" && "mt-3",
            )}
            key={f.id}
            onClick={() => {
              setFolder(f.id);
              setQuery("");
            }}
            type="button"
          >
            {active && (
              <motion.span
                className="absolute inset-0 -z-10 rounded-lg bg-accent"
                layoutId="notes-folder"
                transition={reduce ? { duration: 0 } : spring}
              />
            )}
            <span className="flex size-4 items-center justify-center">{f.icon}</span>
            <span className="flex-1 truncate">{f.name}</span>
            <span className="text-muted-foreground text-xs tabular-nums">{f.count}</span>
          </button>
        );
      })}
    </nav>
  );

  const noteRow = (n: Note) => {
    const s = todoStats(n);
    const date = relDate(n.updatedAt, now);
    const active = n.id === selectedId;
    const f = folders.find((x) => x.id === n.folderId);
    return (
      <motion.li
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        initial={false}
        key={n.id}
        layout={reduce ? false : "position"}
        layoutId={`note-${n.id}`}
        transition={spring}
      >
        <button
          aria-current={active || undefined}
          className={cn(
            "group/note relative flex w-full cursor-pointer flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-colors",
            ring,
            active ? "bg-accent" : "hover:bg-accent/50",
          )}
          onClick={() => open(n.id)}
          type="button"
        >
          <span className="flex items-center gap-2">
            <span className={cn("min-w-0 flex-1 truncate font-medium", !n.title && "text-muted-foreground")}>
              <Highlight query={query} text={n.title || "New note"} />
            </span>
            {s.total > 0 && (
              <span className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs tabular-nums">
                <ProgressRing done={s.done} total={s.total} />
                {s.done}/{s.total}
              </span>
            )}
          </span>
          <span className="line-clamp-2 text-muted-foreground text-xs leading-5">
            <span className="me-1.5 font-medium text-foreground/80 tabular-nums">{date.short}</span>
            <Highlight query={query} text={excerpt(preview(n), query) || "No additional text"} />
          </span>
          {folder === "all" && f && (
            <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <span className={cn("size-1.5 rounded-full", tones[f.tone])} />
              {f.name}
            </span>
          )}
        </button>
      </motion.li>
    );
  };

  const emptyList = q ? (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <SearchIcon className="size-4.5" />
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-balance font-medium">No notes match “{query.trim()}”</span>
        <span className="text-muted-foreground text-xs">Searching {folderName(folder).toLowerCase()}.</span>
      </div>
      {folder !== "all" && (
        <Button className={press} onClick={() => setFolder("all")} size="sm" variant="outline">
          Search all notes
        </Button>
      )}
    </div>
  ) : (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {folder === "trash" ? <Trash2Icon className="size-4.5" /> : <FolderIcon className="size-4.5" />}
      </span>
      <div className="flex flex-col gap-1">
        <span className="font-medium">{folder === "trash" ? "Nothing deleted" : "No notes here yet"}</span>
        <span className="text-pretty text-muted-foreground text-xs">
          {folder === "trash" ? "Deleted notes stay here until you restore them." : "Start one and it'll show up here."}
        </span>
      </div>
      {folder !== "trash" && (
        <Button className={press} onClick={newNote} size="sm" variant="outline">
          <SquarePenIcon /> New note
        </Button>
      )}
    </div>
  );

  return (
    <div className={cn("@container relative isolate flex h-[760px] w-full overflow-hidden bg-background text-foreground text-sm", className)}>
      <aside className="hidden w-56 shrink-0 flex-col gap-5 border-r bg-muted/40 p-3 @5xl:flex">
        <div className="flex items-center gap-2.5 px-1.5 pt-1">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <NotebookPenIcon className="size-4" />
          </span>
          <span className="font-heading font-semibold">Notes</span>
        </div>
        {folderList}
      </aside>

      <section
        aria-label="Notes"
        className={cn("min-w-0 flex-1 flex-col border-r @3xl:flex @3xl:w-80 @3xl:flex-none", view === "list" ? "flex" : "hidden")}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 px-3">
          <Menu>
            <MenuTrigger
              className={cn("flex h-8 min-w-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 font-heading font-semibold text-base hover:bg-accent data-popup-open:bg-accent @5xl:pointer-events-none @5xl:px-1", ring)}
            >
              <span className="truncate">{folderName(folder)}</span>
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground @5xl:hidden" />
            </MenuTrigger>
            <MenuPopup align="start" className={cn("w-56", menuPop)}>
              <MenuRadioGroup onValueChange={(v) => setFolder(v as string)} value={folder}>
                <MenuRadioItem value="all">All notes</MenuRadioItem>
                {folders.map((f) => (
                  <MenuRadioItem key={f.id} value={f.id}>
                    <span className="flex items-center gap-2">
                      <span className={cn("size-2 rounded-full", tones[f.tone])} />
                      {f.name}
                    </span>
                  </MenuRadioItem>
                ))}
                <MenuRadioItem value="trash">Recently deleted</MenuRadioItem>
              </MenuRadioGroup>
            </MenuPopup>
          </Menu>
          <span className="text-muted-foreground text-xs tabular-nums">{visible.length}</span>
          <Button aria-label="New note" className={cn("ms-auto", press)} onClick={newNote} size="icon-sm" variant="ghost">
            <SquarePenIcon />
          </Button>
        </div>
        <div className="px-3 pb-2">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search notes"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("");
              }}
              placeholder="Search"
              value={query}
            />
            {query && (
              <InputGroupAddon align="inline-end">
                <Button aria-label="Clear search" onClick={() => setQuery("")} size="icon-xs" variant="ghost">
                  <XIcon />
                </Button>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-6">
          {visible.length === 0 ? (
            emptyList
          ) : (
            <LayoutGroup id="notes-list">
              {pinned.length > 0 && (
                <>
                  <h3 className="flex items-center gap-1.5 px-3 pt-2 pb-1 font-medium text-muted-foreground text-xs">
                    <PinIcon className="size-3" /> Pinned
                  </h3>
                  <ul className="flex flex-col gap-0.5">
                    <AnimatePresence initial={false}>{pinned.map(noteRow)}</AnimatePresence>
                  </ul>
                </>
              )}
              {rest.length > 0 && (
                <>
                  {pinned.length > 0 && <h3 className="px-3 pt-4 pb-1 font-medium text-muted-foreground text-xs">Notes</h3>}
                  <ul className="flex flex-col gap-0.5">
                    <AnimatePresence initial={false}>{rest.map(noteRow)}</AnimatePresence>
                  </ul>
                </>
              )}
            </LayoutGroup>
          )}
        </div>
      </section>

      <section aria-label="Editor" className={cn("min-w-0 flex-1 flex-col @3xl:flex", view === "editor" ? "flex" : "hidden")}>
        {note ? (
          <>
            <div className="flex h-14 shrink-0 items-center gap-1 px-3">
              <Button className="-ms-1 @3xl:hidden" onClick={() => setView("list")} size="sm" variant="ghost">
                <ChevronLeftIcon /> {folderName(folder)}
              </Button>
              <div className="hidden min-w-0 items-center gap-1.5 text-muted-foreground text-xs @3xl:flex">
                {note.deleted ? (
                  <span>In Recently deleted</span>
                ) : (
                  <Menu>
                    <MenuTrigger className={cn("flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-1.5 hover:bg-accent hover:text-foreground data-popup-open:bg-accent", ring)}>
                      <span className={cn("size-1.5 rounded-full", tones[folders.find((f) => f.id === note.folderId)?.tone ?? "amber"])} />
                      {folderName(note.folderId)}
                      <ChevronDownIcon className="size-3.5" />
                    </MenuTrigger>
                    <MenuPopup align="start" className={cn("w-48", menuPop)}>
                      <MenuGroup>
                        <MenuGroupLabel>Move to</MenuGroupLabel>
                        <MenuRadioGroup onValueChange={(v) => touch(note.id, () => ({ folderId: v as string }))} value={note.folderId}>
                          {folders.map((f) => (
                            <MenuRadioItem key={f.id} value={f.id}>
                              <span className="flex items-center gap-2">
                                <span className={cn("size-2 rounded-full", tones[f.tone])} />
                                {f.name}
                              </span>
                            </MenuRadioItem>
                          ))}
                        </MenuRadioGroup>
                      </MenuGroup>
                    </MenuPopup>
                  </Menu>
                )}
                <span aria-hidden>·</span>
                <span className="truncate tabular-nums">Edited {relDate(note.updatedAt, now).long}</span>
              </div>
              <div className="ms-auto flex items-center gap-0.5">
                {note.deleted ? (
                  <Button className={press} onClick={() => restore(note.id)} size="sm" variant="outline">
                    <RotateCcwIcon /> Restore
                  </Button>
                ) : (
                  <>
                    <div aria-label="Formatting" className="flex items-center gap-0.5" role="toolbar">
                      {blockTypes.map((t) => {
                        const active = focusedType === t.value;
                        return (
                          <button
                            aria-label={`Turn into ${t.label.toLowerCase()}`}
                            aria-pressed={active}
                            className={cn(
                              "relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg [&_svg]:size-4 sm:size-7",
                              ring,
                              press,
                              active ? "text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                              "disabled:pointer-events-none disabled:opacity-40",
                            )}
                            disabled={!focusedBlock}
                            key={t.value}
                            onClick={() => focusedBlock && convert(focusedBlock, t.value)}
                            onMouseDown={(e) => e.preventDefault()}
                            title={t.label}
                            type="button"
                          >
                            {active && (
                              <motion.span
                                className="absolute inset-0 rounded-lg bg-accent"
                                layoutId="notes-blocktype"
                                transition={reduce ? { duration: 0 } : spring}
                              />
                            )}
                            <span className="relative flex">{t.icon}</span>
                          </button>
                        );
                      })}
                    </div>
                    <span aria-hidden className="mx-1.5 h-4 w-px bg-border" />
                    <Button
                      aria-label={note.pinned ? "Unpin note" : "Pin note"}
                      aria-pressed={!!note.pinned}
                      className={cn(press, note.pinned && "text-foreground")}
                      onClick={() => setNotes((all) => all.map((n) => (n.id === note.id ? { ...n, pinned: !n.pinned } : n)))}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <motion.span
                        animate={{ scale: 1 }}
                        className="flex"
                        initial={reduce ? false : { scale: 0.8 }}
                        key={String(note.pinned)}
                        transition={{ duration: 0.18, ease: easeOut }}
                      >
                        <PinIcon className={cn(note.pinned && "fill-current")} />
                      </motion.span>
                    </Button>
                    <Button aria-label="Delete note" className={press} onClick={() => removeNote(note.id)} size="icon-sm" variant="ghost">
                      <Trash2Icon />
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <motion.article
                animate={{ opacity: 1 }}
                className="mx-auto flex max-w-2xl flex-col px-5 pt-6 pb-24 @3xl:px-12 @3xl:pt-10"
                initial={reduce ? false : { opacity: 0 }}
                key={note.id}
                transition={{ duration: 0.12, ease: "easeOut" }}
              >
                <AutoText
                  aria-label="Title"
                  className="font-heading font-semibold text-2xl tracking-tight @3xl:text-3xl"
                  inputRef={(el) => {
                    titleRef.current = el;
                  }}
                  onChange={(e) => touch(note.id, () => ({ title: e.target.value.replace(/\n/g, "") }))}
                  onFocus={() => setFocusedBlock(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || (e.key === "ArrowDown" && e.currentTarget.selectionStart === e.currentTarget.value.length)) {
                      e.preventDefault();
                      if (note.blocks[0]) setPending({ id: note.blocks[0].id, at: "start" });
                    }
                  }}
                  placeholder="Title"
                  readOnly={note.deleted}
                  value={note.title}
                />
                <div className="mt-2 mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-b pb-5 text-muted-foreground text-xs">
                  <span className="tabular-nums">{words} words</span>
                  {stats.total > 0 && (
                    <span className="flex items-center gap-1.5 tabular-nums">
                      <ProgressRing done={stats.done} total={stats.total} />
                      {stats.done} of {stats.total} done
                    </span>
                  )}
                  <span className="tabular-nums @3xl:hidden">Edited {relDate(note.updatedAt, now).long}</span>
                </div>
                {note.blocks.map((block, i) => {
                  const prevType = note.blocks[i - 1]?.type;
                  const spacing =
                    block.type === "h1"
                      ? "mt-5"
                      : block.type === "h2"
                        ? i === 0
                          ? ""
                          : "mt-5 mb-0.5"
                        : (block.type === "todo" || block.type === "bullet") && prevType === block.type
                          ? "mt-0.5"
                          : i === 0
                            ? ""
                            : "mt-2";
                  const input = (
                    <AutoText
                      aria-label={block.type === "todo" ? "Checklist item" : block.type === "bullet" ? "Bullet" : block.type === "p" ? "Text" : "Heading"}
                      className={cn(
                        blockStyles[block.type],
                        block.type === "todo" && block.done && "text-muted-foreground line-through decoration-muted-foreground/50",
                        "transition-colors duration-200",
                      )}
                      inputRef={(el) => {
                        if (el) blockRefs.current.set(block.id, el);
                        else blockRefs.current.delete(block.id);
                      }}
                      onBlur={() => setFocusedBlock((f) => (f === block.id ? null : f))}
                      onChange={(e) => onBlockChange(block, e.target.value)}
                      onFocus={() => setFocusedBlock(block.id)}
                      onKeyDown={(e) => onBlockKey(e, block, i)}
                      placeholder={
                        note.blocks.length === 1 && block.type === "p"
                          ? "Start writing. Type “[] ” for a checklist, “# ” for a heading."
                          : block.type === "todo"
                            ? "To-do"
                            : block.type === "bullet"
                              ? "List item"
                              : block.type === "p"
                                ? ""
                                : "Heading"
                      }
                      readOnly={note.deleted}
                      value={block.text}
                    />
                  );
                  return (
                    <div className={cn("flex items-start gap-2.5", spacing)} key={block.id}>
                      {block.type === "todo" ? (
                        <CheckBox
                          checked={!!block.done}
                          label={block.text || "To-do"}
                          onToggle={() => !note.deleted && patchBlock(block.id, { done: !block.done })}
                        />
                      ) : block.type === "bullet" ? (
                        <span aria-hidden className="flex h-7 w-4.5 shrink-0 items-center justify-center">
                          <span className="size-1.5 rounded-full bg-foreground/60" />
                        </span>
                      ) : null}
                      <div className="min-w-0 flex-1">{input}</div>
                    </div>
                  );
                })}
                {!note.deleted && (
                  <button
                    aria-label="Add a line at the end"
                    className="mt-2 h-16 w-full cursor-text"
                    onClick={() => {
                      const last = note.blocks[note.blocks.length - 1];
                      if (last && !last.text.trim()) {
                        setPending({ id: last.id, at: "end" });
                        return;
                      }
                      const id = uid("b");
                      setBlocks((bs) => [...bs, { id, type: "p", text: "" }]);
                      setPending({ id, at: "start" });
                    }}
                    tabIndex={-1}
                    type="button"
                  />
                )}
              </motion.article>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <NotebookPenIcon className="size-4.5" />
            </span>
            <span className="font-medium">No note selected</span>
            <Button className={press} onClick={newNote} size="sm" variant="outline">
              <SquarePenIcon /> New note
            </Button>
          </div>
        )}
      </section>

      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-3">
        <AnimatePresence>
          {undo && (
            <motion.div
              animate={{ y: 0, opacity: 1, scale: 1 }}
              className="pointer-events-auto flex items-center gap-1 rounded-full bg-primary p-1 ps-4 text-primary-foreground shadow-lg/15 dark:border dark:bg-popover dark:text-popover-foreground"
              exit={{ y: 8, opacity: 0, scale: 0.97, transition: { duration: 0.12, ease: easeOut } }}
              initial={reduce ? { opacity: 0 } : { y: 16, opacity: 0, scale: 0.96 }}
              role="status"
              transition={reduce ? { duration: 0.15 } : spring}
            >
              <span className="pe-2">Moved to Recently deleted</span>
              <button
                className={cn(
                  "flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 hover:bg-primary-foreground/12 focus-visible:ring-2 focus-visible:ring-primary-foreground/40 dark:hover:bg-accent dark:focus-visible:ring-ring",
                  "outline-none",
                  press,
                )}
                onClick={() => {
                  restore(undo.id);
                  setSelectedId(undo.id);
                }}
                type="button"
              >
                <Undo2Icon className="size-3.5 opacity-80" /> Undo
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
