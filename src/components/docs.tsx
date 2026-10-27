"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";

export const docsNav = [
  {
    label: "Start",
    pages: [
      { href: "/docs", title: "Getting started" },
      { href: "/docs/mcp", title: "MCP server" },
      { href: "/docs/skill", title: "Agent skill" },
    ],
  },
  {
    label: "Agents",
    pages: [
      { href: "/docs/claude", title: "Claude" },
      { href: "/docs/codex", title: "Codex" },
      { href: "/docs/cursor", title: "Cursor" },
      { href: "/docs/vscode", title: "VS Code" },
    ],
  },
];

export function DocsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Docs" className="flex gap-6 overflow-x-auto [scrollbar-width:none] md:flex-col md:gap-5">
      {docsNav.map((group) => (
        <div className="flex shrink-0 gap-1 md:flex-col" key={group.label}>
          <p className="hidden px-2 pb-1 font-mono text-[11px] text-muted-foreground uppercase tracking-widest md:block">{group.label}</p>
          {group.pages.map((page) => {
            const current = pathname === page.href;
            return (
              <Link
                aria-current={current ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-md px-2 py-1.5 text-sm transition-colors",
                  current ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
                href={page.href}
                key={page.href}
              >
                {page.title}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function Code({ children, label }: { children: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {label && <div className="border-b px-4 py-2 font-mono text-[11px] text-muted-foreground">{label}</div>}
      <div className="relative">
        <pre className="overflow-x-auto p-4 pe-12 font-mono text-[13px] leading-relaxed">
          <code>{children}</code>
        </pre>
        <CopyButton aria-label="Copy" className="absolute top-2.5 right-2.5" value={children} />
      </div>
    </div>
  );
}

export function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="relative flex flex-col gap-3 ps-10">
      <span className="absolute top-0 left-0 flex size-6 items-center justify-center rounded-full border bg-card font-mono text-xs">{n}</span>
      <h3 className="font-medium leading-6">{title}</h3>
      {children}
    </li>
  );
}

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="flex flex-col gap-8">{children}</ol>;
}

export function DocsPage({ title, lead, children }: { title: string; lead: ReactNode; children: ReactNode }) {
  return (
    <article className="flex min-w-0 flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-heading font-semibold text-3xl tracking-tight md:text-4xl">{title}</h1>
        <p className="text-pretty text-lg text-muted-foreground">{lead}</p>
      </header>
      <div className="flex flex-col gap-10 text-[15px] leading-relaxed [&_h2]:font-heading [&_h2]:font-semibold [&_h2]:text-xl [&_h2]:tracking-tight [&_p_code]:rounded [&_p_code]:bg-muted [&_p_code]:px-1 [&_p_code]:py-0.5 [&_p_code]:font-mono [&_p_code]:text-[13px] [&_section]:flex [&_section]:flex-col [&_section]:gap-4">
        {children}
      </div>
    </article>
  );
}
