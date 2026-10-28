"use client";

import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { PieCenter } from "@/components/charts/pie-center";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { cn } from "@/lib/utils";

export interface StorageCategory {
  label: string;
  gigabytes: number;
  color: string;
  swatch: string;
}

export interface StorageDonutCardProps {
  title?: string;
  categories: StorageCategory[];
  capacity: number;
  className?: string;
}

const gb = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function RollingNumber({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const spring = useSpring(value, { stiffness: 320, damping: 34 });
  const text = useTransform(spring, (v) => gb.format(v));
  useEffect(() => {
    if (reduceMotion) spring.jump(value);
    else spring.set(value);
  }, [value, reduceMotion, spring]);
  return <motion.span>{text}</motion.span>;
}

export function StorageDonutCard({ title = "Storage", categories, capacity, className }: StorageDonutCardProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const used = categories.reduce((sum, c) => sum + c.gigabytes, 0);
  const data = categories.map((c) => ({ label: c.label, value: c.gigabytes, color: c.color }));

  return (
    <div className={cn("w-[460px] max-w-full rounded-2xl border bg-card p-5 shadow-xs/5", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-muted-foreground text-sm">{title}</p>
        <p className="text-muted-foreground text-xs tabular-nums">
          <span className="font-medium text-foreground">{gb.format(used)} GB</span> of {gb.format(capacity)} GB
        </p>
      </div>
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
        <div className="shrink-0">
          <PieChart
            cornerRadius={4}
            data={data}
            hoverOffset={6}
            hoveredIndex={hovered}
            innerRadius={52}
            onHoverChange={setHovered}
            padAngle={0.03}
            size={168}
          >
            {data.map((d, i) => (
              <PieSlice hoverEffect="grow" index={i} key={d.label} />
            ))}
            <PieCenter>
              {({ value, label }) => (
                <div className="flex flex-col items-center whitespace-nowrap text-center leading-none">
                  <span className="font-semibold text-xl tabular-nums">
                    <RollingNumber value={value} />
                    <span className="ml-0.5 font-normal text-muted-foreground text-xs">GB</span>
                  </span>
                  <span className="mt-1.5 text-muted-foreground text-xs">{label === "Total" ? "used" : label}</span>
                </div>
              )}
            </PieCenter>
          </PieChart>
        </div>
        <ul className="w-full min-w-0 flex-1 space-y-0.5">
          {categories.map((c, i) => (
            <li key={c.label}>
              <button
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-ring",
                  hovered !== null && hovered !== i && "opacity-45",
                )}
                onBlur={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                type="button"
              >
                <span className={cn("size-2.5 shrink-0 rounded-[calc(var(--radius)*0.3)]", c.swatch)} />
                <span className="flex-1 truncate">{c.label}</span>
                <span className="text-muted-foreground text-xs tabular-nums">{gb.format(c.gigabytes)} GB</span>
                <span className="w-9 text-right font-medium text-xs tabular-nums">
                  {Math.round((c.gigabytes / used) * 100)}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
