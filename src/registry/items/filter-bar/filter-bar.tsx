"use client";

import { compile, defineFields, f, formatInput, parseInput, type QueryOf, type ValueOf, validateQuery } from "@qnot/core";
import { QueryProvider, useQuery, useQueryStore, useRule, useStore } from "@qnot/react";
import {
  CircleDashedIcon,
  ListFilterIcon,
  SignalHighIcon,
  TagIcon,
  TimerIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, memo, type ReactNode, type RefObject, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const issueFields = defineFields({
  status: f.enum([
    { value: "backlog", label: "Backlog" },
    { value: "todo", label: "Todo" },
    { value: "in_progress", label: "In progress" },
    { value: "in_review", label: "In review" },
    { value: "done", label: "Done" },
    { value: "canceled", label: "Canceled" },
  ]),
  assignee: f.enum([
    { value: "riley", label: "Riley Park" },
    { value: "noor", label: "Noor Haddad" },
    { value: "sam", label: "Sam Okafor" },
    { value: "kai", label: "Kai Lindqvist" },
    { value: "none", label: "No assignee" },
  ]),
  priority: f.enum([
    { value: "urgent", label: "Urgent" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
    { value: "none", label: "No priority" },
  ]),
  labels: f.multiEnum([
    { value: "bug", label: "Bug" },
    { value: "feature", label: "Feature" },
    { value: "perf", label: "Performance" },
    { value: "design", label: "Design" },
    { value: "docs", label: "Docs" },
  ]),
  estimate: f.number({ min: 0, max: 21, integer: true }),
});

type IssueFields = typeof issueFields;
type FieldName = keyof IssueFields & string;

export interface Issue {
  id: string;
  title: string;
  status: ValueOf<IssueFields["status"]>;
  assignee: ValueOf<IssueFields["assignee"]>;
  priority: ValueOf<IssueFields["priority"]>;
  labels: ValueOf<IssueFields["labels"]>;
  estimate: number;
}

export interface FilterBarProps {
  issues: readonly Issue[];
  me?: string;
  defaultQuery?: QueryOf<IssueFields>;
  onChange?: (query: QueryOf<IssueFields>) => void;
  className?: string;
}

const easeOut = [0.23, 1, 0.32, 1] as const;
const glide = { type: "spring", duration: 0.3, bounce: 0 } as const;

const fieldMeta: Record<FieldName, { label: string; icon: typeof TagIcon }> = {
  status: { label: "Status", icon: CircleDashedIcon },
  assignee: { label: "Assignee", icon: UserRoundIcon },
  priority: { label: "Priority", icon: SignalHighIcon },
  labels: { label: "Labels", icon: TagIcon },
  estimate: { label: "Estimate", icon: TimerIcon },
};

const enumFields = ["status", "assignee", "priority"] as const;
const estimatePresets = [1, 2, 3, 5, 8];
const multiOps = [
  { value: "hasAny", label: "include any of" },
  { value: "hasAll", label: "include all of" },
  { value: "hasNone", label: "exclude" },
];
const numberOps = [
  { value: "gte", label: "at least", symbol: "≥" },
  { value: "lte", label: "at most", symbol: "≤" },
  { value: "eq", label: "exactly", symbol: "=" },
];

const labelTones: Record<string, string> = {
  bug: "bg-rose-500",
  feature: "bg-sky-500",
  perf: "bg-amber-500",
  design: "bg-violet-500",
  docs: "bg-emerald-500",
};

const avatarTones: Record<string, string> = {
  riley: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  noor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  sam: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  kai: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
};

function optionsOf(field: FieldName) {
  const def = issueFields[field];
  return (def.options ?? []) as readonly { value: string; label: string }[];
}

function labelOf(field: FieldName, value: string, me?: string) {
  if (field === "assignee" && value === me) return "me";
  return optionsOf(field).find((o) => o.value === value)?.label ?? value;
}

export function FilterBar({ issues, me = "riley", defaultQuery, onChange, className }: FilterBarProps) {
  const store = useQueryStore({
    fields: issueFields,
    initial: defaultQuery ?? { kind: "group", combinator: "and", children: [] },
    onChange,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const filterButton = useRef<HTMLButtonElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("input, textarea, [role=menu]")) return;
    if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      setMenuOpen(true);
    }
  };

  return (
    <QueryProvider store={store}>
      <div
        className={cn(
          "flex h-[400px] w-full min-w-0 max-w-[560px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5",
          className,
        )}
        onKeyDown={onKeyDown}
      >
        <FilterRow
          filterButton={filterButton}
          me={me}
          menuOpen={menuOpen}
          onMenuOpenChange={setMenuOpen}
        />
        <Results issues={issues} me={me} />
      </div>
    </QueryProvider>
  );
}

function FilterRow({
  me,
  menuOpen,
  onMenuOpenChange,
  filterButton,
}: {
  me: string;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  filterButton: RefObject<HTMLButtonElement | null>;
}) {
  const reduce = useReducedMotion();
  const store = useStore<IssueFields>();
  const query = useQuery<IssueFields>();
  const chips = store.getGroup(store.rootId).children;

  const ruleFor = (field: FieldName) => {
    const index = query.children.findIndex((n) => n.kind === "rule" && n.field === field);
    return index === -1 ? null : { id: chips[index], node: query.children[index] };
  };

  const selectedValues = (field: FieldName): string[] => {
    const found = ruleFor(field);
    if (!found || found.node.kind !== "rule" || !("value" in found.node)) return [];
    const v = found.node.value;
    return Array.isArray(v) ? v.map(String) : v == null ? [] : [String(v)];
  };

  const toggleValue = (field: FieldName, value: string) => {
    const found = ruleFor(field);
    if (!found) {
      const operator = field === "labels" ? "hasAny" : "eq";
      store.addRule(store.rootId, { field, operator, value: field === "labels" ? [value] : value } as never);
      return;
    }
    const current = selectedValues(field);
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setValues(store, found.id, field, next);
  };

  const setEstimate = (min: number) => {
    const found = ruleFor("estimate");
    if (!found) store.addRule(store.rootId, { field: "estimate", operator: "gte", value: min });
    else store.batch(() => {
      store.setOperator(found.id, "gte");
      store.setRuleValue(found.id, min);
    });
  };

  return (
    <div className="flex shrink-0 items-start gap-2 border-b px-3 py-2.5">
      <div className="relative flex min-h-7 min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {chips.map((id) => (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="min-w-0 max-w-full"
              exit={{ opacity: 0, scale: 0.95, transition: { duration: reduce ? 0 : 0.12, ease: easeOut } }}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.95 }}
              key={id}
              layout={reduce ? false : "position"}
              transition={reduce ? { duration: 0 } : { ...glide, opacity: { duration: 0.15, ease: easeOut } }}
            >
              <Chip id={id} me={me} onRemoved={() => filterButton.current?.focus()} />
            </motion.div>
          ))}
        </AnimatePresence>
        {chips.length === 0 && (
          <span className="ps-1 text-muted-foreground text-xs">Showing every issue. Add a filter to narrow it down.</span>
        )}
      </div>
      <Menu onOpenChange={onMenuOpenChange} open={menuOpen}>
        <MenuTrigger
          render={
            <Button
              aria-label="Add filter"
              className="max-sm:px-2"
              ref={filterButton}
              size="sm"
              variant="outline"
            />
          }
        >
          <ListFilterIcon />
          <span className="max-sm:hidden">Filter</span>
          <Kbd className="h-4.5 min-w-4.5 max-sm:hidden">F</Kbd>
        </MenuTrigger>
        <MenuPopup align="end" className="w-52">
          <MenuGroup>
            <MenuGroupLabel>Add filter</MenuGroupLabel>
            {enumFields.map((field) => {
              const Icon = fieldMeta[field].icon;
              const selected = selectedValues(field);
              return (
                <MenuSub key={field}>
                  <MenuSubTrigger>
                    <Icon />
                    {fieldMeta[field].label}
                    {selected.length > 0 && (
                      <span className="ms-auto text-muted-foreground text-xs tabular-nums">{selected.length}</span>
                    )}
                  </MenuSubTrigger>
                  <MenuSubPopup className="w-52">
                    {orderedOptions(field, me).map((o) => (
                      <MenuCheckboxItem
                        checked={selected.includes(o.value)}
                        key={o.value}
                        onCheckedChange={() => toggleValue(field, o.value)}
                      >
                        <span className="flex items-center gap-2">
                          <ValueIcon field={field} value={o.value} />
                          {field === "assignee" && o.value === me ? "Me" : o.label}
                        </span>
                      </MenuCheckboxItem>
                    ))}
                  </MenuSubPopup>
                </MenuSub>
              );
            })}
            <MenuSub>
              <MenuSubTrigger>
                <TagIcon />
                Labels
                {selectedValues("labels").length > 0 && (
                  <span className="ms-auto text-muted-foreground text-xs tabular-nums">{selectedValues("labels").length}</span>
                )}
              </MenuSubTrigger>
              <MenuSubPopup className="w-48">
                {optionsOf("labels").map((o) => (
                  <MenuCheckboxItem
                    checked={selectedValues("labels").includes(o.value)}
                    key={o.value}
                    onCheckedChange={() => toggleValue("labels", o.value)}
                  >
                    <span className="flex items-center gap-2">
                      <ValueIcon field="labels" value={o.value} />
                      {o.label}
                    </span>
                  </MenuCheckboxItem>
                ))}
              </MenuSubPopup>
            </MenuSub>
            <MenuSub>
              <MenuSubTrigger>
                <TimerIcon />
                Estimate
              </MenuSubTrigger>
              <MenuSubPopup className="w-44">
                <MenuRadioGroup onValueChange={(v) => setEstimate(Number(v))} value={null}>
                  {estimatePresets.map((n) => (
                    <MenuRadioItem closeOnClick key={n} value={String(n)}>
                      {n}+ points
                    </MenuRadioItem>
                  ))}
                </MenuRadioGroup>
              </MenuSubPopup>
            </MenuSub>
          </MenuGroup>
          {chips.length > 0 && (
            <>
              <MenuSeparator />
              <MenuItem onClick={() => store.clear()} variant="destructive">
                <XIcon />
                Clear all filters
              </MenuItem>
            </>
          )}
        </MenuPopup>
      </Menu>
    </div>
  );
}

