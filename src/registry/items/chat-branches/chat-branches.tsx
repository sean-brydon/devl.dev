"use client";

import { ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, GitBranchPlusIcon, SparklesIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export interface BranchMessage {
  id: string;
  parentId: string | null;
  role: "user" | "assistant";
  text: string;
}

export interface ChatBranchesProps {
  title?: string;
  messages: BranchMessage[];
  defaultLeafId?: string;
  respond?: (text: string, history: BranchMessage[]) => string;
  assistantName?: string;
  className?: string;
}

const spring = { type: "spring", stiffness: 480, damping: 38 } as const;
const STEP = 16;
const ROW = 26;

const cannedReplies = [
  "Here's a tighter take: “Work offline in Tideline 2.4. Your edits wait patiently and sync the moment you're back.”",
  "Sure. I led with the speed this time: “Sync is now up to 3× faster, and it keeps going when your Wi-Fi doesn't.”",
  "Done. It's under 120 characters now, so it fits the in-app banner without truncating.",
];

function useTree(messages: BranchMessage[]) {
  return useMemo(() => {
    const byId = new Map(messages.map((m) => [m.id, m]));
    const children = new Map<string | null, BranchMessage[]>();
    for (const m of messages) {
      const list = children.get(m.parentId) ?? [];
      list.push(m);
      children.set(m.parentId, list);
    }
    const leaves = messages.filter((m) => !children.has(m.id));
    const pathTo = (id: string | null) => {
      const out: BranchMessage[] = [];
      let cur = id ? byId.get(id) : undefined;
      while (cur) {
        out.unshift(cur);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }
      return out;
    };
    const lane = new Map<string, number>();
    const depth = new Map<string, number>();
    leaves.forEach((leaf, i) => {
      pathTo(leaf.id).forEach((m, d) => {
        depth.set(m.id, d);
        if (!lane.has(m.id)) lane.set(m.id, i);
      });
    });
    const tipOf = (id: string) => {
      for (let i = leaves.length - 1; i >= 0; i--) {
        if (pathTo(leaves[i].id).some((m) => m.id === id)) return leaves[i].id;
      }
      return id;
    };
    return { byId, children, leaves, pathTo, lane, depth, tipOf };
  }, [messages]);
}

export function ChatBranches({
  title = "Release note, v2.4",
  messages: initial,
  defaultLeafId,
  respond,
  assistantName = "Lumen",
  className,
}: ChatBranchesProps) {
  const reduce = useReducedMotionAfterMount();
  const inputId = useId();
  const [messages, setMessages] = useState(initial);
  const tree = useTree(messages);
  const [leafId, setLeafId] = useState<string>(defaultLeafId ?? tree.leaves[0]?.id ?? "");
  const [forkFrom, setForkFrom] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const replyCount = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const viewTip = forkFrom ?? leafId;
  const path = tree.pathTo(viewTip);
  const activeIds = new Set(tree.pathTo(leafId).map((m) => m.id));
  const activeLane = tree.lane.get(leafId) ?? 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [viewTip, pending, reduce]);

  const hop = (id: string) => {
    if (forkFrom) cancelFork();
    setLeafId(tree.tipOf(id));
  };

  const startFork = (id: string) => {
    const m = tree.byId.get(id);
    if (m?.role === "user") setDraft(m.text);
    else if (forkSource?.role === "user") setDraft("");
    setForkFrom(id);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const cancelFork = () => {
    if (forkSource?.role === "user") setDraft("");
    setForkFrom(null);
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;
    const from = forkFrom ? tree.byId.get(forkFrom) : null;
    const parentId = from ? (from.role === "user" ? from.parentId : from.id) : leafId;
    const userMsg: BranchMessage = { id: `u-${Date.now()}`, parentId, role: "user", text };
    const history = [...tree.pathTo(parentId), userMsg];
    setMessages((m) => [...m, userMsg]);
    setLeafId(userMsg.id);
    setForkFrom(null);
    setDraft("");
    setPending(true);
    timer.current = setTimeout(() => {
      const reply =
        respond?.(text, history) ?? cannedReplies[replyCount.current++ % cannedReplies.length];
      const botMsg: BranchMessage = { id: `a-${Date.now()}`, parentId: userMsg.id, role: "assistant", text: reply };
      setMessages((m) => [...m, botMsg]);
      setLeafId(botMsg.id);
      setPending(false);
    }, 1100);
  };

  const forkSource = forkFrom ? tree.byId.get(forkFrom) : null;

  return (
    <section
      aria-label={title}
      className={cn("flex w-full max-w-[440px] flex-col rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-3">
        <h3 className="truncate font-medium text-sm">{title}</h3>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
          {tree.leaves.length} {tree.leaves.length === 1 ? "branch" : "branches"}
        </span>
      </header>

      <Minimap activeIds={activeIds} activeLane={activeLane} onHop={hop} reduce={reduce} tree={tree} />

      <div className="relative mt-3 h-72 overflow-y-auto border-t px-4 py-4 [mask-image:linear-gradient(to_bottom,transparent,black_14px,black_calc(100%-14px),transparent)]" ref={scrollRef}>
        <ol className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {path.map((m) => {
              const siblings = tree.children.get(m.parentId) ?? [];
              const index = siblings.findIndex((s) => s.id === m.id);
              return (
                <motion.li
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  key={m.id}
                  transition={{ ...spring, opacity: { duration: 0.18 } }}
                >
                  <Message
                    assistantName={assistantName}
                    forking={forkFrom === m.id}
                    message={m}
                    onFork={() => startFork(m.id)}
                  />
                  {siblings.length > 1 && (
                    <div
                      className={cn(
                        "mt-1 flex items-center gap-0.5 text-muted-foreground text-xs tabular-nums",
                        m.role === "user" ? "justify-end" : "ps-8",
                      )}
                    >
                      <PagerButton
                        disabled={index === 0}
                        label="Previous branch"
                        onClick={() => hop(siblings[index - 1].id)}
                      >
                        <ChevronLeftIcon className="size-3.5" />
                      </PagerButton>
                      <span className="min-w-7 text-center">
                        {index + 1}/{siblings.length}
                      </span>
                      <PagerButton
                        disabled={index === siblings.length - 1}
                        label="Next branch"
                        onClick={() => hop(siblings[index + 1].id)}
                      >
                        <ChevronRightIcon className="size-3.5" />
                      </PagerButton>
                    </div>
                  )}
                </motion.li>
              );
            })}
            {pending && (
              <motion.li
                animate={{ opacity: 1 }}
                className="flex items-center gap-3"
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                initial={{ opacity: 0 }}
                key="pending"
              >
                <AssistantMark />
                <span className="flex gap-1" role="status">
                  <span className="sr-only">{assistantName} is replying</span>
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      className="size-1.5 rounded-full bg-muted-foreground"
                      key={i}
                      transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY, delay: i * 0.15 }}
                    />
                  ))}
                </span>
              </motion.li>
            )}
          </AnimatePresence>
        </ol>
      </div>

      <form className="border-t p-3" onSubmit={send}>
        <AnimatePresence initial={false}>
          {forkSource && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={reduce ? { duration: 0 } : { ...spring, opacity: { duration: 0.15 } }}
            >
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-info/8 py-1 ps-2.5 pe-1 text-info-foreground text-xs">
                <GitBranchPlusIcon className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {forkSource.role === "user" ? "New branch instead of " : "New branch after "}
                  <span className="font-medium">“{forkSource.text}”</span>
                </span>
                <button
                  aria-label="Cancel branch"
                  className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none transition-colors hover:bg-info/12 focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={cancelFork}
                  type="button"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <label className="sr-only" htmlFor={inputId}>
          Message
        </label>
        <div className="flex items-center gap-2 rounded-xl border bg-background ps-3 pe-1 transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24 dark:bg-input/32">
          <input
            autoComplete="off"
            className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/72"
            id={inputId}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && forkFrom && cancelFork()}
            placeholder={forkFrom ? "Take it somewhere else…" : "Reply, or branch from any message"}
            ref={inputRef}
            value={draft}
          />
          <button
            aria-label="Send"
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-primary text-primary-foreground outline-none transition-[opacity,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:cursor-default disabled:opacity-40"
            disabled={!draft.trim() || pending}
            type="submit"
          >
            <ArrowUpIcon className="size-4" />
          </button>
        </div>
      </form>
    </section>
  );
}

function PagerButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className="relative flex size-6 cursor-pointer items-center justify-center rounded-md outline-none transition-colors before:absolute before:-inset-1 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function AssistantMark() {
  return (
    <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
      <SparklesIcon className="size-3" />
    </span>
  );
}

function Message({
  message,
  assistantName,
  forking,
  onFork,
}: {
  message: BranchMessage;
  assistantName: string;
  forking: boolean;
  onFork: () => void;
}) {
  const user = message.role === "user";
  const forkButton = message.parentId === null ? null : (
    <button
      aria-label={user ? "Rewrite this prompt as a new branch" : "Branch from this reply"}
      className={cn(
        "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-[opacity,background-color,color] duration-150 hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/msg:opacity-100",
        forking && "bg-info/10 text-info-foreground opacity-100 [@media(hover:hover)]:opacity-100",
      )}
      onClick={onFork}
      title={user ? "Rewrite as a new branch" : "Branch from here"}
      type="button"
    >
      <GitBranchPlusIcon className="size-3.5" />
    </button>
  );

  if (user) {
    return (
      <div className="group/msg flex items-center justify-end gap-1.5">
        {forkButton}
        <p
          className={cn(
            "max-w-[80%] whitespace-pre-line text-pretty rounded-2xl rounded-br-md bg-muted px-3 py-2 text-sm transition-shadow",
            forking && "ring-2 ring-info/40",
          )}
        >
          {message.text}
        </p>
      </div>
    );
  }
  return (
    <div className="group/msg flex items-start gap-3">
      <span className="mt-0.5">
        <AssistantMark />
      </span>
      <div className="min-w-0 flex-1">
        <span className="sr-only">{assistantName}: </span>
        <p
          className={cn(
            "-mx-2 -my-1 whitespace-pre-line text-pretty rounded-lg px-2 py-1 text-sm leading-relaxed transition-colors duration-150",
            forking && "bg-info/8",
          )}
        >
          {message.text}
        </p>
      </div>
      {forkButton}
    </div>
  );
}

