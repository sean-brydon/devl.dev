import { type CodeFile, CodeBlock } from "@/registry/items/code-block/code-block";

const previous = `import { Ratelimit } from "@/lib/ratelimit";

const limiter = new Ratelimit({ window: "1m", max: 60 });

export async function guard(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const { ok } = await limiter.check(ip);
  if (!ok) return new Response("Too many requests", { status: 429 });
}`;

const current = `import { Ratelimit } from "@/lib/ratelimit";

const limiter = new Ratelimit({ window: "1m", max: 120 });

export async function guard(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const { ok, reset } = await limiter.check(ip);
  if (!ok) {
    const retry = Math.ceil((reset - Date.now()) / 1000);
    return Response.json({ error: "rate_limited", retry }, { status: 429 });
  }
}`;

const route = `import { guard } from "./rate-limit";
import { db } from "@/lib/db";

// POST /api/invoices — create a draft invoice for a customer
export async function POST(req: Request) {
  const blocked = await guard(req);
  if (blocked) return blocked;

  const body = await req.json();
  if (!body.customerId) {
    return Response.json({ error: "customerId is required" }, { status: 400 });
  }

  const invoice = await db.invoice.create({
    data: {
      customerId: body.customerId,
      currency: body.currency ?? "EUR",
      lines: body.lines ?? [],
      status: "draft",
    },
  });

  return Response.json(invoice, { status: 201 });
}`;

const pkg = `{
  "name": "@northwind/billing-api",
  "version": "2.4.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 4100",
    "test": "vitest run"
  },
  "engines": { "node": ">=22" }
}`;

const files: CodeFile[] = [
  { name: "route.ts", code: route, highlight: [[6, 7]] },
  { name: "rate-limit.ts", code: current, previous },
  { name: "package.json", code: pkg },
];

export default function CodeBlockDemo() {
  return <CodeBlock className="w-[540px] max-w-full" files={files} />;
}
