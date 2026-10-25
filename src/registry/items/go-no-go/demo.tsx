"use client";

import { useEffect, useState } from "react";
import { GoNoGo, type GoNoGoRequest } from "@/registry/items/go-no-go/go-no-go";

const requests: GoNoGoRequest[] = [
  {
    agent: "Kestrel",
    action: "run a shell command",
    risk: "high",
    preview: { type: "command", cwd: "~/orbit/web", command: "rm -rf dist && pnpm publish --access public" },
    reason: "Publishing 2.4.0 after the release checklist passed.",
  },
  {
    agent: "Wren",
    action: "edit a config file",
    risk: "medium",
    preview: {
      type: "diff",
      file: "deploy/limits.yaml",
      lines: [
        { kind: " ", text: "search:" },
        { kind: "-", text: "  rate_limit: 60/min" },
        { kind: "+", text: "  rate_limit: 120/min" },
      ],
    },
  },
];

export default function GoNoGoDemo() {
  const [round, setRound] = useState(0);
  const [resolved, setResolved] = useState(0);

  useEffect(() => {
    if (resolved < requests.length) return;
    const id = setTimeout(() => {
      setResolved(0);
      setRound((r) => r + 1);
    }, 4000);
    return () => clearTimeout(id);
  }, [resolved]);

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-3">
      {requests.map((request, i) => (
        <GoNoGo
          key={`${round}-${i}`}
          onDecision={() => setResolved((n) => n + 1)}
          onUndo={() => setResolved((n) => n - 1)}
          request={request}
          timeout={i === 0 ? 20 : 32}
        />
      ))}
    </div>
  );
}
