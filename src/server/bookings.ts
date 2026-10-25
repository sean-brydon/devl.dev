import { Context, Effect, Layer } from "effect";
import { type AccentId, type BookingStatus, bookablePeriods, HOLD_MINUTES, IMAGE_PREFIX, imageUrl, type PlacementId, placements } from "@/lib/sponsors";
import { Db } from "@/server/db";
import { BookingNotFound, type DbError, InvalidRequest, InvalidTransition, type PaymentError, PeriodUnavailable } from "@/server/errors";
import { ImageStore } from "@/server/images";
import { OgFetcher } from "@/server/og";
import { Payments } from "@/server/payments";
import type { BookingRequest } from "@/server/schemas";

export interface Booking {
  readonly id: string;
  readonly placementId: PlacementId;
  readonly periodStart: string;
  readonly status: BookingStatus;
  readonly productName: string;
  readonly pitch: string;
  readonly url: string;
  readonly email: string;
  readonly accent: AccentId;
  readonly monogram: string | null;
  readonly amountCents: number;
  readonly currency: string;
  readonly stripeSessionId: string | null;
  readonly stripePaymentIntentId: string | null;
  readonly stripeRefundId: string | null;
  readonly holdExpiresAt: number;
  readonly paidAt: number | null;
  readonly reviewedAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly ogImageKey: string | null;
  readonly ogImageStatus: OgImageStatus;
  readonly ogImageSource: string | null;
  readonly ogImageNote: string | null;
  readonly statsToken: string | null;
}

export type OgImageStatus = "none" | "ready" | "failed" | "declined";

interface BookingRow {
  id: string;
  placement_id: PlacementId;
  period_start: string;
  status: BookingStatus;
  product_name: string;
  pitch: string;
  url: string;
  email: string;
  accent: AccentId;
  monogram: string | null;
  amount_cents: number;
  currency: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_refund_id: string | null;
  hold_expires_at: number;
  paid_at: number | null;
  reviewed_at: number | null;
  created_at: number;
  updated_at: number;
  og_image_key: string | null;
  og_image_status: OgImageStatus;
  og_image_source: string | null;
  og_image_note: string | null;
  stats_token: string | null;
}

const fromRow = (r: BookingRow): Booking => ({
  id: r.id,
  placementId: r.placement_id,
  periodStart: r.period_start,
  status: r.status,
  productName: r.product_name,
  pitch: r.pitch,
  url: r.url,
  email: r.email,
  accent: r.accent,
  monogram: r.monogram,
  amountCents: r.amount_cents,
  currency: r.currency,
  stripeSessionId: r.stripe_session_id,
  stripePaymentIntentId: r.stripe_payment_intent_id,
  stripeRefundId: r.stripe_refund_id,
  holdExpiresAt: r.hold_expires_at,
  paidAt: r.paid_at,
  reviewedAt: r.reviewed_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  ogImageKey: r.og_image_key,
  ogImageStatus: r.og_image_status,
  ogImageSource: r.og_image_source,
  ogImageNote: r.og_image_note,
  statsToken: r.stats_token,
});

function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join("");
}

export { imageUrl };

export const CLAIMING: BookingStatus[] = ["holding", "in_review", "scheduled"];

type Err = DbError | BookingNotFound | InvalidTransition | PaymentError;

export class Bookings extends Context.Service<
  Bookings,
  {
    readonly expireStale: Effect.Effect<void, DbError>;
    createHold(request: BookingRequest): Effect.Effect<Booking, DbError | InvalidRequest | PeriodUnavailable>;
    attachSession(id: string, sessionId: string): Effect.Effect<void, DbError>;
    get(id: string): Effect.Effect<Booking, DbError | BookingNotFound>;
    byStatsToken(token: string): Effect.Effect<Booking, DbError | BookingNotFound>;
    markPaid(id: string, paymentIntentId: string): Effect.Effect<Booking, Err>;
    approve(id: string): Effect.Effect<Booking, Err>;
    reject(id: string): Effect.Effect<Booking, Err>;
    release(id: string): Effect.Effect<Booking, DbError | BookingNotFound>;
    snapshotImage(id: string): Effect.Effect<Booking, DbError | BookingNotFound | InvalidTransition>;
    declineImage(id: string): Effect.Effect<Booking, DbError | BookingNotFound | InvalidTransition>;
    readonly list: Effect.Effect<Booking[], DbError>;
  }
