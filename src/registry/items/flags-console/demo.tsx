"use client";

import { defineFields, f } from "@qnot/core";
import { type ConsoleFlag, FlagsConsole } from "@/registry/items/flags-console/flags-console";

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

let seed = 3;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
const traffic = Array.from({ length: 600 }, (_, i) => ({
  id: `u_${(91000 + i * 37).toString(36)}`,
  country: pick(["us", "us", "us", "de", "fr", "gb", "gb", "jp", "br"]),
  plan: pick(["free", "free", "free", "pro", "pro", "team", "enterprise"]),
  email: i % 41 === 0 ? `eng${i}@northwind.io` : `user${i}@mail.example`,
  build: 400 + Math.floor(rand() * 30),
  beta: rand() < 0.15,
}));

const off = { on: false, rules: [], rollout: 0, offVariant: "off" };

const flags: ConsoleFlag[] = [
  {
    key: "checkout.one-page",
    description: "Single-step checkout",
    owner: "Payments",
    variants: [
      { id: "control", name: "Control", tone: "bg-sky-500" },
      { id: "one-page", name: "One-page", tone: "bg-violet-500" },
    ],
    envs: {
      production: {
        on: true,
        rules: [
          { id: "p1", serve: "one-page", when: { kind: "group", combinator: "and", children: [{ kind: "rule", field: "email", operator: "endsWith", value: "@northwind.io" }] } },
          {
            id: "p2",
            serve: "one-page",
            when: {
              kind: "group",
              combinator: "and",
              children: [
                { kind: "rule", field: "beta", operator: "eq", value: true },
                { kind: "rule", field: "country", operator: "in", value: ["de", "fr", "gb"] },
              ],
            },
          },
        ],
        rollout: 10,
        offVariant: "control",
      },
      staging: { on: true, rules: [], rollout: 50, offVariant: "control" },
    },
  },
  {
    key: "search.semantic",
    description: "Embedding search in the command bar",
    owner: "Search",
    variants: [
      { id: "keyword", name: "Keyword", tone: "bg-amber-500" },
      { id: "semantic", name: "Semantic", tone: "bg-emerald-500" },
    ],
    envs: {
      production: {
        on: true,
        rules: [
          {
            id: "s1",
            serve: "semantic",
            when: {
              kind: "group",
              combinator: "and",
              children: [
                { kind: "rule", field: "plan", operator: "in", value: ["team", "enterprise"] },
                { kind: "rule", field: "build", operator: "gte", value: 412 },
              ],
            },
          },
        ],
        rollout: 0,
        offVariant: "keyword",
      },
      staging: { on: true, rules: [], rollout: 100, offVariant: "keyword" },
    },
  },
  {
    key: "inbox.ai-summaries",
    description: "Thread summaries at the top of the inbox",
    owner: "Inbox",
    variants: [
      { id: "off", name: "Off", tone: "bg-muted-foreground/48" },
      { id: "on", name: "Summaries", tone: "bg-rose-500" },
    ],
    envs: {
      production: {
        on: true,
        rules: [{ id: "i1", serve: "on", when: { kind: "group", combinator: "and", children: [{ kind: "rule", field: "beta", operator: "eq", value: true }] } }],
        rollout: 25,
        offVariant: "off",
      },
      staging: { on: true, rules: [], rollout: 100, offVariant: "off" },
    },
  },
  {
    key: "billing.annual-nudge",
    description: "Nudge monthly payers to annual",
    owner: "Growth",
    variants: [
      { id: "off", name: "Nothing", tone: "bg-muted-foreground/48" },
      { id: "banner", name: "Banner", tone: "bg-sky-500" },
    ],
    envs: { production: off, staging: { on: true, rules: [], rollout: 50, offVariant: "off" } },
  },
  {
    key: "onboarding.checklist-v2",
    description: "Shorter first-run checklist",
    owner: "Activation",
    stale: true,
    variants: [
      { id: "v1", name: "Old", tone: "bg-muted-foreground/48" },
      { id: "v2", name: "New", tone: "bg-emerald-500" },
    ],
    envs: {
      production: { on: true, rules: [], rollout: 100, offVariant: "v1" },
      staging: { on: true, rules: [], rollout: 100, offVariant: "v1" },
    },
  },
  {
    key: "reports.legacy-export",
    description: "Keep the old XLS exporter around",
    owner: "Reporting",
    stale: true,
    variants: [
      { id: "off", name: "Off", tone: "bg-muted-foreground/48" },
      { id: "on", name: "Legacy", tone: "bg-amber-500" },
    ],
    envs: { production: off, staging: off },
  },
];

export default function FlagsConsoleDemo() {
  return (
    <FlagsConsole
      environments={[
        { id: "production", name: "Production" },
        { id: "staging", name: "Staging" },
      ]}
      fields={userFields}
      flags={flags}
      traffic={traffic}
    />
  );
}
