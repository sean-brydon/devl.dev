"use client";

import { AnimatePresence, motion, useInView, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type ComponentProps, memo, useEffect, useMemo, useRef, useState } from "react";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

export type WorldRegion = "americas" | "europe" | "africa" | "asia" | "oceania";

export interface WorldCity {
  name: string;
  lon: number;
  lat: number;
  region: WorldRegion;
}

export interface DotMapProps extends Omit<ComponentProps<"div">, "children" | "onChange"> {
  region?: WorldRegion;
  onRegionChange?: (region: WorldRegion) => void;
  defaultRegion?: WorldRegion;
  autoCycle?: boolean;
  cities?: WorldCity[];
  counts?: Record<WorldRegion, number>;
  title?: string;
}

const LAND_ROWS = [
  "a34.33 e77.5",
  "a34.8 a43.22 e76.4 s98.1 s112.3",
  "a35.5 a47.18 e95.1 s96.2 s106.11",
  "a21.9 a35.7 a49.15 e92.3 s98.25 s126.5",
  "a6.11 a18.14 a34.2 a37.8 a50.13 e79.7 s96.47",
  "s0.3 a4.35 a41.6 a50.10 e77.18 s95.48",
  "s0.4 a5.34 a41.6 a51.5 e62.4 e76.20 s96.48",
  "a5.30 a38.1 a40.6 a51.4 e73.6 e80.15 s95.48",
  "a6.29 a41.3 a46.1 a53.2 e74.6 e81.15 s96.38 s135.6",
  "a8.2 a17.18 a41.6 e69.2 e74.4 e80.15 s95.33 s134.3",
  "a7.1 a19.20 a40.8 e68.4 e75.21 s96.31 s134.3",
  "a20.29 e67.5 e73.22 s95.34 s134.1",
  "a21.30 e70.26 s96.34",
  "a21.25 a48.3 e70.20 s90.39",
  "a22.26 e71.13 e85.5 s90.1 s92.35 s128.2",
  "a21.23 e68.6 e76.7 e85.1 e88.2 s90.1 s92.33 s127.3",
  "a22.21 e68.4 e75.1 e78.1 e80.1 s82.10 s93.31 s128.1",
  "a22.20 e68.3 f73.3 e77.1 e80.1 s82.38 s121.3 s126.2",
  "a23.19 f69.8 s85.35 s122.6",
  "a24.16 f68.10 f79.3 s85.35 s123.2",
  "a25.15 f68.17 s85.36",
  "a26.7 a38.2 f66.19 s85.35",
  "a27.6 a39.1 f66.20 s87.6 s94.26",
  "a29.4 a38.3 f65.21 s87.9 s99.19 s119.1",
  "a30.4 a35.3 a40.3 f65.23 s88.8 s101.6 s109.7",
  "a30.7 a42.2 f64.23 s88.6 s100.5 s109.5 s119.2",
  "a34.5 f65.23 s89.4 s101.4 s111.5 s120.1",
  "a36.2 f65.24 s89.1 s101.3 s111.4 s120.2",
  "a37.2 a40.8 f66.27 s102.2 s111.1 s113.2 s120.3",
  "a38.10 f66.26 s103.1 s111.1 s120.2",
  "a41.10 f68.4 f74.18 s110.1 s112.2 s118.2",
  "a40.12 f75.15 s110.3 s116.3 s122.1",
  "a39.14 f75.15 s112.1 s115.4 s120.1 s123.1",
  "a39.17 f75.13 s112.2 s115.3 s119.2 s123.1 o124.5",
  "a39.19 f76.12 s113.2 s119.2 o126.5",
  "a39.19 f76.12 s114.7 o127.4",
  "a40.18 f77.11 o131.1",
  "a40.17 f76.12 f91.1 o124.2 o128.1",
  "a42.15 f77.12 f90.2 o122.5 o128.2",
  "a42.14 f76.11 f89.3 o120.10",
  "a44.12 f77.9 f89.3 o119.13",
  "a43.12 f77.9 f89.2 o117.15",
  "a43.11 f78.8 f90.1 o117.16",
  "a43.9 f78.7 o117.16",
  "a43.9 f79.6 o118.16",
  "a43.8 f78.5 o117.6 o124.9",
  "a43.7 f79.3 o118.2 o127.6",
  "a42.7 o127.5 o141.2",
  "a42.5 o130.1 o141.2",
  "a42.4 o129.2 o139.2",
  "a42.4 o138.3",
  "a41.4",
  "a42.3",
  "a42.2",
  "a44.1",
];

const STEP = 2.5;
const TOP = 80;
const NORTH = 81.5;
const SOUTH = -56.5;
const W = 560;
const H = Math.round((W * (NORTH - SOUTH)) / 360);
const REGION_CODE: Record<string, WorldRegion> = { a: "americas", e: "europe", f: "africa", s: "asia", o: "oceania" };

function px(lon: number, lat: number) {
  return { x: ((lon + 180) / 360) * W, y: ((NORTH - lat) / (NORTH - SOUTH)) * H };
}

