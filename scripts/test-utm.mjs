import assert from "node:assert/strict";
import { test } from "node:test";
import { withUtm } from "../src/lib/utm.ts";

const ctx = { medium: "sponsored", campaign: "grid-component", content: "/components" };

test("adds all tags to a bare URL", () => {
  assert.equal(
    withUtm("https://acme.dev", ctx),
    "https://acme.dev/?utm_source=devl.dev&utm_medium=sponsored&utm_campaign=grid-component&utm_content=%2Fcomponents",
  );
});

test("keeps existing query params untouched", () => {
  const out = withUtm("https://acme.dev/pricing?plan=pro&q=a%20b", ctx);
  assert.ok(out.startsWith("https://acme.dev/pricing?plan=pro&q=a%20b&utm_source=devl.dev"));
});

test("never overwrites an advertiser's utm_*", () => {
  const out = new URL(withUtm("https://acme.dev/?utm_source=newsletter&utm_campaign=fall", ctx));
  assert.equal(out.searchParams.get("utm_source"), "newsletter");
  assert.equal(out.searchParams.get("utm_campaign"), "fall");
  assert.equal(out.searchParams.get("utm_medium"), "sponsored");
  assert.equal(out.searchParams.getAll("utm_source").length, 1);
});

test("preserves the fragment", () => {
  const out = withUtm("https://acme.dev/docs?x=1#install", { ...ctx, medium: "referral", content: "access-pass" });
  assert.equal(out, "https://acme.dev/docs?x=1&utm_source=devl.dev&utm_medium=referral&utm_campaign=grid-component&utm_content=access-pass#install");
});

test("returns the URL unchanged when every tag is already present", () => {
  const url = "https://acme.dev/?utm_source=a&utm_medium=b&utm_campaign=c&utm_content=d";
  assert.equal(withUtm(url, ctx), url);
});

test("rejects malformed and non-http URLs", () => {
  assert.equal(withUtm("not a url", ctx), null);
  assert.equal(withUtm("javascript:alert(1)", ctx), null);
  assert.equal(withUtm("mailto:hi@acme.dev", ctx), null);
  assert.equal(withUtm("", ctx), null);
});
