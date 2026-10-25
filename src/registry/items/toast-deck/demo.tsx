"use client";

import { CloudUploadIcon, RocketIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ToastDeck, useToastDeck } from "@/registry/items/toast-deck/toast-deck";

let deploys = 0;

export default function ToastDeckDemo() {
  const deck = useToastDeck();
  const { show } = deck;

  useEffect(() => {
    show({ id: "seed-invite", title: "Invite sent to Ines Varga", tone: "info", duration: Infinity });
    const t = window.setTimeout(
      () => show({ id: "seed-export", title: "Export ready", description: "q3-pipeline.csv · 2.4 MB", tone: "success", duration: Infinity }),
      350,
    );
    return () => clearTimeout(t);
  }, [show]);

  return (
    <div className="relative h-[30rem] w-full max-w-sm overflow-hidden rounded-2xl border bg-card">
      <div className="grid grid-cols-2 gap-2 p-4">
        <Button
          onClick={() => deck.show({ title: "Draft saved", description: "“Q3 roadmap” is safe in Drafts.", tone: "success" })}
          variant="outline"
        >
          <SaveIcon />
          Save
        </Button>
        <Button
          onClick={() => {
            deploys += 1;
            const fails = deploys % 3 === 0;
            void deck
              .promise(
                new Promise<string>((resolve, reject) =>
                  setTimeout(() => (fails ? reject(new Error("Build failed")) : resolve("acme-web")), 2000),
                ),
                {
                  loading: "Deploying to production…",
                  description: "Building 214 pages",
                  success: (name) => `${name} is live`,
                  error: "Deploy failed: check the build log",
                },
              )
              .catch(() => {});
          }}
          variant="outline"
        >
          <RocketIcon />
          Deploy
        </Button>
        <Button
          onClick={() =>
            deck.show({
              title: "3 files moved to trash",
              action: { label: "Undo", onClick: () => deck.show({ title: "Restored 3 files", tone: "info" }) },
              duration: 6000,
            })
          }
          variant="outline"
        >
          <Trash2Icon />
          Delete
        </Button>
        <Button
          onClick={() =>
            deck.show({ title: "Upload paused", description: "You’re offline. We’ll resume when you’re back.", tone: "error" })
          }
          variant="outline"
        >
          <CloudUploadIcon />
          Go offline
        </Button>
      </div>
      <p className="px-4 text-center text-muted-foreground text-xs">Hover the stack to fan it out, swipe a toast to dismiss.</p>
      <ToastDeck deck={deck} />
    </div>
  );
}
