import { Context, Effect, Layer, Option, Redacted } from "effect";
import { AppConfig } from "@/server/config";
import { AnalyticsUnavailable } from "@/server/errors";
import type { EventName } from "@/server/events";

/** Reads the devl_events dataset (see src/server/events.ts for its columns) through the Analytics Engine SQL API. */
export interface Count {
  key: string;
  count: number;
}

export interface UsageReport {
  days: number;
  totals: Record<EventName, number>;
  daily: { day: string; counts: Record<EventName, number> }[];
  top: Record<EventName, Count[]>;
  clients: Record<EventName, Count[]>;
  mcpClients: Count[];
  mcpItems: Count[];
  countries: Count[];
  referrers: Count[];
}

export const eventNames: EventName[] = ["install", "raw", "mcp", "llms", "skill"];

const empty = () => Object.fromEntries(eventNames.map((name) => [name, 0])) as Record<EventName, number>;
const emptyLists = () => Object.fromEntries(eventNames.map((name) => [name, [] as Count[]])) as Record<EventName, Count[]>;
const isEvent = (value: string): value is EventName => (eventNames as string[]).includes(value);

type Row = Record<string, string | number>;

export class Usage extends Context.Service<
  Usage,
  {
    /** None when CF_ACCOUNT_ID or CF_ANALYTICS_TOKEN isn't set. */
    report(days: number): Effect.Effect<Option.Option<UsageReport>, AnalyticsUnavailable>;
  }
>()("devl/server/Usage") {
  static readonly layer = Layer.effect(
    Usage,
    Effect.gen(function* () {
      const config = yield* AppConfig;

      const query = (accountId: string, token: string) =>
        Effect.fn("Usage.query")(function* (sql: string) {
          const response = yield* Effect.tryPromise({
            try: () =>
              fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: `${sql} FORMAT JSON`,
              }),
            catch: (cause) => new AnalyticsUnavailable({ message: `Analytics Engine request failed: ${String(cause)}` }),
          });
          if (!response.ok) {
            const detail = yield* Effect.promise(() => response.text().catch(() => ""));
            return yield* new AnalyticsUnavailable({ message: `Analytics Engine answered ${response.status}: ${detail.slice(0, 300)}` });
          }
          const body = yield* Effect.tryPromise({
            try: () => response.json() as Promise<{ data?: Row[] }>,
            catch: () => new AnalyticsUnavailable({ message: "Analytics Engine returned malformed JSON" }),
          });
          return body.data ?? [];
        });

      return Usage.of({
        report: Effect.fn("Usage.report")(function* (days: number) {
          const accountId = Option.getOrElse(config.cfAccountId, () => "").trim();
          const token = Option.match(config.analyticsToken, { onNone: () => "", onSome: Redacted.value }).trim();
          if (!accountId || !token) return Option.none();
          const run = query(accountId, token);
          const where = `WHERE timestamp > NOW() - INTERVAL '${Math.round(days)}' DAY AND double2 < 400`;
          const n = "SUM(_sample_interval) AS n";
          const [byDay, bySubject, byClient, mcpClients, mcpItems, countries, referrers] = yield* Effect.all(
            [
              run(`SELECT toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day, blob1 AS event, ${n} FROM devl_events ${where} GROUP BY day, event ORDER BY day`),
              run(`SELECT blob1 AS event, blob2 AS key, ${n} FROM devl_events ${where} GROUP BY event, key ORDER BY n DESC LIMIT 400`),
              run(`SELECT blob1 AS event, blob4 AS key, ${n} FROM devl_events ${where} GROUP BY event, key ORDER BY n DESC`),
              run(`SELECT blob3 AS key, ${n} FROM devl_events ${where} AND blob1 = 'mcp' AND blob2 = 'initialize' GROUP BY key ORDER BY n DESC LIMIT 20`),
              run(`SELECT blob3 AS key, ${n} FROM devl_events ${where} AND blob1 = 'mcp' AND blob2 = 'get_item' GROUP BY key ORDER BY n DESC LIMIT 20`),
              run(`SELECT blob5 AS key, ${n} FROM devl_events ${where} GROUP BY key ORDER BY n DESC LIMIT 15`),
              run(`SELECT blob6 AS key, ${n} FROM devl_events ${where} AND blob6 != '' GROUP BY key ORDER BY n DESC LIMIT 15`),
            ],
            { concurrency: "unbounded" },
          );

          const count = (row: Row) => Number(row.n) || 0;
          const list = (rows: Row[]) => rows.map((row) => ({ key: String(row.key || "(none)"), count: count(row) }));
          const grouped = (rows: Row[], limit: number) => {
            const out = emptyLists();
            for (const row of rows) {
              const event = String(row.event);
              if (isEvent(event) && out[event].length < limit) out[event].push({ key: String(row.key || "(none)"), count: count(row) });
            }
            return out;
          };

          const totals = empty();
          const daily = new Map<string, Record<EventName, number>>();
          for (const row of byDay) {
            const event = String(row.event);
            if (!isEvent(event)) continue;
            const day = String(row.day).slice(0, 10);
            const counts = daily.get(day) ?? empty();
            counts[event] += count(row);
            totals[event] += count(row);
            daily.set(day, counts);
          }

          return Option.some({
            days,
            totals,
            daily: [...daily].map(([day, counts]) => ({ day, counts })),
            top: grouped(bySubject, 20),
            clients: grouped(byClient, 8),
            mcpClients: list(mcpClients),
            mcpItems: list(mcpItems),
            countries: list(countries),
            referrers: list(referrers),
          });
        }),
      });
    }),
  );
}
