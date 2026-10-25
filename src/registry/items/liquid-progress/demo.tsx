"use client";

import { CheckIcon, DownloadIcon, PackageIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LiquidProgress } from "@/registry/items/liquid-progress/liquid-progress";

const TOTAL_GB = 2.4;
const CHUNKS = [6, 11, 3, 14, 9, 2, 17, 8, 12, 5, 13];

export default function LiquidProgressDemo() {
  const [run, setRun] = useState(0);
  const [step, setStep] = useState(0);
  const progress = Math.min(CHUNKS.slice(0, step).reduce((a, b) => a + b, 0), 100);
  const done = progress >= 100;
  const attachmentsCounted = step >= 4;

  useEffect(() => {
    if (done) return;
    const id = window.setTimeout(() => setStep((s) => s + 1), step === 0 ? 500 : 650);
    return () => window.clearTimeout(id);
  }, [step, done, run]);

  const restart = () => {
    setStep(0);
    setRun((r) => r + 1);
  };

  const rows = [
    { label: "Pages", value: Math.min(100, progress * 1.3), meta: `${Math.round(Math.min(1, (progress * 1.3) / 100) * 1800).toLocaleString("en-US")} / 1,800` },
    { label: "Attachments", value: attachmentsCounted ? Math.max(0, (progress - 30) * 1.43) : null, meta: attachmentsCounted ? "312 files" : "Counting…" },
    { label: "Comments", value: Math.min(100, progress * 2.2), meta: progress * 2.2 >= 100 ? "Done" : "Copying…" },
  ];

  return (
    <div className="grid w-96 max-w-full gap-4 rounded-2xl border bg-card p-5 shadow-xs/5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          {done ? <CheckIcon className="size-4 text-success-foreground" /> : <PackageIcon className="size-4" />}
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="truncate font-medium text-sm">{done ? "Your export is ready" : "Exporting Northwind workspace"}</p>
          <p className="text-muted-foreground text-xs tabular-nums">
            {done
              ? `${TOTAL_GB} GB · northwind-2026-10-24.zip`
              : `${((progress / 100) * TOTAL_GB).toFixed(1)} GB of ${TOTAL_GB} GB · about ${Math.max(1, Math.round((100 - progress) / 14))}s left`}
          </p>
        </div>
      </div>
      <LiquidProgress aria-label="Export progress" showValue size="lg" tone={done ? "success" : "primary"} value={progress} />
      <div className="grid gap-3 border-t pt-4">
        {rows.map((row) => (
          <div className="grid grid-cols-[6.5rem_1fr_5.5rem] items-center gap-3 text-xs" key={row.label}>
            <span className="text-muted-foreground">{row.label}</span>
            <LiquidProgress aria-label={row.label} size="sm" value={row.value === null ? null : Math.min(100, row.value)} />
            <span className="text-right text-muted-foreground tabular-nums">{row.meta}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        {done ? (
          <>
            <Button onClick={restart} size="sm" variant="ghost">
              <RotateCcwIcon />
              Run again
            </Button>
            <Button size="sm">
              <DownloadIcon />
              Download
            </Button>
          </>
        ) : (
          <Button onClick={restart} size="sm" variant="ghost">
            Restart
          </Button>
        )}
      </div>
    </div>
  );
}
