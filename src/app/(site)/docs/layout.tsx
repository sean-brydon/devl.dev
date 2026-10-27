import type { ReactNode } from "react";
import { DocsNav } from "@/components/docs";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 pt-8 pb-24 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-12 md:px-8 md:pt-14">
      <aside className="min-w-0 md:sticky md:top-24 md:self-start">
        <DocsNav />
      </aside>
      <div className="min-w-0 max-w-2xl">{children}</div>
    </div>
  );
}
