import { Context, Effect, Layer } from "effect";
import { OgFetchFailed, OgInvalidImage, OgNotFound } from "@/server/errors";

const USER_AGENT = "devl-og-fetcher (+https://devl.dev/advertise)";
const TIMEOUT_MS = 5_000;
const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 1_000_000;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export type ImageType = "image/png" | "image/jpeg" | "image/webp" | "image/gif" | "image/avif";

export interface OgImage {
  readonly bytes: Uint8Array;
  readonly contentType: ImageType;
  readonly source: string;
  readonly width: number | null;
  readonly height: number | null;
}

export class OgFetcher extends Context.Service<
  OgFetcher,
  {
    image(pageUrl: string): Effect.Effect<OgImage, OgNotFound | OgFetchFailed | OgInvalidImage>;
  }
>()("devl/server/OgFetcher") {
  static readonly layer = Layer.succeed(
    OgFetcher,
    OgFetcher.of({
      image: Effect.fn("OgFetcher.image")(function* (pageUrl: string) {
        const page = yield* safeFetch(pageUrl, "text/html,application/xhtml+xml");
        if (!/html|xml/i.test(page.response.headers.get("content-type") ?? "")) {
          yield* Effect.promise(() => page.response.body?.cancel() ?? Promise.resolve());
          return yield* new OgNotFound({ message: "That link isn't an HTML page" });
        }
        const html = new TextDecoder().decode(
          yield* readCapped(page.response, MAX_HTML_BYTES, { truncate: true, stopAt: "</head>" }),
        );
        const found = findOgImage(html);
        if (!found) return yield* new OgNotFound({ message: "No og:image or twitter:image on that page" });

        const source = yield* Effect.try({
          try: () => {
            const url = new URL(decodeEntities(found), page.url);
            if (url.protocol === "http:") url.protocol = "https:";
            return url.toString();
          },
          catch: () => new OgInvalidImage({ message: "The og:image URL is malformed" }),
        });

        const image = yield* safeFetch(source, "image/avif,image/webp,image/png,image/jpeg,image/gif").pipe(
          Effect.mapError((e) => new OgInvalidImage({ message: `Couldn't download the og:image: ${e.message}` })),
        );
        const declared = Number(image.response.headers.get("content-length"));
        if (declared > MAX_IMAGE_BYTES) return yield* new OgInvalidImage({ message: "The og:image is larger than 2 MB" });
        const bytes = yield* readCapped(image.response, MAX_IMAGE_BYTES, { truncate: false }).pipe(
          Effect.mapError((e) => new OgInvalidImage({ message: e.message })),
        );
        const contentType = sniff(bytes);
        const header = (image.response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
        if (!contentType || !header.startsWith("image/")) {
          return yield* new OgInvalidImage({ message: "The og:image isn't a PNG, JPEG, WebP, GIF or AVIF" });
        }
        const size = dimensions(bytes, contentType);
        if (size && (size.width < 200 || size.height < 100 || size.width > 10_000 || size.height > 10_000)) {
          return yield* new OgInvalidImage({ message: `The og:image is ${size.width}×${size.height}; it needs to be at least 200×100` });
        }
        return { bytes, contentType, source: image.url, width: size?.width ?? null, height: size?.height ?? null };
      }),
    }),
  );
}

const safeFetch = Effect.fn("OgFetcher.safeFetch")(function* (start: string, accept: string) {
  let url = start;
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const target = yield* checkUrl(url);
    const response = yield* Effect.tryPromise({
      try: () => fetch(target, { redirect: "manual", signal, headers: { "User-Agent": USER_AGENT, Accept: accept } }),
      catch: (cause) =>
        new OgFetchFailed({ message: signal.aborted ? "Timed out after 5 seconds" : `Couldn't reach ${target.hostname}: ${String(cause)}` }),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      yield* Effect.promise(() => response.body?.cancel() ?? Promise.resolve());
      if (!location) return yield* new OgFetchFailed({ message: "Redirect without a Location header" });
      url = new URL(location, target).toString();
      continue;
    }
    if (!response.ok) return yield* new OgFetchFailed({ message: `${target.hostname} answered ${response.status}` });
    return { response, url: target.toString() };
  }
  return yield* new OgFetchFailed({ message: `More than ${MAX_REDIRECTS} redirects` });
});

const checkUrl = Effect.fn("OgFetcher.checkUrl")(function* (raw: string) {
  const url = yield* Effect.try({ try: () => new URL(raw), catch: () => new OgFetchFailed({ message: "Not a valid URL" }) });
  if (url.protocol !== "https:") return yield* new OgFetchFailed({ message: "Only https:// links are allowed" });
  if (url.port && url.port !== "443") return yield* new OgFetchFailed({ message: "Custom ports aren't allowed" });
  if (url.username || url.password) return yield* new OgFetchFailed({ message: "Links with credentials aren't allowed" });
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (isBlockedHost(host)) return yield* new OgFetchFailed({ message: "That host isn't publicly reachable" });
  const addresses = yield* Effect.promise(() => resolve(host));
  if (addresses === "missing") return yield* new OgFetchFailed({ message: `${host} doesn't resolve` });
  if (Array.isArray(addresses) && addresses.some(isPrivateAddress)) {
    return yield* new OgFetchFailed({ message: "That host resolves to a private address" });
  }
  return url;
});

export function isBlockedHost(host: string) {
  if (!host.includes(".")) return true;
  if (host.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^0x/i.test(host) || /^\d+$/.test(host)) return true;
  return /(^|\.)(localhost|local|internal|lan|home\.arpa|localdomain|intranet|corp)$/.test(host);
}

/**
 * Workers can't do DNS themselves; there `global_fetch_strictly_public` refuses private targets. Under Node (next dev),
 * resolve and check the addresses so a public-looking name can't point at the LAN.
 */
async function resolve(host: string): Promise<string[] | "missing" | "unknown"> {
  const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
  if (onWorkers || typeof process === "undefined" || !process.versions?.node) return "unknown";
  try {
    const dns = await import("node:dns/promises");
    return (await dns.lookup(host, { all: true, verbatim: true })).map((a) => a.address);
  } catch (error) {
    const code = (error as { code?: string }).code;
    return code === "ENOTFOUND" || code === "ENODATA" ? "missing" : "unknown";
  }
}

export function isPrivateAddress(address: string) {
  const v4 = address.match(/^(?:::ffff:)?(\d+)\.(\d+)\.(\d+)\.(\d+)$/i);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || (b === 0 && Number(v4[3]) === 0))) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const v6 = address.toLowerCase();
  return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || v6.startsWith("ff");
}

