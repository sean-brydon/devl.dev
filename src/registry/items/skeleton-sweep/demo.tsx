import { SparklesIcon } from "lucide-react";
import { SkeletonSweep, SkeletonSweepBlock, SkeletonSweepText } from "@/registry/items/skeleton-sweep/skeleton-sweep";

export default function SkeletonSweepDemo() {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border bg-card shadow-xs/5">
      <SkeletonSweep className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <SkeletonSweepBlock className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <SkeletonSweepBlock className="h-3 w-2/5" />
            <SkeletonSweepBlock className="h-2.5 w-1/4" />
          </div>
          <SkeletonSweepBlock className="h-6 w-14 rounded-lg" />
        </div>
        <SkeletonSweepBlock className="h-32 w-full rounded-xl" />
        <div className="flex flex-col gap-2">
          <SkeletonSweepBlock className="h-3 w-full" />
          <SkeletonSweepBlock className="h-3 w-11/12" />
          <SkeletonSweepBlock className="h-3 w-3/5" />
        </div>
      </SkeletonSweep>
      <div className="flex items-center gap-2 border-t px-4 py-3 text-sm">
        <SparklesIcon aria-hidden className="size-4 text-muted-foreground" />
        <SkeletonSweepText className="font-medium" role="status">
          Drafting your summary…
        </SkeletonSweepText>
      </div>
    </div>
  );
}
