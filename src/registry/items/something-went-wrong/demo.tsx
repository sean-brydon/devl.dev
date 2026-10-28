"use client";

import { useRef, useState } from "react";
import { SomethingWentWrong } from "@/registry/items/something-went-wrong/something-went-wrong";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function SomethingWentWrongDemo() {
  const [run, setRun] = useState(0);
  const tries = useRef(0);

  return (
    <div className="px-4 py-10 sm:px-8 sm:py-14">
      <SomethingWentWrong
        breadcrumb={["Reports", "Q3 revenue"]}
        description="We couldn’t load Q3 revenue. Your data is safe, and we’ve logged the error."
        details={{
          id: "err_7Hq2kV9x",
          status: "503 Service Unavailable",
          request: "GET /api/reports/q3-revenue",
          time: "28 Oct 2026, 14:32:07 UTC",
          stack: [
            "ReportUnavailable: upstream timed out after 30000ms",
            "    at fetchReport (reports/api.ts:88:11)",
            "    at loadRevenue (reports/q3/page.tsx:41:22)",
            "    at async Promise.all (index 2)",
          ],
        }}
        key={run}
        onContinue={() => {
          tries.current = 0;
          setRun((r) => r + 1);
        }}
        onRetry={async () => {
          tries.current += 1;
          await wait(1200);
          if (tries.current === 1) throw new Error("Still unavailable");
        }}
        recovered={{
          title: "Q3 revenue is back",
          description: "The report loaded on the second try. Nothing was lost.",
          actionLabel: "Open report",
        }}
      />
    </div>
  );
}
