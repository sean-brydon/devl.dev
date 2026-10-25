"use client";

import { RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrambleText } from "@/registry/items/scramble-text/scramble-text";

const readouts = [
  { label: "Build", value: "4f2a91c" },
  { label: "Ships", value: "Nov 14" },
  { label: "Region", value: "eu-west-2" },
];

const links = ["Changelog", "Roadmap", "Status"];

export default function ScrambleTextDemo() {
  const [replay, setReplay] = useState(0);

  return (
    <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border bg-card p-6 shadow-xs/5">
      <div className="-mt-1.5 -mr-2 flex items-center justify-between">
        <ScrambleText className="text-muted-foreground text-xs tracking-wide" mono replay={replay} text="TRANSMISSION 07/12" />
        <Button aria-label="Decode again" onClick={() => setReplay((n) => n + 1)} size="icon-sm" variant="ghost">
          <RotateCcwIcon />
        </Button>
      </div>

      <ScrambleText
        as="h3"
        className="text-balance font-heading font-medium text-3xl tracking-tight"
        delay={120}
        replay={replay}
        text="Decoding the next release"
      />

      <dl className="grid grid-cols-3 gap-3 border-y py-4">
        {readouts.map((r, i) => (
          <div className="flex flex-col gap-1" key={r.label}>
            <dt className="text-muted-foreground text-xs">{r.label}</dt>
            <dd className="text-sm">
              <ScrambleText delay={420 + i * 90} mono replay={replay} stagger={36} text={r.value} />
            </dd>
          </div>
        ))}
      </dl>

      <nav aria-label="Release" className="-mx-2 -mb-2 flex items-center gap-1">
        {links.map((l) => (
          <ScrambleText
            as="a"
            className="rounded-md px-2 py-1.5 text-muted-foreground text-xs outline-none transition-colors after:ml-1 after:text-muted-foreground/60 after:content-['↗'] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            hold={120}
            href={`#${l.toLowerCase()}`}
            key={l}
            mono
            onClick={(e) => e.preventDefault()}
            stagger={22}
            text={l}
            trigger="hover"
          />
        ))}
      </nav>
    </div>
  );
}
