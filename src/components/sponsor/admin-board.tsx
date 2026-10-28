"use client";

import { ArrowUpRightIcon, CheckIcon, LinkIcon, LockIcon, LogOutIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { GooGroup } from "@/components/goo-group";
import { Monogram } from "@/components/sponsor/ad-creative";
import { formatCtr, Sparkline } from "@/components/sponsor/sparkline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addPeriods, type BookingStatus, campaignOf, formatPeriod, formatPrice, imageUrl, PERIODS_AHEAD, placementIds, placements } from "@/lib/sponsors";
import { withUtm } from "@/lib/utm";
import { cn } from "@/lib/utils";
import type { Booking } from "@/server/bookings";
import type { BookingStats } from "@/server/stats";

const statusMeta: Record<BookingStatus, { label: string; chip: string }> = {
  in_review: { label: "In review", chip: "bg-warning/12 text-warning-foreground" },
  scheduled: { label: "Scheduled", chip: "bg-brand/40 text-brand-foreground dark:bg-brand/15 dark:text-brand" },
  holding: { label: "Holding", chip: "bg-info/10 text-info-foreground" },
  refunded: { label: "Refunded", chip: "bg-muted text-muted-foreground" },
  expired: { label: "Expired", chip: "bg-muted text-muted-foreground/70" },
};

const order: BookingStatus[] = ["in_review", "scheduled", "holding", "refunded", "expired"];

export function AdminLogin({
  devHint,
  disabled,
  title = "Sponsors admin",
  hint = "Enter the admin token to review bookings.",
}: { devHint: boolean; disabled: boolean; title?: string; hint?: string }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return setError(((await res.json()) as { message?: string }).message ?? "Sign-in failed");
    startTransition(() => router.refresh());
  }

  return (
    <form className="mx-auto flex w-full max-w-sm flex-col gap-4 pt-16 md:pt-24" onSubmit={submit}>
      <span className="flex size-11 items-center justify-center rounded-2xl bg-muted">
        <LockIcon className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading font-semibold text-2xl tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">
          {disabled ? "Set ADMIN_TOKEN in the Worker's secrets to enable this page." : hint}
        </p>
      </div>
      {!disabled && (
        <>
          <Input
            aria-invalid={Boolean(error)}
            aria-label="Admin token"
            autoComplete="current-password"
            autoFocus
            onChange={(e) => setToken(e.target.value)}
            placeholder="Admin token"
            type="password"
            value={token}
          />
          {error && <p className="text-destructive-foreground text-sm">{error}</p>}
          <Button disabled={!token} loading={pending} type="submit">
            Sign in
          </Button>
          {devHint && (
            <p className="rounded-lg border border-dashed px-3 py-2 font-mono text-muted-foreground text-xs">
              Dev mode: ADMIN_TOKEN is unset, the token is <span className="text-foreground">dev-admin</span>.
            </p>
          )}
        </>
      )}
    </form>
  );
}

export function AdminBoard({ bookings, currentPeriod, stats }: { bookings: Booking[]; currentPeriod: string; stats: Record<string, BookingStats> }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const counts = useMemo(() => {
    const c = Object.fromEntries(order.map((s) => [s, 0])) as Record<BookingStatus, number>;
    for (const b of bookings) c[b.status]++;
    return c;
  }, [bookings]);
  const [filter, setFilter] = useState<BookingStatus>(counts.in_review > 0 ? "in_review" : "scheduled");
  const visible = bookings.filter((b) => b.status === filter);

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-12 pt-10 md:pt-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-brand-ink text-xs uppercase tracking-widest">Admin</p>
          <h1 className="font-heading font-semibold text-3xl tracking-tight md:text-4xl">Sponsors</h1>
        </div>
        <Button onClick={signOut} size="sm" variant="ghost">
          <LogOutIcon />
          Sign out
        </Button>
      </header>

      <Calendar bookings={bookings} currentPeriod={currentPeriod} />

      <section className="flex flex-col gap-5">
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
          <GooGroup
            items={order.map((status) => ({
              value: status,
              label: (
                <>
                  {statusMeta[status].label}
                  <span className="font-mono text-[10px] opacity-60 tabular-nums">{counts[status]}</span>
                </>
              ),
            }))}
            label="Filter bookings by status"
            onValueChange={(v) => setFilter(v as BookingStatus)}
            size="sm"
            value={filter}
          />
        </div>
        <ul className="flex flex-col divide-y rounded-2xl border bg-card">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.length === 0 ? (
              <motion.li animate={{ opacity: 1 }} className="px-5 py-10 text-center text-muted-foreground text-sm" initial={{ opacity: 0 }} key="empty">
                Nothing {statusMeta[filter].label.toLowerCase()}.
              </motion.li>
            ) : (
              visible.map((booking) => (
                <motion.li
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, x: 16 }}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  key={booking.id}
                  layout={!reduce}
                  transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <BookingRow booking={booking} live={booking.status === "scheduled" && booking.periodStart === currentPeriod} stats={stats[booking.id]} />
                </motion.li>
              ))
            )}
          </AnimatePresence>
        </ul>
      </section>
    </div>
  );
}

