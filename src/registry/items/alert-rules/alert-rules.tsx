"use client";

import {
  type AnyFieldDef,
  compile,
  type EditorSpec,
  type Fields,
  fieldLabel,
  formatInput,
  formatList,
  type Issue,
  parseInput,
  parseList,
  type Query,
  type QueryNode,
  type QueryOf,
  validateQuery,
} from "@qnot/core";
import { QueryProvider, useGroup, useQuery, useQueryStore, useRule } from "@qnot/react";
import { BellRingIcon, PlusIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { memo, type ReactNode, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface PastIncident {
  id: string;
  title: string;
  day: number;
  at: string;
  [attribute: string]: unknown;
}

export interface AlertAction {
  id: string;
  name: string;
}

export interface AlertTrigger {
  metric: string;
  operator: "gt" | "gte" | "lt" | "lte";
  threshold: number | null;
  minutes: number | null;
}

export interface AlertRulesProps {
  fields: Fields;
  metrics: string[];
  durationField: string;
  incidents: readonly PastIncident[];
  actions: AlertAction[];
  defaultName?: string;
  defaultTrigger: AlertTrigger;
  defaultScope?: Query;
  defaultAction?: string;
  days?: number;
  className?: string;
}

const easeOut = [0.23, 1, 0.32, 1] as const;
const triggerOps = [
  { value: "gt", label: "is above" },
  { value: "gte", label: "reaches" },
  { value: "lt", label: "drops below" },
  { value: "lte", label: "is at most" },
];

export function AlertRules({
  fields,
  metrics,
  durationField,
  incidents,
  actions,
  defaultName = "Checkout errors",
  defaultTrigger,
  defaultScope = { kind: "group", combinator: "and", children: [] },
  defaultAction,
  days = 30,
  className,
}: AlertRulesProps) {
  const scopeFields = useMemo(
    () => Object.fromEntries(Object.entries(fields).filter(([k]) => !metrics.includes(k) && k !== durationField)) as Fields,
    [fields, metrics, durationField],
  );
  const store = useQueryStore({ fields: scopeFields, initial: defaultScope as QueryOf<Fields> });
  return (
    <QueryProvider store={store}>
      <AlertEditor
        actions={actions}
        className={className}
        days={days}
        defaultAction={defaultAction ?? actions[0].id}
        defaultName={defaultName}
        defaultTrigger={defaultTrigger}
        durationField={durationField}
        fields={fields}
        incidents={incidents}
        metrics={metrics}
        scopeRoot={store.rootId}
      />
    </QueryProvider>
  );
}

function AlertEditor({
  fields,
  metrics,
  durationField,
  incidents,
  actions,
  defaultName,
  defaultTrigger,
  defaultAction,
  days,
  scopeRoot,
  className,
}: Omit<AlertRulesProps, "defaultScope" | "defaultAction" | "defaultName" | "days"> & {
  defaultName: string;
  defaultAction: string;
  days: number;
  scopeRoot: string;
}) {
  const reduce = useReducedMotion();
  const scope = useQuery();
  const [name, setName] = useState(defaultName);
  const [enabled, setEnabled] = useState(true);
  const [trigger, setTrigger] = useState(defaultTrigger);
  const [action, setAction] = useState(defaultAction);
  const [unreadable, setUnreadable] = useState<Record<number, boolean>>({});
  const metricDef = fields[trigger.metric];

  const query = useMemo<Query>(() => {
    const children: QueryNode[] = [
      { kind: "rule", field: trigger.metric, operator: trigger.operator, value: trigger.threshold },
      { kind: "rule", field: durationField, operator: "gte", value: trigger.minutes },
    ];
    if (scope.combinator === "and" && !scope.not) children.push(...scope.children);
    else if (scope.children.length) children.push(scope);
    return { kind: "group", combinator: "and", children };
  }, [trigger, durationField, scope]);

  const issues = useMemo(() => validateQuery(fields, query), [fields, query]);
  const triggerIssues = issues.filter((i) => (i.path[0] === 0 || i.path[0] === 1) && i.severity === "error");
  const blocked = issues.some((i) => i.severity === "error");
  const fired = useMemo(
    () => (blocked ? [] : incidents.filter(compile(fields, query as QueryOf<Fields>) as (i: PastIncident) => boolean)),
    [blocked, incidents, fields, query],
  );

  const setT = (patch: Partial<AlertTrigger>) => setTrigger((t) => ({ ...t, ...patch }));

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-[600px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-1">
        <BellRingIcon className="size-4 shrink-0 text-muted-foreground" />
        <input
          aria-label="Alert name"
          className="-mx-1.5 min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-0.5 font-medium outline-none transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setName(e.target.value)}
          value={name}
        />
        <Switch aria-label="Alert enabled" checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className={cn("flex flex-col gap-3 px-4 pt-2 pb-4 transition-opacity duration-200", !enabled && "opacity-56")}>
        <div className="flex flex-col gap-1.5">
          <span className="font-medium text-muted-foreground text-xs">When</span>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 leading-8">
            <Select
              items={metrics.map((m) => ({ value: m, label: fieldLabel(m, fields[m]) }))}
              onValueChange={(v) => v && setT({ metric: v })}
              value={trigger.metric}
            >
              <SelectTrigger aria-label="Metric" className="w-auto min-w-0" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {metrics.map((m) => (
                  <SelectItem key={m} value={m}>
                    {fieldLabel(m, fields[m])}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Select items={triggerOps} onValueChange={(v) => v && setT({ operator: v as AlertTrigger["operator"] })} value={trigger.operator}>
              <SelectTrigger aria-label="Comparison" className="w-auto min-w-0" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {triggerOps.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <NumberSlot
              invalid={triggerIssues.some((i) => i.path[0] === 0)}
              label="Threshold"
              onChange={(threshold) => setT({ threshold })}
              onUnreadable={(bad) => setUnreadable((u) => ({ ...u, 0: bad }))}
              suffix={metricDef?.suffix}
              value={trigger.threshold}
            />
            <span className="text-muted-foreground">for at least</span>
            <NumberSlot
              invalid={triggerIssues.some((i) => i.path[0] === 1)}
              label="Minutes"
              onChange={(minutes) => setT({ minutes })}
              onUnreadable={(bad) => setUnreadable((u) => ({ ...u, 1: bad }))}
              suffix="min"
              value={trigger.minutes}
            />
          </div>
          <AnimatePresence initial={false}>
            {triggerIssues.length > 0 && (
              <motion.p
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden text-destructive-foreground text-xs"
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                transition={{ duration: reduce ? 0 : 0.18, ease: easeOut }}
              >
                {triggerIssues
                  .map(
                    (i) =>
                      `${i.path[0] === 0 ? "Threshold" : "Duration"}: ${unreadable[i.path[0] ?? -1] ? "enter a number" : i.message.toLowerCase()}`,
                  )
                  .join(" · ")}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-medium text-muted-foreground text-xs">Scope</span>
          <Conditions id={scopeRoot} status={null} />
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="font-medium text-muted-foreground text-xs">Then</span>
          <Select items={actions.map((a) => ({ value: a.id, label: a.name }))} onValueChange={(v) => v && setAction(v)} value={action}>
            <SelectTrigger aria-label="Action" className="w-auto min-w-0" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {actions.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
      </div>

      <Preview blocked={blocked} days={days} fired={fired} incidents={incidents} metric={trigger.metric} metricDef={metricDef} />
    </div>
  );
}

function NumberSlot({
  value,
  suffix,
  label,
  invalid,
  onChange,
  onUnreadable,
}: {
  value: number | null;
  suffix?: string;
  label: string;
  invalid: boolean;
  onChange: (value: number | null) => void;
  onUnreadable: (unreadable: boolean) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <span className="relative inline-flex w-20">
      <Input
        aria-invalid={invalid || undefined}
        aria-label={label}
        className={cn("tabular-nums", suffix && "[&_input]:pe-9")}
        inputMode="decimal"
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = e.target.value.trim() === "" ? null : Number(e.target.value);
          onUnreadable(n !== null && Number.isNaN(n));
          onChange(n === null || Number.isNaN(n) ? null : n);
        }}
        onFocus={() => setDraft(formatInput(value))}
        size="sm"
        value={draft ?? formatInput(value)}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center text-muted-foreground text-xs">{suffix}</span>
      )}
    </span>
  );
}

function Preview({
  incidents,
  fired,
  days,
  blocked,
  metric,
  metricDef,
}: {
  incidents: readonly PastIncident[];
  fired: PastIncident[];
  days: number;
  blocked: boolean;
  metric: string;
  metricDef: AnyFieldDef | undefined;
}) {
  const reduce = useReducedMotion();
  const firedIds = new Set(fired.map((i) => i.id));
  const perWeek = (fired.length / days) * 7;
  const verdict = blocked
    ? "Fix the trigger to preview it"
    : fired.length === 0
      ? `Quiet: it wouldn't have fired in ${days} days`
      : `Would have fired ${fired.length} ${fired.length === 1 ? "time" : "times"} in ${days} days`;
  const noisy = perWeek > 2;

  return (
    <div className="border-t bg-muted/32 px-4 pt-3 pb-3.5 dark:bg-muted/16">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="font-medium text-xs">{verdict}</h4>
        {noisy && !blocked && (
          <span className="shrink-0 rounded-full bg-warning/12 px-2 py-0.5 font-medium text-[11px] text-warning-foreground">
            Noisy · {perWeek.toFixed(1)} a week
          </span>
        )}
      </div>
      <div aria-hidden className="relative mt-3 mb-1 h-8">
        <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
        {Array.from({ length: Math.floor(days / 7) + 1 }, (_, w) => (
          <span className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-border" key={w} style={{ left: `${((w * 7) / days) * 100}%` }} />
        ))}
        {incidents.map((incident) => {
          const hit = firedIds.has(incident.id);
          return (
            <motion.span
              animate={{ scale: hit ? 1 : 0.6, opacity: hit ? 1 : 0.6 }}
              className={cn(
                "absolute top-1/2 -mt-1.5 -ml-1.5 size-3 rounded-full border-2",
                hit ? "border-card bg-destructive" : "border-muted-foreground/48 bg-card",
              )}
              initial={false}
              key={incident.id}
              style={{ left: `${(incident.day / days) * 100}%` }}
              transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.3, bounce: 0.2 }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{days} days ago</span>
        <span>Today</span>
      </div>
      <ul
        aria-label="Incidents that would have fired"
        className="mt-2.5 flex h-36 flex-col gap-0.5 overflow-y-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        tabIndex={0}
      >
        <AnimatePresence initial={false}>
          {fired.map((incident) => (
            <motion.li
              animate={{ opacity: 1 }}
              className="flex h-7 shrink-0 items-center gap-2 text-xs"
              exit={{ opacity: 0, transition: { duration: 0 } }}
              initial={{ opacity: 0 }}
              key={incident.id}
              transition={{ duration: reduce ? 0 : 0.15, ease: easeOut }}
            >
              <span className="size-1.5 shrink-0 rounded-full bg-destructive" />
              <span className="w-16 shrink-0 text-muted-foreground tabular-nums">{incident.at}</span>
              <span className="min-w-0 flex-1 truncate">{incident.title}</span>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                {String(incident[metric])}
                {metricDef?.suffix === "%" ? "%" : ` ${metricDef?.suffix ?? ""}`}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
        {fired.length === 0 && (
          <li className="flex h-full items-center justify-center text-center text-muted-foreground text-xs">
            {blocked ? "Nothing to preview yet." : `None of the ${incidents.length} past incidents cross this line.`}
          </li>
        )}
      </ul>
    </div>
  );
}

function Conditions({ id, status }: { id: string; status: ReactNode }) {
  const { group, addRule, setCombinator } = useGroup(id);
  return (
    <div className="@container flex flex-col gap-2.5 @sm:gap-1.5">
      {group.children.map((child, i) => (
        <div className="flex items-start gap-1.5" key={child}>
          {i === 0 ? (
            <span className="flex h-8 w-11 shrink-0 items-center text-muted-foreground text-xs sm:h-7">Where</span>
          ) : i === 1 ? (
            <button
              aria-label={`Match ${group.combinator === "and" ? "any" : "all"} conditions instead`}
              className="flex h-8 w-11 shrink-0 sm:h-7 items-center justify-center rounded-lg border border-input bg-background font-medium text-xs shadow-xs/5 outline-none transition-[background-color,scale] duration-150 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] dark:bg-input/32"
              onClick={() => setCombinator(group.combinator === "and" ? "or" : "and")}
              type="button"
            >
              {group.combinator}
            </button>
          ) : (
            <span className="flex h-8 w-11 shrink-0 sm:h-7 items-center ps-1.5 text-muted-foreground text-xs">{group.combinator}</span>
          )}
          <div className="min-w-0 flex-1">
            <Condition id={child} />
          </div>
        </div>
      ))}
      <div className={cn("flex items-center justify-between gap-2", group.children.length > 0 && "ps-12.5")}>
        <button
          className="-ms-1.5 flex h-7 items-center gap-1 rounded-md px-1.5 text-muted-foreground text-xs outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => addRule()}
          type="button"
        >
          <PlusIcon className="size-3.5" />
          {group.children.length ? "Condition" : "Scope to a service, environment or region"}
        </button>
        {status && <span className="min-w-0 truncate text-muted-foreground text-xs tabular-nums">{status}</span>}
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
      <div className="grid grid-cols-[minmax(0,1fr)_2rem] items-start gap-1.5 @sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem] @lg:grid-cols-[8.5rem_8rem_minmax(0,1fr)_2rem]">
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
            "col-start-1 row-start-3 min-w-0 @sm:col-span-2 @sm:row-start-2 @lg:col-span-1 @lg:col-start-3 @lg:row-start-1",
            editor.arity === "none" && "hidden",
          )}
        >
          <ValueEditor def={def} editor={editor} issues={issues} label={label} onChange={setValue} value={rule.value} />
        </div>
        <Button
          aria-label={`Remove condition on ${label}`}
          className="col-start-2 row-start-1 @sm:col-start-3 @lg:col-start-4"
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

