"use client";

import { RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CodeEntry } from "@/registry/items/code-entry/code-entry";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function CodeEntryDemo() {
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState(false);

  return (
    <div className="grid w-full max-w-sm justify-items-center gap-4 rounded-2xl border bg-card p-6">
      <CodeEntry
        hint="We sent a 6-digit code to mara@northwind.dev"
        key={attempt}
        onVerified={() => setDone(true)}
        onVerify={async (code) => {
          await wait(700);
          return code === "424242";
        }}
      />
      {done ? (
        <Button
          onClick={() => {
            setDone(false);
            setAttempt((n) => n + 1);
          }}
          size="sm"
          variant="ghost"
        >
          <RotateCcwIcon />
          Try again
        </Button>
      ) : (
        <p className="text-muted-foreground text-xs">
          Psst, the code is <span className="font-mono text-foreground">424242</span>
        </p>
      )}
    </div>
  );
}
