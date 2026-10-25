export interface UtmContext {
  medium: "sponsored" | "referral";
  campaign: string;
  content: string;
  source?: string;
}

/**
 * Adds devl's UTM tags to an outbound link. Keys the advertiser already set win, the existing query string is appended to
 * rather than re-serialised, and the fragment is kept. Returns null for anything that isn't an http(s) URL.
 */
export function withUtm(url: string, ctx: UtmContext): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const tags: [string, string][] = [
    ["utm_source", ctx.source ?? "devl.dev"],
    ["utm_medium", ctx.medium],
    ["utm_campaign", ctx.campaign],
    ["utm_content", ctx.content],
  ];
  const missing = tags.filter(([key, value]) => value && !parsed.searchParams.has(key));
  if (missing.length === 0) return parsed.toString();
  const extra = missing.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&");
  parsed.search = parsed.search.length > 1 ? `${parsed.search}&${extra}` : `?${extra}`;
  return parsed.toString();
}
