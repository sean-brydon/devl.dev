"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Fragment, type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GhostTone = "info" | "brand" | "destructive";

export interface Ghostwriter {
  id: string;
  name: string;
  tone: GhostTone;
  role?: string;
}

export type DocPiece = string | { id: string; text: string };

export interface GhostSuggestion {
  id: string;
  agent: string;
  target: string;
  mode: "replace" | "after";
  text: string;
  from: string;
  note?: string;
  at: number;
}

export interface GhostwritersProps {
  title?: string;
  agents?: Ghostwriter[];
  paragraphs?: DocPiece[][];
  suggestions?: GhostSuggestion[];
  autoplay?: boolean;
  className?: string;
}

type Decision = "accepted" | "rejected";

const tones: Record<GhostTone, { solid: string; text: string; soft: string; mark: string; line: string }> = {
  info: { solid: "bg-info", text: "text-white", soft: "bg-info/14", mark: "bg-info/22", line: "decoration-info" },
  brand: { solid: "bg-brand", text: "text-brand-foreground", soft: "bg-brand/30", mark: "bg-brand/45", line: "decoration-brand-ink" },
  destructive: { solid: "bg-destructive", text: "text-white", soft: "bg-destructive/12", mark: "bg-destructive/20", line: "decoration-destructive" },
};

const defaultAgents: Ghostwriter[] = [
  { id: "editor", name: "Editor", tone: "info", role: "Tightens loose wording" },
  { id: "facts", name: "Fact-check", tone: "destructive", role: "Checks every number" },
  { id: "scout", name: "Scout", tone: "brand", role: "Fills in what readers will ask" },
];

const defaultParagraphs: DocPiece[][] = [
  [
    { id: "h1", text: "Halcyon" },
    " 3.2 makes exports ",
    { id: "fast", text: "really fast" },
    ". Beta teams said scheduled reports saved them ",
    { id: "pct", text: "12%" },
    " of their ",
    { id: "h2", text: "week" },
    ".",
  ],
  [
    "Admins also get an ",
    { id: "h3", text: "audit log" },
    " that keeps every change for ",
    { id: "tail", text: "90 days." },
  ],
];

const defaultSuggestions: GhostSuggestion[] = [
  { id: "s1", agent: "editor", target: "fast", mode: "replace", text: "up to 4× faster", from: "h1", at: 300 },
  { id: "s2", agent: "facts", target: "pct", mode: "replace", text: "9%", from: "h2", note: "beta survey, n=48", at: 1900 },
  { id: "s3", agent: "scout", target: "tail", mode: "after", text: " It’s on for every workspace.", from: "h3", at: 3500 },
];

const press = "transition-[box-shadow,scale] duration-150 ease-out active:scale-[0.97]";
const APPEAR = 500;
const MOVE = 700;
const SELECT = 850;
const CHAR = 42;

type Phase = "hidden" | "home" | "moving" | "selecting" | "typing" | "pending";

function phaseOf(s: GhostSuggestion, e: number): { phase: Phase; typed: number } {
  const t0 = s.at;
  if (e < t0) return { phase: "hidden", typed: 0 };
  if (e < t0 + APPEAR) return { phase: "home", typed: 0 };
  if (e < t0 + APPEAR + MOVE) return { phase: "moving", typed: 0 };
  const sel = s.mode === "replace" ? SELECT : 300;
  if (e < t0 + APPEAR + MOVE + sel) return { phase: "selecting", typed: 0 };
  const typeStart = t0 + APPEAR + MOVE + sel;
  const typed = Math.floor((e - typeStart) / CHAR);
  if (typed < s.text.length) return { phase: "typing", typed: Math.max(0, typed) };
  return { phase: "pending", typed: s.text.length };
}

function endOf(s: GhostSuggestion) {
  return s.at + APPEAR + MOVE + (s.mode === "replace" ? SELECT : 300) + s.text.length * CHAR;
}

