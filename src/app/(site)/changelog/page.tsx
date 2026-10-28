import { RssIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Subscribe } from "@/components/subscribe";
import { itemHref, items, kindOf, type RegistryItem } from "@/lib/registry";

export const metadata: Metadata = {
  title: "Changelog: new this week",
  description: "Every new devl component, block and screen, grouped by the week it landed. Follow along by RSS or email.",
  alternates: { canonical: "/changelog", types: { "application/rss+xml": "/rss.xml" } },
};

const launchSize = 40;

function weekOf(date: string) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

const longDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

function weeks() {
  const groups = new Map<string, RegistryItem[]>();
  for (const item of items) {
    if (!item.added) continue;
    const week = weekOf(item.added);
    groups.set(week, [...(groups.get(week) ?? []), item]);
  }
  return [...groups]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([week, list]) => ({ week, items: list.sort((a, b) => (b.added ?? "").localeCompare(a.added ?? "") || (b.no ?? 0) - (a.no ?? 0)) }));
}

export default function ChangelogPage() {
  const list = weeks();
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-10 pb-24 md:px-8 md:pt-16">
      <header className="flex flex-col gap-4">
        <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">Changelog</p>
        <h1 className="text-balance font-heading font-semibold text-4xl tracking-tight md:text-5xl">New this week</h1>
        <p className="max-w-2xl text-pretty text-muted-foreground md:text-lg">
          Every piece added to devl, grouped by the week it landed. Get the next drop by email, or follow the{" "}
          <a className="text-foreground underline-offset-4 hover:underline" href="/rss.xml">
            RSS feed
          </a>
          .
        </p>
        <div className="mt-2 flex flex-wrap items-start gap-4">
          <Subscribe />
          <a
            className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-colors hover:bg-accent"
            href="/rss.xml"
          >
            <RssIcon className="size-4" />
            RSS
          </a>
        </div>
      </header>

      <ol className="mt-14 flex flex-col gap-14">
        {list.map(({ week, items: added }, index) => {
          const launch = added.length > launchSize && index === list.length - 1;
          return (
            <li className="grid gap-5 border-t pt-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10" key={week}>
              <div className="flex flex-col gap-1">
                <h2 className="font-heading font-semibold text-base tracking-tight">{launch ? "Where it started" : `Week of ${longDate(week)}`}</h2>
                <p className="text-muted-foreground text-sm">
                  {added.length} {added.length === 1 ? "piece" : "pieces"}
                  {launch && ` · ${longDate(week)}`}
                </p>
              </div>
              {launch ? (
                <details className="group">
                  <summary className="cursor-pointer list-none text-muted-foreground text-sm transition-colors hover:text-foreground">
                    <span className="group-open:hidden">The first {added.length} pieces of devl v2. Show them all</span>
                    <span className="hidden group-open:inline">Hide them</span>
                  </summary>
                  <ul className="mt-5 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    {added.map((item) => (
                      <li className="min-w-0" key={item.slug}>
                        <Link className="flex min-w-0 items-baseline gap-2 text-sm hover:underline" href={itemHref(item)}>
                          <span className="truncate">{item.name}</span>
                          <span className="shrink-0 text-muted-foreground text-xs">{kindOf(item).label.toLowerCase()}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {added.map((item) => (
                    <li className="min-w-0" key={item.slug}>
                      <Link
                        className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-card transition-[border-color,box-shadow] hover:border-foreground/15 hover:shadow-md/5"
                        href={itemHref(item)}
                      >
                        <div className="aspect-[1200/630] overflow-hidden border-b bg-muted">
                          <img
                            alt=""
                            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            height={630}
                            loading="lazy"
                            src={item.og ? `/og/${item.slug}.jpg` : "/og.png"}
                            width={1200}
                          />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1 p-4">
                          <p className="flex items-baseline justify-between gap-3">
                            <span className="truncate font-medium">{item.name}</span>
                            <span className="shrink-0 font-mono text-muted-foreground text-xs">{kindOf(item).label.toLowerCase()}</span>
                          </p>
                          <p className="line-clamp-2 text-pretty text-muted-foreground text-sm">{item.description}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
