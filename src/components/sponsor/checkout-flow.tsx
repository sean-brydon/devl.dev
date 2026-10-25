"use client";

import { CheckIcon, ClockIcon, FlaskConicalIcon, UndoIcon, XIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { AdCard, AdTile } from "@/components/sponsor/ad-creative";
import { sponsorAd } from "@/components/sponsor/house-ads";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { type AccentId, type BookingStatus, formatPrice, formatPeriod, type PlacementId, placements } from "@/lib/sponsors";
import { cn } from "@/lib/utils";

interface PublicBooking {
  id: string;
  status: BookingStatus;
  placement: PlacementId;
  periodStart: string;
  productName: string;
  pitch: string;
  url: string;
  accent: AccentId;
  monogram: string | null;
  image: string | null;
  amountCents: number;
  holdExpiresAt: number;
}

async function getBooking(id: string, sessionId?: string | null) {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
  const res = await fetch(`/api/sponsors/bookings/${encodeURIComponent(id)}${query}`, { cache: "no-store" });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? "Booking not found");
  return (await res.json()) as { booking: PublicBooking; mode: "stripe" | "test" | "off" };
}

function Shell({ icon, tone, eyebrow, title, children }: { icon: ReactNode; tone: "brand" | "muted" | "warn"; eyebrow: string; title: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 pt-12 pb-24 md:pt-20">
      <div className="flex flex-col gap-4">
        <motion.span
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          className={cn(
            "flex size-11 items-center justify-center rounded-2xl [&_svg]:size-5",
            tone === "brand" && "bg-brand text-brand-foreground",
            tone === "muted" && "bg-muted text-foreground",
            tone === "warn" && "bg-warning/12 text-warning-foreground",
          )}
          initial={reduce ? false : { scale: 0.6, rotate: -12, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
        >
          {icon}
        </motion.span>
        <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">{eyebrow}</p>
        <h1 className="text-balance font-heading font-semibold text-3xl tracking-tight md:text-5xl md:leading-[1.05]">{title}</h1>
      </div>
      {children}
    </div>
  );
}

function Summary({ booking }: { booking: PublicBooking }) {
  const placement = placements[booking.placement];
  return (
    <div className="grid gap-6 sm:grid-cols-[1fr_15rem]">
      <dl className="grid grid-cols-[auto_1fr] content-start gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Placement</dt>
        <dd>{placement.label}</dd>
        <dt className="text-muted-foreground">Dates</dt>
        <dd className="tabular-nums">{formatPeriod(booking.periodStart)} (UTC)</dd>
        <dt className="text-muted-foreground">Amount</dt>
        <dd className="tabular-nums">{formatPrice(booking.amountCents)}</dd>
        <dt className="text-muted-foreground">Reference</dt>
        <dd className="truncate font-mono text-xs leading-5">{booking.id.slice(0, 8)}</dd>
      </dl>
      <div className={cn("flex flex-col", placement.format === "tile" && "h-64")}>
        {placement.format === "tile" ? <AdTile className="flex-1" creative={sponsorAd(booking)} /> : <AdCard creative={sponsorAd(booking)} />}
      </div>
    </div>
  );
}

function Missing({ message }: { message: string }) {
  return (
    <Shell eyebrow="Hmm" icon={<XIcon />} title="We couldn't find that booking." tone="muted">
      <p className="text-muted-foreground">{message}</p>
      <Button className="self-start" render={<Link href="/advertise" />} variant="outline">
        Back to Advertise
      </Button>
    </Shell>
  );
}

function Loading() {
  return (
    <div className="flex min-h-[50svh] items-center justify-center text-muted-foreground">
      <Spinner />
    </div>
  );
}

export function SuccessView() {
  const params = useSearchParams();
  const id = params.get("booking");
  const sessionId = params.get("session_id");
  const [state, setState] = useState<{ booking?: PublicBooking; error?: string }>({});
  const tries = useRef(0);

  useEffect(() => {
    if (!id) return setState({ error: "The link is missing its booking reference." });
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const { booking } = await getBooking(id, sessionId);
        if (!live) return;
        setState({ booking });
        if (booking.status === "holding" && tries.current++ < 15) timer = setTimeout(poll, 2000);
      } catch (e) {
        if (live) setState({ error: e instanceof Error ? e.message : "Booking not found" });
      }
    };
    poll();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [id, sessionId]);

  if (state.error) return <Missing message={state.error} />;
  if (!state.booking) return <Loading />;
  const { booking } = state;

  if (booking.status === "holding") {
    return (
      <Shell eyebrow="Almost there" icon={<ClockIcon />} title="Confirming your payment…" tone="muted">
        <p className="text-muted-foreground">This usually takes a few seconds. Keep this tab open.</p>
        <Summary booking={booking} />
      </Shell>
    );
  }
  if (booking.status === "expired" || booking.status === "refunded") {
    return (
      <Shell eyebrow={booking.status === "refunded" ? "Refunded" : "Expired"} icon={<UndoIcon />} title={booking.status === "refunded" ? "This booking was refunded." : "This hold expired before payment."} tone="warn">
        <p className="text-muted-foreground">
          {booking.status === "refunded"
            ? "The refund is on its way to your original payment method. Pick another fortnight any time."
            : "No charge was made. The fortnight is open again if you'd still like it."}
        </p>
        <Button className="self-start" render={<Link href="/advertise" />} variant="outline">
          Book another fortnight
        </Button>
      </Shell>
    );
  }
  return (
    <Shell
      eyebrow={booking.status === "scheduled" ? "Booked" : "Paid · In review"}
      icon={<CheckIcon />}
      title={booking.status === "scheduled" ? "You're on the schedule." : "Thanks — you're booked and in review."}
      tone="brand"
    >
      <p className="max-w-lg text-pretty text-muted-foreground">
        {booking.status === "scheduled"
          ? "Your ad goes live on the first Monday of your fortnight and runs for two weeks, until Sunday night (UTC)."
          : "We review every booking within 48 hours. Once approved, your ad runs for your two weeks, starting Monday (UTC). If we decline it, you're refunded in full automatically."}
      </p>
      <Summary booking={booking} />
      <Button className="self-start" render={<Link href="/" />} variant="outline">
        Back to devl
      </Button>
    </Shell>
  );
}

export function CancelledView() {
  const params = useSearchParams();
  const id = params.get("booking");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) return setDone(true);
    fetch(`/api/sponsors/bookings/${encodeURIComponent(id)}/cancel`, { method: "POST" }).finally(() => setDone(true));
  }, [id]);

  return (
    <Shell eyebrow="Checkout cancelled" icon={<UndoIcon />} title="No charge made." tone="muted">
      <p className="text-muted-foreground">
        {done ? "We've released the fortnight you picked so someone else can take it — or you can grab it again." : "Releasing your hold…"}
      </p>
      <Button className="self-start" render={<Link href="/advertise" />} variant="outline">
        Back to Advertise
      </Button>
    </Shell>
  );
}

