import { Effect } from "effect";
import { Db } from "@/server/db";
import { adminCredentials, requireAdmin, respond } from "@/server/runtime";

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);

/** Every changelog subscriber as CSV, newest first, for importing into whatever sends the email. */
export async function GET() {
  const credentials = await adminCredentials();
  return respond(
    Effect.gen(function* () {
      yield* requireAdmin(credentials);
      const db = yield* Db;
      const rows = yield* db.all<{ email: string; created_at: number; source: string }>("SELECT email, created_at, source FROM subscribers ORDER BY created_at DESC");
      const csv = ["email,subscribed_at,source", ...rows.map((r) => [r.email, new Date(r.created_at).toISOString(), r.source].map(csvCell).join(","))].join("\n");
      return new Response(`${csv}\n`, {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="devl-subscribers.csv"', "Cache-Control": "no-store" },
      });
    }),
  );
}
