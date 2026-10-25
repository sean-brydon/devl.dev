"use client";

import { useState } from "react";
import { ColourField, type Oklch } from "@/registry/items/colour-field/colour-field";

export default function ColourFieldDemo() {
  const [accent, setAccent] = useState<Oklch>({ l: 0.62, c: 0.19, h: 259 });

  return (
    <div className="w-80 max-w-full rounded-2xl border bg-card p-4 shadow-xs/5">
      <ColourField label="Accent colour" onValueChange={setAccent} value={accent} />
    </div>
  );
}