export function TestCheckoutView() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("booking");
  const [state, setState] = useState<{ booking?: PublicBooking; error?: string }>({});
  const [busy, setBusy] = useState<"paid" | "cancel" | null>(null);

  useEffect(() => {
    if (!id) return setState({ error: "The link is missing its booking reference." });
    getBooking(id).then(
      ({ booking, mode }) =>
        setState(mode === "test" ? { booking } : { error: "Stripe is configured, so the test checkout is switched off." }),
      (e) => setState({ error: e instanceof Error ? e.message : "Booking not found" }),
    );
  }, [id]);

  async function simulate(outcome: "paid" | "cancel") {
    if (!id) return;
    setBusy(outcome);
    const res = await fetch("/api/sponsors/test-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: id, outcome }),
    });
    if (!res.ok) {
      setBusy(null);
      setState((s) => ({ ...s, error: "The simulated payment failed." }));
      return;
    }
    router.push(outcome === "paid" ? `/advertise/success?booking=${id}` : `/advertise/cancelled?booking=${id}`);
  }

  if (state.error) return <Missing message={state.error} />;
  if (!state.booking) return <Loading />;
  const { booking } = state;
  const usable = booking.status === "holding";

  return (
    <Shell eyebrow="Local test checkout" icon={<FlaskConicalIcon />} title="Simulated payment" tone="warn">
      <div className="rounded-xl border border-warning/40 border-dashed bg-warning/6 px-4 py-3 text-sm">
        <p className="font-medium text-warning-foreground">Test mode — no money moves.</p>
        <p className="mt-1 text-muted-foreground">
          STRIPE_SECRET_KEY isn't set, so this page stands in for Stripe Checkout. The buttons call the same paid / cancel logic as the real
          webhook.
        </p>
      </div>
      <Summary booking={booking} />
      {usable ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button disabled={busy !== null} loading={busy === "paid"} onClick={() => simulate("paid")} size="lg">
            Simulate successful payment · {formatPrice(booking.amountCents)}
          </Button>
          <Button disabled={busy !== null} loading={busy === "cancel"} onClick={() => simulate("cancel")} size="lg" variant="outline">
            Simulate cancel
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          This booking is already <span className="font-medium text-foreground">{booking.status.replace("_", " ")}</span>.
        </p>
      )}
    </Shell>
  );
}
