import { Effect, Schema } from "effect";
import { accentIds, isPeriodStart, PITCH_MAX, placementIds } from "@/lib/sponsors";
import { InvalidRequest } from "@/server/errors";

const text = (label: string, min: number, max: number) =>
  Schema.Trim.check(
    Schema.isMinLength(min, { message: `${label} needs at least ${min} characters` }),
    Schema.isMaxLength(max, { message: `${label} can be at most ${max} characters` }),
  );

export const BookingRequest = Schema.Struct({
  placement: Schema.Literals(placementIds),
  periodStart: Schema.String.check(Schema.makeFilter(isPeriodStart, { message: "Pick a fortnight" })),
  productName: text("Product name", 2, 32),
  pitch: text("Pitch", 8, PITCH_MAX),
  url: Schema.Trim.check(
    Schema.isMaxLength(300),
    Schema.makeFilter((value: string) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" && url.hostname.includes(".");
      } catch {
        return false;
      }
    }, { message: "Use a full https:// link" }),
  ),
  email: Schema.Trim.check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: "Enter a valid email" })),
  accent: Schema.Literals(accentIds),
  monogram: Schema.optional(
    Schema.Trim.check(Schema.isPattern(/^[\p{L}\p{N}]{0,2}$/u, { message: "Monogram is up to 2 letters" })),
  ),
  useImage: Schema.optional(Schema.Boolean),
});
export type BookingRequest = typeof BookingRequest.Type;

export const TestCheckoutRequest = Schema.Struct({
  bookingId: Schema.String,
  outcome: Schema.Literals(["paid", "cancel"]),
});

export const AdminLoginRequest = Schema.Struct({ token: Schema.String });

export const AdminActionRequest = Schema.Struct({
  action: Schema.Literals(["approve", "reject", "refetch-image", "decline-image"]),
});

export const StripeEvent = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  data: Schema.Struct({
    object: Schema.Struct({
      id: Schema.String,
      client_reference_id: Schema.optional(Schema.NullOr(Schema.String)),
      payment_status: Schema.optional(Schema.String),
      payment_intent: Schema.optional(Schema.NullOr(Schema.String)),
    }),
  }),
});
export type StripeEvent = typeof StripeEvent.Type;

export const decodeBody = <S extends Schema.Constraint>(schema: S) => {
  const decode = Schema.decodeUnknownEffect(schema);
  return (request: Request) =>
    Effect.tryPromise({
      try: () => request.json() as Promise<unknown>,
      catch: () => new InvalidRequest({ message: "Expected a JSON body" }),
    }).pipe(
      Effect.flatMap((body) => decode(body, { errors: "first" })),
      Effect.mapError((error) =>
        error._tag === "InvalidRequest" ? error : new InvalidRequest({ message: friendly(error.message) }),
      ),
    );
};

function friendly(message: string) {
  const [first, at] = message.split("\n");
  const field = at?.match(/\["(\w+)"\]/)?.[1];
  return field && /^(Missing key|Expected)/.test(first) ? `Check the ${field.replace(/[A-Z]/g, (c) => ` ${c.toLowerCase()}`)} field` : first;
}
