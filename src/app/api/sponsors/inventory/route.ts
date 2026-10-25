import { Effect } from "effect";
import { connection } from "next/server";
import { Inventory } from "@/server/inventory";
import { respond } from "@/server/runtime";

export async function GET() {
  await connection();
  return respond(
    Inventory.use((inventory) => inventory.all).pipe(
      Effect.map((placements) => Response.json({ placements }, { headers: { "Cache-Control": "no-store" } })),
    ),
  );
}
