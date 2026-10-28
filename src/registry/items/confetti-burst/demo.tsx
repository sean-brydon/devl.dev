"use client";

import { CheckIcon, RocketIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { type confettiPalettes, useConfetti } from "@/registry/items/confetti-burst/confetti-burst";

const palettes: (keyof typeof confettiPalettes)[] = ["party", "brand", "mono"];

export default function ConfettiBurstDemo() {
  const [palette, setPalette] = useState<keyof typeof confettiPalettes>("party");
  const [shipped, setShipped] = useState(false);
  const { fire, layer } = useConfetti({ palette });

  useEffect(() => {
    if (!shipped) return;
    const t = setTimeout(() => setShipped(false), 2600);
    return () => clearTimeout(t);
  }, [shipped]);

  return (
    <div className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border bg-card p-5 shadow-xs/5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border bg-background">
          <RocketIcon className="size-4 text-muted-foreground" />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm">Release 2.4 is ready</span>
          <span className="text-muted-foreground text-xs">12 changes · all 48 checks passed</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <SegmentedControl aria-label="Confetti palette" size="sm">
          {palettes.map((p) => (
            <SegmentedControlItem
              aria-pressed={palette === p}
              className="text-muted-foreground capitalize hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              data-pressed={palette === p ? "" : undefined}
              key={p}
              onClick={() => setPalette(p)}
            >
              {p}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <div className="relative">
          <Button
            aria-live="polite"
            className="w-28 transition-[scale,box-shadow] duration-150 active:scale-[0.97]"
            onClick={() => {
              if (shipped) return;
              setShipped(true);
              fire();
            }}
            variant={shipped ? "outline" : "default"}
          >
            {shipped ? (
              <>
                <CheckIcon className="text-success-foreground opacity-100!" />
                Shipped
              </>
            ) : (
              "Ship 2.4"
            )}
          </Button>
          {layer}
        </div>
      </div>
    </div>
  );
}
