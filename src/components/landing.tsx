import { ArrowRightIcon, BotIcon, FileCodeIcon, TerminalIcon } from "lucide-react";
import Link from "next/link";
import { GitHubIcon } from "@/components/github-icon";
import { HeroStage } from "@/components/hero-stage";
import { InstallCommand } from "@/components/install-command";
import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import { bklit, cossUi, devl, getItem, type ItemKind, itemHref, items, itemsOfKind, kinds } from "@/lib/registry";

const signature = ["liquid-slider", "json-explorer", "voice-note", "liquid-switch", "ink-stamp", "liquid-segments"];
const showcase = ["drive", "calendar-week", "accounts-crm"];

const shelves: Record<ItemKind, string> = {
  component: "Liquid controls, chat, forms, charts and filters.",
  block: "Heroes, marketing sections, auth and dashboards.",
  screen: "Whole apps: sign-in, settings, mail, drive and more.",
  motion: "Liquid effects, text reveals, loaders, celebrations.",
  illustration: "Animated scenes for empty states and marketing.",
};

const steps = [
  {
    icon: TerminalIcon,
    title: "Install with one command",
    body: "Every piece is a shadcn registry item. The CLI drops a single file into your project, with the coss ui parts it needs.",
    code: "npx shadcn@latest add https://devl.dev/r/drive.json",
  },
  {
    icon: FileCodeIcon,
    title: "Own the code",
    body: "No package to update, no wrapper to fight. It is one readable TypeScript file with typed props, so you change what you like.",
    code: 'import { Drive } from "@/components/drive";',
  },
  {
    icon: BotIcon,
    title: "Or hand it to your AI",
    body: "Copy a prompt from any page and your editor gets the source, the install command and the dependencies in one go.",
    code: "devl.dev/llms.txt",
  },
];

function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-brand-ink text-xs uppercase tracking-widest">{eyebrow}</p>
        <h2 className="max-w-2xl text-balance font-heading font-semibold text-3xl tracking-tight md:text-4xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Landing() {
  const pieces = signature.flatMap((slug) => {
    const item = getItem(slug);
    return item ? [{ slug, name: item.name, category: item.category, href: itemHref(item) }] : [];
  });
  const screens = showcase.flatMap((slug) => getItem(slug) ?? []);

  return (
    <div className="pb-24">
      <section className="mx-auto flex max-w-4xl flex-col items-center px-4 pt-14 text-center md:pt-20">
        <a
          className="flex items-center gap-2 rounded-full border bg-card py-1 ps-1 pe-3 text-muted-foreground text-xs transition-colors hover:text-foreground"
          href={devl.repo}
          rel="noopener"
          target="_blank"
        >
          <span className="rounded-full bg-brand px-2 py-0.5 font-medium text-brand-foreground">Free</span>
          Open source, MIT licensed
          <ArrowRightIcon className="size-3" />
        </a>
        <h1 className="mt-6 text-balance font-heading font-semibold text-5xl tracking-tight md:text-7xl md:leading-[1.02]">
          Components with a little goo in them.
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
          {items.length} free React components, blocks and screens on {cossUi.name}. Copy the source, install with the shadcn CLI, or hand a prompt to your AI editor.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button className="rounded-full" render={<Link href="/components" />} size="lg">
            Browse the catalogue
            <ArrowRightIcon />
          </Button>
          <Button className="rounded-full" render={<a href={devl.repo} rel="noopener" target="_blank" />} size="lg" variant="outline">
            <GitHubIcon className="size-4" />
            Star on GitHub
          </Button>
        </div>
        <div className="mt-6 w-full max-w-xl">
          <InstallCommand command="npx shadcn@latest add https://devl.dev/r/liquid-slider.json" />
        </div>
      </section>

      <section aria-label="Try a few pieces" className="mx-auto mt-12 max-w-6xl px-4 md:mt-14 md:px-8">
        <HeroStage pieces={pieces} />
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-4 md:mt-32 md:px-8">
        <SectionHeading eyebrow="The shelves" title="Everything from a switch to a whole app." />
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {kinds.map((kind) => (
            <Link
              className="group flex flex-col gap-6 rounded-2xl border bg-card p-5 transition-[border-color,box-shadow] duration-200 hover:border-foreground/15 hover:shadow-md/5"
              href={kind.href}
              key={kind.value}
            >
              <span className="font-heading font-semibold text-4xl tabular-nums tracking-tight">{itemsOfKind(kind.value).length}</span>
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 font-medium">
                  {kind.label}
                  <ArrowRightIcon className="size-3.5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
                <span className="text-pretty text-muted-foreground text-sm">{shelves[kind.value]}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-4 md:mt-32 md:px-8">
        <SectionHeading
          action={
            <Button className="rounded-full" render={<Link href="/screens" />} variant="outline">
              All {itemsOfKind("screen").length} screens
              <ArrowRightIcon />
            </Button>
          }
          eyebrow="Screens"
          title="Whole apps you can start from, not just parts."
        />
        <div className="mt-8 grid auto-rows-[18rem] grid-cols-1 gap-x-4 gap-y-8 md:grid-cols-3">
          {screens.map((item) => (
            <ItemCard item={item} key={item.slug} />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-4 md:mt-32 md:px-8">
        <SectionHeading eyebrow="How it works" title="One file each. Yours the moment you add it." />
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body, code }) => (
            <div className="flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-6" key={title}>
              <span className="flex size-9 items-center justify-center rounded-xl bg-muted">
                <Icon className="size-4" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-medium">{title}</h3>
                <p className="text-pretty text-muted-foreground text-sm">{body}</p>
              </div>
              <code className="mt-auto truncate rounded-lg border bg-muted/40 px-3 py-2 font-mono text-xs">{code}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-4 md:mt-32 md:px-8">
        <div className="flex flex-col items-center gap-6 rounded-3xl border bg-card px-6 py-14 text-center md:py-20">
          <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
            {items.length} kept · {devl.cut} cut
          </p>
          <h2 className="max-w-2xl text-balance font-heading font-semibold text-3xl tracking-tight md:text-5xl">Free, open source, and taste-tested.</h2>
          <p className="max-w-xl text-pretty text-muted-foreground">
            Built on{" "}
            <a className="text-foreground underline-offset-4 hover:underline" href={cossUi.site} rel="noopener" target="_blank">
              {cossUi.name}
            </a>
            , charts by{" "}
            <a className="text-foreground underline-offset-4 hover:underline" href={bklit.site} rel="noopener" target="_blank">
              {bklit.name}
            </a>
            . devl’s own code is MIT licensed.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button className="rounded-full" render={<Link href="/components" />} size="lg">
              Start browsing
              <ArrowRightIcon />
            </Button>
            <Button className="rounded-full" render={<Link href="/docs" />} size="lg" variant="outline">
              Read the docs
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
