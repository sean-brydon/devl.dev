import { BookOpenIcon, HeartIcon, StarIcon } from "lucide-react";
import { GitHubIcon } from "@/components/github-icon";
import { Button } from "@/components/ui/button";
import { bklit } from "@/lib/registry";

function BklitMark() {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground font-mono font-semibold text-background text-sm">
      bk
    </span>
  );
}

export function BklitShoutout() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center">
      <BklitMark />
      <p className="flex-1 text-pretty text-sm">
        <span className="font-medium">Every chart here is made by bklit</span>
        <span className="text-muted-foreground">
          {" "}
          — the open-source React chart library by {bklit.author}, built on visx and motion. Install straight from them,
          and give them a star.
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button render={<a href={bklit.repo} rel="noopener" target="_blank" />} size="sm">
          <StarIcon />
          Star bklit-ui
        </Button>
        <Button render={<a href={bklit.site} rel="noopener" target="_blank" />} size="sm" variant="outline">
          Visit bklit
        </Button>
        <Button render={<a href={bklit.sponsor} rel="noopener" target="_blank" />} size="sm" variant="ghost">
          <HeartIcon />
          Sponsor
        </Button>
      </div>
    </div>
  );
}

export function BklitCredit({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <BklitMark />
        <div className="min-w-0">
          <p className="font-medium text-sm">Made by bklit</p>
          <p className="text-muted-foreground text-xs">Open source, MIT · by {bklit.author}</p>
        </div>
      </div>
      <p className="text-pretty text-muted-foreground text-sm">
        This chart is bklit's work. devl just gives it a demo — install it from bklit and star the repo if it helps you.
      </p>
      <div className="grid grid-cols-3 gap-2">
        <Button render={<a href={bklit.repo} rel="noopener" target="_blank" />} size="sm" variant="outline">
          <GitHubIcon />
          GitHub
        </Button>
        <Button render={<a href={bklit.docs(name)} rel="noopener" target="_blank" />} size="sm" variant="outline">
          <BookOpenIcon />
          Docs
        </Button>
        <Button render={<a href={bklit.sponsor} rel="noopener" target="_blank" />} size="sm" variant="outline">
          <HeartIcon />
          Sponsor
        </Button>
      </div>
    </div>
  );
}

export function BklitSourceNote({ name }: { name: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 rounded-xl border bg-card px-4 py-3 text-muted-foreground text-sm">
      This is devl's demo. The chart itself comes from bklit —
      <a className="font-medium text-foreground underline underline-offset-4" href={`${bklit.repo}/tree/main`} rel="noopener" target="_blank">
        read its source on GitHub
      </a>
      or the
      <a className="font-medium text-foreground underline underline-offset-4" href={bklit.docs(name)} rel="noopener" target="_blank">
        bklit docs
      </a>
      .
    </p>
  );
}

export function BklitStrip({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <BklitMark />
        <p className="min-w-0 text-pretty text-sm">
          <span className="font-medium">Made by bklit</span>
          <span className="text-muted-foreground"> · open source, MIT, by {bklit.author}. Install it from bklit and give them a star.</span>
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button render={<a href={bklit.repo} rel="noopener" target="_blank" />} size="sm">
          <StarIcon />
          Star
        </Button>
        <Button render={<a href={bklit.docs(name)} rel="noopener" target="_blank" />} size="sm" variant="outline">
          <BookOpenIcon />
          Docs
        </Button>
        <Button render={<a href={bklit.sponsor} rel="noopener" target="_blank" />} size="sm" variant="ghost">
          <HeartIcon />
          Sponsor
        </Button>
      </div>
    </div>
  );
}
