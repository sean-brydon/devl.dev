"use client";

import { EnvEditor, type EnvVariable } from "@/registry/items/env-editor/env-editor";

const environments = [
  { id: "dev", name: "Development" },
  { id: "preview", name: "Preview" },
  { id: "prod", name: "Production" },
];

const variables: EnvVariable[] = [
  {
    key: "DATABASE_URL",
    values: {
      dev: "postgres://localhost:5432/northwind",
      preview: "postgres://nw:pw@preview-db.internal:5432/nw",
      prod: "postgres://nw:pw@db-primary.internal:5432/nw",
    },
  },
  { key: "PAYMENTS_SECRET_KEY", values: { dev: "pay_test_9fK2aQ71", preview: "pay_test_9fK2aQ71", prod: "pay_prod_Hx0c4Lm2" } },
  { key: "NEXT_PUBLIC_APP_URL", values: { dev: "http://localhost:3000", preview: "https://preview.northwind.dev", prod: "https://northwind.dev" } },
  { key: "REDIS_URL", values: { dev: "redis://localhost:6379", prod: "redis://cache.internal:6379" } },
  { key: "ERROR_TRACKING_DSN", values: { preview: "https://k3@errors.northwind.dev/12", prod: "https://k3@errors.northwind.dev/7" } },
  { key: "FEATURE_ANNUAL_BILLING", values: { dev: "true", preview: "true", prod: "false" } },
  { key: "EMAIL_FROM", values: { dev: "dev@northwind.test", preview: "preview@northwind.dev", prod: "hello@northwind.dev" } },
];

export default function EnvEditorDemo() {
  return (
    <EnvEditor
      environments={environments}
      onSave={() => new Promise((r) => setTimeout(r, 700))}
      project="northwind-web"
      variables={variables}
    />
  );
}
