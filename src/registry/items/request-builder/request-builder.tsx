"use client";

import { CheckIcon, CopyIcon, PlusIcon, SendHorizontalIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestHeader {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface BuiltRequest {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface ResponseData {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface RequestBuilderProps {
  defaultMethod?: HttpMethod;
  defaultUrl?: string;
  defaultParams?: Record<string, string>;
  defaultHeaders?: Omit<RequestHeader, "id">[];
  defaultBody?: string;
  onSend?: (request: BuiltRequest) => Promise<ResponseData>;
  className?: string;
}

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const methodTone: Record<HttpMethod, string> = {
  GET: "text-emerald-700 dark:text-emerald-400",
  POST: "text-sky-700 dark:text-sky-400",
  PUT: "text-amber-700 dark:text-amber-300",
  PATCH: "text-violet-700 dark:text-violet-400",
  DELETE: "text-red-700 dark:text-red-400",
};

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable",
  429: "Too Many Requests",
  500: "Server Error",
  502: "Bad Gateway",
};

function pathParams(url: string) {
  const path = url.split("?")[0].replace(/^[a-z]+:\/\/[^/]+/i, "");
  return [...path.matchAll(/:([A-Za-z_]\w*)/g)].map((m) => m[1]);
}

function queryParams(url: string): [string, string][] {
  const q = url.split("?")[1];
  if (!q) return [];
  return q
    .split("&")
    .filter(Boolean)
    .map((pair) => {
      const [k, ...v] = pair.split("=");
      return [k, v.join("=")];
    });
}

function withQuery(url: string, entries: [string, string][]) {
  const base = url.split("?")[0];
  return entries.length ? `${base}?${entries.map(([k, v]) => `${k}=${v}`).join("&")}` : base;
}

function UrlTokens({ url, params }: { url: string; params: Record<string, string> }) {
  const [base, query] = [url.split("?")[0], url.includes("?") ? url.slice(url.indexOf("?")) : ""];
  const out: ReactNode[] = [];
  const origin = base.match(/^[a-z]+:\/\/[^/]+/i)?.[0] ?? "";
  if (origin) out.push(<span className="text-muted-foreground" key="o">{origin}</span>);
  const rest = base.slice(origin.length);
  let last = 0;
  for (const m of rest.matchAll(/:([A-Za-z_]\w*)/g)) {
    const at = m.index ?? 0;
    if (at > last) out.push(<span key={`p${at}`}>{rest.slice(last, at)}</span>);
    out.push(
      <span
        className={cn(
          "rounded-[calc(var(--radius)*0.3)]",
          params[m[1]] ? "text-sky-700 dark:text-sky-300" : "text-warning-foreground underline decoration-dotted underline-offset-2",
        )}
        key={`t${at}`}
      >
        {m[0]}
      </span>,
    );
    last = at + m[0].length;
  }
  if (last < rest.length) out.push(<span key="r">{rest.slice(last)}</span>);
  if (query) {
    query.split(/([?&=])/).forEach((part, i) => {
      const prev = query.split(/([?&=])/)[i - 1];
      out.push(
        <span
          className={/[?&=]/.test(part) ? "text-muted-foreground" : prev === "=" ? "text-amber-700 dark:text-amber-300" : "text-violet-700 dark:text-violet-400"}
          key={`q${i}`}
        >
          {part}
        </span>,
      );
    });
  }
  return <>{out}</>;
}

function JsonLines({ text }: { text: string }) {
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

function firstOutsideString(text: string, ch: string) {
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === ch) return i;
  }
  return -1;
}

function describeJsonError(text: string, message: string) {
  if (/end of (JSON|data)/i.test(message)) return "Invalid JSON · ends before it closes";
  const pos = Number(message.match(/position (\d+)/)?.[1] ?? Number.NaN);
  const token = message.match(/Unexpected token '?(.)'?/)?.[1];
  const at = Number.isNaN(pos) ? (token ? firstOutsideString(text, token) : -1) : pos;
  const line = at >= 0 ? text.slice(0, at).split("\n").length : null;
  return `Invalid JSON${line ? ` · line ${line}` : ""}${token ? ` · unexpected “${token}”` : ""}`;
}

const formatBytes = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

const fieldClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 font-mono text-xs text-foreground shadow-xs/5 outline-none ring-ring/24 transition-shadow placeholder:text-muted-foreground/72 focus-visible:border-ring focus-visible:ring-[3px] dark:bg-input/32";

const iconBtn =
  "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-[color,background-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground";

function Count({ n }: { n: number }) {
  if (!n) return null;
  return <span className="ms-1.5 rounded-full bg-muted px-1.5 text-[10.5px] text-muted-foreground tabular-nums leading-4">{n}</span>;
}

type Phase = { state: "idle" } | { state: "loading"; started: number } | { state: "done"; res: ResponseData; ms: number; size: number } | { state: "error"; message: string; ms: number };

let uid = 0;
const nextId = () => `h${++uid}`;

export function RequestBuilder({
  defaultMethod = "GET",
  defaultUrl = "https://api.example.com/v1/users/:id",
  defaultParams = {},
  defaultHeaders = [{ key: "Accept", value: "application/json", enabled: true }],
  defaultBody = "",
  onSend,
  className,
}: RequestBuilderProps) {
  const reduce = useReducedMotion();
  const id = useId();
  const [method, setMethod] = useState<HttpMethod>(defaultMethod);
  const [url, setUrl] = useState(defaultUrl);
  const [params, setParams] = useState<Record<string, string>>(defaultParams);
  const [headers, setHeaders] = useState<RequestHeader[]>(() => defaultHeaders.map((h) => ({ ...h, id: nextId() })));
  const [body, setBody] = useState(defaultBody);
  const [tab, setTab] = useState<string>("params");
  const [resTab, setResTab] = useState<"body" | "headers">("body");
  const [phase, setPhase] = useState<Phase>({ state: "idle" });
  const [now, setNow] = useState(0);
  const [copied, setCopied] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  const req = useRef(0);

  const names = useMemo(() => pathParams(url), [url]);
  const query = useMemo(() => queryParams(url), [url]);
  const missing = names.filter((n) => !params[n]?.trim());
  const hasBody = method !== "GET" && method !== "DELETE";
  const bodyError = useMemo(() => {
    if (!hasBody || !body.trim()) return null;
    try {
      JSON.parse(body);
      return null;
    } catch (e) {
      return describeJsonError(body, (e as Error).message);
    }
  }, [body, hasBody]);

  useEffect(() => {
    if (phase.state !== "loading") return;
    const t = setInterval(() => setNow(performance.now() - phase.started), 31);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  const resolved = (() => {
    const at = url.indexOf("?");
    const base = at === -1 ? url : url.slice(0, at);
    const filled = base.replace(/:([A-Za-z_]\w*)/g, (m, n: string) => (params[n]?.trim() ? encodeURIComponent(params[n].trim()) : m));
    return at === -1 ? filled : filled + url.slice(at);
  })();

  const send = async () => {
    if (phase.state === "loading") return;
    const ticket = ++req.current;
    const started = performance.now();
    setNow(0);
    setPhase({ state: "loading", started });
    const built: BuiltRequest = {
      method,
      url: resolved,
      headers: Object.fromEntries(headers.filter((h) => h.enabled && h.key.trim()).map((h) => [h.key.trim(), h.value])),
      body: hasBody && body.trim() ? body : undefined,
    };
    try {
      const res = onSend
        ? await onSend(built)
        : await fetch(built.url, { method, headers: built.headers, body: built.body }).then(async (r) => ({
            status: r.status,
            statusText: r.statusText,
            headers: Object.fromEntries(r.headers.entries()),
            body: await r.text().then((t) => {
              try {
                return JSON.parse(t);
              } catch {
                return t;
              }
            }),
          }));
      if (ticket !== req.current) return;
      const text = res.body === undefined ? "" : typeof res.body === "string" ? res.body : JSON.stringify(res.body);
      setPhase({ state: "done", res, ms: performance.now() - started, size: new Blob([text]).size });
    } catch (e) {
      if (ticket !== req.current) return;
      setPhase({ state: "error", message: (e as Error).message || "Network error", ms: performance.now() - started });
    }
  };

  const setQueryValue = (i: number, value: string) => setUrl(withQuery(url, query.map((q, k) => (k === i ? [q[0], value] : q))));

  const enabledHeaders = headers.filter((h) => h.enabled && h.key.trim()).length;
  const done = phase.state === "done" ? phase : null;
  const pretty = done ? (typeof done.res.body === "string" ? done.res.body : done.res.body === undefined ? "" : JSON.stringify(done.res.body, null, 2)) : "";
  const status = done?.res.status ?? 0;
  const statusTone =
    status >= 500
      ? "bg-destructive/10 text-destructive-foreground"
      : status >= 400
        ? "bg-warning/12 text-warning-foreground"
        : status >= 300
          ? "bg-info/10 text-info-foreground"
          : "bg-success/10 text-success-foreground";

  return (
    <div
      className={cn("flex w-full min-w-0 max-w-[620px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5", className)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          send();
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-2 p-3 sm:flex-nowrap">
        <Select onValueChange={(v) => v && setMethod(v as HttpMethod)} value={method}>
          <SelectTrigger aria-label="Method" className="order-1 h-9 min-h-9 w-[92px] min-w-0 shrink-0 font-mono font-semibold text-xs sm:h-8 sm:min-h-8 sm:text-xs" size="sm">
            <SelectValue>{(v: HttpMethod) => <span className={methodTone[v]}>{v}</span>}</SelectValue>
          </SelectTrigger>
          <SelectPopup>
            {METHODS.map((m) => (
              <SelectItem className="font-mono font-semibold text-xs sm:text-xs" key={m} value={m}>
                <span className={methodTone[m]}>{m}</span>
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>

        <div className="relative order-3 h-9 min-w-0 basis-full rounded-lg border sm:order-2 sm:basis-0 sm:flex-1 border-input bg-background font-mono text-xs shadow-xs/5 ring-ring/24 transition-shadow has-focus-visible:border-ring has-focus-visible:ring-[3px] dark:bg-input/32 sm:h-8">
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre px-2.5" ref={overlay}>
            <UrlTokens params={params} url={url} />
          </div>
          <input
            aria-label="Request URL"
            className="relative h-full w-full bg-transparent px-2.5 text-transparent caret-foreground outline-none selection:bg-info/25 selection:text-transparent"
            onChange={(e) => setUrl(e.target.value)}
            onScroll={(e) => {
              if (overlay.current) overlay.current.scrollLeft = e.currentTarget.scrollLeft;
            }}
            spellCheck={false}
            value={url}
          />
        </div>

        <Button className="order-2 ms-auto shrink-0 sm:order-3 sm:ms-0" disabled={phase.state === "loading"} onClick={send}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ opacity: 1, x: 0 }}
              className="grid place-items-center"
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: 6 }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: -6 }}
              key={phase.state === "loading" ? "l" : "s"}
              transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            >
              {phase.state === "loading" ? (
                <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
              ) : (
                <SendHorizontalIcon className="size-3.5" />
              )}
            </motion.span>
          </AnimatePresence>
          Send
        </Button>
      </div>

      <Tabs className="gap-0" onValueChange={(v) => setTab(String(v))} value={tab}>
        <TabsList className="mx-3 h-9 gap-1 p-0" variant="underline">
          <TabsTab className="px-2 text-xs sm:text-xs" value="params">
            Params
            <Count n={names.length + query.length} />
          </TabsTab>
          <TabsTab className="px-2 text-xs sm:text-xs" value="headers">
            Headers
            <Count n={enabledHeaders} />
          </TabsTab>
          <TabsTab className="px-2 text-xs sm:text-xs" value="body">
            Body
            {bodyError && <span aria-label="Invalid JSON" className="ms-1.5 size-1.5 rounded-full bg-destructive" />}
          </TabsTab>
        </TabsList>

        <div className="border-t bg-muted/30">
          <TabsPanel className="grid min-h-[172px] grid-cols-[auto_1fr] content-start items-center gap-x-3 gap-y-2 p-3" value="params">
            {names.length === 0 && query.length === 0 && (
              <p className="col-span-2 py-6 text-center text-muted-foreground text-xs">
                Add <code className="font-mono text-foreground">:name</code> to the path or{" "}
                <code className="font-mono text-foreground">?key=value</code> to the URL.
              </p>
            )}
            {names.map((n) => (
              <label className="contents" key={`p-${n}`}>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="rounded-[calc(var(--radius)*0.4)] bg-sky-500/10 px-1 font-medium text-[10px] text-sky-700 uppercase leading-4 dark:text-sky-300">path</span>
                  <span className="truncate font-mono text-xs">{n}</span>
                </span>
                <input
                  aria-invalid={!params[n]?.trim() || undefined}
                  className={cn(fieldClass, "h-9 sm:h-8 aria-invalid:border-warning/60")}
                  onChange={(e) => setParams((p) => ({ ...p, [n]: e.target.value }))}
                  placeholder="required"
                  spellCheck={false}
                  value={params[n] ?? ""}
                />
              </label>
            ))}
            {query.map(([k, v], i) => (
              <label className="contents" key={`q-${k}-${i}`}>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="rounded-[calc(var(--radius)*0.4)] bg-violet-500/10 px-1 font-medium text-[10px] text-violet-700 uppercase leading-4 dark:text-violet-300">query</span>
                  <span className="truncate font-mono text-xs">{k}</span>
                </span>
                <input className={cn(fieldClass, "h-9 sm:h-8")} onChange={(e) => setQueryValue(i, e.target.value)} spellCheck={false} value={v} />
              </label>
            ))}
          </TabsPanel>

          <TabsPanel className="flex min-h-[172px] flex-col gap-2 p-3" value="headers">
            <AnimatePresence initial={false}>
              {headers.map((h) => (
                <motion.div
                  animate={{ opacity: 1, height: 32 }}
                  className="flex items-center gap-2"
                  exit={{ opacity: 0, height: 0, marginTop: -8 }}
                  initial={reduce ? false : { opacity: 0, height: 0 }}
                  key={h.id}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                >
                  <Checkbox
                    aria-label={`Send ${h.key || "header"}`}
                    checked={h.enabled}
                    onCheckedChange={(c) => setHeaders((hs) => hs.map((x) => (x.id === h.id ? { ...x, enabled: Boolean(c) } : x)))}
                  />
                  <input
                    aria-label="Header name"
                    className={cn(fieldClass, "w-[38%] flex-none", !h.enabled && "opacity-50")}
                    onChange={(e) => setHeaders((hs) => hs.map((x) => (x.id === h.id ? { ...x, key: e.target.value } : x)))}
                    placeholder="Header"
                    spellCheck={false}
                    value={h.key}
                  />
                  <input
                    aria-label="Header value"
                    className={cn(fieldClass, !h.enabled && "opacity-50")}
                    onChange={(e) => setHeaders((hs) => hs.map((x) => (x.id === h.id ? { ...x, value: e.target.value } : x)))}
                    placeholder="Value"
                    spellCheck={false}
                    value={h.value}
                  />
                  <button
                    aria-label={`Remove ${h.key || "header"}`}
                    className={iconBtn}
                    onClick={() => setHeaders((hs) => hs.filter((x) => x.id !== h.id))}
                    type="button"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            <Button
              className="w-fit text-muted-foreground text-xs sm:text-xs"
              onClick={() => setHeaders((hs) => [...hs, { id: nextId(), key: "", value: "", enabled: true }])}
              size="sm"
              variant="ghost"
            >
              <PlusIcon />
              Add header
            </Button>
          </TabsPanel>

          <TabsPanel className="flex min-h-[172px] flex-col gap-2 p-3" value="body">
            {hasBody ? (
              <>
                <textarea
                  aria-invalid={Boolean(bodyError) || undefined}
                  aria-label="JSON body"
                  className={cn(fieldClass, "h-[104px] resize-none py-2 leading-5 aria-invalid:border-destructive/50")}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={'{\n  "name": "value"\n}'}
                  spellCheck={false}
                  value={body}
                />
                <p className={cn("text-xs", bodyError ? "text-destructive-foreground" : "text-muted-foreground")}>
                  {bodyError ? bodyError : body.trim() ? "Valid JSON · sent as application/json" : "Empty body"}
                </p>
              </>
            ) : (
              <p className="py-6 text-center text-muted-foreground text-xs">
                <span className={cn("font-mono font-semibold", methodTone[method])}>{method}</span> requests don’t send a body.
              </p>
            )}
          </TabsPanel>
        </div>
      </Tabs>

      <div className="border-t">
        <div className="flex h-11 items-center gap-2 px-3 sm:gap-2.5">
          <span className="shrink-0 font-medium text-xs">Response</span>
          <AnimatePresence initial={false} mode="popLayout">
            {done && (
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                className={cn("shrink-0 whitespace-nowrap rounded-full px-2 font-medium font-mono text-[11px] tabular-nums leading-5", statusTone)}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                key={`${status}-${done.ms}`}
                transition={{ type: "spring", stiffness: 520, damping: 30 }}
              >
                {status} {done.res.statusText || STATUS_TEXT[status] || ""}
              </motion.span>
            )}
            {phase.state === "error" && (
              <motion.span
                animate={{ opacity: 1 }}
                className="shrink-0 rounded-full bg-destructive/10 px-2 font-medium text-[11px] text-destructive-foreground leading-5"
                initial={{ opacity: 0 }}
                key="err"
              >
                Failed
              </motion.span>
            )}
          </AnimatePresence>
          <span className="shrink-0 whitespace-nowrap font-mono text-muted-foreground text-xs tabular-nums">
            {phase.state === "loading" && `${Math.round(now)} ms`}
            {phase.state === "done" && (
              <>
                {Math.round(phase.ms)} ms
                <span className="max-sm:hidden">
                  {" "}
                  <span className="text-muted-foreground/50">·</span> {formatBytes(phase.size)}
                </span>
              </>
            )}
            {phase.state === "error" && `${Math.round(phase.ms)} ms`}
          </span>
          {done && (
            <div className="ms-auto flex shrink-0 items-center gap-0.5">
              {(["body", "headers"] as const).map((t) => (
                <button
                  aria-pressed={resTab === t}
                  className={cn(
                    "h-8 rounded-lg px-1.5 text-xs capitalize outline-none sm:px-2 transition-[color,background-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                    resTab === t ? "bg-muted text-foreground" : "text-muted-foreground [@media(hover:hover)]:hover:text-foreground",
                  )}
                  key={t}
                  onClick={() => setResTab(t)}
                  type="button"
                >
                  {t}
                </button>
              ))}
              <button
                aria-label={copied ? "Copied" : "Copy response"}
                className={iconBtn}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(pretty);
                  } catch {}
                  setCopied(true);
                }}
                type="button"
              >
                {copied ? <CheckIcon className="size-3.5 text-success-foreground" /> : <CopyIcon className="size-3.5" />}
              </button>
            </div>
          )}
        </div>

        <div className="relative h-[196px] overflow-auto border-t bg-code" id={`${id}-res`}>
          {phase.state === "idle" && (
            <div className="grid h-full place-items-center px-6 text-center">
              <div>
                <p className="text-muted-foreground text-xs">
                  {missing.length ? (
                    <>
                      Fill in <code className="font-mono text-warning-foreground">:{missing[0]}</code> first, then send.
                    </>
                  ) : (
                    "Send the request to see the response."
                  )}
                </p>
                <p className="mt-2 flex items-center justify-center gap-1 text-muted-foreground text-xs">
                  <Kbd>⌘</Kbd>
                  <Kbd>↵</Kbd>
                  <span className="ms-1">to send</span>
                </p>
              </div>
            </div>
          )}
          {phase.state === "loading" && (
            <div aria-label="Waiting for response" className="flex flex-col gap-2.5 p-4" role="status">
              {[64, 40, 52, 30, 46].map((w, i) => (
                <motion.span
                  animate={reduce ? { opacity: 0.6 } : { opacity: [0.35, 0.8, 0.35] }}
                  className="h-2.5 rounded-full bg-muted-foreground/15"
                  key={i}
                  style={{ width: `${w}%`, marginInlineStart: i === 0 || i === 4 ? 0 : 16 }}
                  transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, delay: i * 0.08, ease: "easeInOut" }}
                />
              ))}
            </div>
          )}
          {phase.state === "error" && (
            <div className="p-4 text-xs">
              <p className="font-medium text-destructive-foreground">Couldn’t reach the server</p>
              <p className="mt-1 font-mono text-muted-foreground">{phase.message}</p>
            </div>
          )}
          {done && (
            <motion.pre
              animate={{ opacity: 1 }}
              className="p-4 font-mono text-[12px] leading-5"
              initial={reduce ? false : { opacity: 0 }}
              key={`${resTab}-${done.ms}`}
              transition={{ duration: 0.18 }}
            >
              {resTab === "body" ? (
                pretty ? (
                  <JsonLines text={pretty} />
                ) : (
                  <span className="text-muted-foreground">No content</span>
                )
              ) : (
                Object.entries(done.res.headers ?? {}).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-sky-800 dark:text-sky-300">{k}</span>
                    <span className="text-muted-foreground">: </span>
                    <span>{v}</span>
                  </div>
                ))
              )}
            </motion.pre>
          )}
        </div>
      </div>
    </div>
  );
}