function orderedOptions(field: FieldName, me: string) {
  const options = optionsOf(field);
  if (field !== "assignee") return options;
  return [...options.filter((o) => o.value === me), ...options.filter((o) => o.value !== me)];
}

function setValues(store: ReturnType<typeof useStore<IssueFields>>, id: string, field: FieldName, next: string[]) {
  if (next.length === 0) {
    store.remove(id);
    return;
  }
  const rule = store.getRule(id);
  if (field === "labels") {
    store.setRuleValue(id, next);
    return;
  }
  const negative = rule.operator === "neq" || rule.operator === "notIn";
  const operator = next.length === 1 ? (negative ? "neq" : "eq") : negative ? "notIn" : "in";
  store.batch(() => {
    store.setOperator(id, operator);
    store.setRuleValue(id, next.length === 1 ? next[0] : next);
  });
}

const segment =
  "flex h-full shrink-0 items-center gap-1.5 whitespace-nowrap px-2 outline-none transition-colors hover:bg-accent focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-popup-open:bg-accent";

const Chip = memo(function Chip({ id, me, onRemoved }: { id: string; me: string; onRemoved: () => void }) {
  const store = useStore<IssueFields>();
  const { rule, issues, setOperator, setValue, remove } = useRule<IssueFields>(id);
  const field = rule.field as FieldName;
  const Icon = fieldMeta[field].icon;
  const raw = "value" in rule ? rule.value : null;
  const values = Array.isArray(raw) ? raw.map(String) : raw == null ? [] : [String(raw)];
  const errors = issues.filter((i) => i.severity === "error");
  const negative = rule.operator === "neq" || rule.operator === "notIn" || rule.operator === "hasNone";

  const removeAndFocus = () => {
    remove();
    onRemoved();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === "Backspace" || e.key === "Delete") && !(e.target as HTMLElement).closest("input")) {
      e.preventDefault();
      removeAndFocus();
    }
  };

  let operatorLabel: string;
  let operatorMenu: ReactNode;
  if (field === "labels") {
    operatorLabel = multiOps.find((o) => o.value === rule.operator)?.label ?? rule.operator;
    operatorMenu = multiOps.map((o) => (
      <MenuRadioItem closeOnClick key={o.value} value={o.value}>
        {o.label}
      </MenuRadioItem>
    ));
  } else if (field === "estimate") {
    operatorLabel = numberOps.find((o) => o.value === rule.operator)?.symbol ?? rule.operator;
    operatorMenu = numberOps.map((o) => (
      <MenuRadioItem closeOnClick key={o.value} value={o.value}>
        <span className="flex w-full items-center justify-between gap-3">
          {o.label}
          <span className="font-mono text-muted-foreground text-xs">{o.symbol}</span>
        </span>
      </MenuRadioItem>
    ));
  } else {
    operatorLabel = negative ? (values.length > 1 ? "is none of" : "is not") : values.length > 1 ? "is any of" : "is";
    operatorMenu = [
      <MenuRadioItem closeOnClick key="pos" value="pos">
        {values.length > 1 ? "is any of" : "is"}
      </MenuRadioItem>,
      <MenuRadioItem closeOnClick key="neg" value="neg">
        {values.length > 1 ? "is none of" : "is not"}
      </MenuRadioItem>,
    ];
  }

  const operatorValue = field === "labels" || field === "estimate" ? rule.operator : negative ? "neg" : "pos";
  const onOperator = (next: string) => {
    if (field === "labels" || field === "estimate") return setOperator(next);
    const wantNegative = next === "neg";
    if (wantNegative === negative) return;
    setOperator(values.length > 1 ? (wantNegative ? "notIn" : "in") : wantNegative ? "neq" : "eq");
  };

  const chip = (
    <div
      className={cn(
        "flex h-7 max-w-full items-stretch overflow-hidden rounded-lg border bg-background text-xs shadow-xs/5 dark:bg-input/32",
        errors.length > 0 && "border-destructive/48",
      )}
      onKeyDown={onKeyDown}
      role="group"
      aria-label={`${fieldMeta[field].label} filter`}
    >
      <span className="flex shrink-0 items-center gap-1.5 ps-2 pe-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="font-medium text-foreground">{fieldMeta[field].label}</span>
      </span>
      <Menu>
        <MenuTrigger className={cn(segment, "border-s text-muted-foreground")}>{operatorLabel}</MenuTrigger>
        <MenuPopup align="start" className="w-40">
          <MenuRadioGroup onValueChange={(v) => onOperator(String(v))} value={operatorValue}>
            {operatorMenu}
          </MenuRadioGroup>
        </MenuPopup>
      </Menu>
      {field === "estimate" ? (
        <EstimateInput invalid={errors.length > 0} onChange={setValue} value={raw} />
      ) : (
        <Menu>
          <MenuTrigger className={cn(segment, "min-w-0 max-w-48 shrink border-s font-medium")}>
            <span className={cn("flex shrink-0 items-center", field === "labels" ? "gap-0.5" : "-space-x-1")}>
              {values.slice(0, 3).map((v) => (
                <ValueIcon field={field} key={v} ring value={v} />
              ))}
            </span>
            <span className="truncate">
              {values.length > 2 ? `${values.length} ${field === "labels" ? "labels" : "values"}` : values.map((v) => labelOf(field, v, me)).join(", ")}
            </span>
          </MenuTrigger>
          <MenuPopup align="start" className="w-52">
            {orderedOptions(field, me).map((o) => (
              <MenuCheckboxItem
                checked={values.includes(o.value)}
                key={o.value}
                onCheckedChange={() => {
                  const next = values.includes(o.value) ? values.filter((v) => v !== o.value) : [...values, o.value];
                  setValues(store, id, field, next);
                  if (next.length === 0) onRemoved();
                }}
              >
                <span className="flex items-center gap-2">
                  <ValueIcon field={field} value={o.value} />
                  {field === "assignee" && o.value === me ? "Me" : o.label}
                </span>
              </MenuCheckboxItem>
            ))}
          </MenuPopup>
        </Menu>
      )}
      <button
        aria-label={`Remove ${fieldMeta[field].label} filter`}
        className={cn(segment, "border-s px-1.5 text-muted-foreground hover:text-foreground")}
        onClick={removeAndFocus}
        type="button"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );

  if (!errors.length) return chip;
  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>{chip}</TooltipTrigger>
      <TooltipPopup>{errors.map((e) => e.message).join(" · ")}</TooltipPopup>
    </Tooltip>
  );
});

