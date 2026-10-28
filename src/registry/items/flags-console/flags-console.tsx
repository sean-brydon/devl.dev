"use client";

import {
  type AnyFieldDef,
  compile,
  compileCases,
  defineFields,
  type EditorSpec,
  f,
  type Fields,
  formatInput,
  formatList,
  type Issue,
  makeRule,
  parseInput,
  parseList,
  type Query,
  type QueryOf,
  validateQuery,
} from "@qnot/core";
import { QueryProvider, useGroup, useQueryStore, useRule } from "@qnot/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  EllipsisIcon,
  FlagIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { memo, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface ConsoleVariant {
  id: string;
  name: string;
  tone: string;
}

export interface ConsoleRule {
  id: string;
  when: Query;
  serve: string;
}

export interface ConsoleTargeting {
  on: boolean;
  rules: ConsoleRule[];
  rollout: number;
  offVariant: string;
}

export interface ConsoleFlag {
  key: string;
  description: string;
  owner: string;
  stale?: boolean;
  variants: [ConsoleVariant, ConsoleVariant];
  envs: Record<string, ConsoleTargeting>;
}

export interface FlagsConsoleProps {
  fields: Fields;
  flags: ConsoleFlag[];
  environments: { id: string; name: string }[];
  traffic: readonly Record<string, unknown>[];
  tickMs?: number;
  className?: string;
}

interface LogEntry {
  id: number;
  kind: "eval" | "marker";
  time: string;
  user?: Record<string, unknown>;
  variant?: string;
  reason?: string;
}

const listFields = defineFields({
  key: f.text(),
  description: f.text(),
  owner: f.text(),
  status: f.enum(["on", "off", "stale"]),
});

const easeOut = [0.23, 1, 0.32, 1] as const;
const glide = { type: "spring", duration: 0.3, bounce: 0 } as const;
const statusFilters = [
  { value: "all", label: "All" },
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
  { value: "stale", label: "Stale" },
] as const;

function bucketOf(id: string, salt: string) {
  let h = 2166136261;
  for (const ch of `${salt}:${id}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) % 100;
}

function statusOf(flag: ConsoleFlag, env: string) {
  if (flag.stale) return "stale";
  return flag.envs[env]?.on ? "on" : "off";
}

let counter = 0;

export function FlagsConsole({ fields, flags: initialFlags, environments, traffic, tickMs = 1100, className }: FlagsConsoleProps) {
  const [flags, setFlags] = useState(initialFlags);
  const [env, setEnv] = useState(environments[0].id);
  const [selectedKey, setSelectedKey] = useState(initialFlags[0].key);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof statusFilters)[number]["value"]>("all");
  const selected = flags.find((f) => f.key === selectedKey) ?? flags[0];
  const config = selected.envs[env];

  const listQuery = useMemo<QueryOf<typeof listFields>>(() => {
    const children: QueryOf<typeof listFields>["children"][number][] = [];
    const term = search.trim();
    if (term) {
      children.push({
        kind: "group",
        combinator: "or",
        children: [
          { kind: "rule", field: "key", operator: "contains", value: term },
          { kind: "rule", field: "description", operator: "contains", value: term },
          { kind: "rule", field: "owner", operator: "contains", value: term },
        ],
      });
    }
    if (status !== "all") children.push({ kind: "rule", field: "status", operator: "eq", value: status });
    return { kind: "group", combinator: "and", children };
  }, [search, status]);

  const rows = useMemo(
    () => flags.map((flag) => ({ flag, key: flag.key, description: flag.description, owner: flag.owner, status: statusOf(flag, env) })),
    [flags, env],
  );
  const visible = useMemo(() => rows.filter(compile(listFields, listQuery)), [rows, listQuery]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, on: 0, off: 0, stale: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);

  const updateConfig = (patch: Partial<ConsoleTargeting>) =>
    setFlags((all) =>
      all.map((flag) => (flag.key === selected.key ? { ...flag, envs: { ...flag.envs, [env]: { ...flag.envs[env], ...patch } } } : flag)),
    );

  return (
    <div
      className={cn(
        "@container mx-auto flex w-full min-w-0 max-w-[1100px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <FlagIcon className="size-4 text-muted-foreground" />
          <h3 className="font-medium">Feature flags</h3>
        </div>
        <span className="flex-1" />
        <Tabs onValueChange={(v) => setEnv(String(v))} value={env}>
          <TabsList aria-label="Environment" className="text-muted-foreground">
            {environments.map((e) => (
              <TabsTab className="text-xs sm:text-xs" key={e.id} value={e.id}>
                {e.name}
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid min-h-0 @3xl:grid-cols-[16rem_minmax(0,1fr)] @3xl:grid-rows-[33rem_auto] @5xl:grid-cols-[16rem_minmax(0,1fr)_18rem] @5xl:grid-rows-[38rem]">
        <aside className="flex min-h-0 flex-col border-b @3xl:border-e @3xl:border-b-0">
          <div className="flex flex-col gap-2 p-3">
            <label className="relative">
              <span className="sr-only">Search flags</span>
              <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search flags" className="[&_input]:ps-8" onChange={(e) => setSearch(e.target.value)} placeholder="Search flags" size="sm" value={search} />
            </label>
            <div aria-label="Filter by status" className="flex gap-1" role="radiogroup">
              {statusFilters.map((s) => (
                <button
                  aria-checked={status === s.value}
                  className={cn(
                    "flex h-6 items-center gap-1 rounded-md px-1.5 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    status === s.value ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  role="radio"
                  type="button"
                >
                  {s.label}
                  <span className="text-[10px] text-muted-foreground tabular-nums">{counts[s.value]}</span>
                </button>
              ))}
            </div>
          </div>
          <ul aria-label="Flags" className="flex max-h-56 min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 pb-1.5 @3xl:max-h-none">
            {visible.map(({ flag, status: s }) => (
              <li key={flag.key}>
                <button
                  aria-current={flag.key === selected.key || undefined}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    flag.key === selected.key ? "bg-accent" : "hover:bg-accent/50",
                  )}
                  onClick={() => setSelectedKey(flag.key)}
                  type="button"
                >
                  <StatusDot status={s} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium font-mono text-xs">{flag.key}</span>
                    <span className="block truncate text-muted-foreground text-xs">{flag.description}</span>
                  </span>
                </button>
              </li>
            ))}
            {visible.length === 0 && (
              <li className="px-3 py-6 text-center text-muted-foreground text-xs">
                No flags match.{" "}
                <button
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                  onClick={() => {
                    setSearch("");
                    setStatus("all");
                  }}
                  type="button"
                >
                  Clear
                </button>
              </li>
            )}
          </ul>
        </aside>

        <FlagEditor
          config={config}
          env={env}
          envName={environments.find((e) => e.id === env)?.name ?? env}
          fields={fields}
          flag={selected}
          key={`${selected.key}-${env}`}
          onChange={updateConfig}
          traffic={traffic}
        />

        <EvaluationLog config={config} fields={fields} flag={selected} scope={`${selected.key}:${env}`} tickMs={tickMs} traffic={traffic} />
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <span
      aria-label={status === "on" ? "On" : status === "off" ? "Off" : "Stale"}
      className={cn(
        "mt-1 size-2 shrink-0 rounded-full",
        status === "on" ? "bg-success" : status === "stale" ? "bg-warning" : "bg-muted-foreground/40",
      )}
      role="img"
    />
  );
}

function useOutcome(fields: Fields, flag: ConsoleFlag, config: ConsoleTargeting) {
  return useMemo(() => {
    const route = compileCases(
      fields,
      { cases: config.rules.map((r) => ({ when: r.when as QueryOf<Fields>, then: r.serve })) },
      { incompleteRules: false },
    );
    const [a, b] = flag.variants;
    return (user: Record<string, unknown>) => {
      if (!config.on) return { variant: config.offVariant, reason: "Flag off" };
      const hit = route(user as never);
      if (hit.index >= 0) return { variant: String(hit.value), reason: `Rule ${hit.index + 1}` };
      const bucket = bucketOf(String(user.id), flag.key);
      return { variant: bucket < config.rollout ? b.id : a.id, reason: `Rollout · bucket ${bucket}` };
    };
  }, [fields, flag, config]);
}

function FlagEditor({
  flag,
  config,
  env,
  envName,
  fields,
  traffic,
  onChange,
}: {
  flag: ConsoleFlag;
  config: ConsoleTargeting;
  env: string;
  envName: string;
  fields: Fields;
  traffic: readonly Record<string, unknown>[];
  onChange: (patch: Partial<ConsoleTargeting>) => void;
}) {
  const reduce = useReducedMotion();
  const evaluate = useOutcome(fields, flag, config);
  const [a, b] = flag.variants;
  const split = useMemo(() => {
    const out: Record<string, number> = { [a.id]: 0, [b.id]: 0 };
    for (const user of traffic) out[evaluate(user).variant]++;
    return out;
  }, [traffic, evaluate, a.id, b.id]);
  const bShare = traffic.length ? split[b.id] / traffic.length : 0;
  const bPercent = Math.round(bShare * 100);

  const setRule = (id: string, patch: Partial<ConsoleRule>) =>
    onChange({ rules: config.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const moveRule = (index: number, delta: -1 | 1) => {
    const rules = [...config.rules];
    const [rule] = rules.splice(index, 1);
    rules.splice(index + delta, 0, rule);
    onChange({ rules });
  };

  return (
    <section aria-label={`${flag.key} targeting`} className="flex min-h-0 min-w-0 flex-col overflow-y-auto border-b @3xl:border-b-0 @5xl:border-e">
      <div className="flex items-start gap-3 px-4 pt-3.5 pb-3">
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-medium font-mono text-[13px]">{flag.key}</h4>
          <p className="truncate text-muted-foreground text-xs">
            {flag.description} · {flag.owner}
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs">
          <span className={cn("font-medium", config.on ? "text-foreground" : "text-muted-foreground")}>
            {config.on ? `On in ${envName}` : `Off in ${envName}`}
          </span>
          <Switch aria-label={`${flag.key} in ${envName}`} checked={config.on} onCheckedChange={(on) => onChange({ on })} />
        </label>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-baseline justify-between gap-3 pb-1.5 text-xs">
          <span className="text-muted-foreground">Serving now</span>
          <span className="flex items-center gap-3 tabular-nums">
            <span className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", a.tone)} />
              {a.name} {100 - bPercent}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", b.tone)} />
              {b.name} {bPercent}%
            </span>
          </span>
        </div>
        <div aria-hidden className={cn("relative h-1.5 overflow-hidden rounded-full", a.tone)}>
          <motion.div
            animate={{ scaleX: bShare }}
            className={cn("absolute inset-0 origin-right", b.tone)}
            initial={false}
            style={{ transformOrigin: "100% 50%" }}
            transition={reduce ? { duration: 0 } : glide}
          />
        </div>
      </div>

      <div className={cn("flex flex-col gap-4 border-t px-4 pt-3 pb-4 transition-opacity duration-200", !config.on && "opacity-56")}>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h5 className="font-medium text-xs">Targeting rules</h5>
            <span className="text-muted-foreground text-xs">First match wins</span>
          </div>
          <AnimatePresence initial={false} mode="popLayout">
            {config.rules.map((rule, index) => (
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98, transition: { duration: reduce ? 0 : 0.15 } }}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.98 }}
                key={rule.id}
                layout={reduce ? false : "position"}
                layoutDependency={index}
                transition={reduce ? { duration: 0 } : { ...glide, opacity: { duration: 0.18, ease: easeOut } }}
              >
                <RuleCard
                  fields={fields}
                  index={index}
                  isLast={index === config.rules.length - 1}
                  onMove={(d) => moveRule(index, d)}
                  onRemove={() => onChange({ rules: config.rules.filter((r) => r.id !== rule.id) })}
                  onServe={(serve) => setRule(rule.id, { serve })}
                  onWhen={(when) => setRule(rule.id, { when })}
                  rule={rule}
                  variants={flag.variants}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          {config.rules.length === 0 && (
            <p className="rounded-xl border border-dashed px-3 py-3 text-center text-muted-foreground text-xs">
              No rules in {envName}. Everyone goes to the rollout.
            </p>
          )}
          <Button
            className="self-start"
            onClick={() =>
              onChange({
                rules: [
                  ...config.rules,
                  {
                    id: `${env}-rule-${++counter}`,
                    when: { kind: "group", combinator: "and", children: [makeRule(fields, { field: Object.keys(fields)[0] })] },
                    serve: b.id,
                  },
                ],
              })
            }
            size="sm"
            variant="outline"
          >
            <PlusIcon />
            Add rule
          </Button>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <h5 className="font-medium text-xs">Everyone else</h5>
            <span className="text-muted-foreground text-xs tabular-nums">
              {config.rollout}% get {b.name}
            </span>
          </div>
          <Slider
            aria-label={`Share of everyone else who get ${b.name}`}
            getAriaLabel={() => `Share of everyone else who get ${b.name}`}
            max={100}
            min={0}
            onValueChange={(v) => onChange({ rollout: Array.isArray(v) ? v[0] : v })}
            step={5}
            value={config.rollout}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-xs">When off, serve</span>
          <VariantSelect label="Variant served when off" onChange={(offVariant) => onChange({ offVariant })} value={config.offVariant} variants={flag.variants} />
        </div>
      </div>
    </section>
  );
}

function VariantSelect({
  value,
  variants,
  label,
  onChange,
}: {
  value: string;
  variants: ConsoleVariant[];
  label: string;
  onChange: (id: string) => void;
}) {
  const current = variants.find((v) => v.id === value) ?? variants[0];
  return (
    <Select items={variants.map((v) => ({ value: v.id, label: v.name }))} onValueChange={(v) => v && onChange(v)} value={value}>
      <SelectTrigger aria-label={label} className="w-auto min-w-0" size="sm">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={cn("size-2 shrink-0 rounded-full", current.tone)} />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectPopup>
        {variants.map((v) => (
          <SelectItem key={v.id} value={v.id}>
            <span className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", v.tone)} />
              {v.name}
            </span>
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

function RuleCard({
  rule,
  index,
  isLast,
  fields,
  variants,
  onWhen,
  onServe,
  onMove,
  onRemove,
}: {
  rule: ConsoleRule;
  index: number;
  isLast: boolean;
  fields: Fields;
  variants: ConsoleVariant[];
  onWhen: (when: Query) => void;
  onServe: (variant: string) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const store = useQueryStore({ fields, initial: rule.when as QueryOf<Fields>, onChange: (q) => onWhen(q as Query) });
  const incomplete = useMemo(() => validateQuery(fields, rule.when).some((i) => i.code === "required"), [fields, rule.when]);
  return (
    <QueryProvider store={store}>
      <div className="flex flex-col gap-2 rounded-xl border bg-background p-2.5 dark:bg-input/16">
        <div className="flex items-center gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted font-medium text-[11px] tabular-nums">
            {index + 1}
          </span>
          <span className="text-muted-foreground text-xs">Serve</span>
          <VariantSelect label={`Variant for rule ${index + 1}`} onChange={onServe} value={rule.serve} variants={variants} />
          <span className="flex-1" />
          <Menu>
            <MenuTrigger render={<Button aria-label={`Rule ${index + 1} actions`} size="icon-sm" variant="ghost" />}>
              <EllipsisIcon />
            </MenuTrigger>
            <MenuPopup align="end" className="w-40">
              <MenuItem disabled={index === 0} onClick={() => onMove(-1)}>
                <ArrowUpIcon />
                Move up
              </MenuItem>
              <MenuItem disabled={isLast} onClick={() => onMove(1)}>
                <ArrowDownIcon />
                Move down
              </MenuItem>
              <MenuSeparator />
              <MenuItem onClick={onRemove} variant="destructive">
                <Trash2Icon />
                Delete rule
              </MenuItem>
            </MenuPopup>
          </Menu>
        </div>
        <Conditions id={store.rootId} status={incomplete ? <span className="text-warning-foreground">Incomplete, skipped</span> : null} />
      </div>
    </QueryProvider>
  );
}

function EvaluationLog({
  scope,
  flag,
  config,
  fields,
  traffic,
  tickMs,
}: {
  scope: string;
  flag: ConsoleFlag;
  config: ConsoleTargeting;
  fields: Fields;
  traffic: readonly Record<string, unknown>[];
  tickMs: number;
}) {
  const reduce = useReducedMotion();
  const evaluate = useOutcome(fields, flag, config);
  const [paused, setPaused] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const evaluateRef = useRef(evaluate);
  const cursor = useRef(0);
  const lastScope = useRef(scope);
  const nextId = useRef(0);

  useEffect(() => {
    if (evaluateRef.current === evaluate) return;
    evaluateRef.current = evaluate;
    if (lastScope.current !== scope) {
      lastScope.current = scope;
      setLog([]);
      return;
    }
    setLog((l) =>
      l[0]?.kind === "marker"
        ? [{ ...l[0], time: clock() }, ...l.slice(1)]
        : [{ id: ++nextId.current, kind: "marker" as const, time: clock() }, ...l].slice(0, 40),
    );
  }, [evaluate, scope]);

  useEffect(() => {
    if (paused || traffic.length === 0) return;
    const tick = () => {
      const user = traffic[cursor.current++ % traffic.length];
      const { variant, reason } = evaluateRef.current(user);
      setLog((l) => [{ id: ++nextId.current, kind: "eval" as const, time: clock(), user, variant, reason }, ...l].slice(0, 40));
    };
    tick();
    const t = setInterval(tick, tickMs);
    return () => clearInterval(t);
  }, [paused, traffic, tickMs]);

  const evals = log.filter((e) => e.kind === "eval");
  const bCount = evals.filter((e) => e.variant === flag.variants[1].id).length;

  return (
    <section aria-label="Live evaluations" className="flex min-h-0 flex-col @3xl:col-span-2 @3xl:border-t @5xl:col-span-1 @5xl:border-t-0">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className="relative flex size-2">
          {!paused && <span className="absolute inset-0 animate-ping rounded-full bg-success/60 motion-reduce:hidden" />}
          <span className={cn("relative size-2 rounded-full", paused ? "bg-muted-foreground/48" : "bg-success")} />
        </span>
        <h5 className="font-medium text-xs">Live evaluations</h5>
        <span className="min-w-0 flex-1 truncate text-end text-muted-foreground text-xs tabular-nums">
          {evals.length ? `${Math.round((bCount / evals.length) * 100)}% ${flag.variants[1].name}` : ""}
        </span>
        <Button aria-label={paused ? "Resume" : "Pause"} onClick={() => setPaused((p) => !p)} size="icon-xs" variant="ghost">
          {paused ? <PlayIcon /> : <PauseIcon />}
        </Button>
      </div>
      <ol aria-live="off" className="flex h-72 min-h-0 flex-col overflow-hidden px-2 pb-2 @3xl:h-56 @5xl:h-auto @5xl:flex-1">
        <AnimatePresence initial={false}>
          {log.map((entry) =>
            entry.kind === "marker" ? (
              <motion.li
                animate={{ opacity: 1 }}
                className="flex h-7 shrink-0 items-center gap-2 px-2 text-[11px] text-muted-foreground"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key={entry.id}
                layout={reduce ? false : "position"}
                transition={reduce ? { duration: 0 } : glide}
              >
                <span className="h-px flex-1 bg-border" />
                Targeting changed {entry.time}
                <span className="h-px flex-1 bg-border" />
              </motion.li>
            ) : (
              <motion.li
                animate={{ opacity: 1, y: 0 }}
                className="flex h-9 shrink-0 items-center gap-2 rounded-lg px-2 text-xs"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0, y: reduce ? 0 : -6 }}
                key={entry.id}
                layout={reduce ? false : "position"}
                transition={reduce ? { duration: 0 } : { ...glide, opacity: { duration: 0.2, ease: easeOut } }}
              >
                <span className="w-14 shrink-0 font-mono text-[10.5px] text-muted-foreground tabular-nums">{entry.time}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[11px]">{String(entry.user?.id)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {[entry.user?.country, entry.user?.plan, entry.reason].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <VariantPill variant={flag.variants.find((v) => v.id === entry.variant) ?? flag.variants[0]} />
              </motion.li>
            ),
          )}
        </AnimatePresence>
      </ol>
    </section>
  );
}

function VariantPill({ variant }: { variant: ConsoleVariant }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 font-medium text-[11px] dark:bg-input/32">
      <span className={cn("size-1.5 rounded-full", variant.tone)} />
      {variant.name}
    </span>
  );
}

function clock() {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
}

function Conditions({ id, status }: { id: string; status: ReactNode }) {
  const { group, addRule, setCombinator } = useGroup(id);
  return (
    <div className="@container flex flex-col gap-2.5 @sm:gap-1.5">
      {group.children.map((child, i) => (
        <div className="flex items-start gap-1.5" key={child}>
          {i === 0 ? (
            <span className="flex h-8 w-9 shrink-0 sm:h-7 items-center text-muted-foreground text-xs">If</span>
          ) : i === 1 ? (
            <button
              aria-label={`Match ${group.combinator === "and" ? "any" : "all"} conditions instead`}
              className="flex h-8 w-9 shrink-0 sm:h-7 items-center justify-center rounded-lg border border-input bg-background font-medium text-xs shadow-xs/5 outline-none transition-[background-color,scale] duration-150 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] dark:bg-input/32"
              onClick={() => setCombinator(group.combinator === "and" ? "or" : "and")}
              type="button"
            >
              {group.combinator}
            </button>
          ) : (
            <span className="flex h-8 w-9 shrink-0 sm:h-7 items-center ps-1 text-muted-foreground text-xs">{group.combinator}</span>
          )}
          <div className="min-w-0 flex-1">
            <Condition id={child} />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between gap-2 ps-10.5">
        <button
          className="-ms-1.5 flex h-7 items-center gap-1 rounded-md px-1.5 text-muted-foreground text-xs outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => addRule()}
          type="button"
        >
          <PlusIcon className="size-3.5" />
          Condition
        </button>
        <span className="min-w-0 truncate text-muted-foreground text-xs tabular-nums">{status}</span>
      </div>
    </div>
  );
}


const Condition = memo(function Condition({ id }: { id: string }) {
  const { rule, def, editor, operators, fieldOptions, issues, setField, setOperator, setValue, remove } = useRule(id);
  const field = typeof rule.field === "string" ? rule.field : "";
  const label = fieldOptions.find((o) => o.value === field)?.label ?? field;
  const errors = issues.filter((i) => i.severity === "error" && i.code !== "required");
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_2rem] items-start gap-1.5 @sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem] @md:grid-cols-[7.5rem_7rem_minmax(0,1fr)_2rem]">
        <Select items={fieldOptions} onValueChange={(v) => v && setField(v)} value={field}>
          <SelectTrigger aria-label="Attribute" className="col-start-1 row-start-1 min-w-0" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {fieldOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <Select items={operators} onValueChange={(v) => v && setOperator(v)} value={rule.operator}>
          <SelectTrigger
            aria-label="Operator"
            className="col-start-1 row-start-2 min-w-0 @sm:col-start-2 @sm:row-start-1"
            size="sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {operators.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <div
          className={cn(
            "col-start-1 row-start-3 min-w-0 @sm:col-span-2 @sm:row-start-2 @md:col-span-1 @md:col-start-3 @md:row-start-1",
            editor.arity === "none" && "hidden",
          )}
        >
          <ValueEditor def={def} editor={editor} issues={issues} label={label} onChange={setValue} value={rule.value} />
        </div>
        <Button
          aria-label={`Remove condition on ${label}`}
          className="col-start-2 row-start-1 @sm:col-start-3 @md:col-start-4"
          onClick={remove}
          size="icon-sm"
          variant="ghost"
        >
          <XIcon />
        </Button>
      </div>
      {errors.length > 0 && <p className="pt-1 text-destructive-foreground text-xs">{errors.map((e) => e.message).join(" · ")}</p>}
    </div>
  );
});

function ValueEditor({
  editor,
  def,
  value,
  issues,
  label,
  onChange,
}: {
  editor: EditorSpec;
  def: AnyFieldDef | undefined;
  value: unknown;
  issues: readonly Issue[];
  label: string;
  onChange: (value: unknown) => void;
}) {
  const invalidAt = (index?: number) =>
    issues.some((i) => i.severity === "error" && i.code !== "required" && (index === undefined || i.index === undefined || i.index === index));
  if (editor.arity === "none") return null;
  if (editor.arity === "two") {
    const pair = Array.isArray(value) ? value : [null, null];
    return (
      <div className="flex items-center gap-1.5">
        <Scalar def={def} editor={editor} invalid={invalidAt(0)} label={`${label} from`} onChange={(v) => onChange([v, pair[1] ?? null])} value={pair[0]} />
        <span className="shrink-0 text-muted-foreground text-xs">and</span>
        <Scalar def={def} editor={editor} invalid={invalidAt(1)} label={`${label} to`} onChange={(v) => onChange([pair[0] ?? null, v])} value={pair[1]} />
      </div>
    );
  }
  if (editor.type === "multiselect") {
    const options = editor.options ?? [];
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <Select
        items={options.map((o) => ({ value: String(o.value), label: o.label }))}
        multiple
        onValueChange={(next) => onChange((next as string[]).map((raw) => parseInput(def, raw)))}
        value={selected}
      >
        <SelectTrigger aria-invalid={invalidAt() || undefined} aria-label={`${label} values`} className="min-w-0" size="sm">
          <SelectValue>
            {(vals: string[]) =>
              vals.length === 0 ? (
                <span className="text-muted-foreground">Choose…</span>
              ) : (
                vals.map((v) => options.find((o) => String(o.value) === v)?.label ?? v).join(", ")
              )
            }
          </SelectValue>
        </SelectTrigger>
        <SelectPopup>
          {options.map((o) => (
            <SelectItem key={String(o.value)} value={String(o.value)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    );
  }
  if (editor.type === "list") {
    return (
      <DraftInput
        format={formatList}
        invalid={invalidAt()}
        label={`${label} values`}
        onChange={onChange}
        parse={(raw) => parseList(def, raw)}
        placeholder="Comma, separated"
        value={value}
      />
    );
  }
  return <Scalar def={def} editor={editor} invalid={invalidAt()} label={label} onChange={onChange} value={value} />;
}

function Scalar({
  editor,
  def,
  value,
  invalid,
  label,
  onChange,
}: {
  editor: EditorSpec;
  def: AnyFieldDef | undefined;
  value: unknown;
  invalid: boolean;
  label: string;
  onChange: (value: unknown) => void;
}) {
  if (editor.type === "select" || editor.type === "boolean") {
    const items =
      editor.type === "boolean"
        ? [
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ]
        : (editor.options ?? []).map((o) => ({ value: String(o.value), label: o.label }));
    return (
      <Select
        items={items}
        onValueChange={(raw) => raw !== null && onChange(parseInput(def, String(raw)))}
        value={value === null || value === undefined ? null : String(value)}
      >
        <SelectTrigger aria-invalid={invalid || undefined} aria-label={label} className="min-w-0" size="sm">
          <SelectValue placeholder="Choose…" />
        </SelectTrigger>
        <SelectPopup>
          {items.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    );
  }
  return (
    <DraftInput
      format={formatInput}
      inputMode={editor.type === "number" ? "decimal" : undefined}
      invalid={invalid}
      label={label}
      onChange={onChange}
      parse={(raw) => parseInput(def, raw)}
      placeholder={editor.type === "number" ? "0" : "Value"}
      type={editor.type === "date" ? "date" : "text"}
      value={value}
    />
  );
}

function DraftInput({
  value,
  parse,
  format,
  invalid,
  label,
  placeholder,
  inputMode,
  type = "text",
  onChange,
}: {
  value: unknown;
  parse: (raw: string) => unknown;
  format: (value: unknown) => string;
  invalid: boolean;
  label: string;
  placeholder?: string;
  inputMode?: "decimal";
  type?: "text" | "date";
  onChange: (value: unknown) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const unreadable = draft !== null && draft.trim() !== "" && parse(draft) === null;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Input
        aria-invalid={invalid || unreadable || undefined}
        aria-label={label}
        className={type === "date" ? "[color-scheme:light] dark:[color-scheme:dark]" : undefined}
        inputMode={inputMode}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(parse(e.target.value));
        }}
        onFocus={() => setDraft(format(value))}
        placeholder={placeholder}
        size="sm"
        type={type}
        value={draft ?? format(value)}
      />
      {unreadable && <p className="text-destructive-foreground text-xs">Enter a number</p>}
    </div>
  );
}

