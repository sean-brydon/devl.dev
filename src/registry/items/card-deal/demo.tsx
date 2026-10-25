"use client";

import { CloudRainIcon, CoffeeIcon, HeadphonesIcon, type LucideIcon, MoonIcon, ShuffleIcon, SunIcon, ZapIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardDeal } from "@/registry/items/card-deal/card-deal";

type Mix = { id: string; title: string; meta: string; icon: LucideIcon; cover: string };

const mixes: Mix[] = [
  { id: "focus", title: "Deep Focus", meta: "38 songs", icon: HeadphonesIcon, cover: "from-indigo-500 to-violet-600" },
  { id: "drive", title: "Late Drive", meta: "52 songs", icon: MoonIcon, cover: "from-slate-600 to-indigo-900" },
  { id: "sunday", title: "Sunday Slow", meta: "24 songs", icon: CoffeeIcon, cover: "from-amber-500 to-orange-600" },
  { id: "run", title: "Run Club", meta: "45 songs", icon: ZapIcon, cover: "from-rose-500 to-fuchsia-600" },
  { id: "rain", title: "Rainy Window", meta: "31 songs", icon: CloudRainIcon, cover: "from-sky-500 to-cyan-700" },
  { id: "morning", title: "Good Morning", meta: "29 songs", icon: SunIcon, cover: "from-lime-500 to-emerald-600" },
];

function shuffled<T>(list: T[]) {
  const next = [...list];
  do {
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
  } while (next.every((item, i) => item === list[i]));
  return next;
}

export default function CardDealDemo() {
  const deck = useRef<HTMLButtonElement>(null);
  const [order, setOrder] = useState(mixes);

  return (
    <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="font-medium text-sm">Made for you</span>
          <span className="truncate text-muted-foreground text-xs">Six mixes, refreshed every morning</span>
        </div>
        <Button
          className="z-10 motion-safe:active:scale-[0.97]"
          onClick={() => setOrder((o) => shuffled(o))}
          ref={deck}
          size="sm"
          variant="outline"
        >
          <ShuffleIcon />
          Shuffle
        </Button>
      </div>
      <CardDeal
        getKey={(mix) => mix.id}
        items={order}
        label="Daily mixes"
        origin={deck}
        renderItem={(mix) => (
          <button
            className="group flex w-full cursor-pointer flex-col gap-2 rounded-xl text-left outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-safe:active:scale-[0.97]"
            type="button"
          >
            <span
              className={`relative flex aspect-square w-full items-end overflow-hidden rounded-xl bg-linear-to-br p-2.5 text-white shadow-xs/5 ${mix.cover}`}
            >
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black/35 to-transparent" />
              <mix.icon className="absolute top-2.5 right-2.5 size-4 opacity-80" />
              <span className="relative font-semibold text-sm leading-tight">{mix.title}</span>
            </span>
            <span className="px-0.5 text-muted-foreground text-xs tabular-nums">{mix.meta}</span>
          </button>
        )}
      />
    </div>
  );
}
