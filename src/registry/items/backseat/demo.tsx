import { Backseat, type BackseatStep } from "@/registry/items/backseat/backseat";

const steps: BackseatStep[] = [
  {
    id: "a",
    title: "Find where invoices are rendered",
    detail: "Found InvoiceView and two PDF templates under billing/render.",
  },
  {
    id: "b",
    title: "Add a currency field to the invoice model",
    detail: "Adding currency with a default of USD and a migration that backfills existing rows from the account settings.",
  },
  {
    id: "c",
    title: "Format totals with the invoice currency",
    detail: "Swapping the hard-coded dollar sign for Intl.NumberFormat with the invoice locale.",
  },
  { id: "d", title: "Update snapshots and run tests", detail: "42 passed, 3 snapshots updated." },
];

export default function BackseatDemo() {
  return (
    <Backseat
      agent="Wren"
      autoNote="Keep the migration reversible"
      goal="Support multiple currencies on invoices"
      steps={steps}
    />
  );
}
