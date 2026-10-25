import { cn } from "@/lib/utils";

function Tile({ className, ad = false }: { className?: string; ad?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        className={cn(
          "relative flex-1 rounded-md border",
          ad
            ? "border-brand-ink/50 bg-brand/30 shadow-[0_0_0_3px] shadow-brand/25"
            : "dot-grid border-neutral-200 bg-neutral-100 dark:border-border dark:bg-card",
        )}
      >
        {ad && (
          <span className="absolute top-1 left-1.5 font-mono text-[7px] text-brand-foreground uppercase tracking-widest dark:text-brand">
            Ad
          </span>
        )}
      </div>
      <div className={cn("h-1 rounded-full", ad ? "w-1/2 bg-brand-ink/50" : "w-2/3 bg-foreground/10")} />
    </div>
  );
}

export function GridPreview() {
  return (
    <div aria-hidden className="flex h-full flex-col gap-2 p-4">
      <div className="h-2 w-1/3 rounded-full bg-foreground/15" />
      <div className="mb-1 h-1.5 w-1/2 rounded-full bg-foreground/8" />
      <div className="grid flex-1 grid-cols-3 grid-rows-2 gap-2">
        <Tile />
        <Tile />
        <Tile ad />
        <Tile className="col-span-2" />
        <Tile />
      </div>
    </div>
  );
}

export function ItemPreview() {
  return (
    <div aria-hidden className="grid h-full grid-cols-[40%_1fr] gap-3 p-4">
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 w-1/3 rounded-full bg-foreground/10" />
        <div className="mt-1 h-3 w-4/5 rounded-full bg-foreground/15" />
        <div className="h-1.5 w-full rounded-full bg-foreground/8" />
        <div className="mt-1 flex h-4 items-center gap-1 rounded-full border bg-card px-1.5">
          <div className="h-1 flex-1 rounded-full bg-foreground/10" />
          <div className="size-2.5 rounded-full bg-brand" />
        </div>
        <div className="relative mt-1 flex flex-col gap-1 rounded-md border border-brand-ink/50 bg-brand/30 p-1.5 shadow-[0_0_0_3px] shadow-brand/25">
          <div className="flex items-center gap-1">
            <div className="size-2.5 rounded-[3px] bg-brand-ink/60" />
            <div className="h-1 w-1/2 rounded-full bg-brand-ink/50" />
          </div>
          <div className="h-1 w-full rounded-full bg-brand-ink/25" />
        </div>
        <div className="mt-1 h-1 w-2/3 rounded-full bg-foreground/8" />
        <div className="h-1 w-1/2 rounded-full bg-foreground/8" />
      </div>
      <div className="dot-grid rounded-md border border-neutral-200 bg-neutral-100 dark:border-border dark:bg-card" />
    </div>
  );
}
