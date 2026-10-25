import { Config, ConfigProvider, Context, Effect, Layer, Option, type Redacted } from "effect";
import { Platform } from "@/server/platform";

export interface AppConfigShape {
  readonly stripeSecretKey: Option.Option<Redacted.Redacted>;
  readonly stripeWebhookSecret: Option.Option<Redacted.Redacted>;
  readonly adminToken: Option.Option<Redacted.Redacted>;
  readonly siteUrl: Option.Option<string>;
  readonly isDev: boolean;
  readonly allowTestCheckout: boolean;
}

export class AppConfig extends Context.Service<AppConfig, AppConfigShape>()("devl/server/AppConfig") {
  static readonly layerNoProvider = Layer.effect(
    AppConfig,
    Effect.gen(function* () {
      const config = yield* Config.all({
        stripeSecretKey: Config.option(Config.Redacted("STRIPE_SECRET_KEY")),
        stripeWebhookSecret: Config.option(Config.Redacted("STRIPE_WEBHOOK_SECRET")),
        adminToken: Config.option(Config.Redacted("ADMIN_TOKEN")),
        siteUrl: Config.option(Config.String("SITE_URL")),
        nodeEnv: Config.String("NODE_ENV").pipe(Config.withDefault("production")),
        allowTestCheckout: Config.Boolean("ALLOW_TEST_CHECKOUT").pipe(Config.withDefault(false)),
      });
      return AppConfig.of({ ...config, siteUrl: Option.map(config.siteUrl, (url) => url.replace(/\/$/, "")), isDev: config.nodeEnv === "development", allowTestCheckout: config.allowTestCheckout || config.nodeEnv === "development" });
    }).pipe(Effect.orDie),
  );

  static readonly layer = AppConfig.layerNoProvider.pipe(
    Layer.provide(ConfigProvider.layer(Effect.map(Platform, ({ env }) => ConfigProvider.fromEnvRecord(env)))),
  );
}
