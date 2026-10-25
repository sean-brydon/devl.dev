import { Effect, Layer, Option, Redacted } from "effect";
import { Bookings } from "@/server/bookings";
import { AppConfig } from "@/server/config";
import { Db } from "@/server/db";
import { type AppError, messageOf, statusOf, Unauthorized } from "@/server/errors";
import { HouseImages, ImageStore } from "@/server/images";
import { Inventory } from "@/server/inventory";
import { OgFetcher } from "@/server/og";
import { hmacHex, Payments, timingSafeEqual } from "@/server/payments";
import { Platform } from "@/server/platform";
import { Sponsors } from "@/server/sponsors";
import { Stats } from "@/server/stats";

export const AppLayer = Layer.mergeAll(Inventory.layer, Sponsors.layer, HouseImages.layer, Stats.layer).pipe(
  Layer.provideMerge(Bookings.layer),
  Layer.provideMerge(Layer.mergeAll(Payments.layer, ImageStore.layer, OgFetcher.layer)),
  Layer.provideMerge(Db.layer),
  Layer.provideMerge(AppConfig.layer),
  Layer.provide(Platform.layer),
);

export type AppServices = Layer.Success<typeof AppLayer>;

export function runEffect<A>(effect: Effect.Effect<A, AppError, AppServices>) {
  return Effect.runPromise(effect.pipe(Effect.provide(AppLayer)));
}

export async function respond(effect: Effect.Effect<Response, AppError, AppServices>) {
  return Effect.runPromise(
    effect.pipe(
      Effect.catch((error: AppError) => {
        const status = statusOf(error);
        return Effect.as(
          status >= 500 ? Effect.logError(error) : Effect.void,
          Response.json(
            {
              error: error._tag,
              message: messageOf(error),
              ...(status >= 500 && process.env.NODE_ENV === "development" && "message" in error ? { detail: error.message } : {}),
            },
            { status },
          ),
        );
      }),
      Effect.provide(AppLayer),
      Effect.catchDefect((defect) =>
        Effect.as(
          Effect.logError("Unhandled defect", defect),
          Response.json(
            {
              error: "Defect",
              message: "Something went wrong on our side.",
              ...(process.env.NODE_ENV === "development" ? { detail: String(defect) } : {}),
            },
            { status: 500 },
          ),
        ),
      ),
    ),
  );
}

export const ADMIN_COOKIE = "devl_admin";
const DEV_ADMIN_TOKEN = "dev-admin";

const adminToken = Effect.gen(function* () {
  const config = yield* AppConfig;
  return Option.match(config.adminToken, {
    onSome: (token) => Option.some(Redacted.value(token)),
    onNone: () => (config.isDev ? Option.some(DEV_ADMIN_TOKEN) : Option.none()),
  });
});

const sessionFor = (token: string) => hmacHex(token, "devl-admin-session");

export const adminSessionFor = Effect.fn("adminSessionFor")(function* (submitted: string) {
  const token = yield* adminToken;
  if (Option.isNone(token)) return yield* new Unauthorized({ message: "Set ADMIN_TOKEN to enable the admin." });
  const [expected, given] = yield* Effect.promise(() => Promise.all([sessionFor(token.value), sessionFor(submitted)]));
  if (!timingSafeEqual(expected, given)) return yield* new Unauthorized({ message: "That token didn't match." });
  return expected;
});

export const requireAdmin = Effect.fn("requireAdmin")(function* (session: string | undefined) {
  const token = yield* adminToken;
  if (Option.isNone(token)) return yield* new Unauthorized({ message: "Set ADMIN_TOKEN to enable the admin." });
  const expected = yield* Effect.promise(() => sessionFor(token.value));
  if (!session || !timingSafeEqual(expected, session)) return yield* new Unauthorized({ message: "Sign in first." });
});

export const devAdminHint = Effect.map(AppConfig, (c) => Option.isNone(c.adminToken) && c.isDev);
