import { Effect, Schema } from "effect";
import { InvalidRequest } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { respond } from "@/server/runtime";
import { isBot, Stats } from "@/server/stats";

const Batch = Schema.Struct({
  events: Schema.Array(Schema.Struct({ b: Schema.String, p: Schema.String, c: Schema.String })).check(Schema.isMaxLength(20)),
});
const decode = Schema.decodeUnknownEffect(Batch);

export async function POST(request: Request) {
  if (isBot(request.headers.get("user-agent"))) return new Response(null, { status: 204 });
  return respond(
    Effect.gen(function* () {
      yield* rateLimit(request, "impressions", 60, 60_000);
      const text = yield* Effect.tryPromise({ try: () => request.text(), catch: () => new InvalidRequest({ message: "Unreadable body" }) });
      if (text.length > 8_000) return yield* new InvalidRequest({ message: "Batch too large" });
      const body = yield* Effect.try({ try: () => JSON.parse(text) as unknown, catch: () => new InvalidRequest({ message: "Expected JSON" }) });
      const { events } = yield* decode(body).pipe(Effect.mapError(() => new InvalidRequest({ message: "Malformed batch" })));
      yield* Stats.use((s) => s.record("impression", events.map((e) => ({ bookingId: e.b, placement: e.p, content: e.c }))));
      return new Response(null, { status: 204 });
    }),
  );
}
