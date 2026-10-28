"use client";

import { CloudAlertIcon, CloudCheckIcon, CloudUploadIcon, FileWarningIcon, RotateCwIcon, WifiOffIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadIssue =
  | { kind: "too-large"; maxBytes: number }
  | { kind: "type"; allowed: string[]; hint?: string }
  | { kind: "connection" };

export interface UploadFailedFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "done" | "failed";
  issue?: UploadIssue;
}

export interface UploadFailedProps {
  files?: UploadFailedFile[];
  destination?: string;
  onRetry?: (id: string) => void;
  onRetryAll?: () => void;
  onRemove?: (id: string) => void;
  onRemoveFailed?: () => void;
  onReplace?: (id: string, file: File) => void;
  className?: string;
}

const MB = 1024 ** 2;

const defaultFiles: UploadFailedFile[] = [
  { id: "brief", name: "survey-brief.pdf", size: 2.4 * MB, progress: 1, status: "done" },
  { id: "walkthrough", name: "north-ridge-walkthrough.mov", size: 18 * MB, progress: 0, status: "failed", issue: { kind: "too-large", maxBytes: 10 * MB } },
  { id: "photo", name: "trailhead-014.heic", size: 3.1 * MB, progress: 0, status: "failed", issue: { kind: "type", allowed: ["JPG", "PNG", "PDF", "MOV", "CSV"], hint: "Export HEIC photos as JPG first." } },
  { id: "responses", name: "visitor-responses.csv", size: 6.8 * MB, progress: 0.62, status: "failed", issue: { kind: "connection" } },
  { id: "cover", name: "cover-north-ridge.jpg", size: 1.2 * MB, progress: 1, status: "done" },
];

const tones: { match: RegExp; className: string }[] = [
  { match: /^pdf$/, className: "text-red-600 dark:text-red-400" },
  { match: /^(jpe?g|png|gif|webp|heic|avif)$/, className: "text-sky-700 dark:text-sky-400" },
  { match: /^(mov|mp4|webm)$/, className: "text-violet-600 dark:text-violet-400" },
  { match: /^(csv|xlsx?)$/, className: "text-emerald-700 dark:text-emerald-400" },
];

const spring = { type: "spring", stiffness: 420, damping: 36 } as const;
const fill = { type: "spring", stiffness: 140, damping: 24 } as const;

