// Verifies the Cf-Access-Jwt-Assertion header that Cloudflare Access adds to requests it let through (app "devl admin").
// RS256 against the team's published keys, plus audience (the app's AUD tag), issuer and expiry.

interface Jwk extends JsonWebKey {
  kid: string;
}

const KEYS_TTL_MS = 60 * 60_000;
let cache: { domain: string; fetchedAt: number; keys: Map<string, CryptoKey> } | undefined;

function decode(segment: string) {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
}

const json = (segment: string) => JSON.parse(new TextDecoder().decode(decode(segment))) as Record<string, unknown>;

async function signingKeys(domain: string, refresh: boolean) {
  if (!refresh && cache?.domain === domain && Date.now() - cache.fetchedAt < KEYS_TTL_MS) return cache.keys;
  const response = await fetch(`https://${domain}/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error(`Access certs answered ${response.status}`);
  const { keys = [] } = (await response.json()) as { keys?: Jwk[] };
  const imported = await Promise.all(
    keys.map(async (jwk) => [jwk.kid, await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"])] as const),
  );
  cache = { domain, fetchedAt: Date.now(), keys: new Map(imported) };
  return cache.keys;
}

/** The signed-in email when the token is a valid Access token for this app, otherwise null. */
export async function verifyAccessJwt(token: string, teamDomain: string, audience: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [rawHeader, rawPayload, rawSignature] = parts;
  const header = json(rawHeader);
  if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
  let key = (await signingKeys(teamDomain, false)).get(header.kid);
  if (!key) key = (await signingKeys(teamDomain, true)).get(header.kid);
  if (!key) return null;
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode(rawSignature), new TextEncoder().encode(`${rawHeader}.${rawPayload}`));
  if (!valid) return null;
  const payload = json(rawPayload);
  const now = Date.now() / 1000;
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(audience) || payload.iss !== `https://${teamDomain}`) return null;
  if (typeof payload.exp !== "number" || payload.exp < now || (typeof payload.nbf === "number" && payload.nbf > now + 60)) return null;
  return typeof payload.email === "string" ? payload.email : null;
}
