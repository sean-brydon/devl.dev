"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { type AccessStatus, RequestAccess } from "@/registry/items/request-access/request-access";

const milestones = [
  { name: "Teams beta", date: "Jul 8", owner: "Priya Nair" },
  { name: "New pricing live", date: "Jul 22", owner: "Theo Brandt" },
  { name: "General availability", date: "Aug 14", owner: "Mara Okafor" },
];

export default function RequestAccessDemo() {
  const [status, setStatus] = useState<AccessStatus>("denied");

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <RequestAccess onStatusChange={setStatus} otherAccounts={["ada.lindqvist@gmail.com"]} resendAfter={45} status={status}>
        <article className="flex flex-col gap-6">
          <header>
            <h1 className="text-balance font-semibold text-2xl">Q3 roadmap</h1>
            <p className="mt-1 text-muted-foreground text-sm">Mara Okafor · Edited 2 days ago</p>
          </header>
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold text-base">Goals</h2>
            <ul className="flex flex-col gap-1.5 text-sm">
              {["Ship Ridgeline for teams by August 14", "Cut median sync time below 200 ms", "Launch the GitHub and Jira importers"].map((g) => (
                <li className="flex gap-2" key={g}>
                  <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {g}
                </li>
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold text-base">Milestones</h2>
            <div className="divide-y rounded-xl border bg-card text-sm">
              {milestones.map((m) => (
                <div className="flex items-center gap-3 px-3 py-2.5" key={m.name}>
                  <span className="min-w-0 flex-1 truncate font-medium">{m.name}</span>
                  <span className="hidden text-muted-foreground sm:inline">{m.owner}</span>
                  <span className="w-14 text-right text-muted-foreground tabular-nums">{m.date}</span>
                </div>
              ))}
            </div>
          </section>
        </article>
      </RequestAccess>
      <div className="flex h-7 items-center gap-2 text-muted-foreground text-xs">
        {status === "pending" && (
          <Button onClick={() => setStatus("granted")} size="xs" variant="outline">
            Simulate Mara approving
          </Button>
        )}
        {status === "granted" && (
          <Button onClick={() => setStatus("denied")} size="xs" variant="ghost">
            Start over
          </Button>
        )}
        {status === "denied" && <span>Request access to continue the demo</span>}
      </div>
    </div>
  );
}
