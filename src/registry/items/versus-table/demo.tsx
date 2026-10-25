import { VersusTable } from "@/registry/items/versus-table/versus-table";

function Mark() {
  return (
    <span className="mb-1 flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs/5">
      <svg aria-hidden className="size-4" fill="none" viewBox="0 0 16 16">
        <path d="M3 3h7l3 3v7H3z" fill="currentColor" opacity=".35" />
        <path d="M3 3h7v3h3v7H3z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </span>
  );
}

export default function VersusTableDemo() {
  return (
    <div className="px-4 py-12 sm:px-8 sm:py-16">
      <VersusTable
        cta={{ label: "Start free", href: "#start" }}
        description="Most teams arrive from a patchwork of docs, sheets and an old wiki. Here's what changes on day one."
        eyebrow="Why teams switch"
        groups={[
          {
            name: "Writing",
            rows: [
              { label: "Real-time co-editing", values: { us: true, sheets: "In two tools", wiki: false } },
              { label: "Comments that turn into tasks", hint: "Assign, due date, done", values: { us: true, sheets: false, wiki: false } },
              { label: "Templates with live data", values: { us: true, sheets: false, wiki: "Paid add-on" } },
            ],
          },
          {
            name: "Finding things",
            rows: [
              { label: "Search inside every doc", values: { us: true, sheets: "Per file", wiki: "Titles only" } },
              { label: "Answers with linked sources", values: { us: true, sheets: false, wiki: false } },
              { label: "History down to the paragraph", values: { us: true, sheets: "Per file", wiki: "30 days" } },
            ],
          },
          {
            name: "Admin & cost",
            rows: [
              { label: "Time to set up", values: { us: "4 minutes", sheets: "A weekend", wiki: "6–8 weeks" } },
              { label: "SSO and SCIM", values: { us: "Included", sheets: "Enterprise only", wiki: "Paid add-on" } },
              { label: "Price per seat", hint: "Billed yearly", values: { us: "$8", sheets: "$14 over 3 tools", wiki: "$22" } },
            ],
          },
        ]}
        them={[
          { id: "sheets", name: "Docs + sheets", note: "The patchwork" },
          { id: "wiki", name: "Legacy wiki", note: "The old intranet" },
        ]}
        title="Paperlane vs. the old way"
        us={{ id: "us", name: "Paperlane", note: "Everything in one place", mark: <Mark /> }}
      />
    </div>
  );
}
