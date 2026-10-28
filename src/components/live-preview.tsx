"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Preview } from "@/components/previews";
import { cn } from "@/lib/utils";

/** Mounts children only while near the viewport, so a page of self-running demos stays calm. */
function WhenVisible({ children, className, scoped }: { children: ReactNode; className?: string; scoped?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={className} data-theme-scope={scoped ? "" : undefined} ref={ref}>
      {visible ? children : <div className="size-full animate-pulse rounded-xl bg-muted/40" />}
    </div>
  );
}

/** Renders a demo at a fixed design width, scales it to the tile's width and centres it vertically when shorter. */
function Scaled({ slug, width }: { slug: string; width: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState({ scale: 0, offset: 0 });

  useEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    const fit = () => {
      const scale = box.clientWidth / width;
      setFrame({ scale, offset: Math.max(0, (box.clientHeight - content.offsetHeight * scale) / 2) });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div className="absolute inset-0 overflow-hidden" ref={outer}>
      <div
        className="origin-top-left"
        ref={inner}
        style={{ width, transform: `translateY(${frame.offset}px) scale(${frame.scale})`, opacity: frame.scale ? 1 : 0 }}
      >
        <Preview slug={slug} />
      </div>
    </div>
  );
}

/** Centres a demo and shrinks it (never grows it) until it fits the tile. */
function Fitted({ slug }: { slug: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    const fit = () => {
      const pad = 40;
      const next = Math.min(1, (box.clientWidth - pad) / content.offsetWidth, (box.clientHeight - pad) / content.offsetHeight);
      setScale(Number.isFinite(next) && next > 0 ? next : 1);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden" ref={outer}>
      <div
        className="flex shrink-0 justify-center"
        ref={inner}
        style={{ width: "min(640px, calc(100% - 40px))", minWidth: "max-content", scale }}
      >
        <Preview slug={slug} />
      </div>
    </div>
  );
}

export function LivePreview({ slug, scaledWidth, className }: { slug: string; scaledWidth?: number; className?: string }) {
  return (
    <WhenVisible className={cn("relative size-full", className)} scoped>
      {scaledWidth ? (
        <Scaled slug={slug} width={scaledWidth} />
      ) : (
        <Fitted slug={slug} />
      )}
    </WhenVisible>
  );
}
