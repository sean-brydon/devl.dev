"use client";

import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { InkStamp } from "@/registry/items/ink-stamp/ink-stamp";

export interface CutPiece {
  slug: string;
  name: string;
  reason: string;
  replacedBy?: { name: string; href: string };
}

/** Real pieces that were cut, as 1-bit ghosts of their last render, stamped as they scroll in and again on hover. */
export function CuttingRoom({ pieces }: { pieces: CutPiece[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.4 });
  const [stamps, setStamps] = useState<(number | null)[]>(() => pieces.map(() => null));

  useEffect(() => {
    if (!seen) return;
    const timers = pieces.map((_, index) =>
      setTimeout(() => setStamps((current) => current.map((value, i) => (i === index ? 1 : value))), 250 + index * 260),
    );
    return () => timers.forEach(clearTimeout);
  }, [seen, pieces]);

  const restamp = (index: number) => setStamps((current) => current.map((value, i) => (i === index ? (value ?? 0) + 1 : value)));

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" ref={ref}>
      {pieces.map((piece, index) => (
        <article className="group flex flex-col gap-3" key={piece.slug} onPointerEnter={() => restamp(index)}>
          <div className="relative grid aspect-[16/10] place-items-center overflow-hidden rounded-2xl border bg-card">
            <div
              aria-hidden
              className="absolute inset-0 bg-foreground opacity-25 transition-opacity duration-300 group-hover:opacity-40"
              style={{ maskImage: `url(/landing/cut-${piece.slug}.png)`, maskSize: "cover", maskPosition: "center top" }}
            />
            <InkStamp caption="didn't make it" className="relative" label="Cut" rotate={-9 + (index % 2) * 6} stampKey={stamps[index]} tone="rose" />
          </div>
          <div className="flex flex-col gap-1 px-0.5">
            <h3 className="font-medium text-sm text-muted-foreground line-through decoration-rose-500/60">{piece.name}</h3>
            <p className="text-pretty text-muted-foreground text-sm">{piece.reason}</p>
            {piece.replacedBy && (
              <a className="text-foreground text-sm underline-offset-4 hover:underline" href={piece.replacedBy.href}>
                Became {piece.replacedBy.name} →
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
