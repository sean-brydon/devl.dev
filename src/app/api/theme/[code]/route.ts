import { connection } from "next/server";
import { decodeTheme, themeRegistryItem } from "@/lib/custom-theme";

// A shadcn registry:theme for a customiser theme, so `npx shadcn add https://devl.dev/api/theme/<code>.json` installs it.
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  await connection();
  const theme = decodeTheme((await params).code.replace(/\.json$/, ""));
  if (!theme) return new Response("Not found", { status: 404 });
  return Response.json(themeRegistryItem(theme), {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=31536000, immutable", "Access-Control-Allow-Origin": "*" },
  });
}
