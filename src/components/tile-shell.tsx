"use client";

import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

const INTERACTIVE =
  'a,button,input,textarea,select,label,summary,canvas,[role="button"],[role="slider"],[role="switch"],[role="checkbox"],[role="radio"],[role="tab"],[role="option"],[role="menuitem"],[role="combobox"],[role="textbox"],[contenteditable="true"],[draggable="true"]';

export function TileShell({
  href,
  playable,
  className,
  preview,
  badge,
  caption,
}: {
  href: string;
  playable: boolean;
  className?: string;
  preview: ReactNode;
  badge?: ReactNode;
  caption: ReactNode;
}) {
  const router = useRouter();
  const [live, setLive] = useState(false);

  function open(event: MouseEvent<HTMLElement>) {
    if (event.defaultPrevented || event.button !== 0) return;
    const target = event.target as Element;
    if (!event.currentTarget.contains(target) || target.closest(INTERACTIVE)) return;
    if (event.metaKey || event.ctrlKey) {
      window.open(href, "_blank", "noopener");
      return;
    }
    router.push(href);
  }

  return (
    <article className={cn("group relative flex min-w-0 cursor-pointer flex-col gap-2", className)} onClick={open}>
      <div
        className={cn(
          "dot-grid relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 transition-[border-color,box-shadow] duration-200 ease-out dark:border-border dark:bg-card",
          "[@media(hover:hover)]:group-hover:border-neutral-300 [@media(hover:hover)]:group-hover:shadow-md/5 dark:[@media(hover:hover)]:group-hover:border-foreground/15",
        )}
        onPointerEnter={(event) => {
          router.prefetch(href);
          if (playable && event.pointerType === "mouse") setLive(true);
        }}
        onPointerLeave={() => setLive(false)}
      >
        <div aria-hidden={!live} className={cn("size-full", !live && "pointer-events-none select-none")} inert={!live}>
          {preview}
        </div>
        {badge}
        <Link
          aria-hidden
          className={cn(
            "absolute right-2.5 bottom-2.5 flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 font-medium text-background text-xs shadow-md/10 transition-[opacity,translate] duration-200 ease-out",
            "pointer-events-none translate-y-1 opacity-0 [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100",
          )}
          href={href}
          tabIndex={-1}
        >
          Open
          <ArrowUpRightIcon className="size-3" />
        </Link>
      </div>
      {caption}
    </article>
  );
}
