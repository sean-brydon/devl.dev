"use client";

import { defineFields, f } from "@qnot/core";
import { RoutingRules } from "@/registry/items/routing-rules/routing-rules";

const formFields = defineFields({
  companySize: f.number({ label: "Company size", min: 1, integer: true }),
  region: f.enum([
    { value: "eu", label: "Europe" },
    { value: "na", label: "North America" },
    { value: "apac", label: "Asia Pacific" },
    { value: "latam", label: "Latin America" },
  ]),
  role: f.enum([
    { value: "engineering", label: "Engineering" },
    { value: "product", label: "Product" },
    { value: "operations", label: "Operations" },
    { value: "executive", label: "Executive" },
  ]),
  useCase: f.enum([
    { value: "scheduling", label: "Team scheduling" },
    { value: "routing", label: "Lead routing" },
    { value: "payments", label: "Paid bookings" },
    { value: "api", label: "Platform / API" },
  ]),
  email: f.text({ label: "Work email" }),
});

let seed = 11;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
const history = Array.from({ length: 400 }, () => ({
  companySize: Math.round(2 + rand() ** 3 * 4000),
  region: pick(["eu", "eu", "na", "na", "na", "apac", "latam"]),
  role: pick(["engineering", "product", "operations", "executive"]),
  useCase: pick(["scheduling", "scheduling", "routing", "payments", "api"]),
  email: "someone@company.example",
}));

export default function RoutingRulesDemo() {
  return (
    <RoutingRules
      description="Where a demo request lands. Checked top to bottom, first match wins."
      destinations={[
        { id: "enterprise", name: "Enterprise AE", detail: "Round robin across 4 AEs" },
        { id: "sales-eu", name: "Sales EU", detail: "Berlin team, CET hours" },
        { id: "sales-na", name: "Sales NA", detail: "New York team, ET hours" },
        { id: "partners", name: "Partnerships", detail: "Platform partner desk" },
        { id: "self-serve", name: "Self-serve booking", detail: "15 min intro call" },
      ]}
      fallback="self-serve"
      fields={formFields}
      history={history}
      routes={[
        {
          id: "big",
          to: "enterprise",
          when: { kind: "group", combinator: "and", children: [{ kind: "rule", field: "companySize", operator: "gte", value: 1000 }] },
        },
        {
          id: "eu",
          to: "sales-eu",
          when: {
            kind: "group",
            combinator: "and",
            children: [
              { kind: "rule", field: "companySize", operator: "gt", value: 50 },
              { kind: "rule", field: "region", operator: "eq", value: "eu" },
            ],
          },
        },
        {
          id: "na",
          to: "sales-na",
          when: {
            kind: "group",
            combinator: "and",
            children: [
              { kind: "rule", field: "companySize", operator: "gt", value: 50 },
              { kind: "rule", field: "region", operator: "eq", value: "na" },
            ],
          },
        },
        {
          id: "api",
          to: "partners",
          when: {
            kind: "group",
            combinator: "and",
            children: [
              { kind: "rule", field: "useCase", operator: "eq", value: "api" },
              { kind: "rule", field: "role", operator: "eq", value: "engineering" },
            ],
          },
        },
      ]}
      sampleResponse={{ companySize: 120, region: "eu", role: "product", useCase: "routing", email: "ines@lumen.example" }}
      title="Demo request routing"
    />
  );
}
