import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, FileCodeIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BklitSourceNote, BklitStrip } from "@/components/bklit-credit";
import { CossCalendarStrip } from "@/components/coss-calendar-credit";
import { QnotStrip } from "@/components/qnot-credit";
import { CodeView } from "@/components/code-view";
import { CopyPrompt } from "@/components/copy-prompt";
import { InstallCommand } from "@/components/install-command";
import { ItemCard } from "@/components/item-card";
import { ItemStage } from "@/components/item-stage";
import { ItemSponsor } from "@/components/sponsor/item-sponsor";
import { Button } from "@/components/ui/button";
import {
  categorySlug,
  getItem,
  installCommand,
  itemHref,
  itemNumber,
  items,
  itemsOfKind,
  kindOf,
  rawUrl,
  registryUrl,
} from "@/lib/registry";

export function generateStaticParams() {
  return items.map((item) => ({ kind: kindOf(item).href.slice(1), slug: item.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[kind]/[slug]">): Promise<Metadata> {
  const item = getItem((await params).slug);
  if (!item) return {};
  const title = `${item.name} · devl`;
  return {
    title: item.name,
    description: item.description,
    openGraph: { title, description: item.description, images: [{ url: "/og.png", width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description: item.description, images: ["/og.png"] },
  };
}

export default function ItemPage({ params }: PageProps<"/[kind]/[slug]">) {
  return (
    <Suspense>
      <ItemDetail params={params} />
    </Suspense>
  );
}

async function ItemDetail({ params }: Pick<PageProps<"/[kind]/[slug]">, "params">) {
  const { kind, slug } = await params;
  const item = getItem(slug);
  if (!item || kindOf(item).href !== `/${kind}`) notFound();

  const section = kindOf(item);
  const siblings = itemsOfKind(item.kind);
  const index = siblings.findIndex((i) => i.slug === slug);
  const prev = siblings[(index - 1 + siblings.length) % siblings.length];
  const next = siblings[(index + 1) % siblings.length];
  const related = siblings.filter((i) => i.category === item.category && i.slug !== slug).slice(0, 4);
  const install = installCommand(item);
  const raw = rawUrl(item);

  const aliases = (item.keywords ?? []).slice(0, 3);
  const code =
    item.source === "bklit" ? (
      <div className="flex flex-col gap-3">
        <BklitSourceNote name={item.upstream ?? item.slug} />
        <CodeView slug={item.slug} />
      </div>
    ) : (
      <CodeView slug={item.slug} />
    );

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 md:px-8">
      <header className="grid gap-8 pt-8 pb-8 md:pt-14 md:pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-end lg:gap-16">
        <div className="flex min-w-0 flex-col gap-4">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 font-mono text-muted-foreground text-xs">
            <Link className="transition-colors hover:text-foreground" href={section.href}>
              {section.label.toLowerCase()}
            </Link>
            <span className="opacity-40">/</span>
            <Link className="transition-colors hover:text-foreground" href={`${section.href}#${categorySlug(item.category)}`}>
              {item.category.toLowerCase()}
            </Link>
            <span className="opacity-40">/</span>
            <span className="tabular-nums">#{itemNumber(item)}</span>
          </nav>
          <h1 className="flex flex-wrap items-center gap-x-4 gap-y-2 text-balance font-heading font-semibold text-4xl tracking-tight md:text-6xl md:leading-[1.02]">
            {item.name}
            {item.isNew && (
              <span className="rounded-full bg-brand px-2.5 py-1 font-mono font-semibold text-[11px] text-brand-foreground uppercase tracking-wider md:text-xs">
                New
              </span>
            )}
          </h1>
          <p className="max-w-2xl text-pretty text-muted-foreground md:text-lg">{item.description}</p>
          {aliases.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-muted-foreground/80 text-xs">
              <span>aka</span>
              {aliases.map((alias, i) => (
                <span key={alias}>
                  <span className="text-foreground/80">{alias}</span>
                  {i < aliases.length - 1 && <span className="ms-2 opacity-40">·</span>}
                </span>
              ))}
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <InstallCommand command={install} />
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
            <CopyPrompt
              dependencies={item.dependencies}
              description={item.description}
              install={install}
              name={item.name}
              raw={raw}
              slug={item.slug}
              source={item.source}
              uiDependencies={item.uiDependencies}
              url={registryUrl(item)}
            />
            <Button
              className="rounded-full"
              render={<a href={item.source ? raw : `/raw/${item.slug}.tsx`} rel="noopener" target="_blank" />}
              size="sm"
              variant="outline"
            >
              <FileCodeIcon />
              {item.source ? "JSON" : "Raw"}
            </Button>
            <Button
              className="rounded-full"
              render={<a href={`/preview/${item.slug}`} rel="noopener" target="_blank" />}
              size="sm"
              variant="outline"
            >
              Full screen
              <ArrowUpRightIcon />
            </Button>
          </div>
        </div>
      </header>

      <ItemStage code={code} kind={item.kind} slug={item.slug} />

      <div className="mt-4 flex flex-col gap-3">
        {item.source === "bklit" ? <BklitStrip name={item.upstream ?? item.slug} /> : <ItemSponsor />}
        {item.poweredBy === "qnot" && <QnotStrip />}
        {item.shoutout === "coss-calendar" && <CossCalendarStrip slug={item.slug} />}
      </div>

      <nav aria-label="More items" className="mt-16 grid gap-3 sm:grid-cols-2">
        {[
          { item: prev, label: "Previous", Icon: ArrowLeftIcon },
          { item: next, label: "Next", Icon: ArrowRightIcon },
        ].map(({ item: target, label, Icon }, i) => (
          <Link
            className="group flex min-w-0 items-center gap-4 rounded-2xl border bg-card p-5 transition-[border-color,box-shadow,scale] duration-200 ease-out active:scale-[0.99] data-[next=true]:flex-row-reverse data-[next=true]:text-right [@media(hover:hover)]:hover:border-foreground/15 [@media(hover:hover)]:hover:shadow-md/5"
            data-next={i === 1}
            href={itemHref(target)}
            key={label}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted transition-transform duration-200 ease-out [@media(hover:hover)]:group-hover:scale-105">
              <Icon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-mono text-muted-foreground text-xs">
                {label} · {target.category}
              </span>
              <span className="truncate font-medium text-base">{target.name}</span>
            </span>
          </Link>
        ))}
      </nav>

      {related.length > 0 && (
        <section className="mt-16 flex flex-col gap-4">
          <h2 className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
            More in <span className="text-foreground">{item.category}</span>
          </h2>
          <div className="grid auto-rows-[16rem] grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <ItemCard item={r} key={r.slug} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
