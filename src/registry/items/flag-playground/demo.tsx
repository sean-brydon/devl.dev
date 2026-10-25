"use client";

import { defineFields, f } from "@qnot/core";
import { FlagPlayground } from "@/registry/items/flag-playground/flag-playground";

const contextFields = defineFields({
  email: f.text(),
  country: f.enum([
    { value: "us", label: "United States" },
    { value: "de", label: "Germany" },
    { value: "fr", label: "France" },
    { value: "gb", label: "United Kingdom" },
    { value: "br", label: "Brazil" },
  ]),
  plan: f.enum([
    { value: "free", label: "Free" },
    { value: "pro", label: "Pro" },
    { value: "team", label: "Team" },
    { value: "enterprise", label: "Enterprise" },
  ]),
  seats: f.number({ min: 1, integer: true }),
  build: f.number({ label: "App build", integer: true }),
  beta: f.boolean({ label: "Beta tester" }),
});

export default function FlagPlaygroundDemo() {
  return (
    <FlagPlayground
      fields={contextFields}
      flags={[
        {
          key: "checkout.one-page",
          description: "The new single-step checkout",
          variants: [
            { id: "control", name: "Control", tone: "bg-sky-500" },
            { id: "one-page", name: "One-page", tone: "bg-violet-500" },
          ],
          rules: [
            {
              name: "Northwind staff",
              when: { kind: "group", combinator: "and", children: [{ kind: "rule", field: "email", operator: "endsWith", value: "@northwind.io" }] },
              serve: "one-page",
            },
            {
              name: "Beta testers in Europe",
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
        },
        {
          key: "search.semantic",
          description: "Embedding search in the command bar",
          variants: [
            { id: "keyword", name: "Keyword", tone: "bg-amber-500" },
            { id: "semantic", name: "Semantic", tone: "bg-emerald-500" },
          ],
          rules: [
            {
              name: "Paid plans on a recent build",
              when: {
                kind: "group",
                combinator: "and",
                children: [
                  { kind: "rule", field: "plan", operator: "in", value: ["pro", "team", "enterprise"] },
                  { kind: "rule", field: "build", operator: "gte", value: 412 },
                ],
              },
              serve: "semantic",
            },
          ],
          rollout: { keyword: 100, semantic: 0 },
        },
        {
          key: "billing.annual-nudge",
          description: "Nudge monthly payers towards annual",
          variants: [
            { id: "none", name: "Nothing", tone: "bg-muted-foreground/48" },
            { id: "banner", name: "Banner", tone: "bg-rose-500" },
            { id: "modal", name: "Modal", tone: "bg-sky-500" },
          ],
          rules: [
            {
              name: "Big teams",
              when: {
                kind: "group",
                combinator: "and",
                children: [
                  { kind: "rule", field: "plan", operator: "eq", value: "team" },
                  { kind: "rule", field: "seats", operator: "gt", value: 20 },
                ],
              },
              serve: "modal",
            },
            {
              name: "Free plan outside Brazil",
              when: {
                kind: "group",
                combinator: "and",
                children: [
                  { kind: "rule", field: "plan", operator: "eq", value: "free" },
                  { kind: "rule", field: "country", operator: "neq", value: "br" },
                ],
              },
              serve: "banner",
            },
          ],
          rollout: { none: 100, banner: 0, modal: 0 },
        },
      ]}
      presets={[
        { name: "Anna, Berlin", context: { id: "u_anna", email: "anna@mail.example", country: "de", plan: "pro", seats: 4, build: 418, beta: true } },
        { name: "Kofi, staff", context: { id: "u_kofi", email: "kofi@northwind.io", country: "us", plan: "team", seats: 64, build: 421, beta: false } },
        { name: "Luana, free", context: { id: "u_luana", email: "luana@mail.example", country: "br", plan: "free", seats: 1, build: 395, beta: false } },
        { name: "Wrong types", context: { id: "u_test", email: "qa@mail.example", country: "de", plan: "gold", seats: 3, build: "412", beta: "yes" } },
      ]}
    />
  );
}
