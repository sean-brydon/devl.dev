import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FrameTheme } from "@/components/frame-theme";
import { Preview } from "@/components/previews";
import { getItem, items } from "@/lib/registry";

export const metadata: Metadata = { robots: { index: false } };

export function generateStaticParams() {
  return items.map((item) => ({ slug: item.slug }));
}

export default function PreviewPage({ params }: PageProps<"/preview/[slug]">) {
  return (
    <Suspense>
      <FrameTheme />
      <PreviewBody params={params} />
    </Suspense>
  );
}

async function PreviewBody({ params }: Pick<PageProps<"/preview/[slug]">, "params">) {
  const item = getItem((await params).slug);
  if (!item) notFound();
  const fills = item.kind === "screen" || item.kind === "block";
  return (
    <main className={fills ? "min-h-svh" : "stage-surface flex min-h-svh items-center justify-center p-6 pb-24"}>
      <Preview slug={item.slug} />
    </main>
  );
}
