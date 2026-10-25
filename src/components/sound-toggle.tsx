"use client";

import { Volume2Icon, VolumeXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playGoo, setSoundEnabled, useSoundEnabled } from "@/lib/sound";

export function SoundToggle() {
  const enabled = useSoundEnabled();

  return (
    <Button
      aria-label={enabled ? "Mute interface sounds" : "Turn on interface sounds"}
      aria-pressed={enabled}
      className="rounded-full text-muted-foreground"
      onClick={() => {
        setSoundEnabled(!enabled);
        if (!enabled) playGoo(4);
      }}
      size="icon-sm"
      variant="ghost"
    >
      {enabled ? <Volume2Icon /> : <VolumeXIcon />}
    </Button>
  );
}
