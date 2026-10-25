"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { GooGroup } from "@/components/goo-group";
import { Skeleton } from "@/components/ui/skeleton";

export interface CodeFile {
  name: string;
  code: string;
  html: string;
}

const cache = new Map<string, Promise<CodeFile[]>>();

function loadCode(slug: string) {
  let files = cache.get(slug);
  if (!files) {
    files = fetch(`/code/${slug}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`code ${res.status}`);
        return res.json() as Promise<{ files: CodeFile[] }>;
      })
      .then((data) => data.files);
    files.catch(() => cache.delete(slug));
    cache.set(slug, files);
  }
  return files;
}

export function CodeView({ slug }: { slug: string }) {
  const [files, setFiles] = useState<CodeFile[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(`${slug}.tsx`);

  useEffect(() => {
    let live = true;
    loadCode(slug).then(
      (loaded) => live && setFiles(loaded),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [slug]);

  const file = files?.find((f) => f.name === active) ?? files?.[0];

  return (
    <div className="overflow-hidden rounded-3xl border bg-card">
      <div className="flex min-h-12 items-center justify-between gap-2 border-b p-2 ps-3">
        <GooGroup
          items={[`${slug}.tsx`, "demo.tsx"].map((name) => ({ value: name, label: <span className="font-mono">{name}</span> }))}
          label="Files"
          onValueChange={setActive}
          size="sm"
          value={active}
        />
        {file && <CopyButton aria-label={`Copy ${file.name}`} value={file.code} />}
      </div>
      {file ? (
        <div
          className="max-h-[42rem] overflow-auto p-5 font-mono text-[13px] leading-relaxed [&_pre]:outline-none"
          // Highlighted at build time by scripts/registry.mjs from files in this repo.
          dangerouslySetInnerHTML={{ __html: file.html }}
        />
      ) : failed ? (
        <p className="p-5 text-muted-foreground text-sm">
          Couldn&apos;t load the code.{" "}
          <a className="underline underline-offset-4 hover:text-foreground" href={`/raw/${slug}.tsx`}>
            Open the raw file
          </a>
          .
        </p>
      ) : (
        <div aria-busy aria-label="Loading code" className="flex flex-col gap-2.5 p-5">
          {[72, 48, 84, 60, 40, 76, 52, 66].map((width, i) => (
            <Skeleton className="h-3.5" key={i} style={{ width: `${width}%` }} />
          ))}
        </div>
      )}
    </div>
  );
}
