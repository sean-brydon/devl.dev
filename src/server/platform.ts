import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Context, Effect, Layer } from "effect";
import { PlatformUnavailable } from "@/server/errors";

export interface D1Result<T> {
  results: T[];
  meta: { changes: number };
}

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T>(): Promise<D1Result<T>>;
  first<T>(): Promise<T | null>;
  run(): Promise<D1Result<unknown>>;
}

export interface D1Like {
  prepare(sql: string): D1Statement;
}

export interface R2ObjectLike {
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
  uploaded: Date;
}

export interface R2Like {
  get(key: string): Promise<R2ObjectLike | null>;
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | string,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string }; customMetadata?: Record<string, string> },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
}

/** The only file that knows about the hosting adapter: swap this layer to run elsewhere. */
export class Platform extends Context.Service<
  Platform,
  { readonly db: D1Like; readonly images: R2Like | undefined; readonly env: Record<string, string | undefined> }
>()("devl/server/Platform") {
  static readonly layer = Layer.effect(
    Platform,
    Effect.tryPromise({
      try: () => getCloudflareContext({ async: true }),
      catch: (cause) => new PlatformUnavailable({ message: String(cause) }),
    }).pipe(
      Effect.flatMap(({ env }) => {
        const bindings = env as unknown as Record<string, unknown>;
        const db = bindings.DB as D1Like | undefined;
        if (!db) return Effect.fail(new PlatformUnavailable({ message: "D1 binding DB is missing" }));
        const vars: Record<string, string | undefined> = { ...process.env };
        for (const [key, value] of Object.entries(bindings)) if (typeof value === "string") vars[key] = value;
        return Effect.succeed(Platform.of({ db, images: bindings.SPONSOR_IMAGES as R2Like | undefined, env: vars }));
      }),
    ),
  );
}

interface AssetsLike {
  fetch(input: Request | string | URL): Promise<Response>;
}

/** Reads a static file the site serves (e.g. /raw/<slug>.tsx): from the Workers assets binding, or over HTTP in dev. */
export async function readAsset(path: string, origin: string): Promise<string | null> {
  const url = new URL(path, origin);
  const assets = await getCloudflareContext({ async: true })
    .then(({ env }) => (env as unknown as { ASSETS?: AssetsLike }).ASSETS)
    .catch(() => undefined);
  const response = await (assets ? assets.fetch(url) : fetch(url)).catch(() => null);
  return response?.ok ? response.text() : null;
}
