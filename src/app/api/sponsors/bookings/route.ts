import { Effect, Option } from "effect";
import { Bookings } from "@/server/bookings";
import { AppConfig } from "@/server/config";
import { NotAvailable } from "@/server/errors";
import { Payments } from "@/server/payments";
import { respond } from "@/server/runtime";
import { BookingRequest, decodeBody } from "@/server/schemas";

const decode = decodeBody(BookingRequest);

export async function POST(request: Request) {
  return respond(
    Effect.gen(function* () {
      const payments = yield* Payments;
      if (payments.mode === "off") return yield* new NotAvailable({ message: "Sponsor bookings open soon." });
      const input = yield* decode(request);
      const bookings = yield* Bookings;
      const config = yield* AppConfig;
      const siteUrl = Option.getOrElse(config.siteUrl, () => new URL(request.url).origin);

      let booking = yield* bookings.createHold(input);
      if (input.useImage !== false) booking = yield* bookings.snapshotImage(booking.id).pipe(Effect.orElseSucceed(() => booking));
      const checkout = yield* payments
        .createCheckout(booking, siteUrl)
        .pipe(Effect.tapError(() => Effect.ignore(bookings.release(booking.id))));
      yield* bookings.attachSession(booking.id, checkout.sessionId);

      return Response.json({ bookingId: booking.id, url: checkout.url, mode: payments.mode }, { status: 201 });
    }),
  );
}