function EstimateInput({ value, invalid, onChange }: { value: unknown; invalid: boolean; onChange: (v: unknown) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const def = issueFields.estimate;
  const unreadable = draft !== null && draft.trim() !== "" && parseInput(def, draft) === null;
  return (
    <input
      aria-invalid={invalid || unreadable || undefined}
      aria-label="Estimate points"
      className="w-12 border-s bg-transparent px-2 font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset aria-invalid:text-destructive-foreground"
      inputMode="numeric"
      onBlur={() => setDraft(null)}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(parseInput(def, e.target.value));
      }}
      onFocus={() => setDraft(formatInput(value))}
      value={draft ?? formatInput(value)}
    />
  );
}

function ValueIcon({ field, value, ring }: { field: FieldName; value: string; ring?: boolean }) {
  if (field === "status") return <StatusIcon status={value} />;
  if (field === "priority") return <PriorityIcon priority={value} />;
  if (field === "labels") return <span className={cn("size-2 shrink-0 rounded-full", labelTones[value])} />;
  if (field === "assignee") return <PersonAvatar id={value} ring={ring} />;
  return null;
}

function PersonAvatar({ id, ring }: { id: string; ring?: boolean }) {
  const name = optionsOf("assignee").find((o) => o.value === id)?.label ?? id;
  if (id === "none")
    return (
      <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/48", ring && "ring-2 ring-background")}>
        <UserRoundIcon className="size-2.5 text-muted-foreground" />
      </span>
    );
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full font-semibold text-[8px]",
        avatarTones[id] ?? "bg-muted text-muted-foreground",
        ring && "ring-2 ring-background",
      )}
    >
      {name
        .split(" ")
        .map((p) => p[0])
        .join("")}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  const tone: Record<string, string> = {
    backlog: "text-muted-foreground",
    todo: "text-muted-foreground",
    in_progress: "text-amber-500",
    in_review: "text-emerald-500",
    done: "text-violet-500",
    canceled: "text-muted-foreground",
  };
  const fill: Record<string, number> = { in_progress: 0.5, in_review: 0.75 };
  return (
    <svg aria-hidden className={cn("size-3.5 shrink-0", tone[status])} fill="none" viewBox="0 0 14 14">
      {status === "backlog" ? (
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeDasharray="2 2" strokeWidth="1.5" />
      ) : status === "done" || status === "canceled" ? (
        <>
          <circle cx="7" cy="7" fill="currentColor" r="6" />
          <path
            d={status === "done" ? "M4.5 7.2 6.2 8.8 9.5 5.4" : "M5 5l4 4M9 5l-4 4"}
            stroke="var(--color-card)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </>
      ) : (
        <>
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          {fill[status] && (
            <path
              d={arcPath(fill[status])}
              fill="currentColor"
            />
          )}
        </>
      )}
    </svg>
  );
}