>()("devl/server/Bookings") {
  static readonly layer = Layer.effect(
    Bookings,
    Effect.gen(function* () {
      const db = yield* Db;
      const payments = yield* Payments;
      const og = yield* OgFetcher;
      const store = yield* ImageStore;

      const expireStale = db
        .run("UPDATE bookings SET status = 'expired', updated_at = ?1 WHERE status = 'holding' AND hold_expires_at < ?1", Date.now())
        .pipe(Effect.asVoid, Effect.catchTag("UniqueViolation", () => Effect.void));

      const get = Effect.fn("Bookings.get")(function* (id: string) {
        const row = yield* db.first<BookingRow>("SELECT * FROM bookings WHERE id = ?", id);
        if (!row) return yield* new BookingNotFound({ id });
        return fromRow(row);
      });

      const transition = Effect.fn("Bookings.transition")(function* (
        booking: Booking,
        to: BookingStatus,
        set: Record<string, string | number | null> = {},
      ) {
        const fields = { status: to, updated_at: Date.now(), ...set };
        const keys = Object.keys(fields);
        const changes = yield* db.run(
          `UPDATE bookings SET ${keys.map((k, i) => `${k} = ?${i + 3}`).join(", ")} WHERE id = ?1 AND status = ?2`,
          booking.id,
          booking.status,
          ...Object.values(fields),
        );
        if (changes === 0) return yield* new InvalidTransition({ id: booking.id, from: booking.status, to });
        return yield* get(booking.id);
      });

      const createHold = Effect.fn("Bookings.createHold")(function* (request: BookingRequest) {
        if (!bookablePeriods().includes(request.periodStart)) {
          return yield* new InvalidRequest({ message: "That fortnight isn't open for booking" });
        }
        yield* expireStale;
        const now = Date.now();
        const id = crypto.randomUUID();
        yield* db
          .run(
            `INSERT INTO bookings (id, placement_id, period_start, status, product_name, pitch, url, email, accent, monogram,
              amount_cents, currency, hold_expires_at, created_at, updated_at, og_image_status, stats_token)
             VALUES (?, ?, ?, 'holding', ?, ?, ?, ?, ?, ?, ?, 'usd', ?, ?, ?, ?, ?)`,
            id,
            request.placement,
            request.periodStart,
            request.productName,
            request.pitch,
            request.url,
            request.email.toLowerCase(),
            request.accent,
            request.monogram ? request.monogram.toUpperCase() : null,
            placements[request.placement].priceCents,
            now + HOLD_MINUTES * 60_000,
            now,
            now,
            request.useImage === false ? "declined" : "none",
            randomToken(),
          )
          .pipe(
            Effect.catchTag("UniqueViolation", () =>
              Effect.fail(new PeriodUnavailable({ placement: request.placement, periodStart: request.periodStart })),
            ),
          );
        return yield* get(id).pipe(Effect.catchTag("BookingNotFound", (e) => Effect.die(e)));
      });

      const refundAndClose = Effect.fn("Bookings.refundAndClose")(function* (booking: Booking) {
        const refundId = yield* payments.refund(booking);
        return yield* transition(booking, "refunded", { stripe_refund_id: refundId, reviewed_at: Date.now() });
      });

      const markPaid = Effect.fn("Bookings.markPaid")(function* (id: string, paymentIntentId: string) {
        const booking = yield* get(id);
        if (booking.status !== "holding" && booking.status !== "expired") return booking;
        const paid = { stripe_payment_intent_id: paymentIntentId, paid_at: Date.now() };
        return yield* transition(booking, "in_review", paid).pipe(
          Effect.catchTag("UniqueViolation", () =>
            // The hold lapsed and someone else claimed the fortnight before payment landed.
            db
              .run("UPDATE bookings SET stripe_payment_intent_id = ?2, paid_at = ?3 WHERE id = ?1", id, paid.stripe_payment_intent_id, paid.paid_at)
              .pipe(
                Effect.catchTag("UniqueViolation", (e) => Effect.die(e)),
                Effect.andThen(get(id)),
                Effect.flatMap(refundAndClose),
              ),
          ),
        );
      });

      const approve = Effect.fn("Bookings.approve")(function* (id: string) {
        const booking = yield* get(id);
        if (booking.status !== "in_review") return yield* new InvalidTransition({ id, from: booking.status, to: "scheduled" });
        return yield* transition(booking, "scheduled", { reviewed_at: Date.now() }).pipe(
          Effect.catchTag("UniqueViolation", (e) => Effect.die(e)),
        );
      });

      const reject = Effect.fn("Bookings.reject")(function* (id: string) {
        const booking = yield* get(id);
        if (booking.status !== "in_review" && booking.status !== "scheduled") {
          return yield* new InvalidTransition({ id, from: booking.status, to: "refunded" });
        }
        return yield* refundAndClose(booking).pipe(Effect.catchTag("UniqueViolation", (e) => Effect.die(e)));
      });

      const release = Effect.fn("Bookings.release")(function* (id: string) {
        const booking = yield* get(id);
        if (booking.status !== "holding") return booking;
        if (booking.ogImageKey) yield* Effect.ignore(store.remove(booking.ogImageKey));
        return yield* transition(booking, "expired", { og_image_key: null, og_image_status: booking.ogImageKey ? "none" : booking.ogImageStatus }).pipe(
          Effect.catchTags({ UniqueViolation: (e) => Effect.die(e), InvalidTransition: () => get(id) }),
        );
      });

      const setImage = Effect.fn("Bookings.setImage")(function* (
        booking: Booking,
        fields: { og_image_key: string | null; og_image_status: OgImageStatus; og_image_source: string | null; og_image_note: string | null },
      ) {
        const changes = yield* db
          .run(
            `UPDATE bookings SET og_image_key = ?3, og_image_status = ?4, og_image_source = ?5, og_image_note = ?6, updated_at = ?7
             WHERE id = ?1 AND status = ?2`,
            booking.id,
            booking.status,
            fields.og_image_key,
            fields.og_image_status,
            fields.og_image_source,
            fields.og_image_note,
            Date.now(),
          )
          .pipe(Effect.catchTag("UniqueViolation", (e) => Effect.die(e)));
        if (changes === 0) return yield* new InvalidTransition({ id: booking.id, from: booking.status, to: booking.status });
        if (booking.ogImageKey && booking.ogImageKey !== fields.og_image_key) yield* Effect.ignore(store.remove(booking.ogImageKey));
        return yield* get(booking.id);
      });

      const editable = Effect.fn("Bookings.editable")(function* (id: string) {
        const booking = yield* get(id);
        // Approval freezes the creative, image included.
        if (booking.status !== "holding" && booking.status !== "in_review") {
          return yield* new InvalidTransition({ id, from: booking.status, to: "image change" });
        }
        return booking;
      });

      const snapshotImage = Effect.fn("Bookings.snapshotImage")(function* (id: string) {
        const booking = yield* editable(id);
        const result = yield* og.image(booking.url).pipe(
          Effect.flatMap((image) => {
            const key = `${IMAGE_PREFIX}${booking.id}-${Date.now().toString(36)}`;
            return store
              .put(key, image.bytes, image.contentType, { bookingId: booking.id, source: image.source })
              .pipe(Effect.as({ og_image_key: key, og_image_status: "ready" as const, og_image_source: image.source, og_image_note: null }));
          }),
          Effect.catch((error) =>
            Effect.succeed({
              og_image_key: null,
              og_image_status: error._tag === "OgNotFound" ? ("none" as const) : ("failed" as const),
              og_image_source: null,
              og_image_note: error.message,
            }),
          ),
        );
        return yield* setImage(booking, result);
      });

      const declineImage = Effect.fn("Bookings.declineImage")(function* (id: string) {
        const booking = yield* editable(id);
        return yield* setImage(booking, { og_image_key: null, og_image_status: "declined", og_image_source: null, og_image_note: null });
      });

      return Bookings.of({
        expireStale,
        createHold,
        attachSession: (id, sessionId) =>
          db
            .run("UPDATE bookings SET stripe_session_id = ?2, updated_at = ?3 WHERE id = ?1", id, sessionId, Date.now())
            .pipe(Effect.asVoid, Effect.catchTag("UniqueViolation", (e) => Effect.die(e))),
        get,
        byStatsToken: (token) =>
          db.first<BookingRow>("SELECT * FROM bookings WHERE stats_token = ?", token).pipe(
            Effect.flatMap((row) => (row ? Effect.succeed(fromRow(row)) : Effect.fail(new BookingNotFound({ id: "stats" })))),
          ),
        markPaid: (id, paymentIntentId) => markPaid(id, paymentIntentId).pipe(Effect.catchTag("UniqueViolation", (e) => Effect.die(e))),
        approve,
        reject,
        release,
        snapshotImage,
        declineImage,
        list: expireStale.pipe(
          Effect.andThen(db.all<BookingRow>("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 300")),
          Effect.map((rows) => rows.map(fromRow)),
        ),
      });
    }),
  );
}

export const publicBooking = (b: Booking) => ({
  id: b.id,
  status: b.status,
  placement: b.placementId,
  periodStart: b.periodStart,
  productName: b.productName,
  pitch: b.pitch,
  url: b.url,
  accent: b.accent,
  monogram: b.monogram,
  image: imageUrl(b.ogImageKey),
  amountCents: b.amountCents,
  holdExpiresAt: b.holdExpiresAt,
});
export type PublicBooking = ReturnType<typeof publicBooking>;
