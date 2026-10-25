import { Effect } from "effect";
import { connection } from "next/server";
import { campaignOf, isPlacementId } from "@/lib/sponsors";
import { withUtm } from "@/lib/utm";
import { Bookings } from "@/server/bookings";
import { respond } from "@/server/runtime";
import { cleanContent, isBot, Stats } from "@/server/stats";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const query = new URL(request.url).searchParams;
  const bot = isBot(request.headers.get("user-agent"));

  return respond(
    Effect.gen(function* () {
      const booking = yield* Bookings.use((b) => b.get(id));
      const p = query.get("p") ?? "";
      const placement = isPlacementId(p) ? p : booking.placementId;
      const content = cleanContent(query.get("c"));
      if (!bot) yield* Effect.ignore(Stats.use((s) => s.record("click", [{ bookingId: booking.id, placement, content }])));
      const destination = withUtm(booking.url, { medium: "sponsored", campaign: campaignOf(placement), content }) ?? booking.url;
      return new Response(null, {
        status: 302,
        headers: { Location: destination, "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
      });
    }).pipe(Effect.catchTag("BookingNotFound", () => Effect.succeed(Response.redirect(new URL("/advertise", request.url), 302)))),
  );
}
