import { Effect, Layer, Option, Redacted } from "effect";
import { cookies, headers } from "next/headers";
import { verifyAccessJwt } from "@/server/access";
import { Bookings } from "@/server/bookings";
import { AppConfig } from "@/server/config";
import { Db } from "@/server/db";
import { type AppError, messageOf, statusOf, Unauthorized } from "@/server/errors";
import { HouseImages, ImageStore } from "@/server/images";
import { Inventory } from "@/server/inventory";
import { OgFetcher } from "@/server/og";
import { hmacHex, Payments, timingSafeEqual } from "@/server/payments";
import { Platform } from "@/server/platform";
import { clientIp, durableLimit } from "@/server/rate-limit";
import { Sponsors } from "@/server/sponsors";
import { Stats } from "@/server/stats";
import { Usage } from "@/server/usage";

export const AppLayer = Layer.mergeAll(Inventory.layer, Sponsors.layer, HouseImages.layer, Stats.layer, Usage.layer).pipe(
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

const SESSION_DAYS = 7;
const signSession = (token: string, expires: number) => hmacHex(token, `devl-admin-session:${expires}`);

/** Sign-in attempts per IP and in total, per 15 minutes. Checked before the token, so guesses count too. */
export const limitAdminLogin = Effect.fn("limitAdminLogin")(function* (request: Request) {
  const ip = yield* Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(clientIp(request))));
  const ipBucket = `ip:${Array.from(new Uint8Array(ip).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("")}`;
  yield* durableLimit(ipBucket, 10, 15 * 60_000);
  yield* durableLimit("global", 100, 15 * 60_000);
});

export const adminSessionFor = Effect.fn("adminSessionFor")(function* (submitted: string) {
  const token = yield* adminToken;
  if (Option.isNone(token)) return yield* new Unauthorized({ message: "Set ADMIN_TOKEN to enable the admin." });
  const probe = "devl-admin-check";
  const [expected, given] = yield* Effect.promise(() => Promise.all([hmacHex(token.value, probe), hmacHex(submitted, probe)]));
  if (!timingSafeEqual(expected, given)) return yield* new Unauthorized({ message: "That token didn't match." });
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  const signature = yield* Effect.promise(() => signSession(token.value, expires));
  return `${expires}.${signature}`;
});

export interface AdminCredentials {
  /** The devl_admin cookie from the admin-token sign-in. */
  readonly session: string | undefined;
  /** Cf-Access-Jwt-Assertion, set by Cloudflare Access on /admin and /api/admin. */
  readonly access: string | null;
}

export async function adminCredentials(): Promise<AdminCredentials> {
  const [jar, list] = await Promise.all([cookies(), headers()]);
  return { session: jar.get(ADMIN_COOKIE)?.value, access: list.get("cf-access-jwt-assertion") };
}

/** The email Cloudflare Access signed in, when ACCESS_TEAM_DOMAIN and ACCESS_AUD are set and the token checks out. */
const accessEmail = Effect.fn("accessEmail")(function* (jwt: string | null) {
  const config = yield* AppConfig;
  if (!jwt || Option.isNone(config.accessTeamDomain) || Option.isNone(config.accessAudience)) return Option.none<string>();
  const domain = config.accessTeamDomain.value;
  const audience = config.accessAudience.value;
  const email = yield* Effect.promise(() => verifyAccessJwt(jwt, domain, audience).catch(() => null));
  return Option.fromNullishOr(email);
});

/** A valid Cloudflare Access sign-in is enough; otherwise fall back to the admin-token session (local dev, or Access unset). */
export const requireAdmin = Effect.fn("requireAdmin")(function* ({ session, access }: AdminCredentials) {
  if (Option.isSome(yield* accessEmail(access))) return;
  const token = yield* adminToken;
  if (Option.isNone(token)) return yield* new Unauthorized({ message: "Set ADMIN_TOKEN to enable the admin." });
  const [rawExpires, signature] = (session ?? "").split(".");
  const expires = Number(rawExpires);
  if (!signature || !Number.isSafeInteger(expires) || expires < Date.now()) return yield* new Unauthorized({ message: "Sign in first." });
  const expected = yield* Effect.promise(() => signSession(token.value, expires));
  if (!timingSafeEqual(expected, signature)) return yield* new Unauthorized({ message: "Sign in first." });
});

export const devAdminHint = Effect.map(AppConfig, (c) => Option.isNone(c.adminToken) && c.isDev);
