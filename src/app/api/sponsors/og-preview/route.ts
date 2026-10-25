import { Effect } from "effect";
import { connection } from "next/server";
import { OgFetcher } from "@/server/og";
import { rateLimit } from "@/server/rate-limit";
import { respond } from "@/server/runtime";

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url).searchParams.get("url") ?? "";
  return respond(
    Effect.gen(function* () {
      yield* rateLimit(request, "og-preview", 20, 60_000);
      const image = yield* OgFetcher.use((og) => og.image(url));
      return new Response(image.bytes.slice().buffer as ArrayBuffer, {
        headers: {
          "Content-Type": image.contentType,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "X-Og-Source": image.source,
        },
      });
    }),
  );
}
