"use client";

import { defineFields, f } from "@qnot/core";
import { FlagTargeting } from "@/registry/items/flag-targeting/flag-targeting";

const userFields = defineFields({
  country: f.enum([
    { value: "us", label: "United States" },
    { value: "de", label: "Germany" },
    { value: "fr", label: "France" },
    { value: "gb", label: "United Kingdom" },
    { value: "jp", label: "Japan" },
    { value: "br", label: "Brazil" },
  ]),
  plan: f.enum([
    { value: "free", label: "Free" },
    { value: "pro", label: "Pro" },
    { value: "team", label: "Team" },
    { value: "enterprise", label: "Enterprise" },
  ]),
  email: f.text(),
  build: f.number({ label: "App build", min: 1, integer: true }),
  beta: f.boolean({ label: "Beta tester" }),
});

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const rand = seeded(42);
const pick = <T,>(items: readonly T[], weights: readonly number[]) => {
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) if ((r -= weights[i]) < 0) return items[i];
  return items[items.length - 1];
};

const population = Array.from({ length: 2000 }, (_, i) => ({
  id: `u_${(48213 + i * 7).toString(36)}`,
  country: pick(["us", "de", "fr", "gb", "jp", "br"], [38, 16, 10, 14, 12, 10]),
  plan: pick(["free", "pro", "team", "enterprise"], [55, 25, 14, 6]),
  email: i % 97 === 0 ? `dev${i}@northwind.io` : `user${i}@mail.example`,
  build: 380 + Math.floor(rand() * 60),
  beta: rand() < 0.12,
}));

const variants = [
  { id: "control", name: "Control", tone: "bg-sky-500" },
  { id: "one-page", name: "One-page", tone: "bg-violet-500" },
];

export default function FlagTargetingDemo() {
  return (
    <FlagTargeting
      environments={[
        { id: "production", name: "Production" },
        { id: "staging", name: "Staging" },
        { id: "development", name: "Development" },
      ]}
      fields={userFields}
      flagKey="checkout.one-page"
      flagName="One-page checkout"
      population={population}
      targeting={{
        production: {
          on: true,
          rules: [
            {
              id: "staff",
              when: { kind: "group", combinator: "and", children: [{ kind: "rule", field: "email", operator: "endsWith", value: "@northwind.io" }] },
              serve: "one-page",
            },
            {
              id: "beta-eu",
              when: {
                kind: "group",
                combinator: "and",
                children: [
                  { kind: "rule", field: "beta", operator: "eq", value: true },
                  { kind: "rule", field: "country", operator: "in", value: ["de", "fr", "gb"] },
                ],
              },
              serve: "one-page",
            },
          ],
          rollout: { control: 90, "one-page": 10 },
          offVariant: "control",
        },
        staging: {
          on: true,
          rules: [
            {
              id: "staff-staging",
              when: { kind: "group", combinator: "and", children: [{ kind: "rule", field: "email", operator: "endsWith", value: "@northwind.io" }] },
              serve: "one-page",
            },
          ],
          rollout: { control: 50, "one-page": 50 },
          offVariant: "control",
        },
        development: { on: false, rules: [], rollout: { control: 0, "one-page": 100 }, offVariant: "control" },
      }}
      variants={variants}
    />
  );
}
