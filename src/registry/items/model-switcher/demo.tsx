"use client";

import { useState } from "react";
import { ModelSwitcherPanel, type ModelSwitcherValue } from "@/registry/items/model-switcher/model-switcher";

export default function ModelSwitcherDemo() {
  const [value, setValue] = useState<ModelSwitcherValue>({ model: "quill-4", thinking: true, effort: 1 });
  return (
    <div className="flex h-[440px] items-start">
      <div className="rounded-2xl border bg-card shadow-xs/5">
        <ModelSwitcherPanel onValueChange={setValue} value={value} />
      </div>
    </div>
  );
}
