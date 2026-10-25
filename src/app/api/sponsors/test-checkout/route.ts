import { Effect } from "effect";
import { Bookings, publicBooking } from "@/server/bookings";
import { NotAvailable } from "@/server/errors";
import { Payments } from "@/server/payments";
import { respond } from "@/server/runtime";
import { decodeBody, TestCheckoutRequest } from "@/server/schemas";

const decode = decodeBody(TestCheckoutRequest);

export async function POST(request: Request) {
  return respond(
    Effect.gen(function* () {
      const payments = yield* Payments;
      if (payments.mode !== "test") return yield* new NotAvailable({ message: payments.mode === "stripe" ? "Test checkout is off while Stripe is configured." : "Test checkout is off." });
      const { bookingId, outcome } = yield* decode(request);
      const bookings = yield* Bookings;
      const booking =
        outcome === "paid" ? yield* bookings.markPaid(bookingId, `test_pi_${bookingId}`) : yield* bookings.release(bookingId);
      return Response.json({ booking: publicBooking(booking) });
    }),
  );
}
