import { Effect } from "effect";
import { connection } from "next/server";
import { type HouseName, HouseImages, houseSites } from "@/server/images";
import { respond } from "@/server/runtime";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  await connection();
  const { name } = await params;
  if (!(name in houseSites)) return new Response("Not found", { status: 404 });
  return respond(
    HouseImages.use((house) => house.image(name as HouseName)).pipe(
      Effect.map((image) =>
        image
          ? new Response(image.bytes, {
              headers: {
                "Content-Type": image.contentType,
                "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
                "X-Content-Type-Options": "nosniff",
              },
            })
          : new Response("No image", { status: 404, headers: { "Cache-Control": "public, max-age=600" } }),
      ),
    ),
  );
}
