"use client";

import { Suspense } from "react";
import { demos } from "@/registry/__generated__/demos";

export function Preview({ slug }: { slug: string }) {
  const Demo = demos[slug];
  if (!Demo) return <span className="text-muted-foreground text-sm">No preview yet</span>;
  return (
    <Suspense fallback={<div className="size-full min-h-24 min-w-24 animate-pulse rounded-xl bg-muted/40" />}>
      <Demo />
    </Suspense>
  );
}
