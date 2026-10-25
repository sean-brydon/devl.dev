"use client";

import {
  type AnyFieldDef,
  compileCases,
  type EditorSpec,
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
import { ArrowDownIcon, ArrowUpIcon, EllipsisIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { memo, type ReactNode, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface FlagVariant {
  id: string;
  name: string;
  tone: string;
}

export interface TargetingRule {
  id: string;
  when: Query;
  serve: string;
}

export interface EnvironmentTargeting {
  on: boolean;
  rules: TargetingRule[];
  rollout: Record<string, number>;
  offVariant: string;
}

export interface FlagEnvironment {
  id: string;
  name: string;
}

export interface FlagTargetingProps {
  flagKey: string;
  flagName: string;
  fields: Fields;
  variants: FlagVariant[];
  environments: FlagEnvironment[];
  targeting: Record<string, EnvironmentTargeting>;
  population: readonly Record<string, unknown>[];
  onChange?: (targeting: Record<string, EnvironmentTargeting>) => void;
  className?: string;
}

const easeOut = [0.23, 1, 0.32, 1] as const;
const glide = { type: "spring", duration: 0.3, bounce: 0 } as const;

function bucketOf(id: string, salt: string) {
  let h = 2166136261;
  for (const ch of `${salt}:${id}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10000) / 100;
}

function pickRollout(rollout: Record<string, number>, bucket: number, variants: FlagVariant[]) {
  let edge = 0;
  for (const v of variants) {
    edge += rollout[v.id] ?? 0;
    if (bucket < edge) return v.id;
  }
  return variants[variants.length - 1].id;
}

let nextId = 0;
const ruleId = () => `rule-${++nextId}-${Date.now().toString(36)}`;

export function FlagTargeting({
  flagKey,
  flagName,
  fields,
  variants,
  environments,
  targeting: initial,
  population,
  onChange,
  className,
}: FlagTargetingProps) {
  const reduce = useReducedMotion();
  const [targeting, setTargeting] = useState(initial);
  const [env, setEnv] = useState(environments[0].id);
  const config = targeting[env];

  const update = (patch: Partial<EnvironmentTargeting>) => {
    const next = { ...targeting, [env]: { ...config, ...patch } };
    setTargeting(next);
    onChange?.(next);
  };

  const setRule = (id: string, patch: Partial<TargetingRule>) =>
    update({ rules: config.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const moveRule = (index: number, delta: -1 | 1) => {
    const rules = [...config.rules];
    const [rule] = rules.splice(index, 1);
    rules.splice(index + delta, 0, rule);
    update({ rules });
  };

  const addRule = () => {
    const first = Object.keys(fields)[0];
    update({
      rules: [
        ...config.rules,
        {
          id: ruleId(),
          when: { kind: "group", combinator: "and", children: [makeRule(fields, { field: first })] },
          serve: variants[variants.length - 1].id,
        },
      ],
    });
  };

  const outcome = useMemo(() => {
    const route = compileCases(
      fields,
      { cases: config.rules.map((r) => ({ when: r.when as QueryOf<Fields>, then: r.id })), otherwise: null },
      { incompleteRules: false },
    );
    const byVariant: Record<string, number> = Object.fromEntries(variants.map((v) => [v.id, 0]));
    const byRule: Record<string, number> = {};
    for (const user of population) {
      if (!config.on) {
        byVariant[config.offVariant]++;
        continue;
      }
      const hit = route(user as never);
      if (hit.index >= 0) {
        const rule = config.rules[hit.index];
        byRule[rule.id] = (byRule[rule.id] ?? 0) + 1;
        byVariant[rule.serve]++;
      } else {
        byVariant[pickRollout(config.rollout, bucketOf(String(user.id), flagKey), variants)]++;
      }
    }
    const targeted = Object.values(byRule).reduce((a, b) => a + b, 0);
    return { byVariant, byRule, everyoneElse: config.on ? population.length - targeted : 0 };
  }, [config, fields, flagKey, population, variants]);

  const variantOf = (id: string) => variants.find((v) => v.id === id) ?? variants[0];
  const [a, b] = variants;
  const bShare = config.rollout[b.id] ?? 0;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-[580px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5",
        className,
      )}
    >
      <div className="flex items-start gap-3 px-4 pt-3.5 pb-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{flagName}</h3>
          <p className="truncate font-mono text-muted-foreground text-xs">{flagKey}</p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs">
          <span className={cn("font-medium tabular-nums", config.on ? "text-foreground" : "text-muted-foreground")}>
            {config.on ? "On" : "Off"}
          </span>
          <Switch aria-label={`Serve ${flagName} in ${env}`} checked={config.on} onCheckedChange={(on) => update({ on })} />
        </label>
      </div>

      <div className="px-4 pb-3">
        <Tabs onValueChange={(v) => setEnv(String(v))} value={env}>
          <TabsList className="w-full">
            {environments.map((e) => (
              <TabsTab className="gap-1.5 text-xs sm:text-xs" key={e.id} value={e.id}>
                <span
                  className={cn("size-1.5 rounded-full", targeting[e.id].on ? "bg-success" : "bg-muted-foreground/40")}
                />
                {e.name}
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className={cn("flex flex-col gap-4 px-4 pb-4 transition-opacity duration-200", !config.on && "opacity-56")}>
        <section className="flex flex-col gap-2">
          <SectionTitle hint="First match wins">Targeting rules</SectionTitle>
          <div className="relative flex flex-col gap-2">
            <AnimatePresence initial={false} mode="popLayout">
              {config.rules.map((rule, index) => (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98, transition: { duration: reduce ? 0 : 0.15 } }}
                  initial={{ opacity: 0, scale: reduce ? 1 : 0.98 }}
                  key={`${env}-${rule.id}`}
                  layout={reduce ? false : "position"}
                  layoutDependency={index}
                  transition={reduce ? { duration: 0 } : { ...glide, opacity: { duration: 0.18, ease: easeOut } }}
                >
                  <RuleCard
                    count={config.on ? (outcome.byRule[rule.id] ?? 0) : null}
                    fields={fields}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === config.rules.length - 1}
                    onChange={(when) => setRule(rule.id, { when })}
                    onMove={(delta) => moveRule(index, delta)}
                    onRemove={() => update({ rules: config.rules.filter((r) => r.id !== rule.id) })}
                    onServe={(serve) => setRule(rule.id, { serve })}
                    rule={rule}
                    variants={variants}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {config.rules.length === 0 && (
              <p className="rounded-xl border border-dashed px-3 py-4 text-center text-muted-foreground text-xs">
                No rules in {environments.find((e) => e.id === env)?.name}. Everyone falls through to the rollout.
              </p>
            )}
          </div>
          <Button className="self-start" onClick={addRule} size="sm" variant="outline">
            <PlusIcon />
            Add rule
          </Button>
        </section>

        <section className="flex flex-col gap-2.5">
          <SectionTitle hint={`${outcome.everyoneElse.toLocaleString()} users`}>Everyone else</SectionTitle>
          <div className="flex flex-col gap-3 rounded-xl border bg-muted/32 p-3 dark:bg-muted/16">
            <div className="flex items-center justify-between gap-3 text-xs">
              <VariantLabel share={100 - bShare} variant={a} />
              <VariantLabel align="end" share={bShare} variant={b} />
            </div>
            <Slider
              aria-label={`Share of everyone else who get ${b.name}`}
              max={100}
              min={0}
              onValueChange={(v) => {
                const share = Array.isArray(v) ? v[0] : v;
                update({ rollout: { [a.id]: 100 - share, [b.id]: share } });
              }}
              step={5}
              value={bShare}
            />
          </div>
        </section>

        <section className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-xs">When the flag is off</p>
            <p className="text-muted-foreground text-xs">Everyone gets this variant.</p>
          </div>
          <VariantSelect
            label="Variant served when off"
            onChange={(offVariant) => update({ offVariant })}
            value={config.offVariant}
            variants={variants}
          />
        </section>
      </div>

      <Distribution population={population.length} split={outcome.byVariant} variantOf={variantOf} variants={variants} />
    </div>
  );
}

function SectionTitle({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h4 className="font-medium text-xs">{children}</h4>
      {hint && <span className="text-muted-foreground text-xs tabular-nums">{hint}</span>}
    </div>
  );
}

function VariantDot({ variant }: { variant: FlagVariant }) {
  return <span className={cn("size-2 shrink-0 rounded-full", variant.tone)} />;
}

function VariantLabel({ variant, share, align }: { variant: FlagVariant; share: number; align?: "end" }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", align === "end" && "flex-row-reverse")}>
      <VariantDot variant={variant} />
      <span className="truncate">{variant.name}</span>
      <span className="font-medium tabular-nums">{share}%</span>
    </span>
  );
}

function VariantSelect({
  value,
  variants,
  label,
  onChange,
}: {
  value: string;
  variants: FlagVariant[];
  label: string;
  onChange: (id: string) => void;
}) {
  return (
    <Select items={variants.map((v) => ({ value: v.id, label: v.name }))} onValueChange={(v) => v && onChange(v)} value={value}>
      <SelectTrigger aria-label={label} className="w-auto min-w-0 shrink" size="sm">
        <span className="flex items-center gap-1.5">
          <VariantDot variant={variants.find((v) => v.id === value) ?? variants[0]} />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectPopup>
        {variants.map((v) => (
          <SelectItem key={v.id} value={v.id}>
            <span className="flex items-center gap-2">
              <VariantDot variant={v} />
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
  fields,
  variants,
  count,
  isFirst,
  isLast,
  onChange,
  onServe,
  onMove,
  onRemove,
}: {
  rule: TargetingRule;
  index: number;
  fields: Fields;
  variants: FlagVariant[];
  count: number | null;
  isFirst: boolean;
  isLast: boolean;
  onChange: (when: Query) => void;
  onServe: (variant: string) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const store = useQueryStore({
    fields,
    initial: rule.when as QueryOf<Fields>,
    onChange: (q) => onChange(q as Query),
  });
  const issues = useMemo(() => validateQuery(fields, rule.when), [fields, rule.when]);
  const incomplete = issues.some((i) => i.code === "required") || (rule.when.kind === "group" && rule.when.children.length === 0);

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
              <MenuItem disabled={isFirst} onClick={() => onMove(-1)}>
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
        <Conditions
          id={store.rootId}
          status={
            incomplete ? (
              <span className="text-warning-foreground">Incomplete, not serving yet</span>
            ) : count === null ? (
              "Flag is off"
            ) : (
              `Serves ${count.toLocaleString()} ${count === 1 ? "user" : "users"}`
            )
          }
        />
      </div>
    </QueryProvider>
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

function Distribution({
  split,
  population,
  variants,
  variantOf,
}: {
  split: Record<string, number>;
  population: number;
  variants: FlagVariant[];
  variantOf: (id: string) => FlagVariant;
}) {
  const reduce = useReducedMotion();
  const percents = tenths(variants.map((v) => split[v.id] ?? 0), population);
  let offset = 0;
  return (
    <div className="border-t bg-muted/32 px-4 py-3 dark:bg-muted/16">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h4 className="font-medium text-xs">Who gets what</h4>
        <span className="text-muted-foreground text-xs tabular-nums">Simulated on {population.toLocaleString()} users</span>
      </div>
      <div aria-hidden className="relative h-2 overflow-hidden rounded-full bg-muted">
        {variants.map((v) => {
          const share = population ? split[v.id] / population : 0;
          const left = offset;
          offset += share;
          return (
            <motion.span
              animate={{ x: `${left * 100}%`, scaleX: share }}
              className={cn("absolute inset-y-0 left-0 w-full origin-left", v.tone)}
              initial={false}
              key={v.id}
              style={{ x: `${left * 100}%`, scaleX: share }}
              transition={reduce ? { duration: 0 } : glide}
            />
          );
        })}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {variants.map((v, i) => (
          <li className="flex items-center gap-1.5 text-xs" key={v.id}>
            <VariantDot variant={variantOf(v.id)} />
            <span className="text-muted-foreground">{v.name}</span>
            <span className="font-medium tabular-nums">{percents[i]}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function tenths(counts: number[], total: number) {
  if (!total) return counts.map(() => 0);
  const raw = counts.map((c) => (c / total) * 1000);
  const floored = raw.map(Math.floor);
  let left = 1000 - floored.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - floored[i], i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    floored[i]++;
    left--;
  }
  return floored.map((t) => t / 10);
}
