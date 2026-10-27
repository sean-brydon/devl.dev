"use client";

import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LivePreview } from "@/components/live-preview";
import { cn } from "@/lib/utils";

export interface StagePiece {
  slug: string;
  name: string;
  category: string;
  href: string;
}

/** The landing page's window: pick a signature piece on the left, play with it live on the right. */
export function HeroStage({ pieces }: { pieces: StagePiece[] }) {
  const [active, setActive] = useState(pieces[0]?.slug);
  const current = pieces.find((piece) => piece.slug === active) ?? pieces[0];
  if (!current) return null;

  return (
    <div className="overflow-hidden rounded-3xl border bg-card shadow-lg/5">
      <div className="flex h-11 items-center gap-3 border-b px-4">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-foreground/12" />
          <span className="size-2.5 rounded-full bg-foreground/12" />
          <span className="size-2.5 rounded-full bg-foreground/12" />
        </span>
        <span className="min-w-0 flex-1 truncate text-center font-mono text-muted-foreground text-xs">devl.dev{current.href}</span>
        <Link
          className="flex items-center gap-1 rounded-full px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-foreground"
          href={current.href}
        >
          Open
          <ArrowUpRightIcon className="size-3.5" />
        </Link>
      </div>
      <div className="grid md:grid-cols-[15rem_minmax(0,1fr)]">
        <div
          aria-label="Signature pieces"
          className="flex gap-1 overflow-x-auto border-b p-2 [scrollbar-width:none] md:flex-col md:overflow-visible md:border-r md:border-b-0 [&::-webkit-scrollbar]:hidden"
          role="tablist"
        >
          {pieces.map((piece) => {
            const selected = piece.slug === current.slug;
            return (
              <button
                aria-selected={selected}
                className={cn(
                  "flex shrink-0 cursor-pointer flex-col items-start rounded-xl px-3 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "bg-accent" : "hover:bg-accent/60",
                )}
                key={piece.slug}
                onClick={() => setActive(piece.slug)}
                role="tab"
                type="button"
              >
                <span className={cn("text-sm", selected ? "font-medium text-foreground" : "text-foreground/80")}>{piece.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{piece.category}</span>
              </button>
            );
          })}
        </div>
        <div className="stage-surface relative h-[26rem] md:h-[32rem]" role="tabpanel">
          <LivePreview key={current.slug} slug={current.slug} />
        </div>
      </div>
    </div>
  );
}
