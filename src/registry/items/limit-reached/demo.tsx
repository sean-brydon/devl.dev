"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LimitReached } from "@/registry/items/limit-reached/limit-reached";

const START = { used: 500, limit: 500, plan: "Team", seconds: 3 * 86400 + 4 * 3600 + 12 * 60 + 8, resetDate: "Nov 1" };

export default function LimitReachedDemo() {
  const [run, setRun] = useState(0);
  const [state, setState] = useState(START);
  const [upgrading, setUpgrading] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const atLimit = state.used >= state.limit;

  const upgrade = () => {
    setUpgrading(true);
    timer.current = window.setTimeout(() => {
      setUpgrading(false);
      setState((s) => ({ ...s, limit: 2000, plan: "Pro" }));
    }, 700);
  };

  const replay = () => {
    window.clearTimeout(timer.current);
    setUpgrading(false);
    setState(START);
    setRun((r) => r + 1);
  };

  return (
    <div className="grid w-full max-w-md justify-items-center gap-3">
      <LimitReached
        key={run}
        limit={state.limit}
        onReset={() => setState((s) => ({ ...s, used: 0, seconds: 30 * 86400, resetDate: "Dec 1" }))}
        onUpgrade={upgrade}
        planName={state.plan}
        resetDate={state.resetDate}
        secondsUntilReset={state.seconds}
        upgrade={{ plan: "Pro", limit: 2000 }}
        upgrading={upgrading}
        used={state.used}
      />
      {atLimit ? (
        <Button disabled={upgrading || state.seconds <= 5} onClick={() => setState((s) => ({ ...s, seconds: 5 }))} size="sm" variant="ghost">
          Skip to reset
        </Button>
      ) : (
        <Button onClick={replay} size="sm" variant="ghost">
          Replay
        </Button>
      )}
    </div>
  );
}
