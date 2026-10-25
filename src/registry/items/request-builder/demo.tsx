"use client";

import { type BuiltRequest, RequestBuilder, type ResponseData } from "@/registry/items/request-builder/request-builder";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function mockApi(req: BuiltRequest): Promise<ResponseData> {
  await wait(140 + Math.random() * 320);
  const base = { "content-type": "application/json; charset=utf-8", "x-request-id": `req_${Math.random().toString(36).slice(2, 10)}` };
  if (req.url.includes(":id")) {
    return { status: 400, headers: base, body: { error: "missing_param", message: "Path param :id is required" } };
  }
  if (!req.headers.Authorization) {
    return { status: 401, headers: base, body: { error: "unauthorized", message: "Missing bearer token" } };
  }
  if (req.method === "DELETE") return { status: 204, headers: { "x-request-id": base["x-request-id"] } };
  if (req.method !== "GET") {
    const input = req.body ? JSON.parse(req.body) : {};
    return { status: 201, headers: { ...base, location: "/v1/deployments/dpl_8Qm2" }, body: { id: "dpl_8Qm2", state: "queued", ...input } };
  }
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 3);
  const all = [
    { id: "dpl_7Hx2", branch: "main", state: "ready", commit: "a1f9c2e", duration_s: 48 },
    { id: "dpl_7Gv9", branch: "feat/annual-billing", state: "error", commit: "3be07d1", duration_s: 31 },
    { id: "dpl_7Ft4", branch: "main", state: "ready", commit: "9c41f0a", duration_s: 52 },
    { id: "dpl_7Ek1", branch: "fix/rate-limit", state: "ready", commit: "e20b6c3", duration_s: 45 },
  ];
  return {
    status: 200,
    headers: { ...base, "x-ratelimit-remaining": "118", "cache-control": "no-store" },
    body: { data: all.slice(0, limit), has_more: limit < all.length },
  };
}

export default function RequestBuilderDemo() {
  return (
    <RequestBuilder
      defaultBody={'{\n  "branch": "main",\n  "target": "production"\n}'}
      defaultHeaders={[
        { key: "Authorization", value: "Bearer sk_test_4eC39Hq", enabled: true },
        { key: "Accept", value: "application/json", enabled: true },
        { key: "X-Debug", value: "1", enabled: false },
      ]}
      defaultParams={{ id: "prj_northwind" }}
      defaultUrl="https://api.northwind.dev/projects/:id/deploys?limit=3"
      onSend={mockApi}
    />
  );
}
