"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { type LeaderboardEntry, Leaderboard } from "@/registry/items/leaderboard/leaderboard";

const start: LeaderboardEntry[] = [
  { id: "mira", name: "Mira Okafor", detail: "Enterprise · EMEA", score: 184200, previousRank: 2 },
  { id: "jonah", name: "Jonah Lindqvist", detail: "Mid-market · NA", score: 179850, previousRank: 1 },
  { id: "priya", name: "Priya Raman", detail: "Enterprise · APAC", score: 163400, previousRank: 3 },
  { id: "teo", name: "Teo Alvarez", detail: "SMB · LATAM", score: 151900, previousRank: 5 },
  { id: "hana", name: "Hana Sato", detail: "Mid-market · APAC", score: 149300, previousRank: 4 },
  { id: "luca", name: "Luca Ferri", detail: "SMB · EMEA", score: 141050, previousRank: 7 },
  { id: "amara", name: "Amara Diallo", detail: "Enterprise · NA", score: 137700, previousRank: 6 },
  { id: "you", name: "Sam Whitfield", detail: "Mid-market · NA", score: 131250, previousRank: 9 },
  { id: "noor", name: "Noor Haddad", detail: "SMB · MENA", score: 126900, previousRank: 8 },
];

const script: [string, number][] = [
  ["you", 7400],
  ["teo", 3100],
  ["you", 6800],
  ["mira", 2400],
  ["hana", 5200],
  ["you", 9600],
  ["jonah", 6100],
  ["you", 4300],
  ["priya", 3800],
  ["you", 8200],
];

export default function LeaderboardDemo() {
  const [entries, setEntries] = useState(start);
  const [step, setStep] = useState(0);
  const [live, setLive] = useState(true);

  useEffect(() => {
    if (!live) return;
    const id = setTimeout(
      () => {
        if (step >= script.length) {
          setEntries(start);
          setStep(0);
          return;
        }
        const [who, amount] = script[step];
        setEntries((list) => list.map((e) => (e.id === who ? { ...e, score: e.score + amount } : e)));
        setStep((s) => s + 1);
      },
      step >= script.length ? 4200 : 2000,
    );
    return () => clearTimeout(id);
  }, [live, step]);

  return (
    <Leaderboard
      action={
        <Button onClick={() => setLive((v) => !v)} size="xs" variant="outline">
          {live ? <PauseIcon /> : <PlayIcon />}
          {live ? "Pause" : "Resume"}
        </Button>
      }
      caption="Closed won · Oct 1 – Oct 24"
      entries={entries}
      format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
      title="Sales leaderboard"
      youId="you"
    />
  );
}