function readCapped(response: Response, limit: number, options: { truncate: boolean; stopAt?: string }) {
  return Effect.tryPromise({
    try: async () => {
      const reader = response.body?.getReader();
      if (!reader) return new Uint8Array();
      const chunks: Uint8Array[] = [];
      let total = 0;
      const marker = options.stopAt;
      const decoder = new TextDecoder();
      let tail = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > limit) {
          await reader.cancel();
          if (!options.truncate) throw new Error(`Larger than ${Math.round(limit / 1024 / 1024)} MB`);
          chunks.push(value.subarray(0, value.byteLength - (total - limit)));
          break;
        }
        chunks.push(value);
        if (marker) {
          tail = (tail + decoder.decode(value, { stream: true })).slice(-4096);
          if (tail.toLowerCase().includes(marker)) {
            await reader.cancel();
            break;
          }
        }
      }
      const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
      let offset = 0;
      for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return out;
    },
    catch: (cause) => new OgFetchFailed({ message: cause instanceof Error ? cause.message : "Download failed" }),
  });
}

export function findOgImage(html: string) {
  const wanted = ["og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src"];
  const found = new Map<string, string>();
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attr = (name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i"));
    const key = attr("property") ?? attr("name");
    const content = attr("content");
    const k = key && (key[1] ?? key[2] ?? key[3])?.trim().toLowerCase();
    const v = content && (content[1] ?? content[2] ?? content[3])?.trim();
    if (k && v && wanted.includes(k) && !found.has(k)) found.set(k, v);
  }
  return wanted.map((k) => found.get(k)).find(Boolean) ?? null;
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x2F;|&#47;/gi, "/");
}

export function sniff(b: Uint8Array): ImageType | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && /avi[fs]/.test(ascii(8, 12))) return "image/avif";
  return null;
}

function dimensions(b: Uint8Array, type: ImageType): { width: number; height: number } | null {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  try {
    if (type === "image/png") return { width: view.getUint32(16), height: view.getUint32(20) };
    if (type === "image/gif") return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
    if (type === "image/webp") {
      const chunk = String.fromCharCode(...b.subarray(12, 16));
      if (chunk === "VP8 ") return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
      if (chunk === "VP8L") {
        const bits = view.getUint32(21, true);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      if (chunk === "VP8X") {
        return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
      }
    }
    if (type === "image/jpeg") {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) return null;
        const marker = b[i + 1];
        const length = view.getUint16(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: view.getUint16(i + 5), width: view.getUint16(i + 7) };
        }
        i += 2 + length;
      }
    }
  } catch {
    return null;
  }
  return null;
}
