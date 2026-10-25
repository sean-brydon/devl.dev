"use client";

import { type ComponentProps, type CSSProperties, type PointerEvent, useRef } from "react";
import { cn } from "@/lib/utils";

export interface TorchGridProps extends ComponentProps<"div"> {
  radius?: number;
}

export function TorchGrid({
  radius = 260,
  className,
  style,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  ...props
}: TorchGridProps) {
  const ref = useRef<HTMLDivElement>(null);

  const measure = () => {
    const grid = ref.current;
    if (!grid) return;
    const g = grid.getBoundingClientRect();
    for (const card of grid.querySelectorAll<HTMLElement>("[data-spotlight-card]")) {
      const c = card.getBoundingClientRect();
      card.style.setProperty("--card-x", `${c.left - g.left}px`);
      card.style.setProperty("--card-y", `${c.top - g.top}px`);
    }
  };

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const grid = ref.current;
    if (!grid) return;
    const g = grid.getBoundingClientRect();
    grid.style.setProperty("--spot-x", `${event.clientX - g.left}px`);
    grid.style.setProperty("--spot-y", `${event.clientY - g.top}px`);
  };

  return (
    <div
      className={cn("group/spotlight relative", className)}
      data-spotlight-grid=""
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (e.pointerType !== "mouse") return;
        measure();
        track(e);
        ref.current?.setAttribute("data-lit", "");
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        ref.current?.removeAttribute("data-lit");
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (e.pointerType === "mouse") track(e);
      }}
      ref={ref}
      style={{ "--spot-r": `${radius}px`, ...style } as CSSProperties}
      {...props}
    />
  );
}

export type TorchCardProps = ComponentProps<"div">;

const atX = "(var(--spot-x, -999px) - var(--card-x, 0px))";
const atY = "(var(--spot-y, -999px) - var(--card-y, 0px))";

export function TorchCard({ className, children, ...props }: TorchCardProps) {
  return (
    <div
      className={cn("relative isolate rounded-2xl border bg-card shadow-xs/5", className)}
      data-spotlight-card=""
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 ease-out group-data-lit/spotlight:opacity-100 [--spot-fill:color-mix(in_srgb,var(--color-foreground)_5%,transparent)] dark:[--spot-fill:color-mix(in_srgb,var(--color-foreground)_9%,transparent)]"
        style={{ background: `radial-gradient(var(--spot-r) circle at calc${atX} calc${atY}, var(--spot-fill), transparent 70%)` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px z-10 rounded-[inherit] border border-transparent opacity-0 transition-opacity duration-300 ease-out group-data-lit/spotlight:opacity-100 [--spot-rim:color-mix(in_srgb,var(--color-foreground)_32%,transparent)] dark:[--spot-rim:color-mix(in_srgb,var(--color-foreground)_44%,transparent)]"
        style={{
          background: `radial-gradient(calc(var(--spot-r) * 0.7) circle at calc(${atX} + 1px) calc(${atY} + 1px), var(--spot-rim), transparent 70%) border-box`,
          mask: "linear-gradient(#000 0 0) padding-box exclude, linear-gradient(#000 0 0) border-box",
        }}
      />
      {children}
    </div>
  );
}
