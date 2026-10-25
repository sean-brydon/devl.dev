"use client";

import { ArrowRightIcon, BugIcon, CheckIcon, type LucideIcon, MailIcon, NotebookPenIcon, RotateCcwIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PromptTemplate {
  id: string;
  title: string;
  icon?: LucideIcon;
  template: string;
}

export interface FillInPromptsProps {
  templates?: PromptTemplate[];
  onUse?: (prompt: string, values: Record<string, string>) => void;
  className?: string;
}

const defaultTemplates: PromptTemplate[] = [
  {
    id: "email",
    title: "Cold email",
    icon: MailIcon,
    template:
      "Write a {tone:warm|direct|playful} email to {name} at {company} about {topic}, under {count:80|120|200} words.",
  },
  {
    id: "bug",
    title: "Bug report",
    icon: BugIcon,
    template:
      "Turn this into a bug report for {team:web|mobile|platform}: when I {action}, I expected {expected} but got {actual}.",
  },
  {
    id: "recap",
    title: "Meeting recap",
    icon: NotebookPenIcon,
    template: "Summarise my notes from the {meeting} into {count:3|5|7} decisions and owners, in a {tone:crisp|friendly} tone.",
  },
];

type Part = { kind: "text"; text: string } | { kind: "var"; name: string; options: string[]; slot: number };

function parse(template: string): Part[] {
  const parts: Part[] = [];
  const re = /\{([\w ]+?)(?::([^}]+))?\}/g;
  let last = 0;
  let slot = 0;
  for (const m of template.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ kind: "text", text: template.slice(last, at) });
    parts.push({ kind: "var", name: m[1] ?? "", options: m[2] ? m[2].split("|") : [], slot: slot++ });
    last = at + m[0].length;
  }
  if (last < template.length) parts.push({ kind: "text", text: template.slice(last) });
  return parts;
}