// Stays false until mounted so the server render and the first client render match.
function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function formatBytes(bytes: number) {
  if (bytes < MB) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = bytes / MB;
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

function listOf(items: string[]) {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

export function UploadFailed({
  files = defaultFiles,
  destination = "Q3 site survey",
  onRetry,
  onRetryAll,
  onRemove,
  onRemoveFailed,
  onReplace,
  className,
}: UploadFailedProps) {
  const reduce = useSafeReducedMotion();
  const failed = files.filter((f) => f.status === "failed");
  const uploading = files.filter((f) => f.status === "uploading").length;
  const done = files.filter((f) => f.status === "done").length;
  const retryable = failed.filter((f) => f.issue?.kind === "connection").length;
  const state = failed.length > 0 ? "failed" : uploading > 0 ? "uploading" : "done";

  const title =
    state === "failed"
      ? `${failed.length} of ${files.length} didn't upload`
      : state === "uploading"
        ? `Uploading ${uploading} of ${files.length}`
        : files.length === 0
          ? "Nothing to upload"
          : `${done} of ${files.length} uploaded`;

  const Icon = state === "failed" ? CloudAlertIcon : state === "uploading" ? CloudUploadIcon : CloudCheckIcon;

  return (
    <section
      aria-label={`Uploads to ${destination}`}
      className={cn("w-full max-w-136 overflow-hidden rounded-2xl border bg-card shadow-xs/5", className)}
    >
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
        <div className="flex min-w-0 flex-1 basis-60 items-center gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl border bg-card shadow-xs/5 transition-colors duration-300 [&_svg]:size-5",
              state === "failed" ? "text-destructive-foreground" : state === "done" ? "text-success-foreground" : "text-muted-foreground",
            )}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                key={state}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                <Icon />
              </motion.span>
            </AnimatePresence>
          </span>
          <div className="grid min-w-0 gap-0.5">
            <h3 aria-live="polite" className="truncate font-semibold text-base tabular-nums">
              {title}
            </h3>
            <p className="truncate text-muted-foreground text-sm">
              {state === "failed" ? `${done} saved to ` : state === "uploading" ? "Saving to " : "All in "}
              <span className="text-foreground">{destination}</span>
            </p>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {failed.length > 0 && (
            <motion.div
              animate={{ opacity: 1 }}
              className="flex shrink-0 gap-2"
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              initial={{ opacity: 0 }}
            >
              <Button disabled={retryable === 0} onClick={onRetryAll} size="sm" variant="outline">
                <RotateCwIcon />
                Retry all
              </Button>
              <Button onClick={onRemoveFailed} size="sm" variant="ghost">
                Remove failed
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div aria-hidden className="flex gap-1 px-4 pb-4">
        {files.map((f) => (
          <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted" key={f.id}>
            <motion.span
              animate={{ scaleX: f.status === "failed" ? 1 : f.progress }}
              className={cn(
                "absolute inset-0 origin-left rounded-full transition-colors duration-300",
                f.status === "failed" ? "bg-destructive" : f.status === "done" ? "bg-success" : "bg-primary",
              )}
              initial={false}
              transition={reduce ? { duration: 0 } : fill}
            />
          </span>
        ))}
      </div>

      <ul className="border-t">
        <AnimatePresence initial={false}>
          {files.map((file) => (
            <UploadRow
              file={file}
              key={file.id}
              onRemove={onRemove ? () => onRemove(file.id) : undefined}
              onReplace={onReplace ? (picked) => onReplace(file.id, picked) : undefined}
              onRetry={onRetry ? () => onRetry(file.id) : undefined}
              reduce={reduce}
            />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

function UploadRow({
  file,
  reduce,
  onRetry,
  onRemove,
  onReplace,
}: {
  file: UploadFailedFile;
  reduce: boolean;
  onRetry?: () => void;
  onRemove?: () => void;
  onReplace?: (file: File) => void;
}) {
  const ext = extensionOf(file.name);
  const tone = tones.find((t) => t.match.test(ext))?.className ?? "text-muted-foreground";
  const issue = file.status === "failed" ? file.issue : undefined;
  const percent = Math.round(file.progress * 100);

  return (
    <motion.li
      animate={{ opacity: 1, height: "auto" }}
      className="overflow-hidden border-b last:border-b-0"
      exit={{ opacity: 0, height: 0, transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
      transition={spring}
    >
      <div className="flex gap-3 px-4 py-3">
        <span
          aria-hidden
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background font-mono font-semibold text-[10px] uppercase tracking-wide",
            tone,
          )}
        >
          {ext.slice(0, 4)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate font-medium text-sm">{file.name}</span>
            <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
              {file.status === "uploading" ? `${percent}%` : formatBytes(file.size)}
            </span>
          </div>
          <Collapse reduce={reduce} show={file.status === "uploading" || issue?.kind === "connection"}>
            <div
              aria-label={`${file.name} upload progress`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={percent}
              className="h-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
            >
              <motion.div
                animate={{ scaleX: file.progress }}
                className={cn("h-full origin-left rounded-full transition-colors duration-300", issue ? "bg-destructive" : "bg-primary")}
                initial={false}
                transition={reduce ? { duration: 0 } : fill}
              />
            </div>
          </Collapse>
          <Collapse reduce={reduce} show={!!issue}>
            {issue && <IssueLine fileName={file.name} issue={issue} onReplace={onReplace} onRetry={onRetry} percent={percent} size={file.size} />}
          </Collapse>
        </div>
        <div className="flex w-8 shrink-0 items-start justify-end">
          <AnimatePresence initial={false} mode="popLayout">
            {file.status === "done" ? (
              <DrawnCheck key="done" reduce={reduce} />
            ) : file.status === "failed" && onRemove ? (
              <motion.span
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key="remove"
                transition={{ duration: 0.15 }}
              >
                <Button aria-label={`Remove ${file.name}`} onClick={onRemove} size="icon-sm" variant="ghost">
                  <XIcon />
                </Button>
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.li>
  );
}

function Collapse({ show, reduce, children }: { show: boolean; reduce: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden"
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="pt-1.5">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function IssueLine({
  issue,
  fileName,
  percent,
  size,
  onRetry,
  onReplace,
}: {
  issue: UploadIssue;
  fileName: string;
  percent: number;
  size: number;
  onRetry?: () => void;
  onReplace?: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  const reason =
    issue.kind === "too-large"
      ? `Too large (${formatBytes(size)}, max ${formatBytes(issue.maxBytes)})`
      : issue.kind === "type"
        ? `Type not allowed (.${extensionOf(fileName)})`
        : `Connection dropped at ${percent}%`;

  const ReasonIcon = issue.kind === "connection" ? WifiOffIcon : FileWarningIcon;
  const accept = issue.kind === "type" ? issue.allowed.map((t) => `.${t.toLowerCase()}`).join(",") : undefined;

  return (
    <div className="grid gap-2">
      <p className="flex items-center gap-1.5 text-destructive-foreground text-xs">
        <ReasonIcon aria-hidden className="size-3.5 shrink-0" />
        <span className="tabular-nums">{reason}</span>
      </p>
      {issue.kind === "type" && (
        <p className="text-muted-foreground text-xs">
          Use {listOf(issue.allowed)}.{issue.hint ? ` ${issue.hint}` : ""}
        </p>
      )}
      {issue.kind === "connection" && <p className="text-muted-foreground text-xs">The first {percent}% is saved. Retry picks up from there.</p>}
      <div className="flex">
        {issue.kind === "connection" ? (
          <Button onClick={onRetry} size="xs" variant="outline">
            <RotateCwIcon />
            Retry from {percent}%
          </Button>
        ) : (
          <>
            <input
              accept={accept}
              aria-label={`Replacement for ${fileName}`}
              className="sr-only"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) onReplace?.(picked);
                e.target.value = "";
              }}
              ref={input}
              tabIndex={-1}
              type="file"
            />
            <Button onClick={() => input.current?.click()} size="xs" variant="outline">
              {issue.kind === "too-large" ? "Choose a smaller file" : "Choose another file"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function DrawnCheck({ reduce }: { reduce: boolean }) {
  return (
    <motion.span
      animate={{ opacity: 1, scale: 1 }}
      aria-label="Uploaded"
      className="mt-1 flex size-6 items-center justify-center rounded-full bg-success/12 text-success-foreground"
      exit={{ opacity: 0, scale: 0.8 }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
      role="img"
      transition={spring}
    >
      <svg aria-hidden className="size-3.5" fill="none" viewBox="0 0 16 16">
        <motion.path
          animate={{ pathLength: 1 }}
          d="M3.5 8.5l3 3 6-7"
          initial={reduce ? false : { pathLength: 0 }}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          transition={{ duration: 0.32, delay: 0.08, ease: [0.65, 0, 0.35, 1] }}
        />
      </svg>
    </motion.span>
  );
}
