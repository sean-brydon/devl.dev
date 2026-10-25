"use client";

import { defineFields, f } from "@qnot/core";
import { AlertRules, type PastIncident } from "@/registry/items/alert-rules/alert-rules";

const signalFields = defineFields({
  errorRate: f.number({ label: "Error rate", min: 0, max: 100, suffix: "%" }),
  p95: f.number({ label: "p95 latency", min: 0, suffix: "ms" }),
  cpu: f.number({ label: "CPU", min: 0, max: 100, suffix: "%" }),
  minutes: f.number({ label: "Duration", min: 1, max: 1440, integer: true, suffix: "min" }),
  service: f.enum([
    { value: "checkout", label: "checkout" },
    { value: "payments", label: "payments" },
    { value: "search", label: "search" },
    { value: "auth", label: "auth" },
  ]),
  env: f.enum(
    [
      { value: "production", label: "production" },
      { value: "staging", label: "staging" },
    ],
    { label: "Environment" },
  ),
  region: f.enum([
    { value: "us-east", label: "us-east" },
    { value: "eu-west", label: "eu-west" },
  ]),
});

const incidents: PastIncident[] = [
  { id: "i1", day: 1.5, at: "Sep 26", title: "Card tokenizer timeouts", errorRate: 3.4, p95: 1840, cpu: 62, minutes: 12, service: "checkout", env: "production", region: "us-east" },
  { id: "i2", day: 3.2, at: "Sep 28", title: "Search index rebuild", errorRate: 0.4, p95: 2900, cpu: 91, minutes: 40, service: "search", env: "production", region: "eu-west" },
  { id: "i3", day: 4.8, at: "Sep 29", title: "Coupon service 502s", errorRate: 2.6, p95: 960, cpu: 48, minutes: 3, service: "checkout", env: "production", region: "eu-west" },
  { id: "i4", day: 6.1, at: "Oct 1", title: "Staging deploy smoke test", errorRate: 9.8, p95: 700, cpu: 30, minutes: 22, service: "checkout", env: "staging", region: "us-east" },
  { id: "i5", day: 8.4, at: "Oct 3", title: "Login rate limiter misfire", errorRate: 5.1, p95: 420, cpu: 55, minutes: 9, service: "auth", env: "production", region: "us-east" },
  { id: "i6", day: 10.2, at: "Oct 5", title: "Tax provider degraded", errorRate: 2.2, p95: 2100, cpu: 51, minutes: 31, service: "checkout", env: "production", region: "us-east" },
  { id: "i7", day: 12.9, at: "Oct 8", title: "Webhook backlog", errorRate: 1.1, p95: 3300, cpu: 77, minutes: 55, service: "payments", env: "production", region: "us-east" },
  { id: "i8", day: 14.3, at: "Oct 9", title: "Cart totals mismatch", errorRate: 1.6, p95: 880, cpu: 44, minutes: 18, service: "checkout", env: "production", region: "eu-west" },
  { id: "i9", day: 16.7, at: "Oct 11", title: "Node pool rotation", errorRate: 0.9, p95: 1500, cpu: 96, minutes: 14, service: "search", env: "production", region: "us-east" },
  { id: "i10", day: 18.5, at: "Oct 13", title: "3-D Secure challenge loop", errorRate: 4.7, p95: 1200, cpu: 58, minutes: 7, service: "checkout", env: "production", region: "eu-west" },
  { id: "i11", day: 20.1, at: "Oct 15", title: "Refund job retries", errorRate: 2.9, p95: 640, cpu: 39, minutes: 26, service: "payments", env: "production", region: "eu-west" },
  { id: "i12", day: 22.6, at: "Oct 17", title: "Session store failover", errorRate: 6.3, p95: 2600, cpu: 83, minutes: 4, service: "auth", env: "production", region: "eu-west" },
  { id: "i13", day: 24.4, at: "Oct 19", title: "Shipping rates API slow", errorRate: 2.1, p95: 3100, cpu: 47, minutes: 11, service: "checkout", env: "production", region: "us-east" },
  { id: "i14", day: 26.8, at: "Oct 21", title: "Load test in staging", errorRate: 12.4, p95: 4100, cpu: 99, minutes: 35, service: "checkout", env: "staging", region: "eu-west" },
  { id: "i15", day: 28.9, at: "Oct 24", title: "Payment method list empty", errorRate: 3.1, p95: 760, cpu: 41, minutes: 6, service: "checkout", env: "production", region: "us-east" },
];

export default function AlertRulesDemo() {
  return (
    <AlertRules
      actions={[
        { id: "page", name: "Page the on-call" },
        { id: "slack", name: "Post in #inc-checkout" },
        { id: "email", name: "Email the payments team" },
      ]}
      defaultName="Checkout error spike"
      defaultScope={{
        kind: "group",
        combinator: "and",
        children: [
          { kind: "rule", field: "service", operator: "eq", value: "checkout" },
          { kind: "rule", field: "env", operator: "eq", value: "production" },
        ],
      }}
      defaultTrigger={{ metric: "errorRate", operator: "gt", threshold: 2, minutes: 5 }}
      durationField="minutes"
      fields={signalFields}
      incidents={incidents}
      metrics={["errorRate", "p95", "cpu"]}
    />
  );
}
