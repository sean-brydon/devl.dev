"use client";

import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  GitBranchIcon,
  GlobeIcon,
  type LucideIcon,
  PackageIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StageStatus = "queued" | "running" | "success" | "failed" | "skipped";

export interface PipelineStage {
  id: string;
  name: string;
  status: StageStatus;
  icon?: LucideIcon;
  logs: string[];
  startedAt?: number;
  durationMs?: number;
  error?: string;
}

export interface DeployPipelineProps {
  stages: PipelineStage[];
  commit: { message: string; sha: string; branch: string; author?: string };
  url?: string;
  onRetry?: (stageId: string) => void;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

const secs = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
};

function lineTone(line: string) {
  if (/^(✗|×|error|ERR|FAIL)/i.test(line.trim())) return "text-destructive-foreground";
  if (/^(✓|✔|PASS|ready)/i.test(line.trim())) return "text-success-foreground";
  if (/^(⚠|warn)/i.test(line.trim())) return "text-warning-foreground";
  if (/^(>|\$)/.test(line.trim())) return "text-foreground";
  return "text-muted-foreground";
}

function Node({ stage, selected, onSelect, elapsed, indicator }: { stage: PipelineStage; selected: boolean; onSelect: () => void; elapsed: number; indicator: string }) {
  const reduce = useReducedMotion();
  const Icon = stage.icon ?? PackageIcon;
  const s = stage.status;
  return (
    <button
      aria-label={`${stage.name}: ${s}`}
      aria-pressed={selected}
      className="group/node relative z-10 flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-xl py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-20"
      onClick={onSelect}
      type="button"
    >
      <span className="relative grid size-9 place-items-center">
        <span
          className={cn(
            "absolute inset-0 rounded-full border bg-card transition-[background-color,border-color] duration-300",
            s === "success" && "border-success bg-success",
            s === "failed" && "border-destructive bg-destructive",
            s === "running" && "border-info/30",
            (s === "queued" || s === "skipped") && "border-dashed",
          )}
        />
        {s === "running" && (
          <motion.svg
            animate={reduce ? undefined : { rotate: 360 }}
            aria-hidden
            className="absolute -inset-px size-[38px] text-info"
            transition={{ duration: 1, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
            viewBox="0 0 38 38"
          >
            <circle cx="19" cy="19" fill="none" r="18" stroke="currentColor" strokeDasharray="28 200" strokeLinecap="round" strokeWidth="2" />
          </motion.svg>
        )}
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "relative grid place-items-center",
              s === "success" || s === "failed" ? "text-white" : s === "running" ? "text-foreground" : "text-muted-foreground/70",
            )}
            exit={{ scale: 0.6, opacity: 0 }}
            initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
            key={s === "success" ? "ok" : s === "failed" ? "x" : "icon"}
            transition={{ type: "spring", stiffness: 600, damping: 24 }}
          >
            {s === "success" ? (
              <CheckIcon className="size-4" strokeWidth={3} />
            ) : s === "failed" ? (
              <XIcon className="size-4" strokeWidth={3} />
            ) : (
              <Icon className="size-4" />
            )}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className={cn("font-medium text-xs transition-colors", selected ? "text-foreground" : "text-muted-foreground [@media(hover:hover)]:group-hover/node:text-foreground")}>
        {stage.name}
      </span>
      <span
        className={cn(
          "h-4 font-mono text-[11px] tabular-nums",
          s === "failed" ? "text-destructive-foreground" : "text-muted-foreground",
        )}
      >
        {s === "queued" ? "—" : s === "skipped" ? "skipped" : secs(elapsed)}
      </span>
      {selected && (
        <motion.span
          className="absolute -bottom-[13px] h-0.5 w-6 rounded-full bg-foreground"
          layoutId={indicator}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 44 }}
        />
      )}
    </button>
  );
}

