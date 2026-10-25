"use client";

import { CheckIcon, CopyIcon, RotateCwIcon, WebhookIcon } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DeliveryStatus = number | "pending" | "timeout";

export interface WebhookDelivery {
  id: string;
  event: string;
  status: DeliveryStatus;
  latencyMs?: number;
  sentAt: string;
  attempt: number;
  request: { headers: Record<string, string>; body: unknown };
  response?: { headers?: Record<string, string>; body?: string };
  redeliveryOf?: string;
}

export interface WebhookInspectorProps {
  endpoint: string;
  deliveries: WebhookDelivery[];
  onRedeliver?: (delivery: WebhookDelivery) => void;
  className?: string;
}

const ok = (s: DeliveryStatus) => typeof s === "number" && s >= 200 && s < 300;

function statusStyle(s: DeliveryStatus) {
  if (s === "pending") return "bg-muted text-muted-foreground";
  if (ok(s)) return "bg-success/10 text-success-foreground";
  if (typeof s === "number" && s >= 400 && s < 500) return "bg-warning/12 text-warning-foreground";
  return "bg-destructive/10 text-destructive-foreground";
}

function statusLabel(s: DeliveryStatus) {
  return s === "pending" ? "…" : s === "timeout" ? "T/O" : String(s);
}

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Json({ value }: { value: unknown }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi;
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) out.push(<span className="text-muted-foreground" key={`g${at}`}>{text.slice(last, at)}</span>);
    if (m[1]) {
      out.push(
        <span className={m[2] ? "text-sky-800 dark:text-sky-300" : "text-emerald-700 dark:text-emerald-400"} key={`s${at}`}>
          {m[1]}
        </span>,
      );
      if (m[2]) out.push(<span className="text-muted-foreground" key={`c${at}`}>{m[2]}</span>);
    } else {
      out.push(
        <span className={m[3] ? "text-rose-700 dark:text-rose-400" : "text-amber-700 dark:text-amber-300"} key={`n${at}`}>
          {m[0]}
        </span>,
      );
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(<span className="text-muted-foreground" key="end">{text.slice(last)}</span>);
  return <>{out}</>;
}

