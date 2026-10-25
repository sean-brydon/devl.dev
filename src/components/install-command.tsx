"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

export function InstallCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="group flex w-full max-w-full items-center gap-3 rounded-full border bg-card py-2 ps-4 pe-2 text-left font-mono text-xs outline-none transition-colors hover:border-brand-ink/40 focus-visible:ring-2 focus-visible:ring-ring"
      onClick={async () => {
        await navigator.clipboard.writeText(command);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      type="button"
    >
      <span className="text-brand-ink">$</span>
      <span className="min-w-0 flex-1 truncate">{command}</span>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground transition-transform group-active:scale-90">
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      </span>
      <span className="sr-only">{copied ? "Copied" : "Copy install command"}</span>
    </button>
  );
}
