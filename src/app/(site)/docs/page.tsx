import type { Metadata } from "next";

export const metadata: Metadata = { title: "Getting started" };

export default function DocsPage() {
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-6 pb-16 md:px-8 md:pt-10">
        <h1 className="font-heading font-semibold text-2xl tracking-tight md:text-3xl">Getting started</h1>
        <p className="text-muted-foreground">
          Every devl component is built on coss ui. Set up coss ui in your project first, then add any component with
          the shadcn CLI.
        </p>
        <pre className="overflow-x-auto rounded-xl border bg-card p-4 font-mono text-sm">npx shadcn@latest init @coss/style</pre>
    </article>
  );
}
