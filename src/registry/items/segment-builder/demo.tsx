"use client";

import { defineFields, f } from "@qnot/core";
import { SegmentBuilder, type SegmentPerson } from "@/registry/items/segment-builder/segment-builder";

const peopleFields = defineFields({
  country: f.enum([
    { value: "us", label: "United States" },
    { value: "de", label: "Germany" },
    { value: "fr", label: "France" },
    { value: "gb", label: "United Kingdom" },
    { value: "nl", label: "Netherlands" },
    { value: "jp", label: "Japan" },
    { value: "br", label: "Brazil" },
  ]),
  plan: f.enum([
    { value: "free", label: "Free" },
    { value: "pro", label: "Pro" },
    { value: "team", label: "Team" },
    { value: "enterprise", label: "Enterprise" },
  ]),
  role: f.enum([
    { value: "admin", label: "Admin" },
    { value: "member", label: "Member" },
    { value: "viewer", label: "Viewer" },
  ]),
  sessions: f.number({ label: "Sessions", description: "Sessions in the last 30 days", min: 0, integer: true }),
  features: f.multiEnum([
    { value: "dashboards", label: "Dashboards" },
    { value: "api", label: "API" },
    { value: "exports", label: "Exports" },
    { value: "automations", label: "Automations" },
    { value: "sso", label: "SSO" },
  ]),
  signedUp: f.date({ label: "Signed up" }),
});

const first = ["Ada", "Bruno", "Chiara", "Dmitri", "Elif", "Farah", "Goran", "Hana", "Idris", "Jonas", "Keiko", "Lena", "Mateo", "Nia", "Oskar", "Priya", "Quinn", "Rafael", "Sofia", "Tomas", "Uma", "Viktor", "Wen", "Yara", "Zeno"];
const last = ["Achterberg", "Bianchi", "Castro", "Dubois", "Eriksen", "Fischer", "García", "Hoshino", "Ivanova", "Jansen", "Kowalski", "Laurent", "Moreau", "Nakamura", "Okafor", "Petrov", "Quist", "Rossi", "Silva", "Tanaka", "Vogel", "Weber", "Yilmaz"];

let seed = 7;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(items: readonly T[], weights?: readonly number[]) => {
  if (!weights) return items[Math.floor(rand() * items.length)];
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) if ((r -= weights[i]) < 0) return items[i];
  return items[items.length - 1];
};

const people: SegmentPerson[] = Array.from({ length: 1200 }, (_, i) => {
  const name = `${pick(first)} ${pick(last)}`;
  const plan = pick(["free", "pro", "team", "enterprise"], [50, 26, 17, 7]);
  const heavy = plan === "team" || plan === "enterprise";
  return {
    id: `p${i}`,
    name,
    email: `${name.split(" ")[0].toLowerCase()}.${name.split(" ")[1].toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}@${pick(["fastmail.example", "mail.example", "orbit.example", "lumen.example"])}`,
    country: pick(["us", "de", "fr", "gb", "nl", "jp", "br"], [34, 15, 9, 13, 6, 12, 11]),
    plan,
    role: pick(["admin", "member", "viewer"], [14, 66, 20]),
    sessions: Math.floor(rand() * (heavy ? 60 : 30)),
    features: ["dashboards", "api", "exports", "automations", "sso"].filter((_, k) => rand() < [0.7, heavy ? 0.45 : 0.15, 0.35, heavy ? 0.4 : 0.1, plan === "enterprise" ? 0.8 : 0.02][k]),
    signedUp: `202${4 + Math.floor(rand() * 3)}-${String(1 + Math.floor(rand() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rand() * 28)).padStart(2, "0")}`,
  };
});

export default function SegmentBuilderDemo() {
  return (
    <SegmentBuilder
      defaultName="Power users in Europe"
      defaultQuery={{
        kind: "group",
        combinator: "and",
        children: [
          { kind: "rule", field: "country", operator: "in", value: ["de", "fr", "gb", "nl"] },
          { kind: "rule", field: "sessions", operator: "gte", value: 20 },
          { kind: "rule", field: "features", operator: "hasAny", value: ["api", "automations"] },
        ],
      }}
      describe={(p) => `${p.sessions} ${p.sessions === 1 ? "session" : "sessions"}`}
      fields={peopleFields}
      people={people}
    />
  );
}
