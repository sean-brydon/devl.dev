import { Context, Effect, Layer } from "effect";
import { bookablePeriods, type PlacementId, placementIds, placements } from "@/lib/sponsors";
import { Bookings } from "@/server/bookings";
import { Db } from "@/server/db";
import type { DbError } from "@/server/errors";

export interface PlacementInventory {
  placement: PlacementId;
  priceCents: number;
  periods: { periodStart: string; free: boolean }[];
}

export class Inventory extends Context.Service<
  Inventory,
  { readonly all: Effect.Effect<PlacementInventory[], DbError> }
>()("devl/server/Inventory") {
  static readonly layer = Layer.effect(
    Inventory,
    Effect.gen(function* () {
      const db = yield* Db;
      const bookings = yield* Bookings;

      const all = Effect.gen(function* () {
        yield* bookings.expireStale;
        const periods = bookablePeriods();
        const taken = yield* db.all<{ placement_id: string; period_start: string }>(
          `SELECT placement_id, period_start FROM bookings
           WHERE status IN ('holding', 'in_review', 'scheduled') AND period_start BETWEEN ? AND ?`,
          periods[0],
          periods[periods.length - 1],
        );
        const claimed = new Set(taken.map((t) => `${t.placement_id}|${t.period_start}`));
        return placementIds.map((placement) => ({
          placement,
          priceCents: placements[placement].priceCents,
          periods: periods.map((periodStart) => ({ periodStart, free: !claimed.has(`${placement}|${periodStart}`) })),
        }));
      }).pipe(Effect.withSpan("Inventory.all"));

      return Inventory.of({ all });
    }),
  );
}
