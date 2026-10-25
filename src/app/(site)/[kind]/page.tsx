import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Library } from "@/components/library";
import { kinds } from "@/lib/registry";

export function generateStaticParams() {
  return kinds.map((k) => ({ kind: k.href.slice(1) }));
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
