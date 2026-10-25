"use client";

import { ChevronRightIcon, RotateCcwIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SpawnNode {
  id: string;
  name: string;
  model?: string;
  task?: string;
  start: number;
  duration: number;
  costPerSecond: number;
  outcome?: "done" | "failed";
  children?: SpawnNode[];
}

export interface SpawnTreeProps {
  root: SpawnNode;
  speed?: number;
  autoplay?: boolean;
  title?: string;
  className?: string;
}

type Status = "queued" | "running" | "done" | "failed";

interface Live {
  status: Status;
  elapsed: number;
  cost: number;
  branchCost: number;
  counts: Record<Status, number>;
}

function endOf(node: SpawnNode): number {
  return Math.max(node.start + node.duration, ...(node.children ?? []).map(endOf));
}

function compute(node: SpawnNode, t: number, out: Map<string, Live>): Live {
  const elapsed = Math.min(Math.max(t - node.start, 0), node.duration);
  const status: Status =
    t < node.start ? "queued" : t < node.start + node.duration ? "running" : (node.outcome ?? "done");
  const cost = elapsed * node.costPerSecond;
  const counts: Record<Status, number> = { queued: 0, running: 0, done: 0, failed: 0 };
  let branchCost = cost;
  for (const child of node.children ?? []) {
    const c = compute(child, t, out);
    branchCost += c.branchCost;
    counts[c.status]++;
    for (const k of Object.keys(counts) as Status[]) counts[k] += c.counts[k];
  }
  const live = { status, elapsed, cost, branchCost, counts };
  out.set(node.id, live);
  return live;
}

function clock(s: number) {
  const whole = Math.floor(s);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function SpawnTree({ root, speed = 1.2, autoplay = true, title = "Agent run", className }: SpawnTreeProps) {
  const reduce = useReducedMotion();
  const total = useMemo(() => endOf(root), [root]);
  const [t, setT] = useState(autoplay ? 0 : total);
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const finished = t >= total;

  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => setT((v) => Math.min(v + 0.2 * speed, total)), 200);
    return () => clearInterval(id);
  }, [finished, speed, total]);

  const live = useMemo(() => {
    const map = new Map<string, Live>();
    compute(root, t, map);
    return map;
  }, [root, t]);

  const rootLive = live.get(root.id)!;
  const running = rootLive.counts.running + (rootLive.status === "running" ? 1 : 0);

  const toggle = (id: string) =>
    setFolded((f) => {
      const next = new Set(f);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className={cn("w-full max-w-[480px] rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h3 className="font-medium text-sm">{title}</h3>
          <p className="text-muted-foreground text-xs tabular-nums">
            {finished ? "Finished" : `${running} working`} · {clock(t)} ·{" "}
            <Money className="text-foreground" value={rootLive.branchCost} /> total
          </p>
        </div>
        <AnimatePresence initial={false}>
          {finished && (
            <motion.span
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              className="origin-right"
              exit={{ opacity: 0, scale: reduce ? 1 : 0.95, filter: "blur(2px)" }}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.95, filter: "blur(2px)" }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            >
              <Button
                className="transition-[scale,box-shadow,background-color] duration-150 ease-out active:scale-[0.97]"
                onClick={() => setT(0)}
                size="xs"
                variant="outline"
              >
                <RotateCcwIcon />
                Replay
              </Button>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <ul className="p-2" role="tree">
        <TreeNode folded={folded} isLast live={live} node={root} onToggle={toggle} root />
      </ul>
    </div>
  );
}

function TreeNode({
  node,
  live,
  folded,
  onToggle,
  isLast,
  root,
}: {
  node: SpawnNode;
  live: Map<string, Live>;
  folded: Set<string>;
  onToggle: (id: string) => void;
  isLast: boolean;
  root?: boolean;
}) {
  const reduce = useReducedMotion();
  const groupId = useId();
  const l = live.get(node.id)!;
  const kids = node.children ?? [];
  const isFolded = folded.has(node.id);
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 380, damping: 34 };
  const descendants = l.counts.queued + l.counts.running + l.counts.done + l.counts.failed;

  return (
    <li
      aria-expanded={kids.length ? !isFolded : undefined}
      className={cn("relative", !root && "pt-1.5 pl-5")}
      role="treeitem"
    >
      {!root && (
        <>
          <span
            aria-hidden
            className={cn("absolute top-0 left-2 w-px bg-border", isLast ? "h-7" : "bottom-0")}
          />
          <span aria-hidden className="absolute top-7 left-2 h-px w-3 bg-border" />
        </>
      )}
      <motion.div
        className={cn(
          "relative rounded-lg border bg-background px-3 py-2 transition-[border-color,opacity] duration-300 ease-out",
          l.status === "running" && "border-info/32",
          l.status === "queued" && "opacity-60",
        )}
        layout="position"
        transition={spring}
      >
        <div className="flex items-center gap-2">
          {kids.length > 0 ? (
            <button
              aria-controls={groupId}
              aria-label={isFolded ? `Expand ${node.name}` : `Fold ${node.name}`}
              className="relative -ml-1 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-150 after:absolute after:-inset-1.5 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onToggle(node.id)}
              type="button"
            >
              <ChevronRightIcon
                className={cn(
                  "size-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none",
                  !isFolded && "rotate-90",
                )}
              />
            </button>
          ) : null}
          <StatusDot status={l.status} />
          <span className="truncate font-medium text-sm">{node.name}</span>
          {node.model && (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground">
              {node.model}
            </span>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-2.5 font-mono text-xs tabular-nums">
            <span className={l.status === "running" ? "text-foreground" : "text-muted-foreground"}>
              {clock(l.elapsed)}
            </span>
            <Money className="w-12 text-right text-muted-foreground" value={l.cost} />
          </span>
        </div>
        {node.task && (
          <p className={cn("mt-0.5 truncate text-muted-foreground text-xs", kids.length > 0 ? "pl-10" : "pl-4")}>
            {node.task}
          </p>
        )}
        {kids.length > 0 && (
          <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-dashed pt-1.5 text-xs">
            <span className="truncate text-muted-foreground">
              {descendants} sub-agent{descendants === 1 ? "" : "s"}
              {l.counts.running > 0 && <span className="text-info-foreground"> · {l.counts.running} running</span>}
              {l.counts.failed > 0 && <span className="text-destructive-foreground"> · {l.counts.failed} failed</span>}
            </span>
            <span className="shrink-0 text-muted-foreground">
              branch <Money className="font-medium font-mono text-foreground" value={l.branchCost} />
            </span>
          </div>
        )}
      </motion.div>

      <AnimatePresence initial={false}>
        {kids.length > 0 && !isFolded && (
          <motion.ul
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            id={groupId}
            initial={{ height: 0, opacity: 0 }}
            role="group"
            transition={spring}
          >
            {kids.map((child, i) => (
              <TreeNode
                folded={folded}
                isLast={i === kids.length - 1}
                key={child.id}
                live={live}
                node={child}
                onToggle={onToggle}
              />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

function StatusDot({ status }: { status: Status }) {
  return (
    <span className="relative flex size-2 shrink-0">
      <span
        className={cn(
          "size-2 rounded-full transition-colors duration-300 ease-out",
          status === "queued" && "bg-muted-foreground/40",
          status === "running" && "bg-info",
          status === "done" && "bg-success",
          status === "failed" && "bg-destructive",
        )}
      />
      <span className="sr-only">{status}</span>
    </span>
  );
}

function Money({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const mv = useSpring(value, reduce ? { duration: 0 } : { stiffness: 140, damping: 22 });
  const text = useTransform(mv, (v) => `$${Math.max(v, 0).toFixed(2)}`);
  useEffect(() => {
    mv.set(value);
  }, [mv, value]);
  return <motion.span className={cn("inline-block tabular-nums", className)}>{text}</motion.span>;
}
