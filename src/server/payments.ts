import { Context, Effect, Layer, Option, Redacted, Schema } from "effect";
import { formatPeriod, HOLD_MINUTES, placements } from "@/lib/sponsors";
import type { Booking } from "@/server/bookings";
import { AppConfig } from "@/server/config";
import { PaymentError, WebhookInvalid } from "@/server/errors";
import { StripeEvent } from "@/server/schemas";

const SIGNATURE_TOLERANCE_SECONDS = 300;

export interface CheckoutSession {
  readonly sessionId: string;
  readonly url: string;
}

export class Payments extends Context.Service<
  Payments,
  {
    readonly mode: "stripe" | "test" | "off";
    createCheckout(booking: Booking, siteUrl: string): Effect.Effect<CheckoutSession, PaymentError>;
    paidSession(sessionId: string): Effect.Effect<Option.Option<{ paymentIntentId: string }>, PaymentError>;
    refund(booking: Booking): Effect.Effect<string, PaymentError>;
    verifyWebhook(payload: string, signature: string | null): Effect.Effect<StripeEvent, WebhookInvalid>;
  }
>()("devl/server/Payments") {
  static readonly layer = Layer.effect(
    Payments,
    Effect.gen(function* () {
      const config = yield* AppConfig;

      const stripe = (key: Redacted.Redacted, method: "GET" | "POST", path: string, form?: Record<string, string>, idempotencyKey?: string) =>
        Effect.tryPromise({
          try: async (signal) => {
            const response = await fetch(`https://api.stripe.com/v1/${path}`, {
              method,
              signal,
              headers: {
                Authorization: `Bearer ${Redacted.value(key)}`,
                "Content-Type": "application/x-www-form-urlencoded",
                ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
              },
              body: form ? new URLSearchParams(form) : undefined,
            });
            const json = (await response.json()) as Record<string, unknown> & { error?: { message?: string } };
            if (!response.ok) throw new Error(json.error?.message ?? `Stripe responded ${response.status}`);
            return json;
          },
          catch: (cause) => new PaymentError({ message: cause instanceof Error ? cause.message : String(cause) }),
        });

      const verifyWebhook = Effect.fn("Payments.verifyWebhook")(function* (payload: string, signature: string | null) {
        const secret = yield* Option.match(config.stripeWebhookSecret, {
          onNone: () => Effect.fail(new WebhookInvalid({ message: "STRIPE_WEBHOOK_SECRET is not set" })),
          onSome: Effect.succeed,
        });
        const parts = (signature ?? "").split(",").map((part) => part.split("=") as [string, string]);
        const timestamp = Number(parts.find(([k]) => k === "t")?.[1]);
        const candidates = parts.filter(([k]) => k === "v1").map(([, v]) => v);
        if (!Number.isFinite(timestamp) || candidates.length === 0) {
          return yield* new WebhookInvalid({ message: "Malformed Stripe-Signature header" });
        }
        if (Math.abs(Date.now() / 1000 - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
          return yield* new WebhookInvalid({ message: "Signature timestamp outside tolerance" });
        }
        const expected = yield* Effect.promise(() => hmacHex(Redacted.value(secret), `${timestamp}.${payload}`));
        if (!candidates.some((candidate) => timingSafeEqual(candidate, expected))) {
          return yield* new WebhookInvalid({ message: "Signature mismatch" });
        }
        return yield* Effect.try({
          try: () => JSON.parse(payload) as unknown,
          catch: () => new WebhookInvalid({ message: "Body is not JSON" }),
        }).pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(StripeEvent)),
          Effect.mapError((e) => (e._tag === "WebhookInvalid" ? e : new WebhookInvalid({ message: "Unexpected event shape" }))),
        );
      });

      return Option.match(config.stripeSecretKey, {
        onNone: () =>
          Payments.of({
            mode: config.allowTestCheckout ? "test" : "off",
            createCheckout: (booking, siteUrl) =>
              config.allowTestCheckout
                ? Effect.succeed({ sessionId: `test_cs_${booking.id}`, url: `${siteUrl}/advertise/checkout?booking=${booking.id}` })
                : Effect.fail(new PaymentError({ message: "Payments aren't set up yet" })),
            paidSession: () => Effect.succeed(Option.none()),
            refund: (booking) => Effect.succeed(`test_re_${booking.id}`),
            verifyWebhook,
          }),
        onSome: (key) =>
          Payments.of({
            mode: "stripe",
            createCheckout: (booking, siteUrl) =>
              stripe(key, "POST", "checkout/sessions", {
                mode: "payment",
                "line_items[0][quantity]": "1",
                "line_items[0][price_data][currency]": booking.currency,
                "line_items[0][price_data][unit_amount]": String(booking.amountCents),
                "line_items[0][price_data][product_data][name]": `Sponsored placement · ${placements[booking.placementId].label} · ${formatPeriod(booking.periodStart)} (UTC)`,
                "line_items[0][price_data][product_data][description]": `${booking.productName} · two weeks, Monday to Sunday`,
                customer_email: booking.email,
                client_reference_id: booking.id,
                "metadata[booking_id]": booking.id,
                "payment_intent_data[metadata][booking_id]": booking.id,
                // Stripe's minimum is 30 minutes; the extra minute absorbs clock skew, late payments are reconciled in Bookings.markPaid.
                expires_at: String(Math.floor(booking.createdAt / 1000) + HOLD_MINUTES * 60 + 60),
                success_url: `${siteUrl}/advertise/success?booking=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${siteUrl}/advertise/cancelled?booking=${booking.id}`,
              }).pipe(Effect.map((s) => ({ sessionId: String(s.id), url: String(s.url) }))),
            paidSession: (sessionId) =>
              stripe(key, "GET", `checkout/sessions/${encodeURIComponent(sessionId)}`).pipe(
                Effect.map((s) =>
                  s.payment_status === "paid" && typeof s.payment_intent === "string"
                    ? Option.some({ paymentIntentId: s.payment_intent })
                    : Option.none(),
                ),
              ),
            refund: (booking) =>
              booking.stripePaymentIntentId
                ? stripe(key, "POST", "refunds", { payment_intent: booking.stripePaymentIntentId }, `refund-${booking.id}`).pipe(
                    Effect.map((r) => String(r.id)),
                  )
                : Effect.fail(new PaymentError({ message: "Booking has no payment to refund" })),
            verifyWebhook,
          }),
      });
    }),
  );
}

const encoder = new TextEncoder();

export async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
