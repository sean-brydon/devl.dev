import { Effect } from "effect";
import { Db } from "@/server/db";
import { InvalidRequest } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { respond } from "@/server/runtime";

const email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// The same 204 for new and existing addresses, so the form can't be used to check who has signed up.
export async function POST(request: Request) {
  return respond(
    Effect.gen(function* () {
      yield* rateLimit(request, "subscribe", 5, 60_000);
      const body = yield* Effect.tryPromise({
        try: () => request.json() as Promise<{ email?: unknown; source?: unknown; website?: unknown }>,
        catch: () => new InvalidRequest({ message: "Expected JSON" }),
      });
      if (body.website) return new Response(null, { status: 204 });
      const address = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (address.length > 254 || !email.test(address)) return yield* new InvalidRequest({ message: "That doesn't look like an email address." });
      const source = body.source === "landing" ? "landing" : "changelog";
      const db = yield* Db;
      yield* db
        .run("INSERT INTO subscribers (email, created_at, source) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING", address, Date.now(), source)
        .pipe(Effect.catchTag("UniqueViolation", () => Effect.succeed(0)));
      return new Response(null, { status: 204 });
    }),
  );
}
