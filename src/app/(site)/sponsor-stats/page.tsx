import { Effect } from "effect";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatCtr, Sparkline } from "@/components/sponsor/sparkline";
import { Spinner } from "@/components/ui/spinner";
import { campaignOf, formatPeriod, periodStartOf, placements } from "@/lib/sponsors";
import { withUtm } from "@/lib/utm";
import { Bookings } from "@/server/bookings";
import { runEffect } from "@/server/runtime";
import { Stats } from "@/server/stats";

export const metadata: Metadata = { title: "Sponsor stats", robots: { index: false, follow: false } };

export default function SponsorStatsPage({ searchParams }: PageProps<"/sponsor-stats">) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-12 pb-24 md:pt-20">
      <Suspense
        fallback={
          <div className="flex min-h-[40svh] items-center justify-center text-muted-foreground">
            <Spinner />
          </div>
        }
      >
        <StatsView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function StatsView({ searchParams }: Pick<PageProps<"/sponsor-stats">, "searchParams">) {
  const t = (await searchParams).t;
  const token = typeof t === "string" ? t : "";
  await connection();
  if (!/^[0-9a-f]{36}$/.test(token)) notFound();
  const data = await runEffect(
    Effect.gen(function* () {
      const booking = yield* Bookings.use((b) => b.byStatsToken(token));
      const stats = yield* Stats.use((s) => s.forBookings([booking]));
      return { booking, stats: stats[booking.id] };
    }).pipe(Effect.catchTag("BookingNotFound", () => Effect.succeed(null))),
  );
  if (!data) notFound();
  const { booking, stats } = data;
  const placement = placements[booking.placementId];
  const current = periodStartOf(Date.now());
  const state =
    booking.status !== "scheduled"
      ? booking.status.replace("_", " ")
      : booking.periodStart === current
        ? "live now"
        : booking.periodStart > current
          ? "scheduled"
          : "finished";
  const destination = withUtm(booking.url, {
    medium: "sponsored",
    campaign: campaignOf(booking.placementId),
    content: "",
  });

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-brand-ink text-xs uppercase tracking-widest">Sponsor stats · {state}</p>
        <h1 className="text-balance font-heading font-semibold text-3xl tracking-tight md:text-5xl">{booking.productName} on devl</h1>
        <p className="text-muted-foreground">
          {placement.label} · {formatPeriod(booking.periodStart)} (UTC)
        </p>
      </header>

      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: "Impressions", value: stats.impressions.toLocaleString("en-US") },
          { label: "Clicks", value: stats.clicks.toLocaleString("en-US") },
          { label: "CTR", value: formatCtr(stats.ctr) },
        ].map((m) => (
          <div className="flex flex-col gap-1 rounded-2xl border bg-card p-4" key={m.label}>
            <dt className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">{m.label}</dt>
            <dd className="font-heading font-semibold text-2xl tabular-nums md:text-3xl">{m.value}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-muted-foreground text-xs uppercase tracking-widest">Per day</h2>
        <div className="rounded-2xl border bg-card p-4">
          <Sparkline className="h-24 w-full" days={stats.days} label="Impressions and clicks per day" stretch />
          <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground tabular-nums">
            <span>{formatPeriod(booking.periodStart, true)}</span>
            <span className="flex gap-3">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-sm bg-foreground/15" /> impressions
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-sm bg-brand-ink" /> clicks
              </span>
            </span>
          </div>
        </div>
      </section>

      {stats.byContent.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-muted-foreground text-xs uppercase tracking-widest">Where it was seen</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[11px] text-muted-foreground">
                <th className="pb-2 font-normal">Page</th>
                <th className="pb-2 text-right font-normal">Impressions</th>
                <th className="pb-2 text-right font-normal">Clicks</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.byContent.slice(0, 20).map((row) => (
                <tr key={row.content}>
                  <td className="py-2 font-mono text-xs">{row.content}</td>
                  <td className="py-2 text-right tabular-nums">{row.impressions}</td>
                  <td className="py-2 text-right tabular-nums">{row.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="flex flex-col gap-2 border-t pt-6 text-muted-foreground text-sm">
        <p>
          Clicks land on <span className="break-all font-mono text-foreground text-xs">{destination}</span>, plus{" "}
          <span className="font-mono text-foreground text-xs">utm_content</span> set to the {booking.placementId === "item" ? "item" : "page"} it
          was clicked on.
        </p>
        <p className="text-xs">
          First-party counts, aggregated per day. An impression is your ad at least half on screen for a second, once per page view.
          Bots are excluded; no cookies, IPs or personal data are stored.
        </p>
      </section>
    </div>
  );
}
