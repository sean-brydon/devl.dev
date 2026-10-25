import { Effect } from "effect";
import { RateLimited } from "@/server/errors";

const windows = new Map<string, { count: number; resetAt: number }>();

/** Per-isolate fixed window; good enough to stop a page from being used as a free fetch proxy. */
export function rateLimit(request: Request, bucket: string, limit: number, windowMs: number) {
  return Effect.suspend(() => {
    const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const key = `${bucket}:${ip}`;
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
