import { Context, Effect, Layer } from "effect";
import { isPlacementId, periodDays, periodStartOf } from "@/lib/sponsors";
import type { Booking } from "@/server/bookings";
import { Db } from "@/server/db";
import type { DbError } from "@/server/errors";

export type EventKind = "impression" | "click";

export interface AdEvent {
  bookingId: string;
  placement: string;
  content: string;
}

export interface DailyStat {
  day: string;
  impressions: number;
  clicks: number;
}

export interface BookingStats {
  impressions: number;
  clicks: number;
  ctr: number;
  days: DailyStat[];
  byContent: { content: string; impressions: number; clicks: number }[];
}

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|headless|lighthouse|pagespeed|curl|wget|python|httpclient|axios|node-fetch|go-http/i;

export function isBot(userAgent: string | null) {
  return !userAgent || BOT_UA.test(userAgent);
}

export function cleanContent(content: string | null | undefined) {
  const value = (content ?? "").trim().slice(0, 120);
  return /^[\w\-./:]+$/.test(value) ? value : "other";
}

const emptyStats = (days: string[]): BookingStats => ({
  impressions: 0,
  clicks: 0,
  ctr: 0,
  days: days.map((day) => ({ day, impressions: 0, clicks: 0 })),
  byContent: [],
});

export class Stats extends Context.Service<
  Stats,
  {
    record(kind: EventKind, events: AdEvent[]): Effect.Effect<number, DbError>;
    forBookings(bookings: Booking[]): Effect.Effect<Record<string, BookingStats>, DbError>;
  }
>()("devl/server/Stats") {
  static readonly layer = Layer.effect(
    Stats,
    Effect.gen(function* () {
      const db = yield* Db;

      const record = Effect.fn("Stats.record")(function* (kind: EventKind, events: AdEvent[]) {
        const now = Date.now();
        const day = new Date(now).toISOString().slice(0, 10);
        const current = periodStartOf(now);
        const live = new Map<string, string | null>();
        let recorded = 0;
        for (const event of events.slice(0, 20)) {
          if (!live.has(event.bookingId)) {
            const row = yield* db.first<{ placement_id: string }>(
              "SELECT placement_id FROM bookings WHERE id = ? AND status = 'scheduled' AND period_start = ?",
              event.bookingId,
              current,
            );
            live.set(event.bookingId, row?.placement_id ?? null);
          }
          const placement = live.get(event.bookingId);
          // Only live, approved bookings count, and only in the slot they bought.
          if (!placement || !isPlacementId(event.placement) || event.placement !== placement) continue;
          yield* db
            .run(
              `INSERT INTO sponsor_events (booking_id, kind, placement, content, day, count) VALUES (?1, ?2, ?3, ?4, ?5, 1)
               ON CONFLICT (booking_id, kind, placement, content, day) DO UPDATE SET count = count + 1`,
              event.bookingId,
              kind,
              placement,
              cleanContent(event.content),
              day,
            )
            .pipe(Effect.catchTag("UniqueViolation", (e) => Effect.die(e)));
          recorded++;
        }
        return recorded;
      });

      const forBookings = Effect.fn("Stats.forBookings")(function* (bookings: Booking[]) {
        const single = bookings.length === 1 ? bookings[0].id : null;
        const rows = yield* db.all<{ booking_id: string; kind: EventKind; content: string; day: string; total: number }>(
          `SELECT booking_id, kind, content, day, SUM(count) AS total FROM sponsor_events
           ${single ? "WHERE booking_id = ?" : ""} GROUP BY booking_id, kind, content, day`,
          ...(single ? [single] : []),
        );
        const out: Record<string, BookingStats> = {};
        for (const booking of bookings) out[booking.id] = emptyStats(periodDays(booking.periodStart));
        for (const row of rows) {
          const stats = out[row.booking_id];
          if (!stats) continue;
          const key = row.kind === "impression" ? "impressions" : "clicks";
          stats[key] += row.total;
          const day = stats.days.find((d) => d.day === row.day);
          if (day) day[key] += row.total;
          let content = stats.byContent.find((c) => c.content === row.content);
          if (!content) stats.byContent.push((content = { content: row.content, impressions: 0, clicks: 0 }));
          content[key] += row.total;
        }
        for (const stats of Object.values(out)) {
          stats.ctr = stats.impressions > 0 ? stats.clicks / stats.impressions : 0;
          stats.byContent.sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks);
        }
        return out;
      });

      return Stats.of({ record, forBookings });
    }),
  );
}
