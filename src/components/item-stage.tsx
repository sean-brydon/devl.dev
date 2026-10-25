"use client";

import { CodeIcon, EyeIcon, MonitorIcon, MoonIcon, RotateCwIcon, SmartphoneIcon, SunIcon, TabletIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { GooGroup } from "@/components/goo-group";
import { Button } from "@/components/ui/button";
import type { ItemKind } from "@/lib/registry";
import { cn } from "@/lib/utils";

const widths = { desktop: "100%", tablet: "768px", mobile: "390px" } as const;
type Device = keyof typeof widths;

const heights: Record<ItemKind, string> = {
  component: "h-[min(78svh,40rem)] min-h-[30rem]",
  motion: "h-[min(78svh,40rem)] min-h-[30rem]",
  illustration: "h-[min(78svh,40rem)] min-h-[30rem]",
  block: "h-[min(86svh,50rem)] min-h-[36rem]",
  screen: "h-[min(90svh,54rem)] min-h-[38rem]",
};

export function ItemStage({ slug, kind, code }: { slug: string; kind: ItemKind; code: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [view, setView] = useState("preview");
  const [theme, setTheme] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [reloads, setReloads] = useState(0);
  const [mounted, setMounted] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => setMounted(true), []);
  const frameTheme = theme ?? resolvedTheme ?? "light";
  const [srcTheme, setSrcTheme] = useState<string | null>(null);
  useEffect(() => {
    if (mounted && srcTheme === null && resolvedTheme) setSrcTheme(theme ?? resolvedTheme);
  }, [mounted, srcTheme, resolvedTheme, theme]);

  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "devl:theme", theme: frameTheme }, location.origin);
  }, [frameTheme]);

  const previewing = view === "preview";

  return (
    <section
      aria-label="Live preview"
      className={cn("stage-surface relative isolate overflow-hidden rounded-3xl border shadow-sm/5", heights[kind])}
    >
      <div className={cn("absolute inset-0 flex justify-center", !previewing && "invisible")}>
        <div
          className="h-full pb-20 transition-[width,padding] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] data-[device=desktop]:pb-0 not-data-[device=desktop]:pt-6"
          data-device={device}
          style={{ width: widths[device], maxWidth: "100%" }}
        >
          {srcTheme && (
            <iframe
              className={cn("size-full", device !== "desktop" && "rounded-2xl border bg-background shadow-lg/10")}
              key={reloads}
              onLoad={(event) =>
                event.currentTarget.contentWindow?.postMessage({ type: "devl:theme", theme: frameTheme }, location.origin)
              }
              ref={frame}
              src={`/preview/${slug}?theme=${srcTheme}`}
              title={`${slug} preview`}
            />
          )}
        </div>
      </div>

      {!previewing && <div className="absolute inset-0 overflow-auto p-3 pb-24 sm:p-4 sm:pb-24">{code}</div>}

      <div className="absolute inset-x-0 bottom-4 flex justify-center px-3">
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border bg-background/80 p-1 shadow-lg/10 backdrop-blur-xl [scrollbar-width:none]">
          <GooGroup
            className="bg-transparent p-0"
            items={[
              { value: "preview", label: (<><EyeIcon />Preview</>) },
              { value: "code", label: (<><CodeIcon />Code</>) },
            ]}
            label="View"
            onValueChange={setView}
            size="sm"
            value={view}
          />
          {previewing && (
            <>
              <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />
              <GooGroup
                className="bg-transparent p-0"
                items={[
                  { value: "light", ariaLabel: "Light preview", label: <SunIcon /> },
                  { value: "dark", ariaLabel: "Dark preview", label: <MoonIcon /> },
                ]}
                label="Preview theme"
                onValueChange={setTheme}
                size="sm"
                value={mounted ? frameTheme : null}
              />
              <span aria-hidden className="mx-1 hidden h-5 w-px shrink-0 bg-border sm:block" />
              <GooGroup
                className="hidden bg-transparent p-0 sm:inline-flex"
                items={[
                  { value: "desktop", ariaLabel: "Desktop width", label: <MonitorIcon /> },
                  { value: "tablet", ariaLabel: "Tablet width", label: <TabletIcon /> },
                  { value: "mobile", ariaLabel: "Phone width", label: <SmartphoneIcon /> },
                ]}
                label="Preview width"
                onValueChange={(value) => setDevice(value as Device)}
                size="sm"
                value={device}
              />
              <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />
              <Button
                aria-label="Replay preview"
                className="size-7 shrink-0 rounded-full"
                onClick={() => {
                  setSrcTheme(frameTheme);
                  setReloads((n) => n + 1);
                }}
                size="icon-sm"
                variant="ghost"
              >
                <RotateCwIcon />
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
