"use client";

import {
  type AnyFieldDef,
  compileCases,
  type EditorSpec,
  encodeCases,
  type Fields,
  fieldLabel,
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
import { sqlFormat } from "@qnot/core/formats/sql";
import { QueryProvider, useGroup, useQueryStore, useRule } from "@qnot/react";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CodeIcon,
  CopyPlusIcon,
  EllipsisIcon,
  GripVerticalIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, Reorder, useDragControls, useReducedMotion } from "motion/react";
import { memo, type ReactNode, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface RouteDestination {
  id: string;
  name: string;
  detail: string;
}

export interface Route {
  id: string;
  when: Query;
  to: string;
}

export interface RoutingRulesProps {
  title?: string;
  description?: string;
  fields: Fields;
  destinations: RouteDestination[];
  routes: Route[];
  fallback: string;
  history?: readonly Record<string, unknown>[];
  sampleResponse: Record<string, unknown>;
  onChange?: (routes: Route[], fallback: string) => void;
  className?: string;
}

const easeOut = [0.23, 1, 0.32, 1] as const;
const postgres = sqlFormat({ dialect: "postgres" });
let counter = 0;

export function RoutingRules({
  title = "Request routing",
  description = "Checked top to bottom. The first route that matches wins.",
  fields,
  destinations,
  routes: initialRoutes,
  fallback: initialFallback,
  history = [],
  sampleResponse,
  onChange,
  className,
}: RoutingRulesProps) {
  const reduce = useReducedMotion();
  const [routes, setRoutes] = useState(initialRoutes);
  const [fallback, setFallback] = useState(initialFallback);
  const [response, setResponse] = useState(sampleResponse);
  const [showSql, setShowSql] = useState(false);

  const commit = (next: Route[], nextFallback = fallback) => {
    setRoutes(next);
    setFallback(nextFallback);
    onChange?.(next, nextFallback);
  };

  const patch = (id: string, p: Partial<Route>) => commit(routes.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const move = (index: number, delta: -1 | 1) => {
    const next = [...routes];
    const [route] = next.splice(index, 1);
    next.splice(index + delta, 0, route);
    commit(next);
  };

  const cases = useMemo(
    () => ({ cases: routes.map((r) => ({ when: r.when as QueryOf<Fields>, then: r.id })), otherwise: "fallback" }),
    [routes],
  );
  const route = useMemo(() => compileCases(fields, cases, { incompleteRules: false }), [fields, cases]);
  const hit = route(response as never);
  const shares = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of history) {
      const { value } = route(row as never);
      counts[value as string] = (counts[value as string] ?? 0) + 1;
    }
    return counts;
  }, [history, route]);

  const sql = useMemo(() => {
    try {
      const names = Object.fromEntries(destinations.map((d) => [d.id, d.name]));
      return String(
        encodeCases(
          postgres,
          { cases: routes.map((r) => ({ when: r.when, then: names[r.to] })), otherwise: names[fallback] },
          fields,
        ),
      );
    } catch (e) {
      return e instanceof Error ? e.message.replace(/^qnot\/sql: /, "Can't export yet: ") : "Can't export yet";
    }
  }, [routes, fallback, destinations, fields]);

  const destination = (id: string) => destinations.find((d) => d.id === id) ?? destinations[0];
  const servedBy = hit.index >= 0 ? destination(routes[hit.index].to) : destination(fallback);

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-[600px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5",
        className,
      )}
    >
      <div className="flex items-start gap-3 px-4 pt-3.5 pb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium">{title}</h3>
          <p className="text-pretty text-muted-foreground text-xs">{description}</p>
        </div>
        <Button aria-expanded={showSql} onClick={() => setShowSql((s) => !s)} size="sm" variant={showSql ? "secondary" : "ghost"}>
          <CodeIcon />
          SQL
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {showSql && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: easeOut }}
          >
            <pre className="mx-4 mb-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-xl border bg-muted/40 p-3 font-mono text-[11.5px] leading-5 dark:bg-muted/24">
              {sql.replace(/ (WHEN|ELSE|END)/g, "\n  $1").replace(/\n {2}END/, "\nEND")}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      <Reorder.Group axis="y" className="flex flex-col gap-2 px-4" onReorder={(next) => commit(next)} values={routes}>
        {routes.map((r, index) => (
          <RouteCard
            destinations={destinations}
            fields={fields}
            index={index}
            isLast={index === routes.length - 1}
            key={r.id}
            matched={hit.index === index}
            onDuplicate={() => {
              const copy = { ...r, id: `route-${++counter}` };
              commit([...routes.slice(0, index + 1), copy, ...routes.slice(index + 1)]);
            }}
            onMove={(delta) => move(index, delta)}
            onRemove={() => commit(routes.filter((x) => x.id !== r.id))}
            onTo={(to) => patch(r.id, { to })}
            onWhen={(when) => patch(r.id, { when })}
            route={r}
            share={history.length ? (shares[r.id] ?? 0) / history.length : null}
          />
        ))}
      </Reorder.Group>

      <div className="flex flex-col gap-2 px-4 pt-2 pb-3">
        <Button
          className="self-start"
          onClick={() =>
            commit([
              ...routes,
              {
                id: `route-${++counter}`,
                when: { kind: "group", combinator: "and", children: [makeRule(fields, { field: Object.keys(fields)[0] })] },
                to: destinations[0].id,
              },
            ])
          }
          size="sm"
          variant="outline"
        >
          <PlusIcon />
          Add route
        </Button>
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 transition-[background-color,border-color] duration-200",
            hit.index === -1 && "border-success/40 border-solid bg-success/6 dark:bg-success/10",
          )}
        >
          <span className="whitespace-nowrap text-muted-foreground text-xs">
            {routes.length ? "Otherwise send to" : "Send everyone to"}
          </span>
          <DestinationSelect destinations={destinations} label="Fallback destination" onChange={(id) => commit(routes, id)} value={fallback} />
          <span className="flex-1" />
          {history.length > 0 && (
            <span className="text-muted-foreground text-xs tabular-nums max-sm:hidden">
              {Math.round(((shares.fallback ?? 0) / history.length) * 100)}% of last month
            </span>
          )}
        </div>
      </div>

      <TestPanel fields={fields} onChange={setResponse} response={response} servedBy={servedBy} via={hit.index >= 0 ? `Route ${hit.index + 1}` : "the fallback"} />
    </div>
  );
}