function Minimap({
  tree,
  activeIds,
  activeLane,
  onHop,
  reduce,
}: {
  tree: ReturnType<typeof useTree>;
  activeIds: Set<string>;
  activeLane: number;
  onHop: (id: string) => void;
  reduce: boolean | null;
}) {
  const rowId = useId();
  const nodes = [...tree.byId.values()];
  const maxDepth = Math.max(0, ...nodes.map((n) => tree.depth.get(n.id) ?? 0));
  const width = (maxDepth + 1) * STEP;
  const pos = (id: string) => ({
    x: STEP / 2 + (tree.depth.get(id) ?? 0) * STEP,
    y: ROW / 2 + (tree.lane.get(id) ?? 0) * ROW,
  });

  const branchName = (leaf: BranchMessage, lane: number) => {
    if (lane === 0) return "Main";
    const first = tree.pathTo(leaf.id).find((m) => tree.lane.get(m.id) === lane && m.role === "user");
    return first?.text ?? "Branch";
  };

  return (
    <nav aria-label="Branches" className="mx-3 rounded-xl bg-muted/50 p-1">
      <div className="relative">
        <ul>
          <AnimatePresence initial={false}>
          {tree.leaves.map((leaf, lane) => {
            const active = lane === activeLane;
            return (
              <motion.li
                animate={{ height: ROW, opacity: 1 }}
                initial={reduce ? false : { height: 0, opacity: 0 }}
                key={leaf.id}
                transition={{ ...spring, opacity: { duration: 0.15 } }}
              >
                <button
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "relative flex w-full cursor-pointer items-center rounded-lg text-left text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => onHop(leaf.id)}
                  style={{ height: ROW }}
                  type="button"
                >
                  {active && (
                    <motion.span
                      className="absolute inset-0 rounded-lg bg-card shadow-xs/5 ring-1 ring-border"
                      layoutId={`${rowId}-active`}
                      transition={reduce ? { duration: 0 } : spring}
                    />
                  )}
                  <span className="relative min-w-0 flex-1 truncate pe-2" style={{ paddingInlineStart: width + 10 }}>
                    <span className={cn(active && "font-medium")}>{branchName(leaf, lane)}</span>
                  </span>
                  <span className="relative pe-2 text-muted-foreground tabular-nums">
                    {tree.pathTo(leaf.id).length}
                    <span className="sr-only"> messages</span>
                  </span>
                </button>
              </motion.li>
            );
          })}
          </AnimatePresence>
        </ul>
        <svg
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 overflow-visible"
          height={tree.leaves.length * ROW}
          width={width}
        >
          {nodes.map((n) => {
            if (!n.parentId) return null;
            const a = pos(n.parentId);
            const b = pos(n.id);
            const d =
              a.y === b.y
                ? `M ${a.x} ${a.y} L ${b.x} ${b.y}`
                : `M ${a.x} ${a.y} C ${a.x + STEP * 0.7} ${a.y}, ${b.x - STEP * 0.7} ${b.y}, ${b.x} ${b.y}`;
            const on = activeIds.has(n.id);
            return (
              <motion.path
                animate={{ pathLength: 1 }}
                className={cn("transition-[stroke] duration-200", on ? "stroke-foreground" : "stroke-muted-foreground/40")}
                d={d}
                fill="none"
                initial={reduce ? false : { pathLength: 0 }}
                key={`e-${n.id}`}
                strokeLinecap="round"
                strokeWidth={1.5}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              />
            );
          })}
          {nodes.map((n) => {
            const p = pos(n.id);
            const on = activeIds.has(n.id);
            const user = n.role === "user";
            return (
              <motion.circle
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "transition-[fill,stroke] duration-200",
                  on ? "stroke-foreground" : "stroke-muted-foreground/60",
                  user ? (on ? "fill-foreground" : "fill-muted-foreground/60") : "fill-card",
                )}
                cx={p.x}
                cy={p.y}
                initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                key={`n-${n.id}`}
                r={user ? 3 : 2.75}
                strokeWidth={1.5}
                style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                transition={{ duration: 0.2, delay: 0.12 }}
              />
            );
          })}
        </svg>
      </div>
    </nav>
  );
}
