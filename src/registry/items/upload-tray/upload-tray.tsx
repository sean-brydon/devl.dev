"use client";

import { CheckIcon, CloudUploadIcon, RotateCwIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type DragEvent, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface UploadTrayFile {
  name: string;
  size: number;
}

type Status = "uploading" | "done" | "error";

interface Upload extends UploadTrayFile {
  id: string;
  progress: number;
  bytesPerSecond: number;
  status: Status;
  attempt: number;
  tilt: number;
  failAt?: number;
}

export interface UploadTrayProps {
  initialFiles?: UploadTrayFile[];
  shouldFail?: (file: UploadTrayFile, attempt: number) => boolean;
  onFiles?: (files: File[]) => void;
  accept?: string;
  hint?: string;
  className?: string;
}

const KINDS: { match: RegExp; label: string; className: string }[] = [
  { match: /\.pdf$/i, label: "PDF", className: "bg-destructive text-white" },
  { match: /\.(png|jpe?g|gif|webp|svg|avif)$/i, label: "IMG", className: "bg-info text-white" },
  { match: /\.(mp4|mov|webm)$/i, label: "VID", className: "bg-foreground text-background" },
  { match: /\.(zip|tar|gz|rar)$/i, label: "ZIP", className: "bg-warning text-white" },
  { match: /\.(docx?|txt|md|pages)$/i, label: "DOC", className: "bg-sky-600 text-white dark:bg-sky-500" },
  { match: /\.(csv|xlsx?|numbers)$/i, label: "XLS", className: "bg-success text-white" },
  { match: /\.(fig|sketch|psd)$/i, label: "FIG", className: "bg-violet-600 text-white dark:bg-violet-500" },
];

function kindOf(name: string) {
  const known = KINDS.find((k) => k.match.test(name));
  if (known) return known;
  const ext = name.split(".").pop()?.slice(0, 3).toUpperCase() ?? "FILE";
  return { label: ext, className: "bg-muted-foreground text-background" };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatEta(seconds: number) {
  if (!Number.isFinite(seconds)) return "…";
  const s = Math.max(1, Math.ceil(seconds));
  if (s < 60) return `${s}s left`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s left`;
}

let uid = 0;
const makeUpload = (file: UploadTrayFile): Upload => ({
  ...file,
  id: `u${++uid}`,
  progress: 0,
  bytesPerSecond: (0.35 + Math.random() * 0.9) * 1024 ** 2,
  status: "uploading",
  attempt: 0,
  tilt: (Math.random() - 0.5) * 14,
});

const TICK = 120;

export function UploadTray({
  initialFiles = [],
  shouldFail = () => false,
  onFiles,
  accept,
  hint = "PDF, images, video or archives · up to 50 MB",
  className,
}: UploadTrayProps) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const reduce = useReducedMotion();
  const inputId = useId();
  const shouldFailRef = useRef(shouldFail);
  useEffect(() => {
    shouldFailRef.current = shouldFail;
  }, [shouldFail]);

  const add = (files: UploadTrayFile[]) => {
    const next = files.map((file) => {
      const u = makeUpload(file);
      return shouldFailRef.current(u, 0) ? { ...u, failAt: 0.35 + Math.random() * 0.3 } : u;
    });
    setUploads((list) => [...next, ...list]);
  };

  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || initialFiles.length === 0) return;
    seeded.current = true;
    const timers = initialFiles.map((file, i) => window.setTimeout(() => add([file]), 250 + i * 260));
    return () => {
      timers.forEach(clearTimeout);
      seeded.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = uploads.some((u) => u.status === "uploading");
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setUploads((list) =>
        list.map((u) => {
          if (u.status !== "uploading") return u;
          const jitter = 0.7 + Math.random() * 0.6;
          const progress = Math.min(1, u.progress + (u.bytesPerSecond * jitter * TICK) / 1000 / u.size);
          if (u.failAt !== undefined && progress >= u.failAt) {
            return { ...u, progress: u.failAt, status: "error", failAt: undefined };
          }
          return { ...u, progress, status: progress >= 1 ? "done" : "uploading" };
        }),
      );
    }, TICK);
    return () => clearInterval(id);
  }, [active]);

  const retry = (id: string) => {
    setUploads((list) =>
      list.map((u) => {
        if (u.id !== id) return u;
        const attempt = u.attempt + 1;
        const failAt = shouldFailRef.current(u, attempt) ? 0.35 + Math.random() * 0.3 : undefined;
        return { ...u, attempt, failAt, progress: 0, status: "uploading" };
      }),
    );
  };

  const remove = (id: string) => setUploads((list) => list.filter((u) => u.id !== id));

  const takeFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const files = [...list];
    onFiles?.(files);
    add(files.map((f) => ({ name: f.name, size: Math.max(f.size, 200_000) })));
  };

  const onDrag = (event: DragEvent, kind: "enter" | "leave" | "over" | "drop") => {
    event.preventDefault();
    if (kind === "enter") {
      depth.current += 1;
      setDragging(true);
    } else if (kind === "leave") {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    } else if (kind === "drop") {
      depth.current = 0;
      setDragging(false);
      takeFiles(event.dataTransfer.files);
    }
  };

  const done = uploads.filter((u) => u.status === "done").length;

  return (
    <div className={cn("grid w-full max-w-md gap-3", className)}>
      <label
        className={cn(
          "group/drop relative flex cursor-pointer flex-col items-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed bg-card px-6 py-8 text-center outline-none transition-[border-color,background-color] duration-200 has-focus-visible:ring-2 has-focus-visible:ring-ring",
          dragging ? "border-primary bg-accent" : "border-border hover:border-ring/60",
        )}
        htmlFor={inputId}
        onDragEnter={(e) => onDrag(e, "enter")}
        onDragLeave={(e) => onDrag(e, "leave")}
        onDragOver={(e) => onDrag(e, "over")}
        onDrop={(e) => onDrag(e, "drop")}
      >
        <motion.span
          animate={dragging && !reduce ? { y: [-2, -8, -2], scale: 1.08 } : { y: 0, scale: 1 }}
          className={cn(
            "flex size-11 items-center justify-center rounded-full transition-colors duration-200 [&_svg]:size-5",
            dragging ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
          transition={dragging ? { y: { repeat: Infinity, duration: 1.1, ease: "easeInOut" } } : { type: "spring", stiffness: 300, damping: 18 }}
        >
          <CloudUploadIcon />
        </motion.span>
        <span className="font-medium text-sm">
          {dragging ? "Let go to upload" : (
            <>
              Drop files here or <span className="underline underline-offset-4">browse</span>
            </>
          )}
        </span>
        <span className="text-muted-foreground text-xs">{hint}</span>
        <input
          accept={accept}
          className="sr-only"
          id={inputId}
          multiple
          onChange={(e) => {
            takeFiles(e.target.files);
            e.target.value = "";
          }}
          type="file"
        />
      </label>

      {uploads.length > 0 && (
        <div className="flex items-center justify-between px-1 text-muted-foreground text-xs">
          <span>
            <span className="text-foreground tabular-nums">{done}</span> of <span className="tabular-nums">{uploads.length}</span> uploaded
          </span>
          {done > 0 && (
            <button
              className="cursor-pointer rounded underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setUploads((list) => list.filter((u) => u.status !== "done"))}
              type="button"
            >
              Clear finished
            </button>
          )}
        </div>
      )}

      <ul className="grid gap-2">
        <AnimatePresence initial={false}>
          {uploads.map((u) => (
            <UploadCard key={u.id} onRemove={() => remove(u.id)} onRetry={() => retry(u.id)} upload={u} />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function UploadCard({ upload: u, onRetry, onRemove }: { upload: Upload; onRetry: () => void; onRemove: () => void }) {
  const reduce = useReducedMotion();
  const kind = kindOf(u.name);
  const remaining = (u.size * (1 - u.progress)) / u.bytesPerSecond;

  return (
    <motion.li
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      className={cn(
        "relative flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs/5 transition-colors",
        u.status === "error" && "border-destructive/40 bg-destructive/4",
      )}
      exit={{ opacity: 0, scale: 0.94, x: 24, transition: { duration: 0.18 } }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -24, rotate: u.tilt, scale: 0.95 }}
      layout={!reduce}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
    >
      <span
        className={cn(
          "relative flex h-10 w-8 shrink-0 items-end justify-center rounded-md pb-1.5 font-bold font-mono text-[9px] tracking-wide [clip-path:polygon(0_0,70%_0,100%_22%,100%_100%,0_100%)]",
          kind.className,
        )}
      >
        <span aria-hidden className="absolute top-0 right-0 size-2.5 rounded-bl-sm bg-background/35" />
        {kind.label}
      </span>
      <div className="grid min-w-0 flex-1 gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-medium text-sm">{u.name}</span>
          <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
            {u.status === "uploading" && `${Math.round(u.progress * 100)}%`}
          </span>
        </div>
        <div
          aria-label={`${u.name} upload progress`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(u.progress * 100)}
          className={cn(
            "h-1.5 overflow-hidden rounded-full bg-muted transition-[height,opacity,margin] duration-500",
            u.status === "done" && "-my-0.75 h-0 opacity-0",
          )}
          role="progressbar"
        >
          <motion.div
            animate={{ width: `${u.progress * 100}%` }}
            className={cn("h-full rounded-full", u.status === "error" ? "bg-destructive" : "bg-primary")}
            initial={false}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        <span className="-mt-0.5 text-muted-foreground text-xs tabular-nums" aria-live="polite">
          {u.status === "uploading" && (
            <>
              {formatBytes(u.size * u.progress)} of {formatBytes(u.size)} · {formatEta(remaining)}
            </>
          )}
          {u.status === "done" && <>Uploaded · {formatBytes(u.size)}</>}
          {u.status === "error" && <span className="text-destructive-foreground">Connection lost at {Math.round(u.progress * 100)}%</span>}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <AnimatePresence initial={false} mode="popLayout">
          {u.status === "done" && (
            <motion.span
              animate={{ scale: 1, opacity: 1 }}
              className="flex size-6 items-center justify-center rounded-full bg-success text-white [&_svg]:size-3.5"
              exit={{ scale: 0.6, opacity: 0 }}
              initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
              key="done"
              transition={{ type: "spring", stiffness: 520, damping: 26 }}
            >
              <CheckIcon strokeWidth={3} />
            </motion.span>
          )}
          {u.status === "error" && (
            <motion.button
              animate={{ scale: 1, opacity: 1 }}
              aria-label={`Retry ${u.name}`}
              className="flex h-8 cursor-pointer items-center gap-1 rounded-lg border bg-popover px-2.5 font-medium text-xs outline-none transition-[background-color,scale] hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] [&_svg]:size-3.5"
              exit={{ scale: 0.9, opacity: 0 }}
              initial={reduce ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
              key="retry"
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              onClick={onRetry}
              type="button"
            >
              <RotateCwIcon />
              Retry
            </motion.button>
          )}
        </AnimatePresence>
        <button
          aria-label={`Remove ${u.name}`}
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-[background-color,color,scale] hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] [&_svg]:size-3.5"
          onClick={onRemove}
          type="button"
        >
          <XIcon />
        </button>
      </div>
    </motion.li>
  );
}
