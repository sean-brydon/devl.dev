"use client";

import { MoonIcon, SpeakerIcon, Volume2Icon } from "lucide-react";
import { useState } from "react";
import { LiquidSlider } from "@/registry/items/liquid-slider/liquid-slider";

export default function LiquidSliderDemo() {
  const [volume, setVolume] = useState(64);

  return (
    <div className="grid w-80 max-w-full gap-5 rounded-2xl border bg-card p-5 shadow-xs/5">
      <div className="grid gap-0.5">
        <p className="font-medium text-sm">Living room</p>
        <p className="text-muted-foreground text-xs">Studio Monitor · {volume === 0 ? "Muted" : "Playing"}</p>
      </div>
      <LiquidSlider formatValue={(v) => `${v}%`} icon={<Volume2Icon />} label="Volume" onValueChange={setVolume} value={volume} />
      <LiquidSlider
        defaultValue={4}
        formatValue={(v) => (v > 0 ? `+${v} dB` : `${v} dB`)}
        icon={<SpeakerIcon />}
        label="Bass"
        max={12}
        min={-12}
        tone="info"
      />
      <LiquidSlider
        defaultValue={30}
        formatValue={(v) => `${v} min`}
        icon={<MoonIcon />}
        label="Sleep timer"
        max={90}
        min={5}
        step={5}
      />
    </div>
  );
}
