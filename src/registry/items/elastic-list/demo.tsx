"use client";

import { RefreshCwIcon } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { type ElasticListActions, ElasticList } from "@/registry/items/elastic-list/elastic-list";

type Activity = { id: number; who: string; tone: string; did: string; what: string; when: string };

const tones = {
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  sky: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  rose: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

const seed: Activity[] = [
  { id: 1, who: "Priya Shah", tone: tones.violet, did: "commented on", what: "Q3 roadmap", when: "4m" },
  { id: 2, who: "Tomás Ruiz", tone: tones.emerald, did: "merged", what: "Fix invoice rounding", when: "12m" },
  { id: 3, who: "Ines Becker", tone: tones.amber, did: "assigned you", what: "Onboarding copy", when: "26m" },
  { id: 4, who: "Kai Nakamura", tone: tones.sky, did: "shared", what: "Pricing experiment", when: "41m" },
  { id: 5, who: "Leah Okafor", tone: tones.rose, did: "approved", what: "Brand refresh", when: "1h" },
  { id: 6, who: "Priya Shah", tone: tones.violet, did: "moved", what: "Search filters to Review", when: "1h" },
  { id: 7, who: "Owen Carter", tone: tones.emerald, did: "mentioned you in", what: "Weekly sync", when: "2h" },
  { id: 8, who: "Ines Becker", tone: tones.amber, did: "closed", what: "Login loop on Safari", when: "3h" },
  { id: 9, who: "Kai Nakamura", tone: tones.sky, did: "uploaded", what: "Hero shots v2", when: "5h" },
  { id: 10, who: "Leah Okafor", tone: tones.rose, did: "created", what: "Launch checklist", when: "6h" },
];

const incoming: Omit<Activity, "id">[] = [
  { who: "Owen Carter", tone: tones.emerald, did: "replied to", what: "Q3 roadmap", when: "now" },
  { who: "Tomás Ruiz", tone: tones.emerald, did: "deployed", what: "v2.14 to staging", when: "now" },
  { who: "Leah Okafor", tone: tones.rose, did: "reacted to", what: "Hero shots v2", when: "now" },
  { who: "Priya Shah", tone: tones.violet, did: "invited", what: "Mina to Design", when: "now" },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("");

export default function ElasticListDemo() {
  const actions = useRef<ElasticListActions>(null);
  const [rows, setRows] = useState(seed);
  const [fresh, setFresh] = useState<number[]>([]);
  const [updated, setUpdated] = useState(false);
  const next = useRef(0);

  const refresh = () =>
    new Promise<void>((resolve) => {
      setTimeout(() => {
        const item = incoming[next.current % incoming.length];
        const id = 100 + next.current++;
        setRows((r) => [{ ...item, id }, ...r.map((row) => (row.when === "now" ? { ...row, when: "1m" } : row))]);
        setFresh([id]);
        setUpdated(true);
        resolve();
      }, 1100);
    });

  return (
    <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border bg-card shadow-xs/5">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <span className="font-medium text-sm">Activity</span>
          <span className="text-muted-foreground text-xs">{updated ? "Updated just now" : "Pull down to refresh"}</span>
        </div>
        <Button
          aria-label="Refresh activity"
          className="motion-safe:active:scale-[0.97]"
          onClick={() => actions.current?.refresh()}
          size="icon-sm"
          variant="ghost"
        >
          <RefreshCwIcon />
        </Button>
      </div>
      <ElasticList actionsRef={actions} className="h-[312px]" label="Recent activity" onRefresh={refresh}>
        <ul className="flex flex-col py-1">
          {rows.map((row) => (
            <motion.li
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden"
              initial={fresh.includes(row.id) ? { opacity: 0, height: 0 } : false}
              key={row.id}
              transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            >
              <button
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left outline-none transition-colors duration-150 focus-visible:bg-accent [@media(hover:hover)]:hover:bg-accent/60"
                type="button"
              >
                <span className={`grid size-9 shrink-0 place-items-center rounded-full font-medium text-xs ${row.tone}`}>
                  {initials(row.who)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium text-sm">{row.who}</span>
                    <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{row.when}</span>
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    {row.did} <span className="text-foreground/80">{row.what}</span>
                  </span>
                </span>
              </button>
            </motion.li>
          ))}
          <li className="px-4 pt-3 pb-4 text-center text-muted-foreground text-xs">You're all caught up</li>
        </ul>
      </ElasticList>
    </div>
  );
}
