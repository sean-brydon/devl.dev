import { ArrowUpRightIcon, StarIcon } from "lucide-react";
import { GitHubIcon } from "@/components/github-icon";
import { Button } from "@/components/ui/button";
import { qnot } from "@/lib/registry";

function QnotMark() {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand font-mono font-semibold text-brand-foreground text-sm">
      q
    </span>
  );
}

export function QnotShoutout() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center">
      <QnotMark />
      <p className="flex-1 text-pretty text-sm">
        <span className="font-medium">Built on Qnot</span>
        <span className="text-muted-foreground">
          {" "}
          — a fast, typed query builder for any framework. Rules stay one shape from the UI to SQL, flags and search.
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button render={<a href={qnot.site} rel="noopener" target="_blank" />} size="sm">
          Explore Qnot
          <ArrowUpRightIcon />
        </Button>
        <Button render={<a href={qnot.repo} rel="noopener" target="_blank" />} size="sm" variant="outline">
          <StarIcon />
          Star on GitHub
        </Button>
      </div>
    </div>
  );
}

export function QnotCredit() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <QnotMark />
        <div className="min-w-0">
          <p className="font-medium text-sm">Powered by Qnot</p>
          <p className="font-mono text-muted-foreground text-xs">{qnot.packages.join(" + ")}</p>
        </div>
      </div>
      <p className="text-pretty text-muted-foreground text-sm">
        The rules, matching and serialisation here are Qnot. This component is the UI on top.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button render={<a href={qnot.site} rel="noopener" target="_blank" />} size="sm" variant="outline">
          Qnot docs
        </Button>
        <Button render={<a href={qnot.repo} rel="noopener" target="_blank" />} size="sm" variant="outline">
          <GitHubIcon />
          GitHub
        </Button>
      </div>
    </div>
  );
}

export function QnotStrip() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <QnotMark />
        <p className="min-w-0 text-pretty text-sm">
          <span className="font-medium">Powered by Qnot</span>
          <span className="text-muted-foreground"> · the rules, matching and serialisation are Qnot; this is the UI on top.</span>
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button render={<a href={qnot.site} rel="noopener" target="_blank" />} size="sm">
          Explore Qnot
          <ArrowUpRightIcon />
        </Button>
        <Button render={<a href={qnot.repo} rel="noopener" target="_blank" />} size="sm" variant="outline">
          <GitHubIcon />
          GitHub
        </Button>
      </div>
    </div>
  );
}
