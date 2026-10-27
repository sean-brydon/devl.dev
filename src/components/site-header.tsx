"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommandMenu } from "@/components/command-menu";
import { GitHubIcon } from "@/components/github-icon";
import { GooGroup } from "@/components/goo-group";
import { Logo } from "@/components/logo";
import { SoundToggle } from "@/components/sound-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { bklit, devl, getItem, itemsOfKind, kinds, qnot } from "@/lib/registry";

function Sections({ active }: { active: string | null }) {
  return (
    <GooGroup
      items={kinds.map((k) => ({
        value: k.value,
        href: k.href,
        label: (
          <>
            {k.label}
            <span className="font-mono text-[10px] opacity-60 tabular-nums">{itemsOfKind(k.value).length}</span>
          </>
        ),
      }))}
      label="Sections"
      value={active}
    />
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const active = kinds.find((k) => pathname.startsWith(k.href))?.value ?? null;
  const current = getItem(pathname.split("/")[2] ?? "");
  const credit = current?.source === "bklit" ? "bklit" : current?.poweredBy === "qnot" ? "qnot" : null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-4 px-4 md:px-8">
        <Link aria-label="devl home" className="shrink-0" href="/">
          <Logo />
        </Link>
        <nav aria-label="Sections" className="hidden min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] md:flex xl:justify-center">
          <Sections active={active} />
        </nav>
        <div className="ms-auto flex items-center gap-2 md:ms-0">
          <Button
            className="rounded-full px-2.5 text-muted-foreground hover:text-foreground aria-[current=page]:text-foreground max-sm:hidden"
            render={<Link aria-current={pathname.startsWith("/docs") ? "page" : undefined} href="/docs" />}
            size="sm"
            variant="ghost"
          >
            Docs
          </Button>
          <Button
            className="rounded-full px-2.5 text-muted-foreground hover:text-foreground aria-[current=page]:text-foreground"
            render={<Link aria-current={pathname.startsWith("/advertise") ? "page" : undefined} href="/advertise" />}
            size="sm"
            variant="ghost"
          >
            Advertise
          </Button>
          <div className="hidden w-60 lg:block">
            <CommandMenu />
          </div>
          <div className="lg:hidden">
            <CommandMenu compact shortcut={false} />
          </div>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <SoundToggle />
          {credit ? (
            <Button
              aria-label={credit === "bklit" ? "bklit-ui on GitHub" : "Qnot on GitHub"}
              className="rounded-full"
              render={<a href={credit === "bklit" ? bklit.repo : qnot.repo} rel="noopener" target="_blank" />}
              size="sm"
              variant="outline"
            >
              <GitHubIcon />
              <span className="max-sm:sr-only">{credit === "bklit" ? "Star bklit" : "Star Qnot"}</span>
            </Button>
          ) : (
            <Button
              aria-label="devl on GitHub"
              className="rounded-full"
              render={<a href={devl.repo} rel="noreferrer" target="_blank" />}
              size="icon-sm"
              variant="ghost"
            >
              <GitHubIcon />
            </Button>
          )}
        </div>
      </div>
      <nav
        aria-label="Sections"
        className="-mt-1 overflow-x-auto px-4 pb-2.5 [mask-image:linear-gradient(90deg,#000_88%,transparent)] [scrollbar-width:none] md:hidden"
      >
        <Sections active={active} />
      </nav>
    </header>
  );
}
