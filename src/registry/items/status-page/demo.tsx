import { type DayStatus, StatusPage } from "@/registry/items/status-page/status-page";

function days(marks: Record<number, DayStatus>, noDataBefore = 0): DayStatus[] {
  return Array.from({ length: 90 }, (_, i) => (i < noDataBefore ? "none" : (marks[i] ?? "operational")));
}

export default function StatusPageDemo() {
  return (
    <div className="px-4 py-10 sm:px-8 sm:py-12">
      <StatusPage
        company="Fernway"
        components={[
          { id: "api", name: "REST API", description: "api.fernway.dev", status: "operational", history: days({ 41: "degraded", 77: "degraded" }), notes: { 41: "Elevated 5xx rate for 18 minutes.", 77: "Slow responses from eu-west for 42 minutes." } },
          { id: "dash", name: "Dashboard", status: "operational", history: days({ 63: "outage" }), notes: { 63: "Dashboard unavailable for 26 minutes after a bad deploy." } },
          { id: "hooks", name: "Webhooks", description: "Delivery and retries", status: "operational", history: days({ 22: "degraded", 63: "degraded" }), notes: { 22: "Deliveries delayed up to 6 minutes.", 63: "Retries queued during the dashboard outage." } },
          { id: "search", name: "Search", description: "Full-text and filters", status: "degraded", history: days({ 52: "degraded", 89: "degraded" }), notes: { 52: "Index rebuild slowed queries for 1 hour.", 89: "Ongoing: p95 latency above 2s." } },
          { id: "files", name: "File storage", status: "operational", history: days({}, 18) },
          { id: "auth", name: "Sign-in & SSO", status: "operational", history: days({ 8: "degraded" }), notes: { 8: "SSO logins slow for one identity provider." } },
        ]}
        incidents={[
          {
            id: "i3",
            title: "Elevated search latency",
            impact: "minor",
            date: "Today",
            updates: [
              { stage: "identified", time: "10:42 UTC", body: "A hot shard in us-east is slowing some queries. We’re rebalancing it now; results are still correct." },
              { stage: "investigating", time: "10:18 UTC", body: "Some searches are taking longer than usual to return." },
            ],
          },
          {
            id: "i2",
            title: "Dashboard unavailable",
            impact: "major",
            date: "Sep 28, 2026",
            updates: [
              { stage: "resolved", time: "14:51 UTC", body: "The rollback finished and every region is serving normally." },
              { stage: "monitoring", time: "14:38 UTC", body: "We rolled back the release and are watching error rates." },
              { stage: "investigating", time: "14:25 UTC", body: "The dashboard returns errors for most users. The API is not affected." },
            ],
          },
        ]}
        onSubscribe={() => new Promise((r) => setTimeout(r, 800))}
        today="2026-10-24"
      />
    </div>
  );
}
