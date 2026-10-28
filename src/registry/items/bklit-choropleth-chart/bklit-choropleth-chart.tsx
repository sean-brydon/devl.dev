"use client";

import type { FeatureCollection, Geometry } from "geojson";
import { RotateCwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import {
  type ChoroplethFeature,
  ChoroplethChart,
  ChoroplethFeatureComponent,
  type ChoroplethFeatureProperties,
  ChoroplethTooltip,
} from "@/components/charts/choropleth";
import { TooltipContent } from "@/components/charts/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Countries = FeatureCollection<Geometry, ChoroplethFeatureProperties>;

export interface VisitorsMapCardProps {
  title?: string;
  period?: string;
  visitors: Record<string, number>;
  topologyUrl?: string;
  aliases?: Record<string, string>;
  className?: string;
}

const WORLD = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const defaultAliases: Record<string, string> = { "United States of America": "United States" };
const whole = new Intl.NumberFormat("en-US");
const shades = [22, 40, 60, 80, 100];
const shade = (amount: number) => `color-mix(in oklab, var(--color-indigo-500) ${amount}%, var(--chart-scale-mix))`;

function useCountries(url: string) {
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; data: Countries | null }>({
    status: "loading",
    data: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((topology: Parameters<typeof feature>[0]) => {
        const all = feature(topology, topology.objects.countries) as Countries;
        setState({
          status: "ready",
          data: { ...all, features: all.features.filter((f) => f.properties.name !== "Antarctica") },
        });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ status: "error", data: null });
        return error;
      });
    return () => controller.abort();
  }, [url, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading", data: null });
    setAttempt((a) => a + 1);
  }, []);

  return { ...state, retry };
}

export function VisitorsMapCard({
  title = "Visitors by country",
  period = "Last 30 days",
  visitors,
  topologyUrl = WORLD,
  aliases = defaultAliases,
  className,
}: VisitorsMapCardProps) {
  const { status, data, retry } = useCountries(topologyUrl);

  const { total, top, max } = useMemo(() => {
    const entries = Object.entries(visitors).sort((a, b) => b[1] - a[1]);
    return {
      total: entries.reduce((sum, [, v]) => sum + v, 0),
      top: entries.slice(0, 4),
      max: entries[0]?.[1] ?? 1,
    };
  }, [visitors]);

  const valueOf = useCallback((f: ChoroplethFeature) => visitors[f.properties.name ?? ""], [visitors]);

  const colorOf = useCallback(
    (f: ChoroplethFeature) => {
      const value = valueOf(f);
      if (!value) return "var(--chart-scale-01)";
      const step = Math.min(shades.length - 1, Math.floor(Math.sqrt(value / max) * shades.length));
      return shade(shades[step]);
    },
    [valueOf, max],
  );

  return (
    <div className={cn("w-[480px] max-w-full rounded-2xl border bg-card p-5 shadow-xs/5", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-muted-foreground text-sm">{title}</p>
        <p className="text-muted-foreground text-xs">{period}</p>
      </div>
      <p className="mt-1 font-semibold text-2xl tabular-nums tracking-tight">{whole.format(total)}</p>
      <div className="relative mt-3 aspect-[8/5] w-full">
        {status === "ready" && data ? (
          <ChoroplethChart aspectRatio="8 / 5" center={[10, 12]} data={data}>
            <ChoroplethFeatureComponent fadedOpacity={0.5} getFeatureColor={colorOf} stroke="var(--card)" />
            <ChoroplethTooltip
              content={({ feature: country }) => {
                const value = valueOf(country);
                const name = country.properties.name ?? "Unknown";
                return (
                  <TooltipContent
                    rows={
                      value
                        ? [
                            { color: colorOf(country), label: "Visitors", value: whole.format(value) },
                            { color: "transparent", label: "Share", value: `${((value / total) * 100).toFixed(1)}%` },
                          ]
                        : [{ color: "var(--chart-scale-01)", label: "Visitors", value: "None yet" }]
                    }
                    title={aliases[name] ?? name}
                  />
                );
              }}
            />
          </ChoroplethChart>
        ) : status === "error" ? (
          <div className="flex size-full flex-col items-center justify-center gap-2 rounded-xl bg-muted text-center">
            <p className="text-muted-foreground text-sm">Couldn't load the map.</p>
            <Button onClick={retry} size="sm" variant="outline">
              <RotateCwIcon />
              Try again
            </Button>
          </div>
        ) : (
          <div aria-label="Loading map" className="size-full animate-pulse rounded-xl bg-muted" role="status" />
        )}
      </div>
      <div aria-hidden className="mt-2 flex items-center justify-end gap-1.5 text-muted-foreground text-xs">
        Fewer
        {shades.map((amount) => (
          <span className="size-2.5 rounded-[calc(var(--radius)*0.3)]" key={amount} style={{ background: shade(amount) }} />
        ))}
        More
      </div>
      <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {top.map(([country, value]) => (
          <li className="text-sm" key={country}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate">{aliases[country] ?? country}</span>
              <span className="text-muted-foreground text-xs tabular-nums">{whole.format(value)}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
