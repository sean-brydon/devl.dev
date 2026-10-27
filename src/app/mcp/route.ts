import { handleMcp } from "@/server/mcp";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => undefined);
  if (body === undefined) {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers: cors });
  }
  const reply = await handleMcp(body, new URL(request.url).origin);
  if (reply === null) return new Response(null, { status: 202, headers: cors });
  return Response.json(reply, { headers: cors });
}

export function GET() {
  return new Response("devl MCP server. Connect with: claude mcp add --transport http devl https://devl.dev/mcp", {
    status: 405,
    headers: { ...cors, Allow: "POST, OPTIONS", "Content-Type": "text/plain; charset=utf-8" },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}
