import { Effect } from "effect";
import { Db } from "@/server/db";
import { RateLimited } from "@/server/errors";

const windows = new Map<string, { count: number; resetAt: number }>();

/** Per-isolate fixed window; good enough to stop a page from being used as a free fetch proxy. */
export function rateLimit(request: Request, bucket: string, limit: number, windowMs: number) {
  return Effect.suspend(() => {
    const key = `${bucket}:${clientIp(request)}`;
    const now = Date.now();
    const current = windows.get(key);
    if (!current || current.resetAt < now) {
      if (windows.size > 5_000) for (const [k, v] of windows) if (v.resetAt < now) windows.delete(k);
      windows.set(key, { count: 1, resetAt: now + windowMs });
      return Effect.void;
    }
    current.count++;
    return current.count > limit
      ? Effect.fail(new RateLimited({ message: "Slow down a little — try again in a minute." }))
      : Effect.void;
  });
}

export function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/** Fixed window in D1, so the limit holds across every isolate and location. */
export const durableLimit = Effect.fn("durableLimit")(function* (bucket: string, limit: number, windowMs: number) {
  const db = yield* Db;
  const now = Date.now();
  const row = yield* db.first<{ count: number }>(
    `INSERT INTO admin_login_attempts (bucket, window_start, count) VALUES (?1, ?2, 1)
     ON CONFLICT (bucket) DO UPDATE SET
       count = CASE WHEN window_start <= ?2 - ?3 THEN 1 ELSE count + 1 END,
       window_start = CASE WHEN window_start <= ?2 - ?3 THEN ?2 ELSE window_start END
     RETURNING count`,
    bucket,
    now,
    windowMs,
  );
  if ((row?.count ?? 0) > limit) return yield* new RateLimited({ message: "Too many sign-in attempts. Try again in 15 minutes." });
});
