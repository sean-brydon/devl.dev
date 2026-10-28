import { Effect, Option } from "effect";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminLogin } from "@/components/sponsor/admin-board";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { EventName } from "@/server/events";
import { adminCredentials, devAdminHint, requireAdmin, runEffect } from "@/server/runtime";
import { type Count, eventNames, Usage, type UsageReport } from "@/server/usage";

export const metadata: Metadata = { title: "Usage stats", robots: { index: false, follow: false } };

const ranges = [7, 30, 90];

const labels: Record<EventName, { title: string; hint: string }> = {
  install: { title: "Installs", hint: "/r/<slug>.json (shadcn CLI)" },
  raw: { title: "Raw source", hint: "/raw/<slug>.tsx" },
  mcp: { title: "MCP calls", hint: "/mcp tools and methods" },
  llms: { title: "llms.txt", hint: "/llms.txt" },
  skill: { title: "Skill", hint: "/skill/SKILL.md" },
};

export default function AdminStatsPage({ searchParams }: PageProps<"/admin/stats">) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-12 pb-24 md:px-8">
      <Suspense
        fallback={
          <div className="flex min-h-[50svh] items-center justify-center text-muted-foreground">
            <Spinner />
          </div>
        }
      >
        <StatsGate searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function StatsGate({ searchParams }: Pick<PageProps<"/admin/stats">, "searchParams">) {
  const credentials = await adminCredentials();
  const asked = Number((await searchParams).days);
  const days = ranges.includes(asked) ? asked : 30;
  await connection();
  const state = await runEffect(
    Effect.gen(function* () {
      const access = yield* requireAdmin(credentials).pipe(
        Effect.as({ ok: true as const }),
        Effect.catchTag("Unauthorized", (e) => Effect.succeed({ ok: false as const, reason: e.message })),
      );
      if (!access.ok) return { authed: false as const, reason: access.reason, devHint: yield* devAdminHint };
      const report = yield* Usage.use((u) => u.report(days)).pipe(
        Effect.map((r) => ({ ok: true as const, report: r })),
        Effect.catchTag("AnalyticsUnavailable", (e) => Effect.succeed({ ok: false as const, error: e.message })),
      );
      return { authed: true as const, report };
    }),
  );

  if (!state.authed) {
    return <AdminLogin devHint={state.devHint} disabled={state.reason.startsWith("Set ADMIN_TOKEN")} hint="Enter the admin token to see installs and agent usage." title="Usage stats" />;
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-brand-ink text-xs uppercase tracking-widest">Admin · usage</p>
          <h1 className="font-heading font-semibold text-3xl tracking-tight md:text-4xl">Installs and agents</h1>
          <p className="text-muted-foreground text-sm">
            From Workers Analytics Engine (<code className="font-mono text-xs">devl_events</code>). Page views live in Cloudflare Web Analytics.
          </p>
        </div>
        <nav className="flex gap-1 rounded-full border p-1 font-mono text-xs">
          {ranges.map((range) => (
            <Link
              className={cn("rounded-full px-3 py-1", range === days ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              href={`/admin/stats?days=${range}`}
              key={range}
            >
              {range}d
            </Link>
          ))}
        </nav>
      </header>
      {!state.report.ok ? (
        <Notice>{state.report.error}</Notice>
      ) : Option.isNone(state.report.report) ? (
        <Notice>
          Set <code className="font-mono">CF_ACCOUNT_ID</code> and <code className="font-mono">CF_ANALYTICS_TOKEN</code> in the Worker's secrets to read the stats here. ANALYTICS.md has the steps.
        </Notice>
      ) : (
        <Report report={state.report.report.value} />
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed p-4 text-muted-foreground text-sm">{children}</p>;
}

function Report({ report }: { report: UsageReport }) {
  const peak = Math.max(1, ...report.daily.map((d) => d.counts.install + d.counts.raw + d.counts.mcp));
  return (
    <>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {eventNames.map((event) => (
          <div className="flex flex-col gap-1 rounded-2xl border bg-card p-4" key={event}>
            <dt className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">{labels[event].title}</dt>
            <dd className="font-heading font-semibold text-2xl tabular-nums md:text-3xl">{report.totals[event].toLocaleString("en-US")}</dd>
            <dd className="truncate font-mono text-[10px] text-muted-foreground">{labels[event].hint}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-muted-foreground text-xs uppercase tracking-widest">Per day · installs, raw, MCP</h2>
        {report.daily.length === 0 ? (
          <Notice>Nothing recorded in the last {report.days} days yet.</Notice>
        ) : (
          <div className="flex h-32 items-end gap-px rounded-2xl border bg-card p-4">
            {report.daily.map(({ day, counts }) => (
              <div
                className="flex min-w-1 flex-1 flex-col justify-end"
                key={day}
                style={{ height: "100%" }}
                title={`${day}: ${counts.install} installs, ${counts.raw} raw, ${counts.mcp} MCP`}
              >
                <div className="bg-foreground/15" style={{ height: `${(counts.mcp / peak) * 100}%` }} />
                <div className="bg-foreground/40" style={{ height: `${(counts.raw / peak) * 100}%` }} />
                <div className="bg-brand-ink" style={{ height: `${(counts.install / peak) * 100}%` }} />
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <Ranked rows={report.top.install} title="Top installs" />
        <Ranked rows={report.top.raw} title="Top raw source" />
        <Ranked rows={report.top.mcp} title="MCP tools and methods" />
        <Ranked rows={report.mcpItems} title="Items read over MCP (get_item)" />
        <Ranked rows={report.mcpClients} title="MCP clients (initialize)" />
        <Ranked rows={report.clients.install} title="Install clients" />
        <Ranked rows={report.countries} title="Countries" />
        <Ranked rows={report.referrers} title="Referrers" />
      </div>
    </>
  );
}

function Ranked({ title, rows }: { title: string; rows: Count[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-mono text-muted-foreground text-xs uppercase tracking-widest">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">None yet.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="py-1.5 font-mono text-xs">{row.key}</td>
                <td className="py-1.5 text-right tabular-nums">{row.count.toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
