"use client";

import {
  type AnyFieldDef,
  compile,
  type EditorSpec,
  type Fields,
  formatInput,
  formatList,
  type Issue,
  parseInput,
  parseList,
  type Query,
  type QueryOf,
  validateQuery,
} from "@qnot/core";
import { QueryProvider, useGroup, useQuery, useQueryStore, useRule, useStore } from "@qnot/react";
import { PlusIcon, UsersRoundIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { memo, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SegmentPerson {
  id: string;
  name: string;
  email: string;
  [attribute: string]: unknown;
}

export interface SegmentBuilderProps {
  fields: Fields;
  people: readonly SegmentPerson[];
  defaultName?: string;
  defaultQuery?: Query;
  sampleSize?: number;
  describe?: (person: SegmentPerson) => string;
  onChange?: (segment: { name: string; query: Query; size: number }) => void;
  className?: string;
}

const easeOut = [0.23, 1, 0.32, 1] as const;
const glide = { type: "spring", duration: 0.3, bounce: 0 } as const;
const tones = [
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
];

export function SegmentBuilder({
  fields,
  people,
  defaultName = "Untitled segment",
  defaultQuery = { kind: "group", combinator: "and", children: [] },
  sampleSize = 5,
  describe,
  onChange,
  className,
}: SegmentBuilderProps) {
  const [name, setName] = useState(defaultName);
  const store = useQueryStore({ fields, initial: defaultQuery as QueryOf<Fields> });
  return (
    <QueryProvider store={store}>
      <div
        className={cn(
          "flex w-full min-w-0 max-w-[580px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5",
          className,
        )}
      >
        <div className="px-4 pt-3.5">
          <input
            aria-label="Segment name"
            className="-mx-1.5 w-[calc(100%+0.75rem)] rounded-md bg-transparent px-1.5 py-0.5 font-medium outline-none transition-colors placeholder:text-muted-foreground hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this segment"
            value={name}
          />
        </div>
        <Audience describe={describe} name={name} onChange={onChange} people={people} sampleSize={sampleSize} />
      </div>
    </QueryProvider>
  );
}

function Audience({
  people,
  sampleSize,
  name,
  describe,
  onChange,
}: {
  people: readonly SegmentPerson[];
  sampleSize: number;
  name: string;
  describe?: (person: SegmentPerson) => string;
  onChange?: SegmentBuilderProps["onChange"];
}) {
  const reduce = useReducedMotion();
  const store = useStore();
  const query = useQuery();
  const issues = useMemo(() => validateQuery(store.fields, query), [store, query]);
  const broken = issues.some((i) => i.severity === "error" && i.code !== "required");
  const incomplete = issues.filter((i) => i.code === "required").length;
  const matching = useMemo(() => (broken ? [] : people.filter(compile(store.fields, query) as (p: SegmentPerson) => boolean)), [broken, people, query, store]);
  const size = broken ? 0 : matching.length;
  const share = people.length ? size / people.length : 0;

  useEffect(() => {
    onChange?.({ name, query, size });
  }, [name, query, size, onChange]);

  const spring = useSpring(size, { duration: 0.45, bounce: 0 });
  const shown = useTransform(spring, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    if (reduce) spring.jump(size);
    else spring.set(size);
  }, [size, reduce, spring]);

  const sample = matching.slice(0, sampleSize);
  const rest = size - sample.length;

  return (
    <>
      <div className="px-4 pt-1 pb-3">
        <div className="flex items-end justify-between gap-3">
          <p className="flex items-baseline gap-1.5">
            <motion.span className="font-semibold text-2xl tabular-nums tracking-tight">{broken ? "—" : shown}</motion.span>
            <span className="text-muted-foreground text-xs">people</span>
          </p>
          <p className="pb-1 text-muted-foreground text-xs tabular-nums">
            {broken ? "Fix the rule below" : `${(share * 100).toFixed(1)}% of ${people.length.toLocaleString()}`}
          </p>
        </div>
        <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            animate={{ scaleX: share }}
            className="h-full w-full origin-left rounded-full bg-primary"
            initial={false}
            transition={reduce ? { duration: 0 } : glide}
          />
        </div>
      </div>

      <div className="border-t px-4 py-3">
        <Conditions
          id={store.rootId}
          status={incomplete > 0 ? `${incomplete} incomplete, ignored` : null}
        />
      </div>

      <div className="border-t bg-muted/32 px-2 pt-2.5 pb-2 dark:bg-muted/16">
        <div className="flex items-baseline justify-between px-2 pb-1.5">
          <h4 className="font-medium text-xs">In this segment</h4>
          {rest > 0 && <span className="text-muted-foreground text-xs tabular-nums">and {rest.toLocaleString()} more</span>}
        </div>
        <div className="relative" style={{ height: `${sampleSize * 2.5}rem` }}>
          <AnimatePresence initial={false} mode="popLayout">
            {sample.map((person, index) => (
              <motion.div
                animate={{ opacity: 1 }}
                className="flex h-10 items-center gap-2.5 rounded-lg px-2"
                exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.12 } }}
                initial={{ opacity: 0 }}
                key={person.id}
                layout={reduce ? false : "position"}
                layoutDependency={index}
                transition={reduce ? { duration: 0 } : { ...glide, opacity: { duration: 0.18, ease: easeOut } }}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full font-semibold text-[10px]",
                    tones[person.id.charCodeAt(person.id.length - 1) % tones.length],
                  )}
                >
                  {person.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-xs">{person.name}</span>
                  <span className="block truncate text-muted-foreground text-xs">{person.email}</span>
                </span>
                {describe && <span className="shrink-0 text-muted-foreground text-xs tabular-nums max-[400px]:hidden">{describe(person)}</span>}
              </motion.div>
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {size === 0 && (
              <motion.div
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <UsersRoundIcon className="mb-1 size-5 text-muted-foreground" />
                <p className="font-medium text-xs">{broken ? "This segment can't be evaluated yet" : "Nobody matches"}</p>
                <p className="text-muted-foreground text-xs">
                  {broken ? "Fix the highlighted rule to see who is in it." : "Loosen a rule, or match any rule instead of all."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

function Conditions({ id, status }: { id: string; status: string | null }) {
  const { group, addRule, setCombinator } = useGroup(id);
  return (
    <div className="@container flex flex-col gap-2.5 @sm:gap-1.5">
      {group.children.map((child, i) => (
        <div className="flex items-start gap-1.5" key={child}>
          {i === 0 ? (
            <span className="flex h-8 w-11 shrink-0 sm:h-7 items-center text-muted-foreground text-xs">Where</span>
          ) : i === 1 ? (
            <button
              aria-label={`Match ${group.combinator === "and" ? "any" : "all"} rules instead`}
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
      {group.children.length === 0 && (
        <p className="rounded-xl border border-dashed px-3 py-3 text-center text-muted-foreground text-xs">
          No rules yet, so everyone is in this segment.
        </p>
      )}
      <div className={cn("flex items-center justify-between gap-2", group.children.length > 0 && "ps-12.5")}>
        <Button className={cn(group.children.length > 0 && "-ms-2")} onClick={() => addRule()} size="xs" variant="ghost">
          <PlusIcon />
          Add rule
        </Button>
        {status && <span className="min-w-0 truncate text-muted-foreground text-xs">{status}</span>}
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

