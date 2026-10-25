"use client";

import {
  compile,
  defineFields,
  f,
  fieldLabel,
  parseInput,
  type PathIssue,
  type Query,
  type QueryNode,
  type QueryOf,
  type ValueOf,
  validateQuery,
} from "@qnot/core";
import { CornerDownLeftIcon, SearchIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export const ticketFields = defineFields({
  status: f.enum([
    { value: "open", label: "Open" },
    { value: "pending", label: "Pending" },
    { value: "solved", label: "Solved" },
    { value: "closed", label: "Closed" },
  ]),
  owner: f.enum([
    { value: "riley", label: "Riley" },
    { value: "noor", label: "Noor" },
    { value: "sam", label: "Sam" },
    { value: "kai", label: "Kai" },
    { value: "none", label: "Nobody" },
  ]),
  priority: f.number({ min: 1, max: 4, integer: true, description: "1 low, 2 normal, 3 high, 4 urgent" }),
  channel: f.enum([
    { value: "email", label: "Email" },
    { value: "chat", label: "Chat" },
    { value: "phone", label: "Phone" },
  ]),
  customer: f.text(),
  title: f.text(),
});

type TicketFields = typeof ticketFields;

export interface Ticket {
  id: string;
  title: string;
  customer: string;
  status: ValueOf<TicketFields["status"]>;
  owner: ValueOf<TicketFields["owner"]>;
  priority: number;
  channel: ValueOf<TicketFields["channel"]>;
  updated: string;
}

export interface SmartSearchProps {
  tickets: readonly Ticket[];
  me?: string;
  defaultValue?: string;
  examples?: string[];
  onQueryChange?: (query: Query) => void;
  className?: string;
}

interface Token {
  raw: string;
  start: number;
  end: number;
  node: QueryNode;
  label: string;
}

const easeOut = [0.23, 1, 0.32, 1] as const;
const glide = { type: "spring", duration: 0.3, bounce: 0 } as const;
const priorityNames = ["Low", "Normal", "High", "Urgent"];
const fieldNames = Object.keys(ticketFields) as (keyof TicketFields & string)[];
const opWords: Record<string, string> = { gt: ">", gte: "≥", lt: "<", lte: "≤", eq: "is", neq: "is not", in: "is any of", notIn: "is none of", contains: "has", notContains: "lacks", between: "between" };

function splitTokens(text: string) {
  const out: { raw: string; start: number; end: number }[] = [];
  const re = /(-?[\w.]+(?::|>=|<=|>|<)"[^"]*"?|"[^"]*"?|\S+)/g;
  for (let m = re.exec(text); m; m = re.exec(text)) out.push({ raw: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}

function enumValue(field: keyof TicketFields, raw: string, me: string) {
  if (field === "owner" && raw.toLowerCase() === "me") return me;
  const def = ticketFields[field];
  const options = (def.options ?? []) as readonly { value: string; label: string }[];
  return options.find((o) => o.value === raw.toLowerCase() || o.label.toLowerCase() === raw.toLowerCase())?.value ?? raw;
}

function toToken(part: { raw: string; start: number; end: number }, me: string): Token {
  const m = /^(-?)([\w.]+)(:|>=|<=|>|<)(.*)$/.exec(part.raw);
  if (!m) {
    const text = part.raw.replace(/^"|"$/g, "");
    return { ...part, node: { kind: "rule", field: "title", operator: "contains", value: text }, label: "Title" };
  }
  const [, neg, key, sign, rest] = m;
  const field = key as keyof TicketFields;
  const raw = rest.replace(/^"|"$/g, "");
  const def = ticketFields[field];
  const negate = neg === "-";
  if (!def) return { ...part, node: { kind: "rule", field: key, operator: "eq", value: raw }, label: key };
  const kind = def.kind;
  if (sign !== ":") {
    const op = { ">": "gt", ">=": "gte", "<": "lt", "<=": "lte" }[sign] as string;
    const parsed = parseInput(def, raw);
    return { ...part, node: { kind: "rule", field, operator: op, value: parsed ?? (raw || null) }, label: fieldLabel(field, def) };
  }
  if (kind === "number" && raw.includes("..")) {
    const [a, b] = raw.split("..").map((v) => parseInput(def, v) ?? (v || null));
    return { ...part, node: { kind: "rule", field, operator: negate ? "notBetween" : "between", value: [a, b] }, label: fieldLabel(field, def) };
  }
  if (kind === "enum") {
    const values = raw.split(",").filter(Boolean).map((v) => enumValue(field, v, me));
    const many = values.length > 1;
    return {
      ...part,
      node: {
        kind: "rule",
        field,
        operator: many ? (negate ? "notIn" : "in") : negate ? "neq" : "eq",
        value: many ? values : (values[0] ?? null),
      },
      label: fieldLabel(field, def),
    };
  }
  if (kind === "number") {
    return { ...part, node: { kind: "rule", field, operator: negate ? "neq" : "eq", value: parseInput(def, raw) ?? (raw || null) }, label: fieldLabel(field, def) };
  }
  return { ...part, node: { kind: "rule", field, operator: negate ? "notContains" : "contains", value: raw || null }, label: fieldLabel(field, def) };
}

function describeValue(node: QueryNode, me: string) {
  if (node.kind !== "rule" || !("value" in node)) return "";
  const field = node.field as keyof TicketFields;
  const def = ticketFields[field];
  const show = (v: unknown) => {
    if (v === null || v === undefined || v === "") return "…";
    if (field === "owner" && v === me) return "me";
    if (field === "priority" && typeof v === "number" && priorityNames[v - 1]) return priorityNames[v - 1];
    const option = (def?.options as readonly { value: unknown; label: string }[] | undefined)?.find((o) => o.value === v);
    return option?.label ?? String(v);
  };
  const v = node.value;
  if (Array.isArray(v)) return node.operator.includes("etween") ? `${show(v[0])}–${show(v[1])}` : v.map(show).join(", ");
  return show(v);
}

function suggestionsFor(token: string, me: string) {
  const m = /^(-?)([\w.]*)(:?)(.*)$/.exec(token);
  if (!m) return [];
  const [, neg, key, colon, rest] = m;
  if (!colon) {
    return fieldNames
      .filter((name) => name.startsWith(key.toLowerCase()) && name !== "title")
      .map((name) => ({ insert: `${neg}${name}:`, label: `${neg}${name}:`, hint: ticketFields[name].description ?? fieldLabel(name, ticketFields[name]) }));
  }
  const def = ticketFields[key as keyof TicketFields];
  if (!def?.options) return [];
  const done = rest.split(",");
  const partial = done.pop() ?? "";
  const prefix = `${neg}${key}:${done.length ? `${done.join(",")},` : ""}`;
  const options = (def.options as readonly { value: string; label: string }[]).map((o) => ({ value: o.value, label: o.label }));
  if (key === "owner") options.unshift({ value: "me", label: `Me (${options.find((o) => o.value === me)?.label ?? me})` });
  return options
    .filter((o) => o.value.startsWith(partial.toLowerCase()) && !(key === "owner" && o.value === me))
    .map((o) => ({ insert: `${prefix}${o.value} `, label: `${prefix}${o.value}`, hint: o.label }));
}

export function SmartSearch({
  tickets,
  me = "riley",
  defaultValue = "",
  examples = [],
  onQueryChange,
  className,
}: SmartSearchProps) {
  const reduce = useReducedMotion();
  const inputId = useId();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(defaultValue);
  const [caret, setCaret] = useState(defaultValue.length);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const tokens = useMemo(() => splitTokens(text).map((p) => toToken(p, me)), [text, me]);
  const query = useMemo<Query>(() => ({ kind: "group", combinator: "and", children: tokens.map((t) => t.node) }), [tokens]);
  const issues = useMemo(() => validateQuery(ticketFields, query), [query]);
  const issueAt = (index: number): PathIssue | undefined =>
    issues.find((i) => i.path[0] === index && i.severity === "error" && !(i.code === "required" && tokens[index]?.end === caret));

  const results = useMemo(
    () => tickets.filter(compile<TicketFields, Ticket>(ticketFields, query as QueryOf<TicketFields>, { invalidRules: "skip" })),
    [tickets, query],
  );
  useEffect(() => {
    onQueryChange?.(query);
  }, [query, onQueryChange]);

  const current = useMemo(() => {
    const before = text.slice(0, caret);
    const start = before.search(/\S*$/);
    const after = text.slice(caret).search(/\s|$/);
    return { start, end: caret + after, value: text.slice(start, caret + after) };
  }, [text, caret]);
  const suggestions = useMemo(() => suggestionsFor(current.value, me).slice(0, 6), [current.value, me]);
  const open =
    focused &&
    !dismissed &&
    suggestions.length > 0 &&
    (current.value !== "" || text.trim() === "") && !(suggestions.length === 1 && suggestions[0].label === current.value.trim());

  const commit = (next: string, nextCaret: number) => {
    setText(next);
    setCaret(nextCaret);
    setActive(0);
    setDismissed(false);
    requestAnimationFrame(() => input.current?.setSelectionRange(nextCaret, nextCaret));
  };

  const accept = (index: number) => {
    const s = suggestions[index];
    if (!s) return;
    const next = text.slice(0, current.start) + s.insert + text.slice(current.end).replace(/^\s+/, "");
    commit(next, current.start + s.insert.length);
  };

  const removeToken = (token: Token) => {
    const next = (text.slice(0, token.start) + text.slice(token.end)).replace(/\s{2,}/g, " ").trimStart();
    commit(next, Math.min(token.start, next.length));
    input.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
    } else if (open && (e.key === "Enter" || e.key === "Tab")) {
      e.preventDefault();
      accept(active);
    } else if (e.key === "Escape") {
      if (open) setDismissed(true);
      else if (text) commit("", 0);
    }
  };

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-[620px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5",
        className,
      )}
    >
      <div className="relative px-3 pt-3">
        <label className="sr-only" htmlFor={inputId}>
          Search tickets
        </label>
        <div className="relative flex h-10 items-center gap-2 rounded-xl border border-input bg-background px-3 shadow-xs/5 ring-ring/24 transition-shadow has-focus-visible:border-ring has-focus-visible:ring-[3px] dark:bg-input/32">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            aria-activedescendant={open ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={open}
            autoCapitalize="off"
            autoComplete="off"
            className="h-full min-w-0 flex-1 bg-transparent font-mono text-base outline-none sm:text-[13px] placeholder:font-sans placeholder:text-muted-foreground/72"
            id={inputId}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              setText(e.target.value);
              setCaret(e.target.selectionStart ?? e.target.value.length);
              setActive(0);
              setDismissed(false);
            }}
            onFocus={() => setFocused(true)}
            onKeyDown={onKeyDown}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
            placeholder="status:open owner:me priority>2"
            ref={input}
            role="combobox"
            spellCheck={false}
            value={text}
          />
          {text ? (
            <button
              aria-label="Clear search"
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => commit("", 0)}
              type="button"
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </div>
        <AnimatePresence>
          {open && (
            <motion.ul
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute inset-x-3 top-full z-20 mt-1 origin-top overflow-hidden rounded-xl border bg-popover p-1 shadow-lg/5"
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
              id={listId}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.98, y: reduce ? 0 : -2 }}
              role="listbox"
              transition={{ duration: 0.14, ease: easeOut }}
            >
              {suggestions.map((s, i) => (
                <li
                  aria-selected={i === active}
                  className={cn(
                    "flex h-8 cursor-default items-center gap-3 rounded-md px-2 text-xs",
                    i === active && "bg-accent text-accent-foreground",
                  )}
                  id={`${listId}-${i}`}
                  key={s.label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    accept(i);
                  }}
                  onMouseMove={() => setActive(i)}
                  role="option"
                >
                  <span className="font-mono text-[12px]">{s.label}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.hint}</span>
                  {i === active && <CornerDownLeftIcon className="size-3 shrink-0 text-muted-foreground" />}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <div className="flex min-h-11 flex-wrap items-center gap-1.5 px-3 py-2">
        <AnimatePresence initial={false} mode="popLayout">
          {tokens.map((token, i) => {
            const issue = issueAt(i);
            const node = token.node;
            const op = node.kind === "rule" ? (opWords[node.operator] ?? node.operator) : "";
            return (
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "flex h-6 max-w-full items-center gap-1 rounded-md border ps-1.5 text-xs",
                  issue
                    ? "border-destructive/32 bg-destructive/6 text-destructive-foreground dark:bg-destructive/12"
                    : "border-transparent bg-muted",
                )}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: reduce ? 0 : 0.1 } }}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.95 }}
                key={token.start}
                layout={reduce ? false : "position"}
                title={issue?.message}
                transition={reduce ? { duration: 0 } : { ...glide, opacity: { duration: 0.12 } }}
              >
                <span className={cn("font-medium", !issue && "text-foreground")}>{token.label}</span>
                <span className={issue ? "" : "text-muted-foreground"}>{op}</span>
                <span className="min-w-0 truncate font-medium">{describeValue(node, me)}</span>
                {issue && <span className="truncate opacity-80">· {issue.message}</span>}
                <button
                  aria-label={`Remove ${token.raw}`}
                  className="flex h-full w-5 shrink-0 items-center justify-center rounded-e-md opacity-64 outline-none transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => removeToken(token)}
                  type="button"
                >
                  <XIcon className="size-3" />
                </button>
              </motion.span>
            );
          })}
        </AnimatePresence>
        {tokens.length === 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-xs">
            <span>Try</span>
            {examples.map((ex) => (
              <button
                className="rounded-md border border-dashed px-1.5 py-0.5 font-mono text-[11px] outline-none transition-colors hover:border-solid hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                key={ex}
                onClick={() => {
                  commit(`${ex} `, ex.length + 1);
                  input.current?.focus();
                }}
                type="button"
              >
                {ex}
              </button>
            ))}
            <span className="max-sm:hidden">
              or press <Kbd>Tab</Kbd> to complete
            </span>
          </div>
        )}
      </div>

      <div className="border-t">
        <div className="flex h-9 items-center justify-between gap-3 px-4 pt-1 text-muted-foreground text-xs">
          <span className="min-w-0 truncate tabular-nums">
            {tokens.length ? `${results.length} of ${tickets.length} tickets` : `${tickets.length} tickets`}
          </span>
          {tokens.length > 0 && (
            <button
              className="shrink-0 rounded-md px-1.5 py-0.5 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => commit("", 0)}
              type="button"
            >
              Clear search
            </button>
          )}
        </div>
        <div className="relative h-[264px] overflow-y-auto px-1.5 pb-1.5" role="table" aria-label="Tickets">
          <div className="sr-only" role="row">
            <span role="columnheader">Priority</span>
            <span role="columnheader">Ticket</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Owner</span>
          </div>
          <AnimatePresence initial={false}>
            {results.map((t) => (
              <motion.div
                animate={{ opacity: 1 }}
                className="flex h-11 items-center gap-3 rounded-lg px-2.5 hover:bg-accent/50"
                exit={{ opacity: 0, transition: { duration: 0 } }}
                initial={{ opacity: 0 }}
                key={t.id}
                role="row"
                transition={{ duration: reduce ? 0 : 0.15, ease: easeOut }}
              >
                <span role="cell">
                  <PriorityPill priority={t.priority} />
                </span>
                <span className="min-w-0 flex-1" role="cell">
                  <span className="block truncate">{t.title}</span>
                  <span className="block truncate text-muted-foreground text-xs">
                    <span className="font-mono">{t.id}</span> · {t.customer} · {t.updated}
                  </span>
                </span>
                <span className="shrink-0" role="cell">
                  <StatusBadge status={t.status} />
                </span>
                <span className="w-12 shrink-0 truncate text-end text-muted-foreground text-xs max-sm:hidden" role="cell">
                  {t.owner === me ? "Me" : t.owner === "none" ? "—" : ticketFields.owner.options?.find((o) => o.value === t.owner)?.label}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {results.length === 0 && (
              <motion.div
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <SearchIcon className="mb-1 size-5 text-muted-foreground" />
                <p className="font-medium">No tickets match</p>
                <p className="text-muted-foreground text-xs">Drop a token or widen a range.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PriorityPill({ priority }: { priority: number }) {
  const tone =
    priority >= 4
      ? "bg-destructive/10 text-destructive-foreground"
      : priority === 3
        ? "bg-warning/12 text-warning-foreground"
        : "bg-muted text-muted-foreground";
  return (
    <span className={cn("flex h-5 w-14 items-center justify-center rounded-md font-medium text-[11px]", tone)}>
      {priorityNames[priority - 1] ?? priority}
    </span>
  );
}

function StatusBadge({ status }: { status: Ticket["status"] }) {
  const styles: Record<Ticket["status"], string> = {
    open: "bg-info/10 text-info-foreground",
    pending: "bg-warning/12 text-warning-foreground",
    solved: "bg-success/10 text-success-foreground",
    closed: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 font-medium text-[11px]", styles[status])}>
      {ticketFields.status.options?.find((o) => o.value === status)?.label}
    </span>
  );
}