function hash(n: number) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const round = (v: number) => Math.round(v * 100) / 100;

function buildDots() {
  const dots: { x: number; y: number; region: WorldRegion; o: number }[] = [];
  LAND_ROWS.forEach((row, r) => {
    const lat = TOP - r * STEP;
    const shift = r % 2 ? STEP / 2 : 0;
    for (const run of row.split(" ").filter(Boolean)) {
      const region = REGION_CODE[run[0]];
      const [first, count] = run.slice(1).split(".").map(Number);
      for (let k = first; k < first + count; k++) {
        const { x, y } = px(-180 + STEP / 2 + shift + k * STEP, lat);
        dots.push({ x: round(x), y: round(y), region, o: round(0.55 + hash(dots.length) * 0.45) });
      }
    }
  });
  return dots;
}

const defaultCities: WorldCity[] = [
  { name: "San Francisco", lon: -122.4, lat: 37.8, region: "americas" },
  { name: "New York", lon: -74, lat: 40.7, region: "americas" },
  { name: "Toronto", lon: -79.4, lat: 43.7, region: "americas" },
  { name: "Mexico City", lon: -99.1, lat: 19.4, region: "americas" },
  { name: "Bogotá", lon: -74.1, lat: 4.7, region: "americas" },
  { name: "São Paulo", lon: -46.6, lat: -23.5, region: "americas" },
  { name: "Buenos Aires", lon: -58.4, lat: -34.6, region: "americas" },
  { name: "London", lon: -0.1, lat: 51.5, region: "europe" },
  { name: "Paris", lon: 2.3, lat: 48.9, region: "europe" },
  { name: "Berlin", lon: 13.4, lat: 52.5, region: "europe" },
  { name: "Madrid", lon: -3.7, lat: 40.4, region: "europe" },
  { name: "Stockholm", lon: 18.1, lat: 59.3, region: "europe" },
  { name: "Warsaw", lon: 21, lat: 52.2, region: "europe" },
  { name: "Lagos", lon: 3.4, lat: 6.5, region: "africa" },
  { name: "Nairobi", lon: 36.8, lat: -1.3, region: "africa" },
  { name: "Cairo", lon: 31.2, lat: 30, region: "africa" },
  { name: "Johannesburg", lon: 28, lat: -26.2, region: "africa" },
  { name: "Casablanca", lon: -7.6, lat: 33.6, region: "africa" },
  { name: "Tokyo", lon: 139.7, lat: 35.7, region: "asia" },
  { name: "Singapore", lon: 103.8, lat: 1.4, region: "asia" },
  { name: "Mumbai", lon: 72.9, lat: 19.1, region: "asia" },
  { name: "Seoul", lon: 127, lat: 37.6, region: "asia" },
  { name: "Dubai", lon: 55.3, lat: 25.2, region: "asia" },
  { name: "Shanghai", lon: 121.5, lat: 31.2, region: "asia" },
  { name: "Bengaluru", lon: 77.6, lat: 13, region: "asia" },
  { name: "Sydney", lon: 151.2, lat: -33.9, region: "oceania" },
  { name: "Melbourne", lon: 145, lat: -37.8, region: "oceania" },
  { name: "Auckland", lon: 174.8, lat: -36.8, region: "oceania" },
  { name: "Perth", lon: 115.9, lat: -31.9, region: "oceania" },
  { name: "Brisbane", lon: 153, lat: -27.5, region: "oceania" },
];

const defaultCounts: Record<WorldRegion, number> = {
  americas: 3412,
  europe: 2876,
  africa: 941,
  asia: 4128,
  oceania: 612,
};

const regions: { id: WorldRegion; label: string }[] = [
  { id: "americas", label: "Americas" },
  { id: "europe", label: "Europe" },
  { id: "africa", label: "Africa" },
  { id: "asia", label: "Asia" },
  { id: "oceania", label: "Oceania" },
];

const DotField = memo(function DotField({ region }: { region: WorldRegion }) {
  const dots = useMemo(buildDots, []);
  return (
    <g>
      {dots.map((d, i) => {
        const on = d.region === region;
        return (
          <circle
            className="transition-[fill,fill-opacity] duration-500"
            cx={d.x}
            cy={d.y}
            fill={on ? "var(--color-info)" : "var(--color-foreground)"}
            fillOpacity={on ? d.o : 0.16}
            key={i}
            r={on ? 1.35 : 1.1}
          />
        );
      })}
    </g>
  );
});

interface Pulse {
  id: number;
  city: WorldCity;
  on: boolean;
}

function RollingNumber({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 90, damping: 20 });
  const text = useTransform(spring, (v) => Math.round(v).toLocaleString("en-US"));
  useEffect(() => spring.set(value), [spring, value]);
  return <motion.span>{text}</motion.span>;
}