function arcPath(fraction: number) {
  const angle = fraction * Math.PI * 2;
  const x = 7 + 3 * Math.sin(angle);
  const y = 7 - 3 * Math.cos(angle);
  return `M7 7 L7 4 A3 3 0 ${fraction > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`;
}

function PriorityIcon({ priority }: { priority: string }) {
  if (priority === "urgent")
    return (
      <svg aria-hidden className="size-3.5 shrink-0 text-orange-500" viewBox="0 0 14 14">
        <rect fill="currentColor" height="12" rx="3" width="12" x="1" y="1" />
        <path d="M7 4v3.6M7 9.6v.2" stroke="var(--color-card)" strokeLinecap="round" strokeWidth="1.6" />
      </svg>
    );
  if (priority === "none")
    return (
      <svg aria-hidden className="size-3.5 shrink-0 text-muted-foreground" viewBox="0 0 14 14">
        {[2, 6, 10].map((x) => (
          <rect fill="currentColor" height="1.5" key={x} rx="0.75" width="2.5" x={x - 0.5} y="6.25" />
        ))}
      </svg>
    );
  const level = priority === "high" ? 3 : priority === "medium" ? 2 : 1;
  return (
    <svg aria-hidden className="size-3.5 shrink-0 text-foreground" viewBox="0 0 14 14">
      {[0, 1, 2].map((i) => (
        <rect
          fill="currentColor"
          height={4 + i * 3}
          key={i}
          opacity={i < level ? 1 : 0.24}
          rx="1"
          width="2.6"
          x={1.6 + i * 4}
          y={11 - (4 + i * 3)}
        />
      ))}
    </svg>
  );
}