export function Ghostwriters({
  title = "Halcyon 3.2 launch notes",
  agents = defaultAgents,
  paragraphs = defaultParagraphs,
  suggestions = defaultSuggestions,
  autoplay = true,
  className,
}: GhostwritersProps) {
  const [elapsed, setElapsed] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [focus, setFocus] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number; h: number }>>({});
  const docRef = useRef<HTMLDivElement>(null);
  const lastInput = useRef(0);
  const doneAt = useRef<number | null>(null);
  const clock = useRef(0);

  const agentById = useCallback((id: string) => agents.find((a) => a.id === id) ?? agents[0], [agents]);
  const texts = new Map<string, string>();
  for (const p of paragraphs) for (const piece of p) if (typeof piece !== "string") texts.set(piece.id, piece.text);

  const scriptEnd = Math.max(...suggestions.map(endOf));

  useEffect(() => {
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      clock.current += now - last;
      last = now;
      setElapsed(clock.current);
    }, 40);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const all = suggestions.every((s) => decisions[s.id]);
    if (all) {
      if (doneAt.current === null) doneAt.current = elapsed;
      if (elapsed - doneAt.current > 2600) {
        clock.current = 0;
        doneAt.current = null;
        setDecisions({});
        setElapsed(0);
      }
      return;
    }
    if (!autoplay) return;
    const quiet = performance.now() - lastInput.current > 3500;
    const open = suggestions.filter((s) => !decisions[s.id]);
    const slot = Math.floor((elapsed - scriptEnd - 3200) / 1500);
    if (quiet && slot >= 0 && open.length) {
      const resolvedCount = suggestions.length - open.length;
      if (slot >= resolvedCount) {
        const next = open[0];
        setDecisions((d) => ({ ...d, [next.id]: next.mode === "after" ? "rejected" : "accepted" }));
      }
    }
  }, [elapsed, decisions, suggestions, autoplay, scriptEnd]);

  const states = suggestions.map((s) => ({ s, ...phaseOf(s, elapsed), decision: decisions[s.id] }));
  const byTarget = new Map(states.map((st) => [st.s.target, st]));
  const byFrom = new Map<string, typeof states>();
  for (const st of states) byFrom.set(st.s.from, [...(byFrom.get(st.s.from) ?? []), st]);

  useLayoutEffect(() => {
    const root = docRef.current;
    if (!root) return;
    const box = root.getBoundingClientRect();
    const next: Record<string, { x: number; y: number; h: number }> = {};
    for (const el of root.querySelectorAll<HTMLElement>("[data-caret]")) {
      const r = el.getBoundingClientRect();
      next[el.dataset.caret as string] = { x: r.left - box.left, y: r.top - box.top, h: r.height };
    }
    const same =
      Object.keys(next).length === Object.keys(positions).length &&
      Object.entries(next).every(([k, v]) => positions[k] && Math.abs(positions[k].x - v.x) < 0.5 && Math.abs(positions[k].y - v.y) < 0.5);
    if (!same) setPositions(next);
  });

  const caret = (agentId: string) => (
    <span aria-hidden data-caret={agentId}>
      {"\u2060"}
    </span>
  );

  const renderPiece = (piece: DocPiece, key: number): ReactNode => {
    if (typeof piece === "string") return <Fragment key={key}>{piece}</Fragment>;
    const homes = (byFrom.get(piece.id) ?? []).filter((st) => st.phase === "home");
    const st = byTarget.get(piece.id);
    const homeCarets = homes.map((h) => <Fragment key={h.s.id}>{caret(h.s.agent)}</Fragment>);
    if (!st || st.phase === "hidden" || st.phase === "home") {
      return (
        <Fragment key={key}>
          {homeCarets}
          {piece.text}
        </Fragment>
      );
    }
    const t = tones[agentById(st.s.agent).tone];
    const lit = focus === st.s.id;
    if (st.decision === "accepted") {
      return (
        <Fragment key={`${key}-a`}>
          {homeCarets}
          {st.s.mode === "after" ? piece.text : null}
          <span className="relative">
              <motion.span
                animate={{ opacity: 0 }}
                className={cn("absolute -inset-x-0.5 inset-y-0 rounded-sm", t.mark)}
                initial={{ opacity: 1 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            <span className="relative">{st.s.text}</span>
          </span>
        </Fragment>
      );
    }
    if (st.decision === "rejected") return <Fragment key={`${key}-r`}>{homeCarets}{piece.text}</Fragment>;

    const typing = st.phase === "typing" || st.phase === "pending";
    const original =
      st.phase === "moving" ? (
        <>
          {caret(st.s.agent)}
          {piece.text}
        </>
      ) : st.phase === "selecting" ? (
        <>
          <mark className={cn("rounded-sm text-foreground", st.s.mode === "replace" ? t.mark : "bg-transparent")}>{piece.text}</mark>
          {caret(st.s.agent)}
        </>
      ) : st.s.mode === "replace" ? (
        <del className={cn("mr-1 text-muted-foreground decoration-2", t.line)}>{piece.text}</del>
      ) : (
        piece.text
      );
    return (
      <Fragment key={key}>
        {homeCarets}
        {original}
        {typing && (
          <ins className={cn("rounded-sm text-foreground no-underline transition-colors", lit ? t.mark : t.soft)}>
            {st.s.text.slice(0, st.typed)}
            {caret(st.s.agent)}
          </ins>
        )}
      </Fragment>
    );
  };

  const spring = { type: "spring" as const, stiffness: 320, damping: 30, mass: 0.8 };
  const fade = { duration: 0.16, ease: [0.23, 1, 0.32, 1] as const };
  const active = states.filter((st) => st.phase !== "hidden" && !st.decision);

  const decide = (id: string, d: Decision) => {
    lastInput.current = performance.now();
    setDecisions((prev) => ({ ...prev, [id]: d }));
    setFocus(null);
  };

  return (
    <MotionConfig reducedMotion="user">
    <div
      className={cn("w-full max-w-[460px] rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
      onPointerMove={() => {
        lastInput.current = performance.now();
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <div className="truncate font-medium text-sm">{title}</div>
          <div className="text-muted-foreground text-xs">
            {active.length ? `${active.length} ${active.length === 1 ? "agent" : "agents"} editing` : "Draft · saved"}
          </div>
        </div>
        <div className="flex -space-x-1">
          {agents.map((a) => {
            const on = active.some((st) => st.s.agent === a.id);
            const t = tones[a.tone];
            return (
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full font-medium text-[10px] ring-2 ring-card transition-colors duration-200 ease-out",
                  on ? [t.solid, t.text] : "bg-[color-mix(in_oklab,var(--color-foreground)_10%,var(--color-card))] text-muted-foreground",
                )}
                key={a.id}
                title={a.name}
              >
                {a.name[0]}
              </span>
            );
          })}
        </div>
      </div>

      <div className="relative px-4 pt-5 pb-4" ref={docRef}>
        {/* An invisible copy with every suggestion written in reserves the height, so nothing below jumps while agents type. */}
        <div className="grid">
          <div aria-hidden className="invisible space-y-2.5 text-pretty text-sm leading-[30px] [grid-area:1/1]">
            {paragraphs.map((p, i) => (
              <p key={i}>
                {p.map((piece) => {
                  if (typeof piece === "string") return piece;
                  const sug = suggestions.find((x) => x.target === piece.id);
                  return sug ? `${piece.text}${sug.mode === "replace" ? " " : ""}${sug.text}` : piece.text;
                })}
              </p>
            ))}
          </div>
          <div className="space-y-2.5 text-pretty text-sm leading-[30px] [grid-area:1/1]">
            {paragraphs.map((p, i) => (
              <p key={i}>{p.map(renderPiece)}</p>
            ))}
          </div>
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-0">
          <AnimatePresence>
            {active.map((st) => {
              const pos = positions[st.s.agent];
              if (!pos) return null;
              const a = agentById(st.s.agent);
              const t = tones[a.tone];
              const h = Math.min(pos.h || 18, 20);
              const quiet = st.phase === "pending" && elapsed > endOf(st.s) + 1400;
              return (
                <motion.div
                  animate={{ x: pos.x - 1, y: pos.y + ((pos.h || h) - h) / 2, opacity: 1 }}
                  className="absolute top-0 left-0"
                  exit={{ opacity: 0, transition: fade }}
                  initial={{ x: pos.x - 1, y: pos.y + ((pos.h || h) - h) / 2, opacity: 0 }}
                  key={st.s.agent}
                  transition={spring}
                >
                  <span className={cn("block w-0.5 rounded-full", t.solid, st.phase === "pending" && "animate-caret-blink")} style={{ height: h }} />
                  <motion.span
                    animate={quiet ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
                    className={cn(
                      "absolute bottom-full left-0 mb-px origin-bottom-left whitespace-nowrap rounded-full rounded-bl-[calc(var(--radius)*0.3)] px-1.5 font-medium text-[10px] leading-[14px] shadow-xs/5",
                      t.solid,
                      t.text,
                    )}
                    initial={false}
                    transition={fade}
                  >
                    {a.name}
                  </motion.span>
                  <motion.span
                    animate={{ opacity: quiet ? 1 : 0 }}
                    className={cn("absolute -top-1 -left-[2px] size-1.5 rounded-full", t.solid)}
                    initial={false}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <ul aria-label="Suggestions" className="border-t px-2 py-2">
        {states.length === 0 && <li className="flex min-h-11 items-center px-2 text-muted-foreground text-xs">No suggestions yet. Agents comment here as they read.</li>}
        {states.map((st) => {
          const a = agentById(st.s.agent);
          const t = tones[a.tone];
          const pending = st.phase === "pending" && !st.decision;
          const writing = st.phase === "typing" || st.phase === "pending" || st.decision;
          const status = st.decision
            ? null
            : st.phase === "pending"
              ? (st.s.note ?? (st.s.mode === "after" ? "adds a sentence" : "suggests a rewrite"))
              : st.phase === "typing"
                ? "typing…"
                : st.phase === "selecting"
                  ? "selecting…"
                  : st.phase === "hidden"
                    ? "waiting"
                    : "reading…";
          return (
            <li
              className={cn("flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 ease-out", focus === st.s.id && pending && "bg-accent")}
              key={st.s.id}
              onBlur={() => setFocus(null)}
              onFocus={() => setFocus(st.s.id)}
              onPointerEnter={(e) => e.pointerType === "mouse" && setFocus(st.s.id)}
              onPointerLeave={() => setFocus(null)}
            >
              <span className={cn("size-2 shrink-0 rounded-full transition-colors", writing || st.phase !== "hidden" ? t.solid : "bg-foreground/20")} />
              <div className={cn("min-w-0 flex-1 text-xs transition-opacity duration-300", st.decision && "opacity-60")}>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-medium">{a.name}</span>
                  {status && <span className="truncate text-muted-foreground">{status}</span>}
                </div>
                <AnimatePresence initial={false} mode="wait">
                  {writing ? (
                    <motion.div animate={{ opacity: 1, y: 0 }} className="truncate" initial={{ opacity: 0, y: 3 }} key="diff" transition={fade}>
                      {st.s.mode === "replace" && st.decision !== "accepted" && (
                        <>
                          <span className={cn(st.decision === "rejected" ? "text-foreground" : "text-muted-foreground line-through")}>{texts.get(st.s.target)}</span>
                          <span className="px-1 text-muted-foreground">→</span>
                        </>
                      )}
                      <span className={cn(st.decision === "rejected" && "text-muted-foreground line-through")}>
                        {st.s.mode === "after" ? `+ ${st.s.text.slice(0, st.typed).trim()}` : st.s.text.slice(0, st.typed)}
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div animate={{ opacity: 1 }} className="truncate text-muted-foreground" exit={{ opacity: 0, transition: fade }} initial={{ opacity: 0 }} key="role" transition={fade}>
                      {a.role ?? "Reading the draft"}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex h-9 w-[76px] shrink-0 items-center justify-end gap-1 sm:h-8 sm:w-[68px]">
                <AnimatePresence initial={false} mode="popLayout">
                  {st.decision ? (
                    <motion.div animate={{ opacity: 1, scale: 1 }} initial={{ opacity: 0, scale: 0.95 }} key="badge" transition={fade}>
                      <Badge variant={st.decision === "accepted" ? "success" : "secondary"}>{st.decision === "accepted" ? "Accepted" : "Rejected"}</Badge>
                    </motion.div>
                  ) : pending ? (
                    <motion.div animate={{ opacity: 1, scale: 1 }} className="flex gap-1" exit={{ opacity: 0, scale: 0.95 }} initial={{ opacity: 0, scale: 0.95 }} key="actions" transition={fade}>
                      <Button aria-label={`Reject ${a.name}'s suggestion`} onClick={() => decide(st.s.id, "rejected")} className={press} size="icon" variant="ghost">
                        <XIcon />
                      </Button>
                      <Button aria-label={`Accept ${a.name}'s suggestion`} onClick={() => decide(st.s.id, "accepted")} className={press} size="icon" variant="outline">
                        <CheckIcon />
                      </Button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
    </MotionConfig>
  );
}
