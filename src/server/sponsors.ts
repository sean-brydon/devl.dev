import { Context, Effect, Layer } from "effect";
import { type AccentId, type LiveSponsor, type PlacementId, periodStartOf } from "@/lib/sponsors";
import { imageUrl } from "@/server/bookings";
import { Db } from "@/server/db";
import type { DbError } from "@/server/errors";

export class Sponsors extends Context.Service<
  Sponsors,
  { live(placement: PlacementId, at?: number): Effect.Effect<LiveSponsor | null, DbError> }
>()("devl/server/Sponsors") {
  static readonly layer = Layer.effect(
    Sponsors,
    Effect.gen(function* () {
      const db = yield* Db;

      const live = Effect.fn("Sponsors.live")(function* (placement: PlacementId, at = Date.now()) {
        const row = yield* db.first<{
          id: string;
          period_start: string;
          product_name: string;
          pitch: string;
          url: string;
          accent: AccentId;
          monogram: string | null;
          og_image_key: string | null;
        }>(
          `SELECT id, period_start, product_name, pitch, url, accent, monogram, og_image_key FROM bookings
           WHERE placement_id = ? AND period_start = ? AND status = 'scheduled' LIMIT 1`,
          placement,
          periodStartOf(at),
        );
        return row
          ? {
              bookingId: row.id,
              periodStart: row.period_start,
              productName: row.product_name,
              pitch: row.pitch,
              url: row.url,
              accent: row.accent,
              monogram: row.monogram,
              image: imageUrl(row.og_image_key),
            }
          : null;
      });

      return Sponsors.of({ live });
    }),
  );
}
