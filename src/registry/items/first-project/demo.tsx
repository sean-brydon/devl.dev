"use client";

import { RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FirstProject } from "@/registry/items/first-project/first-project";

export default function FirstProjectDemo() {
  const [run, setRun] = useState(0);
  const [created, setCreated] = useState(false);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <FirstProject key={run} onCreate={() => setCreated(true)} />
      <Button
        className={created ? "" : "invisible"}
        onClick={() => {
          setCreated(false);
          setRun((r) => r + 1);
        }}
        size="xs"
        variant="ghost"
      >
        <RotateCcwIcon />
        Back to the empty state
      </Button>
    </div>
  );
}
