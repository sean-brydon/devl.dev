export const placementIds = [
  "grid:component",
  "grid:block",
  "grid:screen",
  "grid:motion",
  "grid:illustration",
  "item",
] as const;

export type PlacementId = (typeof placementIds)[number];

export interface Placement {
  id: PlacementId;
  label: string;
  where: string;
  priceCents: number;
  format: "tile" | "card";
}

export const placements: Record<PlacementId, Placement> = {
  "grid:component": { id: "grid:component", label: "Components grid", where: "Third tile on the home page and /components", priceCents: 27900, format: "tile" },
  "grid:block": { id: "grid:block", label: "Blocks grid", where: "Third tile on /blocks", priceCents: 17900, format: "tile" },
  "grid:screen": { id: "grid:screen", label: "Screens grid", where: "Third tile on /screens", priceCents: 17900, format: "tile" },
  "grid:motion": { id: "grid:motion", label: "Motion grid", where: "Third tile on /motion", priceCents: 17900, format: "tile" },
  "grid:illustration": { id: "grid:illustration", label: "Illustrations grid", where: "Third tile on /illustrations", priceCents: 17900, format: "tile" },
  item: { id: "item", label: "Every item page", where: "Strip under the live preview on every detail page", priceCents: 36900, format: "card" },
};

export const PERIOD_EPOCH = "2026-01-05";
export const PERIOD_DAYS = 14;
export const PERIODS_AHEAD = 6;
export const HOLD_MINUTES = 30;
export const PITCH_MAX = 80;

export function gridPlacement(kind: string): PlacementId | null {
  const id = `grid:${kind}`;
  return (placementIds as readonly string[]).includes(id) ? (id as PlacementId) : null;
}

export function isPlacementId(value: string): value is PlacementId {
  return (placementIds as readonly string[]).includes(value);
}

export const accents = [
  { id: "lime", label: "Lime", bg: "oklch(0.9 0.19 124)", fg: "oklch(0.27 0.06 130)" },
  { id: "sky", label: "Sky", bg: "oklch(0.82 0.11 230)", fg: "oklch(0.28 0.07 245)" },
  { id: "violet", label: "Violet", bg: "oklch(0.62 0.2 290)", fg: "oklch(0.98 0.01 290)" },
  { id: "rose", label: "Rose", bg: "oklch(0.7 0.19 10)", fg: "oklch(0.99 0.01 10)" },
  { id: "amber", label: "Amber", bg: "oklch(0.84 0.16 75)", fg: "oklch(0.3 0.07 60)" },
  { id: "teal", label: "Teal", bg: "oklch(0.7 0.12 185)", fg: "oklch(0.2 0.04 190)" },
  { id: "ink", label: "Ink", bg: "oklch(0.25 0.01 260)", fg: "oklch(0.97 0 0)" },
] as const;

export type AccentId = (typeof accents)[number]["id"];

export const accentIds = accents.map((a) => a.id) as unknown as readonly [AccentId, ...AccentId[]];

export function accentOf(id: string) {
  return accents.find((a) => a.id === id) ?? accents[0];
}

export function monogramOf(name: string, monogram?: string | null) {
  const source = monogram?.trim() || name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2);
  return (source || "··").slice(0, 2).toUpperCase();
}

export const PRICE_UNIT = "/2wk";

export function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

const DAY = 86_400_000;
const EPOCH_MS = Date.parse(`${PERIOD_EPOCH}T00:00:00Z`);

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Start (Monday 00:00 UTC) of the fortnight containing `at`; fortnights are aligned to PERIOD_EPOCH so they never overlap. */
export function periodStartOf(at: number | Date) {
  const index = Math.floor((new Date(at).getTime() - EPOCH_MS) / (PERIOD_DAYS * DAY));
  return isoDay(EPOCH_MS + index * PERIOD_DAYS * DAY);
}

export function addPeriods(periodStart: string, periods: number) {
  return isoDay(Date.parse(`${periodStart}T00:00:00Z`) + periods * PERIOD_DAYS * DAY);
}

export function isPeriodStart(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && periodStartOf(Date.parse(`${value}T00:00:00Z`)) === value;
}

/** The next PERIODS_AHEAD fortnights after the one running now. */
export function bookablePeriods(now = Date.now()) {
  const current = periodStartOf(now);
  return Array.from({ length: PERIODS_AHEAD }, (_, i) => addPeriods(current, i + 1));
}

export function periodEnd(periodStart: string) {
  return isoDay(Date.parse(`${periodStart}T00:00:00Z`) + (PERIOD_DAYS - 1) * DAY);
}

export function formatPeriod(periodStart: string, short = false) {
  const start = new Date(`${periodStart}T00:00:00Z`);
  const end = new Date(`${periodEnd(periodStart)}T00:00:00Z`);
  const fmt = (d: Date, withMonth: boolean) =>
    d.toLocaleDateString("en-US", { timeZone: "UTC", day: "numeric", ...(withMonth ? { month: "short" } : {}) });
  if (short) return fmt(start, true);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  return `${fmt(start, true)} – ${sameMonth ? fmt(end, false) : fmt(end, true)}`;
}

/** Every UTC day of a period, YYYY-MM-DD. */
export function periodDays(periodStart: string) {
  const start = Date.parse(`${periodStart}T00:00:00Z`);
  return Array.from({ length: PERIOD_DAYS }, (_, i) => isoDay(start + i * DAY));
}

export type BookingStatus = "holding" | "in_review" | "scheduled" | "refunded" | "expired";

export interface SponsorCreative {
  productName: string;
  pitch: string;
  url: string;
  accent: AccentId;
  monogram: string | null;
}

export interface LiveSponsor extends SponsorCreative {
  bookingId: string;
  periodStart: string;
  image: string | null;
}

export const IMAGE_PREFIX = "sponsors/";

export function imageUrl(key: string | null) {
  return key?.startsWith(IMAGE_PREFIX) ? `/api/sponsors/image/${key.slice(IMAGE_PREFIX.length)}` : null;
}

export function campaignOf(placement: PlacementId) {
  return placement.replace(":", "-");
}