type Action = "approve" | "reject" | "refetch-image" | "decline-image";

function imageStatus(booking: Booking) {
  switch (booking.ogImageStatus) {
    case "ready":
      return `og:image · ${booking.status === "scheduled" ? "frozen" : "ready"}`;
    case "none":
      return "No og:image — monogram design";
    case "failed":
      return `og:image failed: ${booking.ogImageNote ?? "unknown error"}`;
    case "declined":
      return "No image (declined) — monogram design";
  }
}

function BookingRow({ booking, live, stats }: { booking: Booking; live: boolean; stats?: BookingStats }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  async function act(action: Action) {
    setBusy(action);
    setError(null);
    const res = await fetch(`/api/admin/bookings/${booking.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      setError(((await res.json()) as { message?: string }).message ?? "Action failed");
      setBusy(null);
      return;
    }
    startTransition(() => router.refresh());
  }

  const canReview = booking.status === "in_review";
  const canReject = booking.status === "in_review" || booking.status === "scheduled";
  const canEditImage = booking.status === "in_review" || booking.status === "holding";
  const image = imageUrl(booking.ogImageKey);

  return (
    <div className="flex flex-col">
    <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:gap-6 md:px-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {image ? (
          <a className="relative block w-28 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-36" href={image} rel="noopener" target="_blank">
            <img alt={`${booking.productName} og:image under review`} className="aspect-video w-full object-cover" src={image} />
            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-black/8 ring-inset dark:ring-white/10" />
          </a>
        ) : (
          <Monogram className="size-10 text-sm" creative={{ name: booking.productName, accent: booking.accent, monogram: booking.monogram }} />
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{booking.productName}</span>
            <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider", statusMeta[booking.status].chip)}>
              {live ? "Live now" : statusMeta[booking.status].label}
            </span>
          </div>
          <p className="text-pretty text-muted-foreground text-sm">{booking.pitch}</p>
          <p className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-muted-foreground">
            <a className="inline-flex items-center gap-0.5 hover:text-foreground" href={booking.url} rel="noopener noreferrer" target="_blank">
              {booking.url.replace(/^https:\/\//, "")}
              <ArrowUpRightIcon className="size-3" />
            </a>
            <a className="hover:text-foreground" href={`mailto:${booking.email}`}>
              {booking.email}
            </a>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
            <span className="text-muted-foreground" title={booking.ogImageSource ?? booking.ogImageNote ?? undefined}>
              {imageStatus(booking)}
            </span>
            {canEditImage && (
              <>
                <button
                  className="underline-offset-4 hover:underline disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() => act("refetch-image")}
                  type="button"
                >
                  {busy === "refetch-image" ? "Refetching…" : "Refetch image"}
                </button>
                {booking.ogImageStatus !== "declined" && (
                  <button
                    className="underline-offset-4 hover:underline disabled:opacity-50"
                    disabled={busy !== null}
                    onClick={() => act("decline-image")}
                    type="button"
                  >
                    Use no image
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-x-4 font-mono text-[11px] md:w-[22rem] md:shrink-0">
        <div>
          <dt className="text-muted-foreground">placement</dt>
          <dd className="truncate">{placements[booking.placementId].label.replace(" grid", "")}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">dates</dt>
          <dd className="tabular-nums">{formatPeriod(booking.periodStart)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">paid</dt>
          <dd className="tabular-nums">{booking.paidAt ? formatPrice(booking.amountCents) : "—"}</dd>
        </div>
      </dl>
      <div className="flex items-center gap-2 md:w-56 md:shrink-0 md:justify-end">
        {canReview && (
          <Button disabled={busy !== null} loading={busy === "approve"} onClick={() => act("approve")} size="sm">
            Approve
          </Button>
        )}
        {canReject && (
          <Button
            disabled={busy !== null}
            loading={busy === "reject"}
            onClick={() => (confirming ? act("reject") : setConfirming(true))}
            size="sm"
            variant={confirming ? "destructive" : "outline"}
          >
            {confirming ? "Confirm refund" : "Reject"}
          </Button>
        )}
        {error && <p className="text-destructive-foreground text-xs">{error}</p>}
      </div>
    </div>
      {booking.paidAt && stats && <StatsStrip booking={booking} stats={stats} />}
    </div>
  );
}

function StatsStrip({ booking, stats }: { booking: Booking; stats: BookingStats }) {
  const [copied, setCopied] = useState(false);
  const share = booking.statsToken ? `/sponsor-stats?t=${booking.statsToken}` : null;
  const destination = withUtm(booking.url, { medium: "sponsored", campaign: campaignOf(booking.placementId), content: "" }) ?? booking.url;
  return (
    <div className="grid gap-3 border-t border-dashed px-4 py-3 font-mono text-[11px] md:grid-cols-[auto_auto_auto_9rem_minmax(0,1fr)_auto] md:items-center md:gap-6 md:px-5">
      {[
        ["impressions", stats.impressions.toLocaleString("en-US")],
        ["clicks", stats.clicks.toLocaleString("en-US")],
        ["ctr", formatCtr(stats.ctr)],
      ].map(([label, value]) => (
        <div className="flex items-baseline gap-2 md:flex-col md:gap-0" key={label}>
          <span className="text-muted-foreground">{label}</span>
          <span className="font-sans font-semibold text-base tabular-nums">{value}</span>
        </div>
      ))}
      <Sparkline className="h-7 w-36" days={stats.days} label={`${booking.productName} impressions and clicks per day`} />
      <p className="min-w-0 truncate text-muted-foreground" title={`${destination} + utm_content=<page>`}>
        → <span className="text-foreground">{destination}</span>
      </p>
      {share && (
        <div className="flex items-center gap-2">
          <a className="inline-flex items-center gap-1 underline-offset-4 hover:underline" href={share} rel="noopener" target="_blank">
            Share stats
            <ArrowUpRightIcon className="size-3" />
          </a>
          <button
            aria-label="Copy stats link"
            className="inline-flex size-6 items-center justify-center rounded-md hover:bg-accent"
            onClick={async () => {
              await navigator.clipboard.writeText(new URL(share, window.location.origin).toString());
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            type="button"
          >
            {copied ? <CheckIcon className="size-3.5" /> : <LinkIcon className="size-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}

function Calendar({ bookings, currentPeriod }: { bookings: Booking[]; currentPeriod: string }) {
  const periods = Array.from({ length: PERIODS_AHEAD + 1 }, (_, i) => addPeriods(currentPeriod, i));
  const claims = new Map<string, Booking>();
  for (const b of bookings) if (b.status === "holding" || b.status === "in_review" || b.status === "scheduled") claims.set(`${b.placementId}|${b.periodStart}`, b);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-mono text-muted-foreground text-xs uppercase tracking-widest">This fortnight and the next {PERIODS_AHEAD}</h2>
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <table className="w-full min-w-[48rem] border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="w-36 text-left font-normal text-muted-foreground" scope="col">
                <span className="sr-only">Placement</span>
              </th>
              {periods.map((week) => (
                <th className="px-1 pb-1 text-left font-mono font-normal text-[10px] text-muted-foreground tabular-nums" key={week} scope="col">
                  {week === currentPeriod ? <span className="text-brand-ink">now</span> : formatPeriod(week)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {placementIds.map((id) => (
              <tr key={id}>
                <th className="pe-2 text-left font-medium" scope="row">
                  {placements[id].label.replace(" grid", "")}
                </th>
                {periods.map((week) => {
                  const claim = claims.get(`${id}|${week}`);
                  return (
                    <td key={week}>
                      <div
                        className={cn(
                          "flex h-9 items-center truncate rounded-md px-1.5 text-[11px]",
                          claim ? statusMeta[claim.status].chip : "border border-dashed text-muted-foreground/40",
                        )}
                        title={claim ? `${claim.productName} · ${statusMeta[claim.status].label}` : "Open"}
                      >
                        {claim ? claim.productName : "open"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 font-mono text-[10px] text-muted-foreground">
        {(["scheduled", "in_review", "holding"] as const).map((s) => (
          <span className="flex items-center gap-1.5" key={s}>
            <span className={cn("size-2.5 rounded-sm", statusMeta[s].chip)} />
            {statusMeta[s].label}
          </span>
        ))}
      </div>
    </section>
  );
}
