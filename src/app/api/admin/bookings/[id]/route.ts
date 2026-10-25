import { Effect } from "effect";
import { cookies } from "next/headers";
import { Bookings, publicBooking } from "@/server/bookings";
import { ADMIN_COOKIE, requireAdmin, respond } from "@/server/runtime";
import { AdminActionRequest, decodeBody } from "@/server/schemas";

const decode = decodeBody(AdminActionRequest);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  return respond(
    Effect.gen(function* () {
      yield* requireAdmin(session);
      const { action } = yield* decode(request);
      const bookings = yield* Bookings;
      const booking =
        action === "approve"
          ? yield* bookings.approve(id)
          : action === "reject"
            ? yield* bookings.reject(id)
            : action === "refetch-image"
              ? yield* bookings.snapshotImage(id)
              : yield* bookings.declineImage(id);
      return Response.json({ booking: publicBooking(booking) });
    }),
  );
}