export function DotMap({
  region: regionProp,
  onRegionChange,
  defaultRegion = "europe",
  autoCycle = true,
  cities = defaultCities,
  counts = defaultCounts,
  title = "Live sessions",
  className,
  ...props
}: DotMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduce = useReducedMotion();
  const [inner, setInner] = useState<WorldRegion>(defaultRegion);
  const [touched, setTouched] = useState(false);
  const region = regionProp ?? inner;
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [drift, setDrift] = useState(0);
  const seq = useRef(0);
  const live = inView && !reduce;

  function pick(next: WorldRegion) {
    setTouched(true);
    setInner(next);
    onRegionChange?.(next);
  }

  useEffect(() => {
    if (!live || !autoCycle || touched || regionProp) return;
    const id = setInterval(() => {
      setInner((r) => regions[(regions.findIndex((x) => x.id === r) + 1) % regions.length].id);
    }, 6000);
    return () => clearInterval(id);
  }, [live, autoCycle, touched, regionProp]);

  useEffect(() => {
    if (!live) return;
    const local = cities.filter((c) => c.region === region);
    const away = cities.filter((c) => c.region !== region);
    const id = setInterval(() => {
      seq.current += 1;
      const n = seq.current;
      const on = local.length > 0 && (away.length === 0 || n % 3 !== 0);
      const pool = on ? local : away;
      const city = pool[Math.floor(Math.random() * pool.length)];
      if (!city) return;
      setPulses((p) => [...p.filter((x) => n - x.id < 4), { id: n, city, on }]);
      if (on) setDrift((d) => Math.max(-40, Math.min(40, d + Math.round(Math.random() * 9 - 3))));
    }, 750);
    return () => clearInterval(id);
  }, [live, region, cities]);

  useEffect(() => setDrift(0), [region]);

  const latest = [...pulses].reverse().find((p) => p.on && p.city.region === region);
  const label = regions.find((r) => r.id === region)?.label;

  return (
    <div
      className={cn("w-full max-w-[560px] overflow-hidden rounded-2xl border bg-card shadow-xs/5", className)}
      ref={ref}
      {...props}
    >
      <div className="flex items-end justify-between gap-4 px-5 pt-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <span className="relative flex size-1.5">
              {live && <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-70" />}
              <span className="relative size-1.5 rounded-full bg-success" />
            </span>
            {title}
          </p>
          <p className="mt-1 font-medium text-2xl tabular-nums tracking-tight">
            <RollingNumber value={counts[region] + drift} />
          </p>
        </div>
        <div className="relative h-5 min-w-0 flex-1 overflow-hidden text-right text-muted-foreground text-xs">
          <AnimatePresence initial={false} mode="popLayout">
            {latest && (
              <motion.p
                animate={{ y: 0, opacity: 1 }}
                className="truncate"
                exit={{ y: -14, opacity: 0 }}
                initial={{ y: 14, opacity: 0 }}
                key={latest.id}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              >
                New session in <span className="text-foreground">{latest.city.name}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-3 pt-3 pb-2">
        <svg aria-label={`Map of live sessions, ${label} highlighted`} className="block h-auto w-full" role="img" viewBox={`0 0 ${W} ${H}`}>
          <DotField region={region} />
          <AnimatePresence>
            {pulses.map((p) => {
              const { x, y } = px(p.city.lon, p.city.lat);
              const on = p.city.region === region;
              const color = on ? "var(--color-info)" : "var(--color-foreground)";
              return (
                <motion.g exit={{ opacity: 0 }} key={p.id} transition={{ duration: 0.6 }}>
                  <motion.circle
                    animate={{ scale: 1, opacity: 0 }}
                    cx={x}
                    cy={y}
                    fill="none"
                    initial={{ scale: 0.15, opacity: on ? 0.9 : 0.4 }}
                    r={on ? 16 : 10}
                    stroke={color}
                    strokeWidth={1.25}
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                    transition={{ duration: 2, ease: [0.23, 1, 0.32, 1] }}
                    vectorEffect="non-scaling-stroke"
                  />
                  <motion.circle
                    animate={{ scale: 1, opacity: on ? 1 : 0.5 }}
                    cx={x}
                    cy={y}
                    fill={color}
                    initial={{ scale: 0.5, opacity: 0 }}
                    r={on ? 2.6 : 1.8}
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                    transition={{ type: "spring", stiffness: 420, damping: 26 }}
                  />
                  {on && <circle cx={x} cy={y} fill="var(--color-info)" opacity={0.25} r={6} />}
                </motion.g>
              );
            })}
          </AnimatePresence>
        </svg>
      </div>

      <div className="flex justify-center border-t px-3 py-3">
        <SegmentedControl aria-label="Region" className="max-w-full" size="sm">
          {regions.map((r) => (
            <SegmentedControlItem
              aria-pressed={region === r.id}
              className="px-2 text-xs sm:px-2.5 sm:text-xs"
              data-pressed={region === r.id ? "" : undefined}
              key={r.id}
              onClick={() => pick(r.id)}
            >
              {r.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
    </div>
  );
}
