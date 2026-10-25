"use client";

import { useEffect, useState } from "react";
import {
  ComposingIndicator,
  type Typer,
  TypingCrowd,
  TypingDots,
  TypingName,
} from "@/registry/items/typing-indicators/typing-indicators";

const team: Record<string, Typer> = {
  sam: { id: "sam", name: "Sam Okafor", initials: "SO", avatarClassName: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  ana: { id: "ana", name: "Ana Ruiz", initials: "AR", avatarClassName: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  leo: { id: "leo", name: "Leo Brandt", initials: "LB", avatarClassName: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  kai: { id: "kai", name: "Kai Moreno", initials: "KM", avatarClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  ivy: { id: "ivy", name: "Ivy Chen", initials: "IC", avatarClassName: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
};

const script = [["sam", "ana"], ["sam", "ana", "leo"], ["sam", "ana", "leo", "kai", "ivy"], ["ana", "leo", "kai"], ["leo"], ["leo", "sam"]];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-16 items-center gap-4 px-4 py-3">
      <span className="w-16 shrink-0 text-muted-foreground text-xs">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function TypingIndicatorsDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % script.length), 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full max-w-[400px] divide-y rounded-2xl border bg-card shadow-xs/5">
      <Row label="Bubble">
        <TypingDots label="Sam is typing" />
      </Row>
      <Row label="Named">
        <TypingName person={team.ana} />
      </Row>
      <Row label="Group">
        <TypingCrowd people={script[step].map((id) => team[id])} />
      </Row>
      <Row label="Assistant">
        <ComposingIndicator />
      </Row>
    </div>
  );
}
