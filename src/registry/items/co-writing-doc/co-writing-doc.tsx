"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import {
  BoldIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileTextIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  MessageSquarePlusIcon,
  MessageSquareTextIcon,
  QuoteIcon,
  RedoIcon,
  Share2Icon,
  SparklesIcon,
  StrikethroughIcon,
  UnderlineIcon,
  UndoIcon,
  XIcon,
} from "lucide-react";
import { Fragment, type ReactNode, useEffect, useId, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type CollaboratorTone = "info" | "success" | "violet" | "warning";

export interface Collaborator {
  id: string;
  name: string;
  initials: string;
  tone: CollaboratorTone;
  agent?: boolean;
}

export interface DocComment {
  id: string;
  block: string;
  author: string;
  text: string;
  time: string;
  reply?: { author: string; text: string };
}

export interface DocSuggestion {
  block: string;
  text: string;
  note: string;
}

export interface CoWritingDocProps {
  title?: string;
  people?: Collaborator[];
  comments?: DocComment[];
  suggestions?: DocSuggestion[];
  writer?: string;
  className?: string;
}

const toneCls: Record<CollaboratorTone, { caret: string; tag: string; soft: string; avatar: string; mark: string; text: string; border: string }> = {
  info: {
    caret: "bg-info",
    tag: "bg-blue-600 text-white",
    soft: "bg-info/12",
    avatar: "bg-info/16 text-info-foreground",
    mark: "decoration-info/60",
    text: "text-info-foreground",
    border: "border-info/32",
  },
  success: {
    caret: "bg-success",
    tag: "bg-emerald-600 text-white",
    soft: "bg-success/16",
    avatar: "bg-success/16 text-success-foreground",
    mark: "decoration-success/60",
    text: "text-success-foreground",
    border: "border-success/32",
  },
  violet: {
    caret: "bg-violet-500",
    tag: "bg-violet-600 text-white",
    soft: "bg-violet-500/14",
    avatar: "bg-violet-500/16 text-violet-700 dark:text-violet-300",
    mark: "decoration-violet-500/60",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-500/32",
  },
  warning: {
    caret: "bg-warning",
    tag: "bg-amber-600 text-white",
    soft: "bg-warning/14",
    avatar: "bg-warning/18 text-warning-foreground",
    mark: "decoration-warning/70",
    text: "text-warning-foreground",
    border: "border-warning/32",
  },
};

const defaultPeople: Collaborator[] = [
  { id: "mina", name: "Mina Park", initials: "MP", tone: "info" },
  { id: "scout", name: "Scout", initials: "S", tone: "success", agent: true },
  { id: "quill", name: "Quill", initials: "Q", tone: "violet", agent: true },
  { id: "theo", name: "Theo Brandt", initials: "TB", tone: "warning" },
];

type Block =
  | { id: string; type: "h1" | "h2"; text: string }
  | { id: string; type: "p"; text: string; mark?: { phrase: string; by: string } }
  | { id: string; type: "li"; text: string; mark?: { phrase: string; by: string } };

const blocks: Block[] = [
  { id: "title", type: "h1", text: "Orbit Calendar: launch narrative" },
  { id: "h-why", type: "h2", text: "Why now" },
  {
    id: "why",
    type: "p",
    text: "Small agencies run their week on calendars that were built for one person. Producers juggle three or four of them, and most clashes are found the morning they happen.",
    mark: { phrase: "built for one person", by: "scout" },
  },
  {
    id: "gap",
    type: "p",
    text: "Nobody owns the shared view. Studio leads keep a spreadsheet on the side, and it is out of date by Tuesday.",
  },
  { id: "h-story", type: "h2", text: "The story we tell" },
  {
    id: "story",
    type: "p",
    text: "Orbit Calendar is the planner the whole studio shares. Every booking, shoot and deadline sits on one page.",
  },
  {
    id: "promise",
    type: "p",
    text: "We lead with time saved, not features.",
  },
  { id: "h-proof", type: "h2", text: "Proof points" },
  { id: "p1", type: "li", text: "Pilot studios cut scheduling clashes by 41% in six weeks.", mark: { phrase: "41% in six weeks", by: "mina" } },
  { id: "p2", type: "li", text: "Producers saved about three hours a week on planning." },
  { id: "p3", type: "li", text: "Nine of twelve interviewed agencies use three or more calendars today." },
];

const defaultComments: DocComment[] = [
  {
    id: "c1",
    block: "why",
    author: "scout",
    text: "Source for this: 9 of 12 interviewed agencies run three or more calendars. Want me to add the quote?",
    time: "2m",
  },
  {
    id: "c2",
    block: "p1",
    author: "mina",
    text: "Can we lead with the agency count instead? It's the stronger number.",
    time: "14m",
    reply: { author: "scout", text: "Moved it up in the outline. Kept 41% as the second point." },
  },
];

const defaultSuggestions: DocSuggestion[] = [
  {
    block: "story",
    text: " No more checking three apps to know who's free on Thursday.",
    note: "Added a concrete moment so the promise lands.",
  },
  {
    block: "promise",
    text: " Three hours back every week is the headline.",
    note: "Turned the principle into the number we lead with.",
  },
];

function Caret({ person, label, layoutId, idle }: { person: Collaborator; label?: string; layoutId: string; idle?: boolean }) {
  const t = toneCls[person.tone];
  const reduce = useReducedMotion();
  const text = label ?? person.name;
  const [tag, setTag] = useState(true);
  useEffect(() => {
    setTag(true);
    const id = setTimeout(() => setTag(false), 1800);
    return () => clearTimeout(id);
  }, [text]);
  return (
    <motion.span
      aria-hidden
      className="group/caret relative inline-block h-[1.15em] w-0 translate-y-[0.18em] align-baseline"
      layoutId={layoutId}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
    >
      <span className="absolute -inset-x-1.5 -top-1.5 bottom-0" />
      <motion.span
        animate={idle && !reduce ? { opacity: [1, 1, 0.25, 1] } : { opacity: 1 }}
        className={cn("absolute inset-y-0 -left-px w-0.5 rounded-full", t.caret)}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
      <span className={cn("absolute -top-1 -left-px size-1.5 rounded-[calc(var(--radius)*0.2)] transition-opacity duration-200", t.caret, tag ? "opacity-0" : "opacity-100 group-hover/caret:opacity-0")} />
      <span
        className={cn(
          "pointer-events-none absolute bottom-full -left-px mb-0.5 inline-flex origin-bottom-left items-center gap-1 whitespace-nowrap rounded-md rounded-bl-none px-1.5 py-px font-medium font-sans text-[10px] leading-4 shadow-xs/5 transition-[opacity,scale] duration-200 ease-out",
          t.tag,
          tag ? "scale-100 opacity-100" : "scale-95 opacity-0 group-hover/caret:scale-100 group-hover/caret:opacity-100",
        )}
      >
        {person.agent && <SparklesIcon className="size-2.5" />}
        {text}
      </span>
    </motion.span>
  );
}

const minaStops = [
  { block: "gap", after: "shared view." },
  { block: "gap", after: "spreadsheet" },
  { block: "p2", after: "three hours" },
  { block: "gap", after: "Tuesday." },
];

export function CoWritingDoc({
  title = "Orbit Calendar: launch narrative",
  people = defaultPeople,
  comments: initialComments = defaultComments,
  suggestions = defaultSuggestions,
  writer = "quill",
  className,
}: CoWritingDocProps) {
  const reduce = useReducedMotion();
  const group = useId();
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<string | null>(null);
  const [sIndex, setSIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [comments, setComments] = useState(initialComments);
  const [resolved, setResolved] = useState<string[]>([]);
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [openInline, setOpenInline] = useState<string | null>(null);
  const [mina, setMina] = useState(0);
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [marks, setMarks] = useState<string[]>([]);

  const byId = (pid: string) => people.find((p) => p.id === pid) ?? people[0];
  const quill = byId(writer);
  const suggestion = suggestions[sIndex];
  const typing = Boolean(suggestion) && typed < (suggestion?.text.length ?? 0);
  const pending = Boolean(suggestion) && !typing;

  useEffect(() => {
    if (!suggestion) return;
    if (reduce) {
      setTyped(suggestion.text.length);
      return;
    }
    if (typed >= suggestion.text.length) return;
    const delay = typed === 0 ? 1600 : suggestion.text[typed - 1] === " " ? 70 : 38;
    const t = setTimeout(() => setTyped((n) => n + 1), delay);
    return () => clearTimeout(t);
  }, [suggestion, typed, reduce]);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setMina((m) => (m + 1) % minaStops.length), 3400);
    return () => clearInterval(t);
  }, [reduce]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(t);
  }, [flash]);

  const resolveSuggestion = (accept: boolean) => {
    if (!suggestion) return;
    if (accept) {
      setExtra((e) => ({ ...e, [suggestion.block]: (e[suggestion.block] ?? "") + suggestion.text }));
      setFlash(suggestion.block);
    }
    setTyped(0);
    setSIndex((i) => i + 1);
  };

  const replay = () => {
    setExtra({});
    setTyped(0);
    setSIndex(0);
    setResolved([]);
    setComments(initialComments);
  };

  const visibleComments = comments.filter((c) => !resolved.includes(c.id));
  const minaStop = minaStops[mina];
  const scout = byId("scout");
  const minaP = byId("mina");

  const renderText = (b: Block) => {
    const base = b.text + (extra[b.id] ?? "");
    const parts: ReactNode[] = [];
    const rawMark = "mark" in b ? b.mark : undefined;
    const markFrom = rawMark ? base.indexOf(rawMark.phrase) : -1;
    const mark = rawMark && markFrom >= 0 ? { from: markFrom, to: markFrom + rawMark.phrase.length, by: rawMark.by } : undefined;
    const stopAt = minaStop.block === b.id ? base.indexOf(minaStop.after) : -1;
    const cursorAt = stopAt >= 0 ? stopAt + minaStop.after.length : -1;

    const cuts = new Set<number>([0, base.length]);
    if (mark) {
      cuts.add(mark.from);
      cuts.add(mark.to);
    }
    if (cursorAt >= 0) cuts.add(Math.min(cursorAt, base.length));
    const points = [...cuts].sort((a, z) => a - z);
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];
      if (from === cursorAt) parts.push(<Caret key={`c-${from}`} layoutId={`${group}-mina`} person={minaP} />);
      const seg = base.slice(from, to);
      const inMark = mark && from >= mark.from && to <= mark.to;
      if (inMark && mark) {
        const who = byId(mark.by);
        const comment = visibleComments.find((c) => c.block === b.id);
        parts.push(
          <span
            className={cn(
              "rounded-[calc(var(--radius)*0.3)] underline decoration-2 underline-offset-4 transition-colors",
              toneCls[who.tone].soft,
              toneCls[who.tone].mark,
              comment && activeComment === comment.id && "ring-2 ring-current/10",
            )}
            key={`m-${from}`}
          >
            {seg}
          </span>,
        );
        if (mark.by === "scout" && to === mark.to)
          parts.push(<Caret idle key="scout" label="Scout · reading" layoutId={`${group}-scout`} person={scout} />);
      } else {
        parts.push(<Fragment key={`t-${from}`}>{seg}</Fragment>);
      }
    }
    if (cursorAt >= base.length && cursorAt >= 0 && !points.includes(cursorAt))
      parts.push(<Caret key="c-end" layoutId={`${group}-mina`} person={minaP} />);

    if (flash === b.id) {
      return (
        <>
          {parts}
          <motion.span
            animate={{ opacity: [0.9, 0] }}
            className="ms-1 inline-flex translate-y-[-1px] items-center gap-1 rounded-full bg-success/12 px-1.5 align-middle font-medium font-sans text-[10px] text-success-foreground"
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
          >
            <CheckIcon className="size-2.5" />
            Accepted
          </motion.span>
        </>
      );
    }

    if (suggestion && suggestion.block === b.id) {
      parts.push(
        <span
          className={cn("rounded-[calc(var(--radius)*0.3)] underline decoration-dotted underline-offset-4", toneCls[quill.tone].soft, toneCls[quill.tone].text, toneCls[quill.tone].mark)}
          key="sugg"
        >
          {suggestion.text.slice(0, typed)}
        </span>,
      );
      parts.push(
        <Caret
          idle={pending}
          key="quill"
          label={typing ? `${quill.name} · suggesting` : `${quill.name} · waiting`}
          layoutId={`${group}-quill`}
          person={quill}
        />,
      );
      if (pending) {
        parts.push(
          <motion.span
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="ms-2 inline-flex origin-left translate-y-[-2px] items-center gap-0.5 rounded-lg border bg-popover p-0.5 align-middle font-sans text-xs shadow-sm/5"
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            key="actions"
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <button
              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 font-medium text-success-foreground outline-none transition-[background-color,scale] duration-150 ease-out hover:bg-success/10 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
              onClick={() => resolveSuggestion(true)}
              type="button"
            >
              <CheckIcon className="size-3.5" />
              Accept
            </button>
            <button
              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-muted-foreground outline-none transition-[background-color,color,scale] duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
              onClick={() => resolveSuggestion(false)}
              type="button"
            >
              <XIcon className="size-3.5" />
              Reject
            </button>
          </motion.span>,
        );
      }
    } else if (!suggestion && b.id === suggestions.at(-1)?.block) {
      parts.push(<Caret idle key="quill-rest" label={`${quill.name} · idle`} layoutId={`${group}-quill`} person={quill} />);
    }
    return parts;
  };

  const commentCard = (c: DocComment, compact = false) => {
    const a = byId(c.author);
    const anchor = blocks.find((b) => b.id === c.block);
    const quote = anchor && "mark" in anchor ? anchor.mark : undefined;
    const r = c.reply ? byId(c.reply.author) : null;
    return (
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          "rounded-xl border bg-card px-3 pt-2.5 pb-3 text-left shadow-xs/5 transition-[border-color,box-shadow]",
          activeComment === c.id && "border-foreground/16 shadow-sm/5",
          compact && "mt-2",
        )}
        exit={{ opacity: 0, x: 12, height: 0, marginTop: 0, padding: 0 }}
        initial={{ opacity: 0, x: 12 }}
        layout
        onMouseEnter={() => setActiveComment(c.id)}
        onMouseLeave={() => setActiveComment(null)}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
      >
        <div className="flex h-6 items-center gap-2">
          <Avatar className={cn("size-5", a.agent && "rounded-md")}>
            <AvatarFallback className={cn("font-medium text-[9px]", toneCls[a.tone].avatar, a.agent && "rounded-md")}>
              {a.agent ? <SparklesIcon className="size-3" /> : a.initials}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-xs">{a.name}</span>
          <span className="text-[11px] text-muted-foreground tabular-nums">{c.time}</span>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="Resolve"
                  className="ms-auto -me-1 text-muted-foreground"
                  onClick={() => setResolved((r) => [...r, c.id])}
                  size="icon-xs"
                  variant="ghost"
                />
              }
            >
              <CheckIcon />
            </TooltipTrigger>
            <TooltipPopup>Resolve</TooltipPopup>
          </Tooltip>
        </div>
        {quote && (
          <p className="mt-2 flex items-stretch gap-2 text-muted-foreground text-xs">
            <span aria-hidden className={cn("w-0.5 shrink-0 rounded-full opacity-64", toneCls[byId(quote.by).tone].caret)} />
            <span className="truncate">{quote.phrase}</span>
          </p>
        )}
        <p className="mt-1.5 text-pretty text-xs leading-relaxed">{c.text}</p>
        {c.reply && r && (
          <div className="mt-2.5 flex gap-2 border-t pt-2.5">
            <Avatar className={cn("size-5 shrink-0", r.agent && "rounded-md")}>
              <AvatarFallback className={cn("font-medium text-[9px]", toneCls[r.tone].avatar, r.agent && "rounded-md")}>
                {r.agent ? <SparklesIcon className="size-3" /> : r.initials}
              </AvatarFallback>
            </Avatar>
            <p className="text-muted-foreground text-xs leading-relaxed">
              <span className="font-medium text-foreground">{r.name}</span> {c.reply.text}
            </p>
          </div>
        )}
        {draftFor === c.id ? (
          <form
            className="mt-2.5 flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              setComments((cs) => cs.map((x) => (x.id === c.id ? { ...x, reply: { author: "theo", text: draft.trim() } } : x)));
              setDraft("");
              setDraftFor(null);
            }}
          >
            <label className="sr-only" htmlFor={`${group}-${c.id}-reply`}>
              Reply
            </label>
            <input
              autoFocus
              className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs outline-none focus:border-ring dark:bg-input/32"
              id={`${group}-${c.id}-reply`}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setDraftFor(null)}
              placeholder="Reply…"
              value={draft}
            />
            <Button size="xs" type="submit">
              Send
            </Button>
          </form>
        ) : (
          <button
            className="mt-2.5 flex h-7 w-full cursor-text items-center rounded-md border border-input bg-background px-2 text-muted-foreground text-xs outline-none hover:border-foreground/16 focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/32"
            onClick={() => setDraftFor(c.id)}
            type="button"
          >
            Reply…
          </button>
        )}
      </motion.div>
    );
  };

  const toolbar: { icon: typeof BoldIcon; label: string; kbd?: string; wide?: boolean }[] = [
    { icon: BoldIcon, label: "Bold", kbd: "⌘B" },
    { icon: ItalicIcon, label: "Italic", kbd: "⌘I" },
    { icon: UnderlineIcon, label: "Underline", kbd: "⌘U", wide: true },
    { icon: StrikethroughIcon, label: "Strikethrough", wide: true },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delay={400}>
      <div
        className={cn(
          "@container relative flex h-[760px] w-full flex-col overflow-hidden bg-background text-foreground text-sm",
          className,
        )}
        onKeyDown={(e) => {
          if (!pending || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            resolveSuggestion(true);
          } else if (e.key === "Backspace") {
            e.preventDefault();
            resolveSuggestion(false);
          }
        }}
      >
        <header className="flex h-12 shrink-0 items-center gap-3 border-b px-3 @3xl:px-4">
          <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 text-muted-foreground">
            <span className="hidden items-center gap-1 @md:flex">
              <span className="px-1">Orbit</span>
              <ChevronRightIcon className="size-3.5 opacity-56" />
              <span className="px-1">Marketing</span>
              <ChevronRightIcon className="size-3.5 opacity-56" />
            </span>
            <FileTextIcon className="ms-1 size-4 shrink-0" />
            <span aria-current="page" className="truncate px-1 font-medium text-foreground">
              {title}
            </span>
          </nav>
          <div className="hidden items-center gap-1.5 text-muted-foreground text-xs @2xl:flex">
            <span className="size-1.5 rounded-full bg-success" />
            Saved · {people.filter((p) => p.agent).length} agents editing
          </div>
          <div className="flex -space-x-1">
            {people.map((p) => (
              <Tooltip key={p.id}>
                <TooltipTrigger
                  render={
                    <span
                      aria-label={`${p.name}${p.agent ? " (agent)" : ""}`}
                      className={cn("relative rounded-full ring-2 ring-background", p.id === "theo" && "hidden @md:inline-flex")}
                      role="img"
                    />
                  }
                >
                  <Avatar className={cn("size-7 bg-background", p.agent && "rounded-lg")}>
                    <AvatarFallback className={cn("text-[10px]", toneCls[p.tone].avatar, p.agent && "rounded-lg")}>
                      {p.agent ? <SparklesIcon className="size-3.5" /> : p.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className={cn("absolute -bottom-0.5 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full", toneCls[p.tone].caret)} />
                </TooltipTrigger>
                <TooltipPopup>
                  {p.name}
                  {p.agent ? " · agent" : ""}
                </TooltipPopup>
              </Tooltip>
            ))}
          </div>
          <Button className="hidden @md:inline-flex" size="sm">
            <Share2Icon />
            Share
          </Button>
        </header>

        <div className="flex h-11 shrink-0 items-center gap-0.5 overflow-x-auto border-b px-2 [scrollbar-width:none] @3xl:px-3" role="toolbar" aria-label="Formatting">
          <Button aria-label="Undo" size="icon-sm" variant="ghost">
            <UndoIcon />
          </Button>
          <Button aria-label="Redo" size="icon-sm" variant="ghost">
            <RedoIcon />
          </Button>
          <span className="mx-1.5 h-5 w-px shrink-0 bg-border" />
          <Button className="shrink-0" size="sm" variant="ghost">
            Body
            <ChevronDownIcon className="opacity-60" />
          </Button>
          <span className="mx-1.5 h-5 w-px shrink-0 bg-border" />
          {toolbar.map((t) => (
            <Tooltip key={t.label}>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={t.label}
                    aria-pressed={marks.includes(t.label)}
                    className={cn(t.wide && "hidden @md:inline-flex", marks.includes(t.label) && "bg-accent text-foreground")}
                    onClick={() => setMarks((m) => (m.includes(t.label) ? m.filter((x) => x !== t.label) : [...m, t.label]))}
                    size="icon-sm"
                    variant="ghost"
                  />
                }
              >
                <t.icon />
              </TooltipTrigger>
              <TooltipPopup>
                {t.label}
                {t.kbd && <Kbd className="ms-1.5">{t.kbd}</Kbd>}
              </TooltipPopup>
            </Tooltip>
          ))}
          <span className="mx-1.5 h-5 w-px shrink-0 bg-border" />
          <Button aria-label="Link" className="hidden @md:inline-flex" size="icon-sm" variant="ghost">
            <LinkIcon />
          </Button>
          <Button aria-label="List" className="hidden @md:inline-flex" size="icon-sm" variant="ghost">
            <ListIcon />
          </Button>
          <Button aria-label="Quote" className="hidden @md:inline-flex" size="icon-sm" variant="ghost">
            <QuoteIcon />
          </Button>
          <Button aria-label="Add comment" size="icon-sm" variant="ghost">
            <MessageSquarePlusIcon />
          </Button>
          <div className="ms-auto flex shrink-0 items-center gap-1.5 ps-2">
            {!suggestion && (
              <Button onClick={replay} size="sm" variant="ghost">
                Replay
              </Button>
            )}
            <Button size="sm" variant="outline">
              <SparklesIcon />
              <span className="hidden @md:inline">Ask an agent</span>
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <LayoutGroup id={group}>
            <article className="mx-auto grid max-w-5xl grid-cols-1 gap-x-8 px-5 pt-10 pb-24 @4xl:grid-cols-[minmax(0,1fr)_16rem] @4xl:px-10">
              {blocks.map((b, i) => {
                const anchored = visibleComments.filter((c) => c.block === b.id);
                const prevIsLi = blocks[i - 1]?.type === "li";
                return (
                  <Fragment key={b.id}>
                    <div
                      className={cn(
                        "relative min-w-0",
                        b.type === "h1" && "mb-2",
                        b.type === "h2" && "mt-7 mb-2",
                        b.type === "p" && "mb-4",
                        b.type === "li" && cn("mb-1.5 ps-5", !prevIsLi && "mt-1"),
                      )}
                    >
                      {b.type === "h1" ? (
                        <h1 className="font-heading font-semibold text-2xl tracking-tight @3xl:text-3xl">{renderText(b)}</h1>
                      ) : b.type === "h2" ? (
                        <h2 className="font-heading font-semibold text-lg tracking-tight">{renderText(b)}</h2>
                      ) : (
                        <p className="text-[15px] text-foreground/88 leading-7">
                          {b.type === "li" && (
                            <span aria-hidden className="absolute top-[0.8em] left-1.5 size-1.5 rounded-full bg-muted-foreground/60" />
                          )}
                          {renderText(b)}
                        </p>
                      )}
                      {b.type === "h1" && (
                        <div className="mt-3 mb-6 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-muted-foreground text-xs">
                          <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground/80">Draft</span>
                          <span className="flex items-center gap-1.5">
                            <span className="flex -space-x-1">
                              {people
                                .filter((p) => p.id !== "theo")
                                .map((p) => (
                                  <Avatar className={cn("size-4 ring-2 ring-background", p.agent && "rounded-[calc(var(--radius)*0.5)]")} key={p.id}>
                                    <AvatarFallback className={cn("font-medium text-[7px]", toneCls[p.tone].avatar, p.agent && "rounded-[calc(var(--radius)*0.5)]")}>
                                      {p.agent ? <SparklesIcon className="size-2.5" /> : p.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                            </span>
                            Mina Park, Scout and Quill
                          </span>
                          <span aria-hidden className="hidden @md:inline">
                            ·
                          </span>
                          <span>Edited just now</span>
                        </div>
                      )}

                      {anchored.length > 0 && (
                        <div className="@4xl:hidden">
                          <button
                            aria-expanded={openInline === b.id}
                            className="mt-1 inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-full border bg-card px-2 text-muted-foreground text-xs hover:text-foreground"
                            onClick={() => setOpenInline(openInline === b.id ? null : b.id)}
                            type="button"
                          >
                            <MessageSquareTextIcon className="size-3" />
                            {anchored.length} {anchored.length === 1 ? "comment" : "comments"} · {byId(anchored[0].author).name}
                          </button>
                          <AnimatePresence initial={false}>
                            {openInline === b.id && (
                              <motion.div
                                animate={{ height: "auto", opacity: 1 }}
                                className="overflow-hidden"
                                exit={{ height: 0, opacity: 0 }}
                                initial={{ height: 0, opacity: 0 }}
                              >
                                {anchored.map((c) => (
                                  <Fragment key={c.id}>{commentCard(c, true)}</Fragment>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>

                    <aside aria-label={anchored.length ? "Comments" : undefined} className="relative hidden @4xl:block">
                      <AnimatePresence>
                        {anchored.map((c) => (
                          <div className="absolute inset-x-0 top-0 z-10" key={c.id}>
                            {commentCard(c)}
                          </div>
                        ))}
                        {suggestion?.block === b.id && (
                          <motion.div
                            animate={{ opacity: 1, x: 0 }}
                            className={cn("absolute inset-x-0 top-0 z-10 rounded-xl border bg-card p-3 shadow-xs/5", toneCls[quill.tone].border)}
                            exit={{ opacity: 0, x: 12 }}
                            initial={{ opacity: 0, x: 12 }}
                            key={`s-${sIndex}`}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="size-5 rounded-md">
                                <AvatarFallback className={cn("rounded-md", toneCls[quill.tone].avatar)}>
                                  <SparklesIcon className="size-3" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-xs">{quill.name}</span>
                              <span className={cn("rounded-full px-1.5 text-[10px]", toneCls[quill.tone].avatar)}>suggestion</span>
                            </div>
                            <p className="mt-1.5 text-muted-foreground text-xs leading-relaxed">
                              {typing ? (
                                <span className="inline-flex items-center gap-1.5">
                                  Writing
                                  <span className="inline-flex gap-0.5">
                                    {[0, 1, 2].map((d) => (
                                      <motion.span
                                        animate={{ opacity: [0.25, 1, 0.25] }}
                                        className="size-1 rounded-full bg-current"
                                        key={d}
                                        transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }}
                                      />
                                    ))}
                                  </span>
                                </span>
                              ) : (
                                suggestion.note
                              )}
                            </p>
                            {pending && (
                              <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <Kbd>⌘↵</Kbd> accept
                                <Kbd className="ms-1">⌫</Kbd> reject
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </aside>
                  </Fragment>
                );
              })}
            </article>
          </LayoutGroup>
        </div>
      </div>
    </TooltipProvider>
    </MotionConfig>
  );
}