function DestinationSelect({
  value,
  destinations,
  label,
  onChange,
}: {
  value: string;
  destinations: RouteDestination[];
  label: string;
  onChange: (id: string) => void;
}) {
  return (
    <Select items={destinations.map((d) => ({ value: d.id, label: d.name }))} onValueChange={(v) => v && onChange(v)} value={value}>
      <SelectTrigger aria-label={label} className="w-auto min-w-0" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {destinations.map((d) => (
          <SelectItem key={d.id} value={d.id}>
            <span className="flex flex-col">
              <span>{d.name}</span>
              <span className="text-muted-foreground text-xs">{d.detail}</span>
            </span>
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

function RouteCard({
  route,
  index,
  fields,
  destinations,
  matched,
  share,
  isLast,
  onWhen,
  onTo,
  onMove,
  onDuplicate,
  onRemove,
}: {
  route: Route;
  index: number;
  fields: Fields;
  destinations: RouteDestination[];
  matched: boolean;
  share: number | null;
  isLast: boolean;
  onWhen: (when: Query) => void;
  onTo: (to: string) => void;
  onMove: (delta: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const reduce = useReducedMotion();
  const controls = useDragControls();
  const store = useQueryStore({ fields, initial: route.when as QueryOf<Fields>, onChange: (q) => onWhen(q as Query) });
  const issues = useMemo(() => validateQuery(fields, route.when), [fields, route.when]);
  const incomplete = issues.some((i) => i.code === "required");

  return (
    <Reorder.Item
      className="relative"
      dragControls={controls}
      dragListener={false}
      layout="position"
      layoutDependency={index}
      transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.3, bounce: 0 }}
      value={route}
      whileDrag={{ scale: 1.01, boxShadow: "0 8px 24px -12px rgb(0 0 0 / 0.25)" }}
    >
      <QueryProvider store={store}>
        <div
          className={cn(
            "flex flex-col gap-2 rounded-xl border bg-background p-2.5 transition-[border-color,box-shadow] duration-200 dark:bg-input/16",
            matched && "border-success/48 ring-3 ring-success/12",
          )}
        >
          <div className="flex items-center gap-1.5">
            <button
              aria-label={`Reorder route ${index + 1}. Drag, or use the arrow keys.`}
              className="flex h-7 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/64 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
              onKeyDown={(e) => {
                if (e.key === "ArrowUp" && index > 0) {
                  e.preventDefault();
                  onMove(-1);
                }
                if (e.key === "ArrowDown" && !isLast) {
                  e.preventDefault();
                  onMove(1);
                }
              }}
              onPointerDown={(e) => controls.start(e)}
              type="button"
            >
              <GripVerticalIcon className="size-3.5" />
            </button>
            <span className="font-medium text-xs tabular-nums">Route {index + 1}</span>
            <ArrowRightIcon className="size-3.5 text-muted-foreground" />
            <DestinationSelect destinations={destinations} label={`Destination for route ${index + 1}`} onChange={onTo} value={route.to} />
            <span className="flex-1" />
            {matched && (
              <span className="rounded-full bg-success/10 px-2 py-0.5 font-medium text-[11px] text-success-foreground max-[400px]:hidden">
                Matches test
              </span>
            )}
            <Menu>
              <MenuTrigger render={<Button aria-label={`Route ${index + 1} actions`} size="icon-sm" variant="ghost" />}>
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
                <MenuItem onClick={onDuplicate}>
                  <CopyPlusIcon />
                  Duplicate
                </MenuItem>
                <MenuSeparator />
                <MenuItem onClick={onRemove} variant="destructive">
                  <Trash2Icon />
                  Delete route
                </MenuItem>
              </MenuPopup>
            </Menu>
          </div>
          <Conditions
            id={store.rootId}
            status={
              incomplete ? (
                <span className="text-warning-foreground">Incomplete, skipped</span>
              ) : share === null ? null : (
                `${Math.round(share * 100)}% of last month`
              )
            }
          />
        </div>
      </QueryProvider>
    </Reorder.Item>
  );
}

function AnswerInput({
  def,
  label,
  value,
  onChange,
}: {
  def: AnyFieldDef;
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const unreadable = draft !== null && draft.trim() !== "" && parseInput(def, draft) === null;
  return (
    <Input
      aria-invalid={unreadable || undefined}
      aria-label={label}
      inputMode={def.kind === "number" ? "numeric" : undefined}
      onBlur={() => setDraft(null)}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(parseInput(def, e.target.value));
      }}
      onFocus={() => setDraft(formatInput(value))}
      size="sm"
      value={draft ?? formatInput(value)}
    />
  );
}

function TestPanel({
  fields,
  response,
  servedBy,
  via,
  onChange,
}: {
  fields: Fields;
  response: Record<string, unknown>;
  servedBy: RouteDestination;
  via: string;
  onChange: (response: Record<string, unknown>) => void;
}) {
  const reduce = useReducedMotion();
  const set = (key: string, value: unknown) => onChange({ ...response, [key]: value });
  return (
    <div className="border-t bg-muted/32 px-4 pt-3 pb-3.5 dark:bg-muted/16">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h4 className="font-medium text-xs">Test a response</h4>
        <span className="text-muted-foreground text-xs max-sm:hidden">Edit the answers to see where it lands</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Object.entries(fields).map(([key, def]) => (
          <label className="flex min-w-0 flex-col gap-1" key={key}>
            <span className="truncate text-muted-foreground text-xs">{fieldLabel(key, def)}</span>
            {def.options ? (
              <Select
                items={(def.options as readonly { value: string; label: string }[]).map((o) => ({ value: o.value, label: o.label }))}
                onValueChange={(v) => v && set(key, v)}
                value={String(response[key] ?? "")}
              >
                <SelectTrigger aria-label={fieldLabel(key, def)} className="min-w-0" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {(def.options as readonly { value: string; label: string }[]).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            ) : (
              <AnswerInput def={def} label={fieldLabel(key, def)} onChange={(v) => set(key, v)} value={response[key]} />
            )}
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border bg-background px-3 py-2 dark:bg-input/32">
        <ArrowRightIcon className="size-3.5 shrink-0 text-success-foreground" />
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className="min-w-0 truncate"
            exit={{ opacity: 0, y: reduce ? 0 : -4 }}
            initial={{ opacity: 0, y: reduce ? 0 : 4 }}
            key={`${servedBy.id}-${via}`}
            transition={{ duration: 0.18, ease: easeOut }}
          >
            <span className="font-medium">{servedBy.name}</span>
            <span className="text-muted-foreground"> via {via} · {servedBy.detail}</span>
          </motion.span>
        </AnimatePresence>
      </div>
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

