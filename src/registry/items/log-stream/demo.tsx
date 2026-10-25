"use client";

import { useCallback } from "react";
import { type LogLine, LogStream } from "@/registry/items/log-stream/log-stream";

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const num = (a: number, b: number) => Math.round(a + Math.random() * (b - a));
const routes = ["/api/invoices", "/api/customers/cus_9fK2", "/api/checkout", "/dashboard", "/api/webhooks/payments"];

const normal: (() => Omit<LogLine, "id" | "ts">)[] = [
  () => ({ level: "info", service: "api", message: `GET ${pick(routes)} 200 in ${num(12, 180)}ms` }),
  () => ({ level: "info", service: "api", message: `POST /api/invoices 201 in ${num(40, 260)}ms` }),
  () => ({ level: "debug", service: "worker", message: `job pdf.render picked up (queue depth ${num(0, 6)})` }),
  () => ({ level: "debug", service: "cache", message: `hit invoice:${num(1000, 9999)} (ttl ${num(60, 86400)}s)` }),
  () => ({ level: "info", service: "worker", message: `email.send delivered to ${pick(["ana", "leo", "kai", "ivy"])}@brightline.studio` }),
  () => ({ level: "warn", service: "api", message: `slow query on invoices.list took ${num(800, 1900)}ms` }),
];

let seq = 0;
const line = (ts: number, l: Omit<LogLine, "id" | "ts">): LogLine => ({ id: `l${++seq}`, ts, ...l });

export default function LogStreamDemo() {
  const subscribe = useCallback((push: (l: LogLine) => void) => {
    const now = Date.now();
    const history: Omit<LogLine, "id" | "ts">[] = [
      ...Array.from({ length: 7 }, () => pick(normal)()),
      ...Array.from({ length: 11 }, (_, i) => ({
        level: "error" as const,
        service: "db",
        message: `ECONNRESET db-primary:5432, retry ${(i % 5) + 1}/5 in ${((i % 5) + 1) * 200}ms`,
      })),
      { level: "info", service: "db", message: "pool recovered, 20/20 connections healthy" },
      ...Array.from({ length: 3 }, () => pick(normal)()),
    ];
    history.forEach((l, i) => push(line(now - (history.length - i) * 700, l)));
    let tick = 0;
    let burst = 0;
    const timer = setInterval(() => {
      tick++;
      if (tick % 40 === 30) burst = num(9, 14);
      if (burst > 0) {
        const attempt = num(1, 5);
        push(line(Date.now(), { level: "error", service: "db", message: `ECONNRESET db-primary:5432, retry ${attempt}/5 in ${attempt * 200}ms` }));
        burst--;
        if (burst === 0) push(line(Date.now(), { level: "info", service: "db", message: "pool recovered, 20/20 connections healthy" }));
        return;
      }
      push(line(Date.now(), pick(normal)()));
    }, 420);
    return () => clearInterval(timer);
  }, []);

  return <LogStream subscribe={subscribe} title="northwind-api logs" />;
}
