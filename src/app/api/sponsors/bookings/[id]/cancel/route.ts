import { Effect } from "effect";
import { Bookings, publicBooking } from "@/server/bookings";
import { respond } from "@/server/runtime";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return respond(
    Bookings.use((bookings) => bookings.release(id)).pipe(
      Effect.map((booking) => Response.json({ booking: publicBooking(booking) })),
    ),
  );
}