function Headers({ headers }: { headers: Record<string, string> }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
      {Object.entries(headers).map(([k, v]) => (
        <div className="contents" key={k}>
          <dt className="text-sky-800 dark:text-sky-300">{k}</dt>
          <dd className="break-all">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

type Tab = "payload" | "headers" | "response";

export function WebhookInspector({ endpoint, deliveries, onRedeliver, className }: WebhookInspectorProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const [selectedId, setSelectedId] = useState(deliveries[0]?.id);
  const [tab, setTab] = useState<Tab>("payload");
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const known = useRef(new Set(deliveries.map((d) => d.id)));
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    for (const d of deliveries) {
      if (!known.current.has(d.id)) {
        known.current.add(d.id);
        if (d.redeliveryOf) setSelectedId(d.id);
      }
    }
    setNow(Date.now());
  }, [deliveries]);

  const selected = deliveries.find((d) => d.id === selectedId) ?? deliveries[0];
  const total = deliveries.filter((d) => d.status !== "pending");
  const rate = total.length ? Math.round((total.filter((d) => ok(d.status)).length / total.length) * 100) : 100;
  const pendingRedelivery = selected && deliveries.some((d) => d.redeliveryOf === selected.id && d.status === "pending");

  const onListKey = (e: KeyboardEvent) => {
    const i = deliveries.findIndex((d) => d.id === selected?.id);
    const next = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : -1;
    if (next < 0 || next >= deliveries.length) return;
    e.preventDefault();
    setSelectedId(deliveries[next].id);
    itemRefs.current.get(deliveries[next].id)?.focus();
  };

  const summary = (d: WebhookDelivery) => {
    if (d.status === "pending") return "Sending…";
    if (d.status === "timeout") return `Timed out after ${((d.latencyMs ?? 30000) / 1000).toFixed(0)}s`;
    if (ok(d.status)) return `Delivered in ${d.latencyMs?.toLocaleString("en-US")} ms`;
    return `Endpoint returned ${d.status} after ${d.latencyMs?.toLocaleString("en-US")} ms`;
  };

  const copyText = selected
    ? tab === "payload"
      ? JSON.stringify(selected.request.body, null, 2)
      : tab === "headers"
        ? Object.entries(selected.request.headers)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n")
        : (selected.response?.body ?? "")
    : "";

  return (
    <div className={cn("flex w-full min-w-0 max-w-[640px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5", className)}>
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
          <WebhookIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Webhook deliveries</p>
          <p className="truncate font-mono text-muted-foreground text-xs">{endpoint}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-success/50 motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-success" />
            </span>
            Listening
          </span>
          <span className="text-muted-foreground tabular-nums">{rate}% delivered</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-[236px_minmax(0,1fr)]">
        <LayoutGroup id={uid}>
          <div
            aria-label="Deliveries"
            className="h-[208px] overflow-y-auto border-b p-1.5 sm:h-[384px] sm:border-e sm:border-b-0 [scrollbar-width:thin]"
            onKeyDown={onListKey}
            role="listbox"
          >
            <AnimatePresence initial={false}>
              {deliveries.map((d) => {
                const isSel = d.id === selected?.id;
                return (
                  <motion.button
                    animate={{ opacity: 1, y: 0 }}
                    aria-selected={isSel}
                    className={cn(
                      "relative flex w-full flex-col gap-1 rounded-lg px-2.5 py-2 text-start outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                      !isSel && "[@media(hover:hover)]:hover:bg-accent/50",
                    )}
                    initial={reduce ? false : { opacity: 0, y: -8 }}
                    key={d.id}
                    layout={reduce ? false : "position"}
                    onClick={() => setSelectedId(d.id)}
                    ref={(el: HTMLButtonElement | null) => {
                      if (el) itemRefs.current.set(d.id, el);
                      else itemRefs.current.delete(d.id);
                    }}
                    role="option"
                    tabIndex={isSel ? 0 : -1}
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    type="button"
                  >
                    {isSel && (
                      <motion.span
                        className="absolute inset-0 rounded-lg bg-accent"
                        layoutId={`${uid}-sel`}
                        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 550, damping: 42 }}
                      />
                    )}
                    <span className="relative flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex h-5 w-10 shrink-0 items-center justify-center rounded-md font-medium font-mono text-[10.5px] tabular-nums transition-colors duration-200",
                          statusStyle(d.status),
                        )}
                      >
                        {d.status === "pending" ? (
                          <span className="size-2.5 animate-spin rounded-full border-[1.5px] border-current border-r-transparent" />
                        ) : (
                          statusLabel(d.status)
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-xs">{d.event}</span>
                    </span>
                    <span className="relative flex items-center gap-2 ps-12 text-[11px] text-muted-foreground">
                      <span className="min-w-0 flex-1 truncate" suppressHydrationWarning>
                        {ago(d.sentAt, now)}
                        {d.attempt > 1 && ` · attempt ${d.attempt}`}
                      </span>
                      <span className="shrink-0 font-mono tabular-nums">
                        {d.status === "pending" ? "—" : d.status === "timeout" ? "30s" : `${d.latencyMs?.toLocaleString("en-US")}ms`}
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </LayoutGroup>

        {selected && (
          <div className="flex min-w-0 flex-col sm:h-[384px]">
            <div className="flex items-start gap-3 px-4 pt-3.5 pb-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium font-mono text-sm">{selected.event}</p>
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.p
                    animate={{ opacity: 1 }}
                    className={cn(
                      "mt-0.5 truncate text-xs",
                      selected.status === "pending" ? "text-muted-foreground" : ok(selected.status) ? "text-success-foreground" : "text-destructive-foreground",
                    )}
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key={`${selected.id}-${selected.status}`}
                    transition={{ duration: 0.15 }}
                  >
                    {summary(selected)}
                  </motion.p>
                </AnimatePresence>
              </div>
              <Button
                className="shrink-0"
                disabled={selected.status === "pending" || pendingRedelivery}
                onClick={() => onRedeliver?.(selected)}
                size="sm"
                variant="outline"
              >
                <RotateCwIcon className={cn(pendingRedelivery && "animate-spin")} />
                Redeliver
              </Button>
            </div>

            <div className="flex items-center gap-1 border-b px-3">
              {(["payload", "headers", "response"] as Tab[]).map((t) => (
                <button
                  aria-pressed={tab === t}
                  className={cn(
                    "relative h-9 rounded-md px-2 text-xs capitalize outline-none transition-colors duration-150 focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    tab === t ? "text-foreground" : "text-muted-foreground [@media(hover:hover)]:hover:text-foreground",
                  )}
                  key={t}
                  onClick={() => setTab(t)}
                  type="button"
                >
                  {t}
                  {tab === t && (
                    <motion.span
                      className="absolute inset-x-1.5 -bottom-px h-0.5 rounded-full bg-primary"
                      layoutId={`${uid}-tab`}
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 45 }}
                    />
                  )}
                </button>
              ))}
              <button
                aria-label={copied ? "Copied" : `Copy ${tab}`}
                className="ms-auto grid size-8 place-items-center rounded-lg text-muted-foreground outline-none transition-[color,background-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(copyText);
                  } catch {}
                  setCopied(true);
                }}
                type="button"
              >
                {copied ? <CheckIcon className="size-3.5 text-success-foreground" /> : <CopyIcon className="size-3.5" />}
              </button>
            </div>

            <div className="min-h-[180px] flex-1 overflow-auto bg-code px-4 py-3 font-mono text-[11.5px] leading-5 [scrollbar-width:thin]">
              {tab === "payload" && (
                <pre>
                  <Json value={selected.request.body} />
                </pre>
              )}
              {tab === "headers" && <Headers headers={selected.request.headers} />}
              {tab === "response" &&
                (selected.status === "pending" ? (
                  <p className="font-sans text-muted-foreground text-xs">Waiting for your endpoint to answer…</p>
                ) : selected.status === "timeout" ? (
                  <div className="font-sans text-xs">
                    <p className="font-medium text-destructive-foreground">No response within 30 seconds</p>
                    <p className="mt-1 text-muted-foreground">Respond with a 2xx quickly and do the work in a background job.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 font-sans text-xs">
                      <span className={cn("rounded-md px-1.5 font-medium font-mono leading-5", statusStyle(selected.status))}>
                        HTTP {selected.status}
                      </span>
                      <span className="text-muted-foreground tabular-nums">{selected.latencyMs?.toLocaleString("en-US")} ms</span>
                    </div>
                    {selected.response?.headers && <Headers headers={selected.response.headers} />}
                    {selected.response?.body && (
                      <pre className="whitespace-pre-wrap break-words border-t pt-3">
                        <Json value={selected.response.body} />
                      </pre>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
