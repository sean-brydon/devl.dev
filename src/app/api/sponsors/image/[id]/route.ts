import { Effect } from "effect";
import { connection } from "next/server";
import { ImageStore } from "@/server/images";
import { respond } from "@/server/runtime";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}-[0-9a-z]+$/.test(id)) return new Response("Not found", { status: 404 });
  return respond(
    ImageStore.use((store) => store.get(`sponsors/${id}`)).pipe(
      Effect.map((image) =>
        image
          ? new Response(image.bytes, {
              headers: {
                "Content-Type": image.contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
                "X-Content-Type-Options": "nosniff",
                "Content-Security-Policy": "default-src 'none'",
              },
            })
          : new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } }),
      ),
    ),
  );
}
