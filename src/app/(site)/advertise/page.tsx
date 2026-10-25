import type { Metadata } from "next";
import { AdvertiseBooking } from "@/components/sponsor/advertise-booking";
import { GridPreview, ItemPreview } from "@/components/sponsor/placement-previews";
import { kinds } from "@/lib/registry";
import { formatPrice, gridPlacement, type PlacementId, placements, PRICE_UNIT } from "@/lib/sponsors";

export const metadata: Metadata = {
  title: "Advertise",
  description: "Sponsor a fortnight on devl: one tile in a section grid or a card on every item page. Fixed prices, UTM-tagged clicks, reviewed within 48 hours.",
};

const gridPlacements = kinds.map((k) => gridPlacement(k.value)).filter((id): id is PlacementId => id !== null);
const visible: PlacementId[] = [...gridPlacements, "item"];
const prices = visible.map((id) => placements[id].priceCents);

export default function AdvertisePage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 md:px-8">
      <section className="grid gap-6 pt-10 pb-10 md:grid-cols-[1fr_auto] md:items-end md:pt-16 md:pb-14">
        <div className="flex flex-col gap-4">
          <p className="font-mono text-brand-ink text-xs uppercase tracking-widest">Advertise</p>
          <h1 className="max-w-3xl text-balance font-heading font-semibold text-4xl tracking-tight md:text-6xl md:leading-[1.02]">
            Sponsor a fortnight where people pick their components.
          </h1>
          <p className="max-w-xl text-pretty text-muted-foreground md:text-lg">
            One slot per placement for two weeks at a time. A fixed price, no auctions, no third-party pixels. Your tile sits in the catalogue,
            in the same shape as everything around it — with UTM-tagged clicks and a private stats link so you can see exactly what it did.
          </p>
        </div>
        <dl className="flex gap-6 font-mono text-xs md:flex-col md:gap-2 md:text-right">
          <div>
            <dt className="text-muted-foreground">placements</dt>
            <dd className="font-sans font-semibold text-2xl text-foreground tabular-nums">{visible.length}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">from</dt>
            <dd className="font-sans font-semibold text-2xl text-brand-ink tabular-nums">
              {formatPrice(Math.min(...prices))}
              <span className="font-mono font-normal text-muted-foreground text-xs">{PRICE_UNIT}</span>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">review</dt>
            <dd className="font-sans font-semibold text-2xl text-foreground tabular-nums">≤48h</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="formats-title" className="flex flex-col gap-4">
        <h2 className="font-mono text-muted-foreground text-xs uppercase tracking-widest" id="formats-title">
          Two formats
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Format
            preview={<GridPreview />}
            prices={gridPlacements.map((id) => ({ label: placements[id].label.replace(" grid", ""), price: placements[id].priceCents }))}
            text="The third tile of the first shelf on a section page. Same size and caption as the components around it, marked Sponsored."
            title="Section grid tile"
          />
          <Format
            preview={<ItemPreview />}
            prices={[{ label: "All item pages", price: placements.item.priceCents }]}
            text="A slim strip right under the live preview on every component, block, screen and motion page. The spot people look while they decide."
            title="Item page card"
          />
        </div>
      </section>

      <section aria-labelledby="book-title" className="mt-16 flex flex-col gap-8 border-t pt-10 md:mt-20">
        <div className="flex flex-col gap-2">
          <h2 className="font-heading font-semibold text-2xl tracking-tight md:text-3xl" id="book-title">
            Book a fortnight
          </h2>
          <p className="max-w-xl text-pretty text-muted-foreground">
            First come, first served. Every slot runs two weeks, Monday to Sunday UTC. Pay now, we review within 48 hours, and your ad goes live on the first Monday.
          </p>
        </div>
        <AdvertiseBooking visiblePlacements={visible} />
      </section>
    </div>
  );
}

function Format({
  title,
  text,
  preview,
  prices,
}: {
  title: string;
  text: string;
  preview: React.ReactNode;
  prices: { label: string; price: number }[];
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="aspect-[16/8] border-b bg-background/50">{preview}</div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-medium">{title}</h3>
        <p className="text-pretty text-muted-foreground text-sm">{text}</p>
        <ul className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {prices.map((p) => (
            <li className="rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] tabular-nums" key={p.label}>
              {p.label} <span className="text-foreground">{formatPrice(p.price)}</span>
              <span className="text-muted-foreground">{PRICE_UNIT}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
