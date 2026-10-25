import { MessageCircleIcon, Repeat2Icon, ShareIcon } from "lucide-react";
import { LikeButton } from "@/registry/items/like-burst/like-burst";

const action =
  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-muted-foreground text-xs tabular-nums outline-none transition-[color,background-color,scale] duration-150 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-ring [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground";

export default function LikeBurstDemo() {
  return (
    <article className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border bg-card p-4 pb-2 shadow-xs/5">
      <header className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-violet-500/15 font-medium text-violet-700 text-xs dark:text-violet-300">
          MO
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="font-medium text-sm">Marta Okafor</span>
          <span className="text-muted-foreground text-xs">@marta · 2h</span>
        </div>
      </header>
      <p className="text-pretty text-sm">
        Shipped dark mode for the dashboard today. Took three tries to get the chart colours to mean the same thing in both themes.
      </p>
      <footer className="-mx-1.5 flex items-center justify-between">
        <button aria-label="Reply, 14 replies" className={action} type="button">
          <MessageCircleIcon className="size-[18px]" />
          14
        </button>
        <button aria-label="Repost, 6 reposts" className={action} type="button">
          <Repeat2Icon className="size-[18px]" />6
        </button>
        <LikeButton count={1299} />
        <button aria-label="Share" className={action} type="button">
          <ShareIcon className="size-[18px]" />
        </button>
      </footer>
    </article>
  );
}