function Results({ issues, me }: { issues: readonly Issue[]; me: string }) {
  const reduce = useReducedMotion();
  const store = useStore<IssueFields>();
  const query = useQuery<IssueFields>();
  const visible = useMemo(
    () => issues.filter(compile<IssueFields, Issue>(issueFields, query, { invalidRules: "skip" })),
    [issues, query],
  );
  const problem = useMemo(() => {
    const issue = validateQuery(issueFields, query).find((i) => i.severity === "error" && i.code !== "required");
    const node = issue ? query.children[issue.path[0] ?? -1] : undefined;
    if (!issue || !node || node.kind !== "rule") return null;
    return `${fieldMeta[node.field as FieldName]?.label ?? "Filter"} ignored: ${issue.message.toLowerCase()}`;
  }, [query]);
  const filtered = query.children.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between gap-3 px-4 pt-1 text-muted-foreground text-xs">
        <span className={cn("truncate tabular-nums", problem && "text-destructive-foreground")}>
          {problem ?? (filtered ? `${visible.length} of ${issues.length} issues` : `${issues.length} issues`)}
        </span>
        {filtered && (
          <button
            className="rounded-md px-1.5 py-0.5 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => store.clear()}
            type="button"
          >
            Clear filters
          </button>
        )}
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
        <AnimatePresence initial={false}>
          {visible.map((issue) => (
            <motion.div
              animate={{ opacity: 1 }}
              className="flex h-10 items-center gap-2.5 rounded-lg px-2.5 hover:bg-accent/50"
              exit={{ opacity: 0, transition: { duration: 0 } }}
              initial={{ opacity: 0 }}
              key={issue.id}
              transition={{ duration: reduce ? 0 : 0.15, ease: easeOut }}
            >
              <PriorityIcon priority={issue.priority} />
              <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums max-sm:hidden">{issue.id}</span>
              <StatusIcon status={issue.status} />
              <span className="min-w-0 flex-1 truncate">{issue.title}</span>
              <span className="flex shrink-0 items-center gap-1 max-sm:hidden">
                {issue.labels.map((l) => (
                  <span className={cn("size-2 rounded-full", labelTones[l])} key={l} title={labelOf("labels", l)} />
                ))}
              </span>
              <span className="w-6 shrink-0 text-end font-mono text-[11px] text-muted-foreground tabular-nums">{issue.estimate}</span>
              <span className="sr-only">{issue.assignee === me ? "Assigned to you" : `Assigned to ${labelOf("assignee", issue.assignee)}`}</span>
              <PersonAvatar id={issue.assignee} />
            </motion.div>
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {visible.length === 0 && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0, y: reduce ? 0 : 4 }}
              transition={{ duration: 0.2, ease: easeOut }}
            >
              <ListFilterIcon className="mb-1 size-5 text-muted-foreground" />
              <p className="font-medium">No issues match</p>
              <p className="text-muted-foreground text-xs">Loosen a filter or start over.</p>
              <Button className="mt-2" onClick={() => store.clear()} size="sm" variant="outline">
                Clear filters
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
