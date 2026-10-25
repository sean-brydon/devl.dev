import { CheckIcon, DatabaseIcon, FileSearchIcon, LoaderIcon } from "lucide-react";
import { RimLight } from "@/registry/items/rim-light/rim-light";

const steps = [
  { label: "Build", meta: "41s", state: "done" },
  { label: "Upload assets", meta: "312 files", state: "running" },
  { label: "Promote to production", meta: "queued", state: "queued" },
] as const;

export default function RimLightDemo() {
  return (
    <div className="grid w-full max-w-md grid-cols-2 gap-3">
      <div className="relative col-span-2 flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs/5">
        <RimLight className="text-brand-ink" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-sm">Deploying northwind-web</span>
            <span className="font-mono text-muted-foreground text-xs">main · 4f2a91c</span>
          </div>
          <span className="rounded-full bg-brand/24 px-2 py-0.5 font-medium text-brand-foreground text-xs dark:text-brand">Live in ~1 min</span>
        </div>
        <ol className="flex flex-col gap-2.5">
          {steps.map((s) => (
            <li className="flex items-center gap-2.5 text-sm" key={s.label}>
              <span className="grid size-5 place-items-center rounded-full border bg-background">
                {s.state === "done" && <CheckIcon className="size-3 text-success-foreground" />}
                {s.state === "running" && <LoaderIcon className="size-3 animate-spin text-muted-foreground motion-reduce:animate-none" />}
              </span>
              <span className={s.state === "queued" ? "text-muted-foreground" : undefined}>{s.label}</span>
              <span className="ml-auto font-mono text-muted-foreground text-xs tabular-nums">{s.meta}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="relative flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs/5">
        <RimLight className="text-info" />
        <FileSearchIcon className="size-4 text-muted-foreground" />
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm">Indexing docs</span>
          <span className="text-muted-foreground text-xs tabular-nums">1,284 of 2,060 pages</span>
        </div>
      </div>

      <div className="relative flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs/5">
        <RimLight className="text-violet-500 dark:text-violet-400" />
        <DatabaseIcon className="size-4 text-muted-foreground" />
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm">Syncing contacts</span>
          <span className="text-muted-foreground text-xs tabular-nums">4,120 merged</span>
        </div>
      </div>
    </div>
  );
}
