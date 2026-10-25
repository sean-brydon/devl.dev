import Link from "next/link";
import { LivePreview } from "@/components/live-preview";
import { TileShell } from "@/components/tile-shell";
import { type RegistryItem, itemHref, itemNumber } from "@/lib/registry";
import { cn } from "@/lib/utils";

const designWidth: Partial<Record<RegistryItem["kind"], number>> = { screen: 1280, block: 1100 };

export type TileSize = "sm" | "wide" | "big";

function Badge({ item }: { item: RegistryItem }) {
  if (item.source === "bklit" || item.poweredBy === "qnot") {
    return (
      <span className="pointer-events-none absolute top-2.5 right-2.5 rounded-full border bg-background/90 px-2 py-0.5 font-mono font-medium text-[10px] backdrop-blur">
        {item.source === "bklit" ? "by bklit" : "on Qnot"}
      </span>
    );
  }
  if (!item.isNew) return null;
  return (
    <span className="pointer-events-none absolute top-2.5 right-2.5 rounded-full bg-brand px-2 py-0.5 font-mono font-semibold text-[10px] text-brand-foreground uppercase tracking-wider">
      New
    </span>
  );
}

export function ItemCard({ item, size = "sm" }: { item: RegistryItem; size?: TileSize }) {
  const scaled = designWidth[item.kind];
  const href = itemHref(item);

  return (
    <TileShell
      badge={<Badge item={item} />}
      caption={
        <div className="flex items-baseline gap-2 px-0.5">
          <span className="font-mono text-[11px] text-muted-foreground/60 tabular-nums">{itemNumber(item)}</span>
          <h3 className="min-w-0 flex-1 truncate font-medium text-sm">
            <Link
              className="outline-none after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
              href={href}
            >
              {item.name}
            </Link>
          </h3>
          <span className="hidden truncate text-muted-foreground text-xs sm:block sm:max-w-[55%]">{item.description}</span>
        </div>
      }
      className={cn(
        scaled && "[&>div:first-child]:aspect-[16/10] [&>div:first-child]:flex-none",
        size === "wide" && "sm:col-span-2",
        size === "big" && "sm:col-span-2 sm:row-span-2",
      )}
      href={href}
      playable={!scaled}
      preview={<LivePreview scaledWidth={scaled} slug={item.slug} />}
    />
  );
}
