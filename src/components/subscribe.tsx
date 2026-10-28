"use client";

import { CheckIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function Subscribe({ source = "changelog" }: { source?: "changelog" | "landing" }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("sending");
    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), website: form.get("website"), source }),
    }).catch(() => null);
    if (response?.ok) return setState("done");
    const body = (await response?.json().catch(() => null)) as { message?: string } | null;
    setMessage(body?.message ?? "That didn't go through. Try again in a minute.");
    setState("error");
  };

  if (state === "done") {
    return (
      <p className="flex items-center gap-2 text-sm" role="status">
        <CheckIcon className="size-4 text-success-foreground" />
        You're on the list. One email when new pieces land, nothing else.
      </p>
    );
  }

  return (
    <form className="flex w-full max-w-md flex-col gap-2" onSubmit={submit}>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`subscribe-${source}`}>
          Email address
        </label>
        <Input autoComplete="email" id={`subscribe-${source}`} name="email" placeholder="you@company.com" required type="email" />
        <input aria-hidden autoComplete="off" className="hidden" name="website" tabIndex={-1} />
        <Button disabled={state === "sending"} type="submit">
          {state === "sending" ? <Spinner /> : "Subscribe"}
        </Button>
      </div>
      {state === "error" ? (
        <p className="text-destructive-foreground text-sm" role="alert">
          {message}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">New pieces, once a week at most. Nothing else.</p>
      )}
    </form>
  );
}
