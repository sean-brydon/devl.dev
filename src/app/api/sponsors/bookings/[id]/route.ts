import { Effect, Option } from "effect";
import { connection } from "next/server";
import { Bookings, publicBooking } from "@/server/bookings";
import { Payments } from "@/server/payments";
import { respond } from "@/server/runtime";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const sessionId = new URL(request.url).searchParams.get("session_id");

  return respond(
    Effect.gen(function* () {
      const bookings = yield* Bookings;
      const payments = yield* Payments;
      let booking = yield* bookings.get(id);

      // The webhook can lag behind the redirect; confirm straight from Stripe so the page shows the truth.
      if ((booking.status === "holding" || booking.status === "expired") && sessionId && sessionId === booking.stripeSessionId) {
        const paid = yield* payments.paidSession(sessionId);
        if (Option.isSome(paid)) booking = yield* bookings.markPaid(id, paid.value.paymentIntentId);
      }

      return Response.json({ booking: publicBooking(booking), mode: payments.mode }, { headers: { "Cache-Control": "no-store" } });
    }),
  );
}
