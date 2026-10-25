import { Effect } from "effect";
import { Bookings } from "@/server/bookings";
import { Payments } from "@/server/payments";
import { respond } from "@/server/runtime";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  return respond(
    Effect.gen(function* () {
      const event = yield* Payments.use((payments) => payments.verifyWebhook(payload, signature));
      const bookings = yield* Bookings;
      const session = event.data.object;
      const bookingId = session.client_reference_id;

      if (bookingId) {
        const paid =
          (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") &&
          session.payment_status === "paid" &&
          session.payment_intent;
        if (paid) yield* bookings.markPaid(bookingId, paid);
        if (event.type === "checkout.session.expired") yield* bookings.release(bookingId);
      }

      return Response.json({ received: true });
    }).pipe(Effect.catchTag("BookingNotFound", () => Effect.succeed(Response.json({ received: true, ignored: true })))),
  );
}
