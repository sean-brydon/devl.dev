import { Schema } from "effect";

export class InvalidRequest extends Schema.TaggedError<InvalidRequest>()("InvalidRequest", {
  message: Schema.String,
}) {}

export class PeriodUnavailable extends Schema.TaggedError<PeriodUnavailable>()("PeriodUnavailable", {
  placement: Schema.String,
  periodStart: Schema.String,
}) {}

export class BookingNotFound extends Schema.TaggedError<BookingNotFound>()("BookingNotFound", {
  id: Schema.String,
}) {}

export class InvalidTransition extends Schema.TaggedError<InvalidTransition>()("InvalidTransition", {
  id: Schema.String,
  from: Schema.String,
  to: Schema.String,
}) {}

export class PaymentError extends Schema.TaggedError<PaymentError>()("PaymentError", {
  message: Schema.String,
}) {}

export class WebhookInvalid extends Schema.TaggedError<WebhookInvalid>()("WebhookInvalid", {
  message: Schema.String,
}) {}

export class Unauthorized extends Schema.TaggedError<Unauthorized>()("Unauthorized", {
  message: Schema.String,
}) {}

export class NotAvailable extends Schema.TaggedError<NotAvailable>()("NotAvailable", {
  message: Schema.String,
}) {}

export class DbError extends Schema.TaggedError<DbError>()("DbError", {
  message: Schema.String,
}) {}

export class UniqueViolation extends Schema.TaggedError<UniqueViolation>()("UniqueViolation", {
  message: Schema.String,
}) {}

export class PlatformUnavailable extends Schema.TaggedError<PlatformUnavailable>()("PlatformUnavailable", {
  message: Schema.String,
}) {}

export class OgNotFound extends Schema.TaggedError<OgNotFound>()("OgNotFound", {
  message: Schema.String,
}) {}

export class OgFetchFailed extends Schema.TaggedError<OgFetchFailed>()("OgFetchFailed", {
  message: Schema.String,
}) {}

export class OgInvalidImage extends Schema.TaggedError<OgInvalidImage>()("OgInvalidImage", {
  message: Schema.String,
}) {}

export class StorageError extends Schema.TaggedError<StorageError>()("StorageError", {
  message: Schema.String,
}) {}

export class RateLimited extends Schema.TaggedError<RateLimited>()("RateLimited", {
  message: Schema.String,
}) {}

export class AnalyticsUnavailable extends Schema.TaggedError<AnalyticsUnavailable>()("AnalyticsUnavailable", {
  message: Schema.String,
}) {}

export type OgError = OgNotFound | OgFetchFailed | OgInvalidImage;

export type AppError =
  | InvalidRequest
  | PeriodUnavailable
  | BookingNotFound
  | InvalidTransition
  | PaymentError
  | WebhookInvalid
  | Unauthorized
  | NotAvailable
  | DbError
  | PlatformUnavailable
  | OgError
  | StorageError
  | RateLimited
  | AnalyticsUnavailable;

export function statusOf(error: AppError) {
  switch (error._tag) {
    case "InvalidRequest":
    case "WebhookInvalid":
      return 400;
    case "Unauthorized":
      return 401;
    case "BookingNotFound":
    case "NotAvailable":
      return 404;
    case "PeriodUnavailable":
    case "InvalidTransition":
      return 409;
    case "OgNotFound":
    case "OgFetchFailed":
    case "OgInvalidImage":
      return 422;
    case "RateLimited":
      return 429;
    case "StorageError":
      return 500;
    case "PaymentError":
    case "AnalyticsUnavailable":
      return 502;
    case "DbError":
    case "PlatformUnavailable":
      return 500;
  }
}

export function messageOf(error: AppError) {
  switch (error._tag) {
    case "PeriodUnavailable":
      return "That fortnight was just taken. Pick another one.";
    case "BookingNotFound":
      return "Booking not found.";
    case "InvalidTransition":
      if (error.to === "image change") return "The image is frozen once a booking is approved.";
      return `Can't move a ${error.from.replace("_", " ")} booking to ${error.to.replace("_", " ")}.`;
    case "DbError":
    case "PlatformUnavailable":
    case "StorageError":
      return "Something went wrong on our side.";
    default:
      return error.message;
  }
}
