"use client";

import { useEffect, useState } from "react";
import { PresenceBar, type PresencePerson, presenceHues } from "@/registry/items/presence-bar/presence-bar";
import { cn } from "@/lib/utils";

const everyone: PresencePerson[] = [
  { id: "ana", name: "Ana Ruiz", initials: "AR", hue: "rose", status: "active", location: "Pricing" },
  { id: "sam", name: "Sam Okafor", initials: "SO", hue: "sky", status: "active", location: "Timeline" },
  { id: "ivy", name: "Ivy Chen", initials: "IC", hue: "violet", status: "idle", location: "Overview" },
  { id: "kai", name: "Kai Moreno", initials: "KM", hue: "emerald", status: "active", location: "Risks" },
  { id: "leo", name: "Leo Brandt", initials: "LB", hue: "amber", status: "active", location: "Pricing" },
  { id: "mo", name: "Mo Haddad", initials: "MH", hue: "orange", status: "idle", location: "Timeline" },
];

const beats = [
  ["ana", "sam", "ivy"],
  ["ana", "sam", "ivy", "kai"],
  ["ana", "sam", "ivy", "kai", "leo", "mo"],
  ["ana", "sam", "kai", "leo", "mo"],
  ["ana", "sam", "kai"],
];

const sections = [
  { id: "Overview", lines: [92, 78] },
  { id: "Pricing", lines: [86, 64, 40] },
  { id: "Timeline", lines: [70, 88] },
  { id: "Risks", lines: [58] },
];

export default function PresenceBarDemo() {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setBeat((b) => (b + 1) % beats.length), 2600);
    return () => clearInterval(id);
  }, []);
  const people = beats[beat].map((id) => everyone.find((p) => p.id === id)!);

  return (
    <PresenceBar people={people} subtitle="Edited just now by Sam" title="Q3 roadmap">
      {(following) => (
        <div className="space-y-1 p-3">
          {sections.map((s) => {
            const here = following?.location === s.id;
            return (
              <div
                className={cn(
                  "rounded-xl px-3 py-2.5 transition-colors duration-300",
                  here && following && presenceHues[following.hue].tint,
                )}
                key={s.id}
              >
                <p className="mb-2 font-medium text-xs">{s.id}</p>
                <div className="space-y-1.5">
                  {s.lines.map((w, i) => (
                    <div className="h-1.5 rounded-full bg-foreground/[0.07]" key={i} style={{ width: `${w}%` }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PresenceBar>
  );
}
