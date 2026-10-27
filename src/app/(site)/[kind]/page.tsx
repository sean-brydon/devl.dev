import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Library } from "@/components/library";
import { type ItemKind, itemsOfKind, kinds } from "@/lib/registry";

export function generateStaticParams() {
  return kinds.map((k) => ({ kind: k.href.slice(1) }));
}

const copy: Record<ItemKind, { title: string; description: (count: number) => string }> = {
  component: {
    title: "Free React components for shadcn",
    description: (n) => `${n} free React components on coss ui (Base UI and Tailwind): liquid controls, chat, forms, charts and more. Copy the source or install with the shadcn CLI.`,
  },
  block: {
    title: "Free React blocks for Tailwind",
    description: (n) => `${n} free page blocks for React and Tailwind: heroes, marketing sections, auth, dashboards and app panels. Copy the source or install with the shadcn CLI.`,
  },
  screen: {
    title: "Free React app screens and templates",
    description: (n) => `${n} free full-screen React app templates: sign-in, settings, AI chat, dashboards, mail, calendar, drive and more, ready for shadcn.`,
  },
  motion: {
    title: "Free animated React components",
    description: (n) => `${n} free animated React components: liquid effects, text reveals, cursors, loaders and celebrations, built with Motion and Tailwind.`,
  },
  illustration: {
    title: "Free animated React illustrations",
    description: (n) => `${n} free animated SVG illustrations for React: empty states, characters, objects and celebrations you can theme and install with shadcn.`,
  },
};

export async function generateMetadata({ params }: PageProps<"/[kind]">): Promise<Metadata> {
  const { kind } = await params;
  const match = kinds.find((k) => k.href === `/${kind}`);
  if (!match) return {};
  const { title, description } = copy[match.value];
  const text = description(itemsOfKind(match.value).length);
  return {
    title,
    description: text,
    alternates: { canonical: match.href },
    openGraph: { title: `${title} · devl`, description: text },
    twitter: { title: `${title} · devl`, description: text },
  };
}

export default function KindPage({ params }: PageProps<"/[kind]">) {
  return (
    <Suspense>
      <KindLibrary params={params} />
    </Suspense>
  );
}

async function KindLibrary({ params }: Pick<PageProps<"/[kind]">, "params">) {
  const { kind } = await params;
  const match = kinds.find((k) => k.href === `/${kind}`);
  if (!match) notFound();
  return <Library kind={match.value} />;
}