const tones = [
  { chip: "bg-violet-500/15", dot: "bg-violet-500" },
  { chip: "bg-sky-500/15", dot: "bg-sky-500" },
  { chip: "bg-amber-500/20", dot: "bg-amber-500" },
  { chip: "bg-emerald-500/15", dot: "bg-emerald-500" },
  { chip: "bg-rose-500/15", dot: "bg-rose-500" },
] as const;
const toneOf = (slot: number) => tones[slot % tones.length] ?? tones[0];
const spring = { type: "spring", stiffness: 460, damping: 36 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;
const press = "transition-[background-color,color,border-color,scale] duration-150 ease-out active:scale-[0.97]";
const blank = "rounded-md border px-1.5 font-medium leading-7";

type Piece = { kind: "text"; text: string } | { kind: "var"; part: Extract<Part, { kind: "var" }>; trail: string };
function pieces(parts: Part[]): Piece[] {
  const out: Piece[] = [];
  for (const p of parts) {
    const prev = out.at(-1);
    if (p.kind === "text" && prev?.kind === "var") {
      const m = /^[.,;:!?]+/.exec(p.text);
      if (m) {
        prev.trail = m[0];
        const rest = p.text.slice(m[0].length);
        if (rest) out.push({ kind: "text", text: rest });
        continue;
      }
    }
    out.push(p.kind === "text" ? p : { kind: "var", part: p, trail: "" });
  }
  return out;
}

export function FillInPrompts({ templates = defaultTemplates, onUse, className }: FillInPromptsProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const [activeId, setActiveId] = useState(templates[0]?.id ?? "");
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [focused, setFocused] = useState<string | null>(null);
  const [used, setUsed] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const usedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(usedTimer.current), []);

  const active = templates.find((t) => t.id === activeId) ?? templates[0];
  const parts = useMemo(() => parse(active?.template ?? ""), [active]);
  const vars = parts.filter((p): p is Extract<Part, { kind: "var" }> => p.kind === "var");
  const current = values[activeId] ?? {};
  const filled = vars.filter((v) => current[v.name]?.trim()).length;
  const ready = vars.length > 0 && filled === vars.length;
  const focusedVar = vars.find((v) => v.name === focused);
  inputs.current.length = vars.length;

  const set = (name: string, value: string) =>
    setValues((all) => ({ ...all, [activeId]: { ...(all[activeId] ?? {}), [name]: value } }));

  const assembled = parts
    .map((p) => (p.kind === "text" ? p.text : current[p.name]?.trim() || `{${p.name}}`))
    .join("");

  const onKey = (e: KeyboardEvent<HTMLInputElement>, slot: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = inputs.current[slot + 1];
      if (next) next.focus();
      else if (ready) use();
    }
  };

  const use = () => {
    if (!ready) return;
    onUse?.(assembled, current);
    setUsed(true);
    clearTimeout(usedTimer.current);
    usedTimer.current = setTimeout(() => setUsed(false), 1600);
  };

  return (
    <div className={cn("w-full max-w-lg rounded-2xl border bg-card text-sm shadow-xs/5", className)}>
      <div className="flex items-center gap-1 overflow-x-auto border-b p-1.5 [scrollbar-width:none]" role="tablist">
        {templates.map((t) => {
          const on = t.id === activeId;
          const Icon = t.icon;
          return (
            <button
              aria-selected={on}
              className={cn(
                "relative flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                press,
                on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              key={t.id}
              onClick={() => {
                setActiveId(t.id);
                setFocused(null);
                setUsed(false);
              }}
              role="tab"
              type="button"
            >
              {on && (
                <motion.span
                  className="absolute inset-0 rounded-lg bg-accent"
                  layoutId={`${uid}-tab`}
                  transition={reduce ? { duration: 0 } : spring}
                />
              )}
              {Icon && <Icon className="relative size-3.5" />}
              <span className="relative font-medium">{t.title}</span>
            </button>
          );
        })}
      </div>

      <div className="grid *:col-start-1 *:row-start-1">
        {templates.map((t) => (
          <p aria-hidden className="invisible mb-10 px-4 pt-4 text-[15px] leading-9" key={t.id}>
            {pieces(parse(t.template)).map((p, i) =>
              p.kind === "text" ? (
                <span key={i}>{p.text}</span>
              ) : (
                <span className="whitespace-nowrap" key={i}>
                  <span className={cn(blank, "inline-block")}>{p.part.name}</span>
                  {p.trail}
                </span>
              ),
            )}
          </p>
        ))}
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
          initial={reduce ? false : { opacity: 0, y: 4 }}
          key={activeId}
          role="tabpanel"
          transition={{ duration: 0.18, ease: easeOut }}
        >
          <p className="px-4 pt-4 text-[15px] text-foreground leading-9">
            {pieces(parts).map((piece, i) =>
              piece.kind === "text" ? (
                <span key={i}>{piece.text}</span>
              ) : (
                <span className="whitespace-nowrap" key={`${activeId}-${piece.part.name}`}>
                <InlineVar
                  inputRef={(el) => {
                    inputs.current[piece.part.slot] = el;
                  }}
                  name={piece.part.name}
                  onBlur={() => setFocused((f) => (f === piece.part.name ? null : f))}
                  onChange={(v) => set(piece.part.name, v)}
                  onFocus={() => setFocused(piece.part.name)}
                  onKeyDown={(e) => onKey(e, piece.part.slot)}
                  slot={piece.part.slot}
                  value={current[piece.part.name] ?? ""}
                />
                {piece.trail}
                </span>
              ),
            )}
          </p>

          <div className="h-10 px-4 pt-2">
            <AnimatePresence initial={false} mode="popLayout">
              {focusedVar && focusedVar.options.length > 0 ? (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5"
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
                  key={focusedVar.name}
                  transition={{ duration: 0.18, ease: easeOut }}
                >
                  <span className="text-muted-foreground text-xs">Try</span>
                  {focusedVar.options.map((o) => (
                    <button
                      className={cn(
                        "relative h-6 cursor-pointer rounded-full border px-2 text-xs outline-none after:absolute after:-inset-1 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                        press,
                        current[focusedVar.name] === o && "border-transparent bg-accent",
                      )}
                      key={o}
                      onClick={() => {
                        set(focusedVar.name, o);
                        inputs.current[focusedVar.slot + 1]?.focus();
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      type="button"
                    >
                      {o}
                    </button>
                  ))}
                </motion.div>
              ) : (
                <motion.p
                  animate={{ opacity: 1, y: 0 }}
                  className="text-muted-foreground text-xs leading-6"
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
                  key="hint"
                  transition={{ duration: 0.18, ease: easeOut }}
                >
                  {ready ? "All blanks filled. Ready to use." : "Type into the blanks. Enter jumps to the next one."}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

        </motion.div>
      </AnimatePresence>
      </div>

      <div className="mt-2 flex items-center gap-3 border-t px-4 py-3">
        <div aria-label={`${filled} of ${vars.length} filled`} className="flex items-center gap-1" role="img">
          {vars.map((v) => (
            <motion.span
              animate={{ width: current[v.name]?.trim() ? 16 : 6 }}
              className={cn(
                "h-1.5 rounded-full transition-colors duration-300",
                current[v.name]?.trim() ? toneOf(v.slot).dot : "bg-muted-foreground/25",
              )}
              initial={false}
              key={`${activeId}-${v.name}`}
              transition={spring}
            />
          ))}
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          {filled}/{vars.length}
        </span>
        <AnimatePresence initial={false}>
          {filled > 0 && (
            <motion.button
              animate={{ opacity: 1 }}
              className={cn(
                "inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 text-muted-foreground text-xs outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                press,
              )}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              initial={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setValues((all) => ({ ...all, [activeId]: {} }))}
              type="button"
            >
              <RotateCcwIcon className="size-3" />
              Clear
            </motion.button>
          )}
        </AnimatePresence>
        <Button
          className="ms-auto overflow-hidden rounded-full transition-[box-shadow,opacity,scale] duration-150 ease-out before:rounded-full active:scale-[0.97]"
          disabled={!ready}
          onClick={use}
          size="sm"
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ y: 0, opacity: 1 }}
              className="inline-flex items-center gap-1.5"
              exit={reduce ? { opacity: 0 } : { y: -14, opacity: 0 }}
              initial={reduce ? { opacity: 0 } : { y: 14, opacity: 0 }}
              key={used ? "used" : "use"}
              transition={{ duration: 0.22, ease: easeOut }}
            >
              {used ? (
                <>
                  <CheckIcon className="size-3.5" />
                  Added
                </>
              ) : (
                <>
                  Use prompt
                  <ArrowRightIcon className="size-3.5" />
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>
    </div>
  );
}

function InlineVar({
  name,
  value,
  slot,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  inputRef,
}: {
  name: string;
  value: string;
  slot: number;
  onChange: (v: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  inputRef: (el: HTMLInputElement | null) => void;
}) {
  const filled = value.trim().length > 0;
  const tone = toneOf(slot);
  return (
    <span
      className={cn(
        "relative inline-grid rounded-md border align-baseline leading-7 transition-[background-color,border-color,box-shadow] duration-150 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
        filled ? cn(tone.chip, "border-transparent") : "border-muted-foreground/35 border-dashed",
      )}
    >
      <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre px-1.5 font-medium">
        {value || name}
      </span>
      <input
        aria-label={name}
        autoComplete="off"
        className="col-start-1 row-start-1 w-full min-w-0 bg-transparent px-1.5 font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={name}
        ref={inputRef}
        size={1}
        spellCheck={false}
        value={value}
      />
    </span>
  );
}
