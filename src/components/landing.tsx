import { ArrowRightIcon, BotIcon, FileCodeIcon, TerminalIcon } from "lucide-react";
import Link from "next/link";
import { CuttingRoom } from "@/components/cutting-room";
import { GitHubIcon } from "@/components/github-icon";
import { HeroStage } from "@/components/hero-stage";
import { InstallCommand } from "@/components/install-command";
import { ItemCard, type TileSize } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import { PourHeadline } from "@/registry/items/pour-hero/pour-hero";
import { bklit, cossUi, devl, getItem, itemHref, items, itemsOfKind, kinds } from "@/lib/registry";

const signature = ["liquid-slider", "json-explorer", "voice-note", "liquid-switch", "ink-stamp", "liquid-segments"];
const showcase = ["drive", "calendar-week", "accounts-crm"];

const wall: [string, TileSize][] = [
  ["liquid-cursor", "big"],
  ["night-owl", "sm"],
  ["magnetic", "sm"],
  ["desk-bot", "sm"],
  ["liquid-fab", "sm"],
  ["magnify-dock", "wide"],
  ["confetti-burst", "sm"],
  ["launch-pad", "sm"],
  ["lava-lamp", "wide"],
  ["card-pile", "sm"],
  ["card-stack", "sm"],
];

const cuts = [
  {
    slug: "booking-hero",
    name: "Booking Hero",
    reason: "Made it all the way onto the site. One look, one note back: “remove this one.”",
  },
  {
    slug: "passkey-sign-in",
    name: "Passkey Sign-in",
    reason: "A top bar, a footer and an account chip around one form. Too much page for signing in.",
    replacedBy: { name: "Sign In", href: "/screens/sign-in" },
  },
  {
    slug: "two-factor-challenge",
    name: "Two Factor Challenge",
    reason: "A demo hint, a trust checkbox and two fallback menus. It only needed the code field.",
    replacedBy: { name: "Verify Email", href: "/screens/verify-email" },
  },
  {
    slug: "magic-link-inbox",
    name: "Magic Link Inbox",
    reason: "Two different screens for waiting on an email was one too many.",
    replacedBy: { name: "Verify Email", href: "/screens/verify-email" },
  },
];

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

const fade = "linear-gradient(to bottom, transparent, #000 18%, #000 72%, transparent)";
const dither = "absolute inset-x-0 top-0 h-[calc(100%-12rem)] [mask-composite:intersect] [mask-position:center_bottom,center] [mask-repeat:no-repeat] [mask-size:1920px_822px,100%_100%]";

/** A 1-bit dithered image used as a mask, so its dots take the theme's text colour. */
function Backdrop({ src }: { src: string }) {
  return (
    <div aria-hidden className="-z-10 absolute inset-0">
      <div className={`${dither} bg-foreground opacity-[0.12] dark:opacity-[0.16]`} style={{ maskImage: `url(${src}), ${fade}` }} />
    </div>
  );
}

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
      <div className="relative isolate overflow-hidden">
        <Backdrop src="/landing/hero-goo-clouds.png" />
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
          <div className="mt-6 w-full">
            <PourHeadline
              className="text-[32px] leading-[1.05] tracking-tight sm:text-6xl sm:leading-[1.02] md:text-7xl lg:text-7xl lg:leading-[1.02]"
              lines={["Components with", "a little goo in them."]}
              playful
            />
          </div>
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
      </div>

      <section className="mx-auto mt-24 max-w-6xl px-4 md:mt-32 md:px-8">
        <SectionHeading eyebrow="Try them" title="Every tile is the real thing. Hover, drag, click." />
        <div className="mt-8 grid auto-rows-[15rem] grid-flow-dense grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {wall.flatMap(([slug, size]) => {
            const item = getItem(slug);
            return item ? [<ItemCard item={item} key={slug} size={size} />] : [];
          })}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-2">
          {kinds.map((kind) => (
            <Link
              className="flex items-center gap-2 rounded-full border bg-card py-1.5 ps-3 pe-2 text-sm transition-colors hover:border-foreground/15"
              href={kind.href}
              key={kind.value}
            >
              {kind.label}
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">{itemsOfKind(kind.value).length}</span>
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
        <SectionHeading eyebrow="The cutting room" title="Taste-tested means saying no." />
        <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">A few of the pieces that didn't make it, and why. Hover one to stamp it again.</p>
        <div className="mt-8">
          <CuttingRoom pieces={cuts} />
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
        <nav aria-label="Site" className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-muted-foreground text-sm">
          <Link className="hover:text-foreground" href="/docs">
            Docs
          </Link>
          <a className="hover:text-foreground" href="/llms.txt">
            llms.txt
          </a>
          <a className="hover:text-foreground" href={devl.repo} rel="noopener" target="_blank">
            GitHub
          </a>
          <Link className="hover:text-foreground" href="/privacy">
            Privacy
          </Link>
        </nav>
      </section>
    </div>
  );
}
