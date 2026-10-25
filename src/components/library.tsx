import { BklitShoutout } from "@/components/bklit-credit";
import { QnotShoutout } from "@/components/qnot-credit";
import { CategoryRail } from "@/components/category-rail";
import { ItemCard, type TileSize } from "@/components/item-card";
import { planGridAds } from "@/components/sponsor/grid-ads";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { type ItemKind, type RegistryItem, categoriesOf, items, itemsOfKind, kinds } from "@/lib/registry";
import { cn } from "@/lib/utils";

const intro: Record<ItemKind, { title: string; blurb: string }> = {
  component: {
    title: "Components with a little goo in them.",
    blurb: "Things I build for real products, cleaned up and shared. Built on coss ui, one file each, yours to steal.",
  },
  block: {
    title: "Blocks: whole sections, ready to paste.",
    blurb: "Heroes, pricing, auth, dashboards and docs pieces, composed from the components.",
  },
  screen: {
    title: "Screens: full apps, start to finish.",
    blurb: "Complete pages for AI and SaaS products. Resize the preview, they hold up down to a phone.",
  },
  illustration: {
    title: "Illustrations that move when you look.",
    blurb: "Small animated scenes for empty states, feature sections and marketing pages. Coded, themeable, no image files.",
  },
  motion: {
    title: "Motion: the wobbly, glowy bits.",
    blurb: "Cursor effects, text tricks, loaders and liquid little things that make an interface feel alive.",
  },
};

/** Mixed tile sizes for the catalogue: featured pieces go big, a steady rhythm of wide tiles breaks up the grid. */
function tileSize(item: RegistryItem, index: number, total: number): TileSize {
  if (item.featured && total > 3) return "big";
  return index % 7 === 4 && total > 4 ? "wide" : "sm";
}

export function Library({ kind }: { kind: ItemKind }) {
  const all = itemsOfKind(kind);
  const wide = kind === "screen" || kind === "block";
  const categories = categoriesOf(kind);
  const withAds = planGridAds(kind, categories.map((c) => c.name), wide);
  const { title, blurb } = intro[kind];

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 md:px-8">
      <section className="grid gap-6 pt-10 pb-8 md:grid-cols-[1fr_auto] md:items-end md:pt-16 md:pb-12">
        <div className="flex flex-col gap-4">
          <h1 className="max-w-3xl text-balance font-heading font-semibold text-4xl tracking-tight md:text-6xl md:leading-[1.02]">
            {title}
          </h1>
          <p className="max-w-xl text-pretty text-muted-foreground md:text-lg">{blurb}</p>
        </div>
        <dl className="flex gap-6 font-mono text-xs md:flex-col md:gap-2 md:text-right">
          <div>
            <dt className="text-muted-foreground">in this shelf</dt>
            <dd className="font-sans font-semibold text-2xl text-foreground tabular-nums">{all.length}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">categories</dt>
            <dd className="font-sans font-semibold text-2xl text-brand-ink tabular-nums">{categories.length}</dd>
          </div>
          <div className="max-md:hidden">
            <dt className="text-muted-foreground">across devl</dt>
            <dd className="font-sans font-semibold text-2xl text-foreground tabular-nums">{items.length}</dd>
          </div>
        </dl>
      </section>

      <CategoryRail categories={categories} />

      {all.length === 0 ? (
        <Empty className="mt-10 rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Brewing</EmptyTitle>
            <EmptyDescription>The first {kinds.find((k) => k.value === kind)!.label.toLowerCase()} land soon.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-14 pt-8">
          {categories.map((category) => {
            const entries = all.filter((item) => item.category === category.name);
            return (
              <section aria-labelledby={`${category.slug}-title`} className="scroll-mt-36 md:scroll-mt-32" id={category.slug} key={category.slug}>
                <h2 className="mb-4 flex items-baseline gap-2.5 font-mono text-muted-foreground text-xs uppercase tracking-widest" id={`${category.slug}-title`}>
                  <span className="text-foreground">{category.name}</span>
                  <span className="tabular-nums">{category.count}</span>
                </h2>
                {entries.some((item) => item.source === "bklit") && (
                  <div className="mb-5">
                    <BklitShoutout />
                  </div>
                )}
                {entries.some((item) => item.poweredBy === "qnot") && (
                  <div className="mb-5">
                    <QnotShoutout />
                  </div>
                )}
                <div
                  className={cn(
                    "grid grid-flow-dense grid-cols-1 gap-x-4 gap-y-6",
                    wide ? "md:grid-cols-2 2xl:grid-cols-3" : "auto-rows-[20rem] sm:grid-cols-2 lg:grid-cols-3",
                  )}
                >
                  {withAds(
                    category.name,
                    entries.map((item, index) => (
                      <ItemCard
                        item={item}
                        key={item.slug}
                        size={wide ? (item.featured && entries.length > 2 ? "wide" : "sm") : tileSize(item, index, entries.length)}
                      />
                    )),
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
