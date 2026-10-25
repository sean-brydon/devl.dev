"use client";

import { defineFields, f } from "@qnot/core";
import { RuleBuilder } from "@/registry/items/rule-builder/rule-builder";

const accountFields = defineFields({
  company: f.text({ minLength: 2 }),
  plan: f.enum([
    { value: "free", label: "Free" },
    { value: "pro", label: "Pro" },
    { value: "team", label: "Team" },
    { value: "enterprise", label: "Enterprise" },
  ]),
  seats: f.number({ min: 1, max: 10000, integer: true }),
  mrr: f.number({ label: "MRR", min: 0 }),
  region: f.enum([
    { value: "eu", label: "Europe" },
    { value: "na", label: "North America" },
    { value: "apac", label: "Asia Pacific" },
    { value: "latam", label: "Latin America" },
  ]),
  signals: f.multiEnum([
    { value: "expansion", label: "Expansion" },
    { value: "at-risk", label: "At risk" },
    { value: "champion", label: "Champion" },
  ]),
  trial: f.boolean({ label: "On trial" }),
  renewsOn: f.date({ label: "Renews on" }),
});

const accounts = [
  { company: "Northwind Labs", plan: "team", seats: 84, mrr: 2520, region: "eu", signals: ["expansion"], trial: false, renewsOn: "2026-12-01" },
  { company: "Brightpath", plan: "pro", seats: 12, mrr: 228, region: "na", signals: [], trial: false, renewsOn: "2027-02-14" },
  { company: "Halcyon Health", plan: "enterprise", seats: 640, mrr: 31200, region: "na", signals: ["champion"], trial: false, renewsOn: "2027-06-30" },
  { company: "Quillstack", plan: "free", seats: 3, mrr: 0, region: "apac", signals: [], trial: true, renewsOn: "2026-11-10" },
  { company: "Ferrous Robotics", plan: "team", seats: 156, mrr: 4680, region: "eu", signals: ["at-risk"], trial: false, renewsOn: "2026-11-28" },
  { company: "Lumen & Co", plan: "pro", seats: 22, mrr: 418, region: "eu", signals: ["expansion"], trial: false, renewsOn: "2027-01-05" },
  { company: "Driftwood Studio", plan: "pro", seats: 8, mrr: 152, region: "latam", signals: [], trial: true, renewsOn: "2026-11-02" },
  { company: "Orbital Freight", plan: "enterprise", seats: 1210, mrr: 52800, region: "eu", signals: ["expansion", "champion"], trial: false, renewsOn: "2027-03-31" },
  { company: "Kestrel Bank", plan: "enterprise", seats: 2300, mrr: 88400, region: "na", signals: ["at-risk"], trial: false, renewsOn: "2026-12-15" },
  { company: "Mosaic Learning", plan: "team", seats: 61, mrr: 1830, region: "apac", signals: [], trial: false, renewsOn: "2027-04-20" },
  { company: "Pinecone Clinics", plan: "team", seats: 97, mrr: 2910, region: "na", signals: ["champion"], trial: false, renewsOn: "2027-01-18" },
  { company: "Sable Logistics", plan: "pro", seats: 31, mrr: 589, region: "latam", signals: ["at-risk"], trial: false, renewsOn: "2026-12-09" },
  { company: "Tidewater Energy", plan: "enterprise", seats: 880, mrr: 39600, region: "apac", signals: [], trial: false, renewsOn: "2027-08-01" },
  { company: "Verve Fitness", plan: "free", seats: 5, mrr: 0, region: "eu", signals: [], trial: false, renewsOn: "2026-11-30" },
  { company: "Atlas Mutual", plan: "team", seats: 212, mrr: 6360, region: "eu", signals: ["expansion"], trial: false, renewsOn: "2027-05-12" },
  { company: "Juniper Retail", plan: "pro", seats: 18, mrr: 342, region: "na", signals: [], trial: true, renewsOn: "2026-11-21" },
  { company: "Cobalt Mining", plan: "team", seats: 74, mrr: 2220, region: "latam", signals: ["at-risk"], trial: false, renewsOn: "2026-12-22" },
  { company: "Saltbox Coffee", plan: "free", seats: 2, mrr: 0, region: "na", signals: [], trial: true, renewsOn: "2026-11-15" },
  { company: "Meridian Air", plan: "enterprise", seats: 1540, mrr: 61600, region: "eu", signals: ["champion"], trial: false, renewsOn: "2027-09-30" },
  { company: "Nimbus Analytics", plan: "team", seats: 58, mrr: 1740, region: "eu", signals: ["expansion"], trial: false, renewsOn: "2027-02-01" },
  { company: "Oakline Legal", plan: "pro", seats: 26, mrr: 494, region: "eu", signals: [], trial: false, renewsOn: "2027-03-03" },
  { company: "Paper Lantern", plan: "pro", seats: 9, mrr: 171, region: "apac", signals: ["expansion"], trial: false, renewsOn: "2027-01-27" },
  { company: "Redwood Civic", plan: "team", seats: 133, mrr: 3990, region: "na", signals: [], trial: false, renewsOn: "2027-06-06" },
  { company: "Zephyr Mobility", plan: "enterprise", seats: 720, mrr: 28800, region: "latam", signals: ["expansion"], trial: false, renewsOn: "2027-07-19" },
];

export default function RuleBuilderDemo() {
  return (
    <RuleBuilder
      defaultQuery={{
        kind: "group",
        combinator: "and",
        children: [
          { kind: "rule", field: "plan", operator: "in", value: ["team", "enterprise"] },
          { kind: "rule", field: "seats", operator: "gte", value: 50 },
          {
            kind: "group",
            combinator: "or",
            children: [
              { kind: "rule", field: "region", operator: "eq", value: "eu" },
              { kind: "rule", field: "signals", operator: "hasAny", value: ["expansion"] },
            ],
          },
        ],
      }}
      fields={accountFields}
      rows={accounts}
      table="accounts"
    />
  );
}
