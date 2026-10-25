import { DropletsIcon, MountainIcon, TreePineIcon, WavesIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LiftToOpen, type LiftToOpenItem } from "@/registry/items/lift-to-open/lift-to-open";

function Route({ stats, about, tags }: { stats: [string, string][]; about: ReactNode; tags: string[] }) {
  return (
    <div className="flex flex-1 flex-col gap-2.5 sm:gap-3">
      <dl className="grid grid-cols-3 gap-2">
        {stats.map(([label, value]) => (
          <div className="flex flex-col gap-0.5 rounded-xl bg-muted px-2.5 py-2" key={label}>
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="font-medium text-sm tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-pretty text-muted-foreground text-sm leading-6">{about}</p>
      <ul className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <li className="rounded-full border px-2.5 py-0.5 text-muted-foreground text-xs" key={tag}>
            {tag}
          </li>
        ))}
      </ul>
      <Button className="mt-auto w-full motion-safe:active:scale-[0.97]">Start route</Button>
    </div>
  );
}

const walks: LiftToOpenItem[] = [
  {
    id: "pine",
    title: "Hollow Pine Loop",
    meta: "Easy · 6.4 km",
    cover: "from-emerald-500 to-teal-700",
    art: <TreePineIcon className="size-7 opacity-90" strokeWidth={1.75} />,
    details: (
      <Route
        about="A shaded loop through old pines with a stream crossing at the halfway bench."
        tags={["Shaded", "Dogs welcome", "Café at start"]}
        stats={[
          ["Distance", "6.4 km"],
          ["Climb", "120 m"],
          ["Time", "1 h 40"],
        ]}
      />
    ),
  },
  {
    id: "marsh",
    title: "Saltmarsh Walk",
    meta: "Easy · 4.1 km",
    cover: "from-sky-500 to-blue-700",
    art: <WavesIcon className="size-7 opacity-90" strokeWidth={1.75} />,
    details: (
      <Route
        about="Boardwalks over the tidal flats. Best two hours either side of low tide."
        tags={["Flat", "Birdwatching", "Step-free"]}
        stats={[
          ["Distance", "4.1 km"],
          ["Climb", "10 m"],
          ["Time", "1 h 05"],
        ]}
      />
    ),
  },
  {
    id: "ridge",
    title: "Cinder Ridge",
    meta: "Hard · 11.8 km",
    cover: "from-orange-500 to-rose-700",
    art: <MountainIcon className="size-7 opacity-90" strokeWidth={1.75} />,
    details: (
      <Route
        about="A steady climb to an exposed ridge with views across three valleys."
        tags={["Exposed", "Scrambling", "No water"]}
        stats={[
          ["Distance", "11.8 km"],
          ["Climb", "740 m"],
          ["Time", "4 h 20"],
        ]}
      />
    ),
  },
  {
    id: "lake",
    title: "Glass Lake",
    meta: "Moderate · 8.2 km",
    cover: "from-indigo-500 to-violet-700",
    art: <DropletsIcon className="size-7 opacity-90" strokeWidth={1.75} />,
    details: (
      <Route
        about="Follows the shoreline to a quiet jetty, then back through birch woods."
        tags={["Swimming spot", "Picnic tables", "Parking"]}
        stats={[
          ["Distance", "8.2 km"],
          ["Climb", "260 m"],
          ["Time", "2 h 30"],
        ]}
      />
    ),
  },
];

export default function LiftToOpenDemo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <span className="font-medium text-sm">Weekend walks</span>
        <span className="text-muted-foreground text-xs">4 saved</span>
      </div>
      <LiftToOpen items={walks} label="Saved walks" />
    </div>
  );
}
