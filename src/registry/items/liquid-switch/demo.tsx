"use client";

import { useState } from "react";
import { LiquidSwitch } from "@/registry/items/liquid-switch/liquid-switch";

export default function LiquidSwitchDemo() {
  const [sync, setSync] = useState(true);

  return (
    <div className="flex w-80 flex-col gap-6">
      <div className="flex items-center justify-center gap-5">
        <LiquidSwitch aria-label="Small switch" defaultChecked size="sm" />
        <LiquidSwitch aria-label="Default switch" />
        <LiquidSwitch aria-label="Large switch" defaultChecked size="lg" tone="success" />
      </div>
      <div className="grid gap-4 rounded-2xl border bg-card p-4">
        <LiquidSwitch
          checked={sync}
          description={sync ? "Changes sync across your devices." : "Changes stay on this device."}
          label="Background sync"
          onCheckedChange={setSync}
        />
        <LiquidSwitch description="Ping me when a build fails." label="Build alerts" tone="info" />
        <LiquidSwitch description="Requires a workspace owner." disabled label="Public link" />
      </div>
    </div>
  );
}