export function DeployPipeline({ stages, commit, url, onRetry, className }: DeployPipelineProps) {
  const reduce = useReducedMotion();
  const indicator = useId();
  const running = stages.find((s) => s.status === "running");
  const failed = stages.find((s) => s.status === "failed");
  const ready = stages.every((s) => s.status === "success" || s.status === "skipped");
  const now = useNow(Boolean(running));
  const [picked, setPicked] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const follow = failed?.id ?? running?.id ?? [...stages].reverse().find((s) => s.status !== "queued")?.id ?? stages[0].id;
  const selectedId = picked ?? follow;
  const selected = stages.find((s) => s.id === selectedId) ?? stages[0];

  useEffect(() => {
    if (running && picked && picked !== running.id) {
      const pickedStage = stages.find((s) => s.id === picked);
      if (pickedStage?.status === "queued") setPicked(null);
    }
  }, [running, picked, stages]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  useLayoutEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [selected.logs.length, selectedId]);

  const elapsedOf = (s: PipelineStage) => (s.status === "running" && s.startedAt ? now - s.startedAt : (s.durationMs ?? 0));
  const total = stages.reduce((sum, s) => sum + elapsedOf(s), 0);
  const overall = failed ? "failed" : ready ? "ready" : running ? "building" : "queued";

  return (
    <div className={cn("flex w-full min-w-0 max-w-[540px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5", className)}>
      <div className="flex items-start gap-3 px-4 pt-3.5 pb-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{commit.message}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground text-xs">
            <GitBranchIcon className="size-3" />
            <span className="truncate font-mono">{commit.branch}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="font-mono">{commit.sha.slice(0, 7)}</span>
            {commit.author && (
              <>
                <span className="text-muted-foreground/50 max-sm:hidden">·</span>
                <span className="truncate max-sm:hidden">{commit.author}</span>
              </>
            )}
          </p>
        </div>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 font-medium text-xs tabular-nums",
              overall === "ready" && "bg-success/10 text-success-foreground",
              overall === "failed" && "bg-destructive/10 text-destructive-foreground",
              overall === "building" && "bg-info/10 text-info-foreground",
              overall === "queued" && "bg-muted text-muted-foreground",
            )}
            exit={{ opacity: 0, scale: 0.95 }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            key={overall}
            transition={{ duration: 0.18, ease }}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                overall === "ready" && "bg-success",
                overall === "failed" && "bg-destructive",
                overall === "building" && "animate-pulse bg-info",
                overall === "queued" && "bg-muted-foreground/60",
              )}
            />
            {overall === "ready" ? "Ready" : overall === "failed" ? "Failed" : overall === "building" ? "Building" : "Queued"}
            <span className="font-mono opacity-70">{secs(total)}</span>
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="relative flex items-start justify-between px-3 pt-2 pb-3 sm:px-6">
        {stages.map((stage, i) => {
          const next = stages[i + 1];
          return (
            <Fragment key={stage.id}>
              <Node elapsed={elapsedOf(stage)} indicator={indicator} onSelect={() => setPicked(stage.id === follow ? null : stage.id)} selected={stage.id === selectedId} stage={stage} />
              {next && (
                <div aria-hidden className="relative mt-[22px] h-0.5 min-w-3 flex-1 overflow-hidden rounded-full bg-border">
                  <motion.span
                    animate={{ scaleX: stage.status === "success" ? 1 : 0 }}
                    className="absolute inset-0 origin-left rounded-full bg-success"
                    initial={false}
                    transition={reduce ? { duration: 0 } : { duration: 0.45, ease }}
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      <div className="border-t">
        <div className="flex h-9 items-center gap-2 px-4 text-xs">
          <span className="font-medium">{selected.name}</span>
          <span className="text-muted-foreground tabular-nums">
            {selected.logs.length} {selected.logs.length === 1 ? "line" : "lines"}
          </span>
          {picked && (
            <button
              className="ms-auto -me-1.5 h-7 rounded-md px-1.5 text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring [@media(hover:hover)]:hover:text-foreground"
              onClick={() => setPicked(null)}
              type="button"
            >
              Follow live
            </button>
          )}
        </div>
        <div
          aria-label={`${selected.name} logs`}
          aria-live="off"
          className="h-[172px] overflow-y-auto bg-code px-4 py-2.5 font-mono text-[11.5px] leading-[19px] [scrollbar-width:thin]"
          ref={logRef}
          role="log"
          tabIndex={0}
        >
          {selected.status === "queued" ? (
            <p className="font-sans text-muted-foreground text-xs">Waiting for earlier stages to finish.</p>
          ) : (
            selected.logs.map((line, i) => (
              <motion.div
                animate={{ opacity: 1 }}
                className={cn("whitespace-pre-wrap break-words", lineTone(line))}
                initial={selected.status === "running" && !reduce ? { opacity: 0 } : false}
                key={`${selected.id}-${i}`}
                transition={{ duration: 0.15 }}
              >
                {line || " "}
              </motion.div>
            ))
          )}
          {selected.status === "running" && <span aria-hidden className="inline-block h-3 w-1.5 animate-pulse bg-muted-foreground/60 align-middle" />}
        </div>
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {failed ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 border-t bg-destructive/[0.04] px-4 py-3"
            exit={{ opacity: 0 }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
            key="failed"
            transition={{ duration: 0.2, ease }}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-destructive-foreground text-xs">{failed.name} failed</p>
              <p className="truncate text-muted-foreground text-xs">{failed.error ?? "See the logs above."}</p>
            </div>
            <Button className="shrink-0" onClick={() => {
                setPicked(null);
                onRetry?.(failed.id);
              }}
              size="sm"
            >
              <RotateCcwIcon />
              Retry {failed.name.toLowerCase()}
            </Button>
          </motion.div>
        ) : ready && url ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 border-t px-4 py-3"
            exit={{ opacity: 0 }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
            key="ready"
            transition={{ duration: 0.22, ease }}
          >
            <motion.span
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex h-8 min-w-0 items-center gap-2 rounded-full border bg-background ps-3 pe-1 shadow-xs/5 dark:bg-input/32"
              initial={reduce ? false : { scale: 0.94, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 26, delay: 0.06 }}
            >
              <GlobeIcon className="size-3.5 shrink-0 text-success-foreground" />
              <span className="min-w-0 truncate font-mono text-xs">{url.replace(/^https?:\/\//, "")}</span>
              <button
                aria-label={copied ? "Copied" : "Copy URL"}
                className="relative grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-[color,background-color,scale] after:absolute after:-inset-1 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                  } catch {}
                  setCopied(true);
                }}
                type="button"
              >
                {copied ? <CheckIcon className="size-3 text-success-foreground" /> : <CopyIcon className="size-3" />}
              </button>
            </motion.span>
            <Button className="ms-auto shrink-0" render={<a href={url} rel="noreferrer" target="_blank" />} size="sm" variant="outline">
              Visit
              <ExternalLinkIcon />
            </Button>
          </motion.div>
        ) : url ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 border-t px-4 py-3"
            exit={{ opacity: 0 }}
            initial={reduce ? false : { opacity: 0 }}
            key="pending"
            transition={{ duration: 0.18, ease }}
          >
            <span className="inline-flex h-8 min-w-0 items-center gap-2 rounded-full border border-dashed ps-3 pe-3 text-muted-foreground">
              <GlobeIcon className="size-3.5 shrink-0" />
              <span className="min-w-0 truncate text-xs">Preview URL appears once {stages[stages.length - 1]?.name ?? "deploy"} passes</span>
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
