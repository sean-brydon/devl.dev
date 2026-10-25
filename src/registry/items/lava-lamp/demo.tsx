import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LavaLamp } from "@/registry/items/lava-lamp/lava-lamp";

export default function LavaLampDemo() {
  return (
    <LavaLamp className="flex h-80 w-full max-w-lg items-center justify-center rounded-2xl border bg-card p-6">
      <div className="flex max-w-60 flex-col items-center gap-2.5 rounded-2xl border bg-background/55 p-4 text-center shadow-xs/5 backdrop-blur-md">
        <span className="font-medium text-muted-foreground text-xs">Emberline Studio</span>
        <h3 className="text-balance font-semibold text-lg leading-snug tracking-tight">Ideas that merge, split and find each other</h3>
        <p className="text-balance text-muted-foreground text-sm">Move your pointer over the glass and a blob drifts after it.</p>
        <Button size="sm">
          Get started
          <ArrowRightIcon />
        </Button>
      </div>
    </LavaLamp>
  );
}
