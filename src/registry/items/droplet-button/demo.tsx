"use client";

import { CheckIcon, GitCommitHorizontalIcon, RocketIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropletButton } from "@/registry/items/droplet-button/droplet-button";

const invites = [
  { name: "Mira Okafor", email: "mira@halcyon.dev", initials: "MO", sent: "Invited 3 days ago" },
  { name: "Theo Lindqvist", email: "theo@halcyon.dev", initials: "TL", sent: "Invited yesterday" },
];

function useTimers() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
}

export default function DropletButtonDemo() {
  const later = useTimers();
  const [deploy, setDeploy] = useState<"idle" | "loading" | "done">("idle");
  const [resent, setResent] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const startDeploy = () => {
    setDeploy("loading");
    later(() => setDeploy("done"), 1800);
    later(() => setDeploy("idle"), 4200);
  };

  const resend = (email: string) => {
    setResent((r) => [...r, email]);
    later(() => setResent((r) => r.filter((e) => e !== email)), 2400);
  };

  const startDelete = () => {
    setDeleting(true);
    later(() => setDeleting(false), 2000);
  };

  return (
    <div className="grid w-full max-w-[26rem] gap-3">
      <div className="rounded-2xl border bg-card p-4 shadow-xs/5">
        <div className="flex items-start justify-between gap-4">
          <div className="grid min-w-0 gap-1">
            <p className="font-medium text-sm">orbit-web</p>
            <p className="flex items-center gap-1.5 truncate text-muted-foreground text-xs">
              <GitCommitHorizontalIcon className="size-3.5 shrink-0" />
              <span className="font-mono">3f9c2a1</span>
              <span aria-hidden>·</span>
              <span className="truncate">Tighten cache headers on /docs</span>
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-medium text-[11px] text-muted-foreground">
            Preview ready
          </span>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="truncate text-muted-foreground text-xs tabular-nums">Production · v2.14.0</p>
          <DropletButton
            className="w-28"
            loading={deploy === "loading"}
            onClick={startDeploy}
            tone={deploy === "done" ? "success" : "primary"}
          >
            {deploy === "done" ? <CheckIcon /> : <RocketIcon />}
            {deploy === "done" ? "Live" : "Deploy"}
          </DropletButton>
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-xs/5">
        <p className="border-b px-4 py-3 font-medium text-sm">Pending invites</p>
        <ul className="divide-y">
          {invites.map((invite) => {
            const sent = resent.includes(invite.email);
            return (
              <li className="flex items-center gap-3 px-4 py-3" key={invite.email}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs">
                  {invite.initials}
                </span>
                <div className="grid min-w-0 flex-1">
                  <span className="truncate font-medium text-sm">{invite.name}</span>
                  <span className="truncate text-muted-foreground text-xs">{sent ? `Sent again to ${invite.email}` : invite.sent}</span>
                </div>
                <DropletButton className="w-[4.75rem]" onClick={() => resend(invite.email)} size="sm" tone="neutral">
                  {sent && <CheckIcon />}
                  {sent ? "Sent" : "Resend"}
                </DropletButton>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-xs/5">
        <p className="font-medium text-sm">Delete orbit-staging?</p>
        <p className="mt-1 text-pretty text-muted-foreground text-sm">
          This removes 14 deployments and frees staging.orbit.app. There is no undo.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button disabled={deleting} variant="ghost">
            Cancel
          </Button>
          <DropletButton loading={deleting} onClick={startDelete} tone="destructive">
            Delete environment
          </DropletButton>
        </div>
      </div>
    </div>
  );
}
