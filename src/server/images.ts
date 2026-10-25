import { Context, Effect, Layer, Option } from "effect";
import { StorageError } from "@/server/errors";
import { OgFetcher } from "@/server/og";
import { Platform } from "@/server/platform";

export interface StoredImage {
  readonly bytes: ArrayBuffer;
  readonly contentType: string;
  readonly meta: Record<string, string>;
}

export class ImageStore extends Context.Service<
  ImageStore,
  {
    put(key: string, bytes: Uint8Array, contentType: string, meta?: Record<string, string>): Effect.Effect<void, StorageError>;
    get(key: string): Effect.Effect<StoredImage | null, StorageError>;
    remove(key: string): Effect.Effect<void, StorageError>;
  }
>()("devl/server/ImageStore") {
  static readonly layer = Layer.effect(
    ImageStore,
    Effect.gen(function* () {
      const { images } = yield* Platform;
      const bucket = Effect.fromNullishOr(images).pipe(
        Effect.mapError(() => new StorageError({ message: "R2 binding SPONSOR_IMAGES is missing" })),
      );
      const attempt = <A>(run: () => Promise<A>) =>
        Effect.tryPromise({ try: run, catch: (cause) => new StorageError({ message: String(cause) }) });

      return ImageStore.of({
        put: (key, bytes, contentType, meta = {}) =>
          bucket.pipe(
            Effect.flatMap((b) => attempt(() => b.put(key, bytes, { httpMetadata: { contentType }, customMetadata: meta }))),
            Effect.asVoid,
          ),
        get: (key) =>
          bucket.pipe(
            Effect.flatMap((b) => attempt(() => b.get(key))),
            Effect.flatMap((object) =>
              object
                ? attempt(() => object.arrayBuffer()).pipe(
                    Effect.map((bytes) => ({
                      bytes,
                      contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
                      meta: object.customMetadata ?? {},
                    })),
                  )
                : Effect.succeed(null),
            ),
          ),
        remove: (key) => bucket.pipe(Effect.flatMap((b) => attempt(() => b.delete(key)))),
      });
    }),
  );
}

export const houseSites = {
  bklit: "https://ui.bklit.com",
  "coss-ui": "https://coss.com/ui",
} as const;

export type HouseName = keyof typeof houseSites;

const DAY = 86_400_000;
const RETRY_AFTER_MISS = 6 * 3_600_000;

/** House-ad og:images: snapshot into R2, refreshed at most daily, stale copy kept if a refresh fails. */
export class HouseImages extends Context.Service<
  HouseImages,
  { image(name: HouseName): Effect.Effect<StoredImage | null, StorageError> }
>()("devl/server/HouseImages") {
  static readonly layer = Layer.effect(
    HouseImages,
    Effect.gen(function* () {
      const store = yield* ImageStore;
      const og = yield* OgFetcher;

      const image = Effect.fn("HouseImages.image")(function* (name: HouseName) {
        const key = `house/${name}`;
        const cached = yield* store.get(key);
        const age = cached ? Date.now() - Number(cached.meta.fetchedAt ?? 0) : Number.POSITIVE_INFINITY;
        if (cached && age < DAY) return cached;

        const miss = yield* store.get(`${key}.miss`);
        if (!cached && miss && Date.now() - Number(miss.meta.fetchedAt ?? 0) < RETRY_AFTER_MISS) return null;

        const fresh = yield* Effect.option(og.image(houseSites[name]));
        if (Option.isNone(fresh)) {
          yield* store.put(`${key}.miss`, new Uint8Array(), "text/plain", { fetchedAt: String(Date.now()) });
          return cached;
        }
        const meta = { fetchedAt: String(Date.now()), source: fresh.value.source };
        yield* store.put(key, fresh.value.bytes, fresh.value.contentType, meta);
        return { bytes: fresh.value.bytes.slice().buffer as ArrayBuffer, contentType: fresh.value.contentType, meta };
      });

      return HouseImages.of({ image });
    }),
  );
}
