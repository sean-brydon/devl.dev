import { Effect } from "effect";
import { connection } from "next/server";
import { isPlacementId } from "@/lib/sponsors";
import { respond } from "@/server/runtime";
import { Sponsors } from "@/server/sponsors";

export async function GET(_request: Request, { params }: { params: Promise<{ placement: string }> }) {
  await connection();
  const placement = decodeURIComponent((await params).placement);
  if (!isPlacementId(placement)) return Response.json({ error: "NotFound", message: "Unknown placement" }, { status: 404 });

  return respond(
    Sponsors.use((sponsors) => sponsors.live(placement)).pipe(
      Effect.map((sponsor) =>
        Response.json(
          { placement, sponsor },
          { headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=600" } },
        ),
      ),
    ),
  );
}
