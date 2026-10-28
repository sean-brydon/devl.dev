"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadFailed, type UploadFailedFile } from "@/registry/items/upload-failed/upload-failed";

const MB = 1024 ** 2;
const ALLOWED = ["JPG", "PNG", "PDF", "MOV", "CSV"];

const initial: UploadFailedFile[] = [
  { id: "brief", name: "survey-brief.pdf", size: 2.4 * MB, progress: 1, status: "done" },
  { id: "walkthrough", name: "north-ridge-walkthrough.mov", size: 18 * MB, progress: 0, status: "failed", issue: { kind: "too-large", maxBytes: 10 * MB } },
  { id: "photo", name: "trailhead-014.heic", size: 3.1 * MB, progress: 0, status: "failed", issue: { kind: "type", allowed: ALLOWED, hint: "Export HEIC photos as JPG first." } },
  { id: "responses", name: "visitor-responses.csv", size: 6.8 * MB, progress: 0.62, status: "failed", issue: { kind: "connection" } },
  { id: "cover", name: "cover-north-ridge.jpg", size: 1.2 * MB, progress: 1, status: "done" },
];

const resume = (f: UploadFailedFile): UploadFailedFile =>
  f.status === "failed" && f.issue?.kind === "connection" ? { ...f, status: "uploading", issue: undefined } : f;

export default function UploadFailedDemo() {
  const [files, setFiles] = useState(initial);
  const uploading = files.some((f) => f.status === "uploading");
  const settled = !uploading && files.every((f) => f.status === "done");

  useEffect(() => {
    if (!uploading) return;
    const id = window.setInterval(() => {
      setFiles((list) =>
        list.map((f) => {
          if (f.status !== "uploading") return f;
          const progress = Math.min(1, f.progress + 0.04 + Math.random() * 0.04);
          return { ...f, progress, status: progress >= 1 ? "done" : "uploading" };
        }),
      );
    }, 140);
    return () => clearInterval(id);
  }, [uploading]);

  const replace = (id: string, picked: File) =>
    setFiles((list) =>
      list.map((f) => {
        if (f.id !== id || f.status !== "failed") return f;
        const ext = picked.name.split(".").pop()?.toUpperCase() ?? "";
        if (f.issue?.kind === "too-large" && picked.size > f.issue.maxBytes) return { ...f, name: picked.name, size: picked.size };
        if (!ALLOWED.includes(ext === "JPEG" ? "JPG" : ext)) {
          return { ...f, name: picked.name, size: picked.size, issue: { kind: "type", allowed: ALLOWED } };
        }
        return { ...f, name: picked.name, size: picked.size, progress: 0, status: "uploading", issue: undefined };
      }),
    );

  return (
    <div className="grid w-full max-w-136 justify-items-center gap-3">
      <UploadFailed
        destination="Q3 site survey"
        files={files}
        onRemove={(id) => setFiles((list) => list.filter((f) => f.id !== id))}
        onRemoveFailed={() => setFiles((list) => list.filter((f) => f.status !== "failed"))}
        onReplace={replace}
        onRetry={(id) => setFiles((list) => list.map((f) => (f.id === id ? resume(f) : f)))}
        onRetryAll={() => setFiles((list) => list.map(resume))}
      />
      <Button className={settled ? undefined : "invisible"} onClick={() => setFiles(initial)} size="sm" variant="ghost">
        Replay
      </Button>
    </div>
  );
}
