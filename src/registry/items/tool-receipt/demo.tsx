"use client";

import { useEffect, useRef, useState } from "react";
import { type ToolReceiptCall, ToolReceiptSpike } from "@/registry/items/tool-receipt/tool-receipt";

const script: { at: number; call: ToolReceiptCall; done: Partial<ToolReceiptCall> }[] = [
  {
    at: 0,
    call: {
      id: "call_8f2a",
      name: "search_docs",
      summary: "refund policy, annual plans",
      status: "running",
      time: "14:02:07",
      args: { query: "refund policy annual plan", limit: 5 },
      result: { hits: 3, top: "Refunds & cancellations", score: 0.92 },
    },
    done: { status: "success", durationMs: 412, tokens: 1204, cost: 0.0031 },
  },
  {
    at: 900,
    call: {
      id: "call_3c71",
      name: "get_customer",
      summary: "cus_7Hq2 · Brightline Studio",
      status: "running",
      time: "14:02:08",
      args: { id: "cus_7Hq2", expand: ["subscription"] },
      result: { plan: "Annual", renewed: "2 Sep 2026", seats: 12 },
    },
    done: { status: "success", durationMs: 688, tokens: 2310, cost: 0.0058 },
  },
  {
    at: 2000,
    call: {
      id: "call_c904",
      name: "create_refund",
      summary: "€1,240.50 prorated, 10 months",
      status: "running",
      time: "14:02:09",
      args: { customer: "cus_7Hq2", amount: 1240.5, currency: "EUR" },
      result: { refund: "re_31Kd", status: "pending", eta_days: 5 },
    },
    done: { status: "error", durationMs: 2050, error: "429 rate limited, try again in 2s" },
  },
];

export default function ToolReceiptDemo() {
  const [calls, setCalls] = useState<ToolReceiptCall[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = timers.current;
    for (const step of script) {
      t.push(setTimeout(() => setCalls((cs) => [...cs, step.call]), step.at));
      t.push(
        setTimeout(
          () => setCalls((cs) => cs.map((c) => (c.id === step.call.id ? { ...c, ...step.done } : c))),
          step.at + (step.done.durationMs ?? 0),
        ),
      );
    }
    return () => t.forEach(clearTimeout);
  }, []);

  const retry = (id: string) => {
    setCalls((cs) => cs.map((c) => (c.id === id ? { ...c, status: "running", error: undefined, durationMs: undefined } : c)));
    timers.current.push(
      setTimeout(
        () =>
          setCalls((cs) =>
            cs.map((c) => (c.id === id ? { ...c, status: "success", durationMs: 940, tokens: 1876, cost: 0.0047 } : c)),
          ),
        940,
      ),
    );
  };

  return <ToolReceiptSpike calls={calls} onRetry={retry} title="Refund for Brightline Studio" />;
}
