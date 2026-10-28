import { Effect } from "effect";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminBoard, AdminLogin } from "@/components/sponsor/admin-board";
import { Spinner } from "@/components/ui/spinner";
import { periodStartOf } from "@/lib/sponsors";
import { Bookings } from "@/server/bookings";
import { Stats } from "@/server/stats";
import { adminCredentials, devAdminHint, requireAdmin, runEffect } from "@/server/runtime";

export const metadata: Metadata = { title: "Sponsors admin", robots: { index: false, follow: false } };

export default function AdminSponsorsPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 md:px-8">
      <Suspense
        fallback={
          <div className="flex min-h-[50svh] items-center justify-center text-muted-foreground">
            <Spinner />
          </div>
        }
      >
        <AdminGate />
      </Suspense>
    </div>
  );
}

async function AdminGate() {
  const credentials = await adminCredentials();
  await connection();
  const state = await runEffect(
    Effect.gen(function* () {
      const access = yield* requireAdmin(credentials).pipe(
        Effect.as({ ok: true as const }),
        Effect.catchTag("Unauthorized", (e) => Effect.succeed({ ok: false as const, reason: e.message })),
      );
      if (!access.ok) return { authed: false as const, reason: access.reason, devHint: yield* devAdminHint };
      const bookings = yield* Bookings.use((b) => b.list);
      const stats = yield* Stats.use((s) => s.forBookings(bookings));
      return { authed: true as const, bookings, stats, currentPeriod: periodStartOf(Date.now()) };
    }),
  );

  if (!state.authed) return <AdminLogin devHint={state.devHint} disabled={state.reason.startsWith("Set ADMIN_TOKEN")} />;
  return <AdminBoard bookings={state.bookings} currentPeriod={state.currentPeriod} stats={state.stats} />;
}
