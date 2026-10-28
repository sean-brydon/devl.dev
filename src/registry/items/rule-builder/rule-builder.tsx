"use client";

import {
  type AnyFieldDef,
  compile,
  type EditorSpec,
  encode,
  type Fields,
  fieldLabel,
  formatInput,
  formatList,
  type Issue,
  type PathIssue,
  parseInput,
  parseList,
  type Query,
  type QueryNode,
  type QueryOf,
  validateQuery,
} from "@qnot/core";
import { sqlFormat } from "@qnot/core/formats/sql";
import { textFormat } from "@qnot/core/formats/text";
import {
  QueryProvider,
  useDragHandle,
  useDropTarget,
  useGroup,
  useGroupDropZone,
  useHistory,
  useNode,
  useQuery,
  useQueryStore,
  useRule,
  useStore,
} from "@qnot/react";
import {
  CalendarIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  CopyIcon,
  CopyPlusIcon,
  EllipsisIcon,
  FolderPlusIcon,
  GripVerticalIcon,
  HashIcon,
  ListIcon,
  PlusIcon,
  Redo2Icon,
  TagsIcon,
  ToggleLeftIcon,
  Trash2Icon,
  TypeIcon,
  Undo2Icon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, memo, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Menu,
  MenuCheckboxItem,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface RuleBuilderProps {
  fields: Fields;
  defaultQuery?: Query;
  rows?: readonly Record<string, unknown>[];
  table?: string;
  noun?: { one: string; many: string };
  maxDepth?: number;
  onChange?: (query: Query) => void;
  className?: string;
}

type OutputTab = "sql" | "json" | "text";

const postgres = sqlFormat({ dialect: "postgres", params: "numbered" });
const english = textFormat();
const easeOut = [0.23, 1, 0.32, 1] as const;
const glide = { type: "spring", duration: 0.3, bounce: 0 } as const;
const emptyQuery: Query = { kind: "group", combinator: "and", children: [] };

const kindIcons: Record<string, typeof TypeIcon> = {
  text: TypeIcon,
  number: HashIcon,
  enum: ListIcon,
  multiEnum: TagsIcon,
  boolean: ToggleLeftIcon,
  date: CalendarIcon,
};

export function RuleBuilder({
  fields,
  defaultQuery = emptyQuery,
  rows,
  table = "accounts",
  noun = { one: "account", many: "accounts" },
  maxDepth = 2,
  onChange,
  className,
}: RuleBuilderProps) {
  const store = useQueryStore({
    fields,
    initial: defaultQuery as QueryOf<Fields>,
    settings: useMemo(() => ({ maxDepth }), [maxDepth]),
    onChange: onChange as ((q: QueryOf<Fields>) => void) | undefined,
  });

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea")) return;
    if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
    e.preventDefault();
    if (e.shiftKey) store.redo();
    else store.undo();
  };

  return (
    <QueryProvider store={store}>
      <div
        className={cn(
          "flex w-full min-w-0 max-w-[640px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5",
          className,
        )}
        onKeyDown={onKeyDown}
      >
        <Header noun={noun} rows={rows} />
        <div className="px-3 pt-1 pb-3 sm:px-4">
          <GroupView depth={0} id={store.rootId} />
        </div>
        <OutputPanel fields={fields} table={table} />
      </div>
    </QueryProvider>
  );
}

function Header({ rows, noun }: { rows?: readonly Record<string, unknown>[]; noun: { one: string; many: string } }) {
  const store = useStore();
  const query = useQuery();
  const { canUndo, canRedo, undo, redo } = useHistory();
  const count = useMemo(() => {
    if (!rows) return null;
    const issues = validateQuery(store.fields, query);
    if (issues.some((i) => i.severity === "error" && i.code !== "required")) return null;
    const test = compile(store.fields, query);
    return rows.filter((row) => test(row as never)).length;
  }, [rows, store, query]);

  return (
    <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
      <div className="min-w-0 flex-1">
        <h3 className="font-medium">Filter {noun.many}</h3>
        <p className="text-muted-foreground text-xs tabular-nums">
          {rows
            ? count === null
              ? "Fix the highlighted rule to see matches"
              : `${count} of ${rows.length} ${rows.length === 1 ? noun.one : noun.many} match`
            : `${store.ruleCount} ${store.ruleCount === 1 ? "rule" : "rules"}`}
        </p>
      </div>
      <div className="flex items-center gap-0.5">
        <IconAction disabled={!canUndo} label="Undo" onClick={undo} shortcut="⌘Z">
          <Undo2Icon />
        </IconAction>
        <IconAction disabled={!canRedo} label="Redo" onClick={redo} shortcut="⇧⌘Z">
          <Redo2Icon />
        </IconAction>
      </div>
    </div>
  );
}

function IconAction({
  label,
  shortcut,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button aria-label={label} disabled={disabled} onClick={onClick} size="icon-sm" variant="ghost" />}
      >
        {children}
      </TooltipTrigger>
      <TooltipPopup>
        {label}
        {shortcut && <span className="ms-1.5 text-muted-foreground">{shortcut}</span>}
      </TooltipPopup>
    </Tooltip>
  );
}

const GroupView = memo(function GroupView({ id, depth }: { id: string; depth: number }) {
  const reduce = useReducedMotion();
  const { group, isRoot, can, setCombinator, setNot, addRule, addGroup, clone, remove } = useGroup(id);
  const { isOver, zoneProps } = useGroupDropZone(id);
  const { isDragging, handleProps } = useDragHandle(id);
  const { position, dropProps } = useDropTarget(id);
  const other = group.combinator === "and" ? "or" : "and";
  const summary = group.not ? "None of these" : group.combinator === "and" ? "All of these" : "Any of these";

  const list = (
    <div className="@container relative flex flex-col gap-3 @sm:gap-1.5" {...zoneProps}>
      <AnimatePresence initial={false} mode="popLayout">
        {group.children.map((child, index) => (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="flex min-w-0 items-start gap-1.5"
            exit={{ opacity: 0, scale: 0.98, transition: { duration: reduce ? 0 : 0.15, ease: easeOut } }}
            initial={{ opacity: 0, scale: reduce ? 1 : 0.98 }}
            key={child}
            layout={reduce ? false : "position"}
            layoutDependency={index}
            transition={reduce ? { duration: 0 } : { ...glide, opacity: { duration: 0.18, ease: easeOut } }}
          >
            <Connector
              id={child}
              index={index}
              onToggle={can.editGroup ? () => setCombinator(other) : undefined}
              value={group.combinator}
            />
            <div className="min-w-0 flex-1">
              <NodeView depth={depth} id={child} />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {group.children.length === 0 && (
        <div
          className={cn(
            "rounded-xl border border-dashed px-3 py-5 text-center text-muted-foreground text-xs transition-colors",
            isOver && "border-primary/48 bg-primary/4 text-foreground",
          )}
        >
          {isRoot ? "No rules yet, so every row matches." : "Empty group. Add a rule or drop one here."}
        </div>
      )}
    </div>
  );

  if (isRoot) {
    return (
      <div className="@container flex flex-col gap-2.5">
        {list}
        <div className={cn("flex items-center gap-1.5", group.children.length > 0 && "ps-[2.875rem] @lg:ps-[3.375rem]")}>
          <Button disabled={!can.addRule} onClick={() => addRule()} size="sm" variant="outline">
            <PlusIcon />
            Add rule
          </Button>
          <Button disabled={!can.addGroup} onClick={() => addGroup()} size="sm" variant="ghost">
            <FolderPlusIcon />
            Add group
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-muted/40 p-1.5 transition-opacity dark:bg-muted/24",
        isDragging && "opacity-48",
      )}
      {...dropProps}
    >
      <DropLine position={position} />
      <div className="flex h-8 items-center gap-1 ps-0.5 pe-0.5 sm:h-7">
        <DragHandle handleProps={handleProps} id={id} label="group" />
        <span className="min-w-0 flex-1 truncate font-medium text-muted-foreground text-xs">{summary}</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="Add rule to group"
                disabled={!can.addRule}
                onClick={() => addRule()}
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <PlusIcon />
          </TooltipTrigger>
          <TooltipPopup>Add rule</TooltipPopup>
        </Tooltip>
        <Menu>
          <MenuTrigger render={<Button aria-label="Group actions" size="icon-sm" variant="ghost" />}>
            <EllipsisIcon />
          </MenuTrigger>
          <MenuPopup align="end" className="w-48">
            <MenuItem disabled={!can.addGroup} onClick={() => addGroup()}>
              <FolderPlusIcon />
              Add nested group
            </MenuItem>
            <MenuItem disabled={!can.clone} onClick={() => clone()}>
              <CopyPlusIcon />
              Duplicate group
            </MenuItem>
            <MenuCheckboxItem checked={group.not} disabled={!can.editGroup} onCheckedChange={(v) => setNot(v)}>
              Match none of these
            </MenuCheckboxItem>
            <MenuSeparator />
            <MenuItem disabled={!can.remove} onClick={remove} variant="destructive">
              <Trash2Icon />
              Delete group
            </MenuItem>
          </MenuPopup>
        </Menu>
      </div>
      <div className="px-0.5 pb-0.5">{list}</div>
    </div>
  );
});

function NodeView({ id, depth }: { id: string; depth: number }) {
  const node = useNode(id);
  if (!node) return null;
  return node.kind === "group" ? <GroupView depth={depth + 1} id={id} /> : <RuleRow id={id} />;
}

function Connector({
  id,
  index,
  value,
  onToggle,
}: {
  id: string;
  index: number;
  value: "and" | "or";
  onToggle?: () => void;
}) {
  const isGroup = useNode(id)?.kind === "group";
  const base = cn("flex h-8 w-10 shrink-0 items-center text-xs sm:h-7 @lg:w-12", isGroup && "mt-[0.4375rem]");
  if (index === 0) return <span className={cn(base, "text-muted-foreground")}>Where</span>;
  if (index === 1 && onToggle) {
    return (
      <button
        aria-label={`Combine with ${value === "and" ? "or" : "and"} instead`}
        className={cn(
          base,
          "justify-center rounded-lg border border-input bg-background px-1.5 font-medium @lg:justify-between text-foreground shadow-xs/5 outline-none transition-[background-color,scale] duration-150 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] dark:bg-input/32",
        )}
        onClick={onToggle}
        type="button"
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: 4 }}
            key={value}
            transition={{ duration: 0.15, ease: easeOut }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
        <ChevronsUpDownIcon className="hidden size-3 opacity-64 @lg:block" />
      </button>
    );
  }
  return <span className={cn(base, "ps-1 text-muted-foreground @lg:ps-1.5")}>{value}</span>;
}

function DropLine({ position }: { position: "before" | "after" | "inside" | null }) {
  if (position !== "before" && position !== "after") return null;
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 z-10 h-0.5 rounded-full bg-primary",
        position === "before" ? "-top-1" : "-bottom-1",
      )}
    />
  );
}

function DragHandle({
  id,
  label,
  handleProps,
}: {
  id: string;
  label: string;
  handleProps: ReturnType<typeof useDragHandle>["handleProps"];
}) {
  const store = useStore();
  const nudge = (delta: -1 | 1) => {
    const node = store.get(id);
    if (!node?.parent) return;
    const siblings = store.getGroup(node.parent).children;
    const index = siblings.indexOf(id);
    const target = delta < 0 ? index - 1 : index + 2;
    if (target < 0 || target > siblings.length) return;
    store.move(id, node.parent, target);
  };
  return (
    <button
      aria-label={`Move ${label}. Drag, or use the arrow keys.`}
      className="col-start-1 row-start-1 flex h-8 w-5 shrink-0 sm:h-7 cursor-grab items-center justify-center rounded-md text-muted-foreground/64 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          nudge(e.key === "ArrowUp" ? -1 : 1);
        }
      }}
      type="button"
      {...handleProps}
    >
      <GripVerticalIcon className="size-3.5" />
    </button>
  );
}

const RuleRow = memo(function RuleRow({ id }: { id: string }) {
  const reduce = useReducedMotion();
  const { rule, def, fields, editor, operators, fieldOptions, issues, can, setField, setOperator, setValue, clone, remove } =
    useRule(id);
  const { isDragging, handleProps } = useDragHandle(id);
  const { position, dropProps } = useDropTarget(id);
  const [unreadable, setUnreadable] = useState(false);
  const messages = unreadable
    ? ["Enter a number"]
    : issues.filter((i) => i.severity === "error" && i.code !== "required").map((i) => i.message);
  const field = typeof rule.field === "string" ? rule.field : "";
  const label = def ? fieldLabel(field, def) : field;
  const FieldIcon = kindIcons[def?.kind ?? "text"] ?? TypeIcon;
  const fieldItems = fieldOptions.map((o) => ({ value: o.value, label: o.label }));

  return (
    <div className={cn("relative transition-opacity", isDragging && "opacity-48")} {...dropProps}>
      <DropLine position={position} />
      <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_2rem] items-start gap-1.5 @sm:grid-cols-[1.25rem_minmax(0,1fr)_minmax(0,1fr)_2rem] @lg:grid-cols-[1.25rem_8.5rem_8.5rem_minmax(0,1fr)_2rem]">
        <DragHandle handleProps={handleProps} id={id} label={`rule on ${label}`} />
        <Select
          disabled={!can.editField}
          items={fieldItems}
          onValueChange={(v) => v && setField(v)}
          value={field}
        >
          <SelectTrigger aria-label="Field" className="col-start-2 row-start-1 min-w-0" size="sm">
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <FieldIcon className="hidden size-3.5 shrink-0 opacity-64 @lg:block" />
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectPopup>
            {fieldOptions.map((o) => {
              const Icon = kindIcons[fields[o.value]?.kind ?? "text"] ?? TypeIcon;
              return (
                <SelectItem key={o.value} value={o.value}>
                  <span className="flex items-center gap-2">
                    <Icon className="size-3.5 opacity-64" />
                    {o.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectPopup>
        </Select>
        <Select
          disabled={!can.editOperator}
          items={operators}
          onValueChange={(v) => v && setOperator(v)}
          value={rule.operator}
        >
          <SelectTrigger
            aria-label="Operator"
            className="col-start-2 row-start-2 min-w-0 @sm:col-start-3 @sm:row-start-1"
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
            "col-start-2 row-start-3 min-w-0 @sm:col-span-2 @sm:row-start-2 @lg:col-span-1 @lg:col-start-4 @lg:row-start-1",
            editor.arity === "none" && "hidden",
          )}
        >
          <ValueEditor
            def={def}
            disabled={!can.editValue}
            editor={editor}
            issues={issues}
            label={label}
            onChange={setValue}
            onUnreadable={setUnreadable}
            value={rule.value}
          />
        </div>
        <Menu>
          <MenuTrigger
            render={
              <Button
                aria-label={`Actions for rule on ${label}`}
                className="col-start-3 row-start-1 @sm:col-start-4 @lg:col-start-5"
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <EllipsisIcon />
          </MenuTrigger>
          <MenuPopup align="end" className="w-44">
            <MenuItem disabled={!can.clone} onClick={() => clone()}>
              <CopyPlusIcon />
              Duplicate
            </MenuItem>
            <MenuSeparator />
            <MenuItem disabled={!can.remove} onClick={remove} variant="destructive">
              <Trash2Icon />
              Delete rule
            </MenuItem>
          </MenuPopup>
        </Menu>
      </div>
      <AnimatePresence initial={false}>
        {messages.length > 0 && (
          <motion.p
            animate={{ opacity: 1, height: "auto" }}
            className="overflow-hidden ps-[1.625rem] text-destructive-foreground text-xs"
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: easeOut }}
          >
            <span className="block pt-1">{messages.join(" · ")}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

function ValueEditor({
  editor,
  def,
  value,
  issues,
  label,
  disabled,
  onChange,
  onUnreadable,
}: {
  editor: EditorSpec;
  def: AnyFieldDef | undefined;
  value: unknown;
  issues: readonly Issue[];
  label: string;
  disabled?: boolean;
  onChange: (value: unknown) => void;
  onUnreadable: (unreadable: boolean) => void;
}) {
  const invalidAt = (index?: number) =>
    issues.some((i) => i.severity === "error" && i.code !== "required" && (index === undefined || i.index === undefined || i.index === index));

  if (editor.arity === "none") return null;

  if (editor.arity === "two") {
    const pair = Array.isArray(value) ? value : [null, null];
    return (
      <div className="flex items-center gap-1.5">
        <Scalar
          def={def}
          disabled={disabled}
          editor={editor}
          invalid={invalidAt(0)}
          label={`${label} from`}
          onChange={(v) => onChange([v, pair[1] ?? null])}
          onUnreadable={onUnreadable}
          value={pair[0]}
        />
        <span className="shrink-0 text-muted-foreground text-xs">and</span>
        <Scalar
          def={def}
          disabled={disabled}
          editor={editor}
          invalid={invalidAt(1)}
          label={`${label} to`}
          onChange={(v) => onChange([pair[0] ?? null, v])}
          onUnreadable={onUnreadable}
          value={pair[1]}
        />
      </div>
    );
  }

  if (editor.type === "multiselect") {
    const options = editor.options ?? [];
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <Select
        disabled={disabled}
        items={options.map((o) => ({ value: String(o.value), label: o.label }))}
        multiple
        onValueChange={(next) => onChange((next as string[]).map((raw) => parseInput(def, raw)))}
        value={selected}
      >
        <SelectTrigger aria-invalid={invalidAt() || undefined} aria-label={`${label} values`} className="min-w-0" size="sm">
          <SelectValue placeholder="Choose…">
            {(vals: string[]) =>
              vals.length === 0
                ? "Choose…"
                : vals.map((v) => options.find((o) => String(o.value) === v)?.label ?? v).join(", ")
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
        disabled={disabled}
        format={formatList}
        invalid={invalidAt()}
        label={`${label} values`}
        onChange={onChange}
        onUnreadable={onUnreadable}
        parse={(raw) => parseList(def, raw)}
        placeholder="Comma, separated"
        value={value}
      />
    );
  }

  return (
    <Scalar
      def={def}
      disabled={disabled}
      editor={editor}
      invalid={invalidAt()}
      label={label}
      onChange={onChange}
      onUnreadable={onUnreadable}
      value={value}
    />
  );
}

function Scalar({
  editor,
  def,
  value,
  invalid,
  label,
  disabled,
  onChange,
  onUnreadable,
}: {
  editor: EditorSpec;
  def: AnyFieldDef | undefined;
  value: unknown;
  invalid: boolean;
  label: string;
  disabled?: boolean;
  onChange: (value: unknown) => void;
  onUnreadable: (unreadable: boolean) => void;
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
        disabled={disabled}
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

  if (editor.type === "date") {
    return (
      <Input
        aria-invalid={invalid || undefined}
        aria-label={label}
        className="[color-scheme:light] dark:[color-scheme:dark]"
        disabled={disabled}
        onChange={(e) => onChange(parseInput(def, e.target.value))}
        size="sm"
        type="date"
        value={formatInput(value)}
      />
    );
  }

  return (
    <DraftInput
      disabled={disabled}
      format={formatInput}
      inputMode={editor.type === "number" ? "decimal" : undefined}
      invalid={invalid}
      label={label}
      onChange={onChange}
      onUnreadable={onUnreadable}
      parse={(raw) => parseInput(def, raw)}
      placeholder={editor.type === "number" ? "0" : "Value"}
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
  disabled,
  onChange,
  onUnreadable,
}: {
  value: unknown;
  parse: (raw: string) => unknown;
  format: (value: unknown) => string;
  invalid: boolean;
  label: string;
  placeholder?: string;
  inputMode?: "decimal";
  disabled?: boolean;
  onChange: (value: unknown) => void;
  onUnreadable: (unreadable: boolean) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const unreadable = draft !== null && draft.trim() !== "" && parse(draft) === null;
  useEffect(() => {
    onUnreadable(unreadable);
    return () => onUnreadable(false);
  }, [unreadable, onUnreadable]);
  return (
    <Input
      aria-invalid={invalid || unreadable || undefined}
      aria-label={label}
      disabled={disabled}
      inputMode={inputMode}
      onBlur={() => setDraft(null)}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(parse(e.target.value));
      }}
      onFocus={() => setDraft(format(value))}
      placeholder={placeholder}
      size="sm"
      value={draft ?? format(value)}
    />
  );
}

function OutputPanel({ fields, table }: { fields: Fields; table: string }) {
  const query = useQuery();
  const [tab, setTab] = useState<OutputTab>("sql");
  const issues = useMemo(() => validateQuery(fields, query), [fields, query]);
  const incomplete = issues.filter((i) => i.code === "required").length;
  const blocking = issues.filter((i) => i.severity === "error" && i.code !== "required");

  const output = useMemo(() => {
    if (blocking.length) return null;
    try {
      const { sql, params } = encode(postgres, query, fields);
      return {
        sql: sql === "1 = 1" ? `SELECT * FROM ${table}` : `SELECT * FROM ${table}\nWHERE ${prettyWhere(sql)}`,
        params,
        json: JSON.stringify(query, null, 2),
        text: encode(english, query, fields) || "Every row",
      };
    } catch {
      return null;
    }
  }, [blocking.length, query, fields, table]);

  const copyText = output ? (tab === "sql" ? output.sql : tab === "json" ? output.json : output.text) : "";

  return (
    <div className="border-t bg-muted/32 dark:bg-muted/16">
      <div className="flex items-center gap-2 px-3 pt-2.5 sm:px-4">
        <Tabs onValueChange={(v) => setTab(v as OutputTab)} value={tab}>
          <TabsList className="h-8 text-muted-foreground">
            <TabsTab className="text-xs sm:text-xs" value="sql">
              SQL
            </TabsTab>
            <TabsTab className="text-xs sm:text-xs" value="json">
              JSON
            </TabsTab>
            <TabsTab className="text-xs sm:text-xs" value="text">
              Plain English
            </TabsTab>
          </TabsList>
        </Tabs>
        <span className="flex-1" />
        <CopyButton disabled={!output} text={copyText} />
      </div>
      <div className="h-44 overflow-auto px-3 pt-2 pb-3 sm:px-4">
        {output ? (
          tab === "sql" ? (
            <div className="flex flex-col gap-2.5">
              <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-5">{highlightSql(output.sql)}</pre>
              {incomplete > 0 && (
                <p className="text-muted-foreground text-xs">
                  Skipping {incomplete} incomplete {incomplete === 1 ? "rule" : "rules"} until {incomplete === 1 ? "it has" : "they have"} a value.
                </p>
              )}
              {output.params.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {output.params.map((p, i) => (
                    <span
                      className="inline-flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 font-mono text-[11px] tabular-nums dark:bg-input/32"
                      key={`${i}-${String(p)}`}
                    >
                      <span className="text-amber-700 dark:text-amber-400">${i + 1}</span>
                      <span className="max-w-40 truncate text-muted-foreground">{JSON.stringify(p)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : tab === "json" ? (
            <pre className="font-mono text-[12px] leading-5">{highlightJson(output.json)}</pre>
          ) : (
            <p className="text-pretty leading-6">{output.text}</p>
          )
        ) : (
          <BlockingIssues fields={fields} issues={blocking} query={query} />
        )}
      </div>
    </div>
  );
}

function BlockingIssues({ issues, query, fields }: { issues: PathIssue[]; query: Query; fields: Fields }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium text-destructive-foreground text-xs">
        Fix {issues.length} {issues.length === 1 ? "rule" : "rules"} to export this filter
      </p>
      <ul className="flex flex-col gap-1">
        {issues.map((issue) => (
          <li className="flex items-baseline gap-2 text-xs" key={`${issue.path.join(".")}-${issue.code}-${issue.index ?? ""}`}>
            <span className="size-1.5 shrink-0 translate-y-[-1px] rounded-full bg-destructive" />
            <span className="font-medium">{nodeLabel(fields, query, issue.path)}</span>
            <span className="text-muted-foreground">{issue.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function nodeLabel(fields: Fields, query: Query, path: readonly number[]) {
  let node: QueryNode | undefined = query;
  for (const index of path) node = node && node.kind === "group" ? node.children[index] : undefined;
  if (!node) return "Rule";
  if (node.kind === "group") return "Group";
  const name = typeof node.field === "string" ? node.field : "Function";
  return fields[name] ? fieldLabel(name, fields[name]) : name;
}

function CopyButton({ text, disabled }: { text: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return (
    <Button
      aria-label={copied ? "Copied" : "Copy"}
      disabled={disabled}
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1400);
      }}
      size="icon-sm"
      variant="ghost"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, scale: 1 }}
          className="flex"
          exit={{ opacity: 0, scale: 0.8 }}
          initial={{ opacity: 0, scale: 0.8 }}
          key={copied ? "done" : "copy"}
          transition={{ duration: 0.15, ease: easeOut }}
        >
          {copied ? <CheckIcon className="text-success-foreground" /> : <CopyIcon />}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}

function prettyWhere(sql: string) {
  let depth = 0;
  let quoted = false;
  let out = "";
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") quoted = !quoted;
    if (!quoted && ch === "(") depth++;
    if (!quoted && ch === ")") depth--;
    if (!quoted && depth === 0) {
      const rest = sql.slice(i);
      const joiner = rest.startsWith(" AND ") ? "AND" : rest.startsWith(" OR ") ? "OR" : null;
      if (joiner) {
        out += `\n  ${joiner} `;
        i += joiner.length + 1;
        continue;
      }
    }
    out += ch;
  }
  return out;
}

const sqlKeywords = /^(SELECT|FROM|WHERE|AND|OR|NOT|IN|LIKE|ILIKE|ESCAPE|BETWEEN|IS|NULL|TRUE|FALSE)$/;

function highlightSql(sql: string) {
  return sql.split(/(\$\d+|'(?:[^']|'')*'|\b[A-Z]+\b)/g).map((part, i) => {
    if (/^\$\d+$/.test(part))
      return (
        <span className="text-amber-700 dark:text-amber-400" key={i}>
          {part}
        </span>
      );
    if (part.startsWith("'"))
      return (
        <span className="text-emerald-700 dark:text-emerald-400" key={i}>
          {part}
        </span>
      );
    if (sqlKeywords.test(part))
      return (
        <span className="text-violet-700 dark:text-violet-400" key={i}>
          {part}
        </span>
      );
    return part;
  });
}

function highlightJson(json: string) {
  return json.split(/("(?:[^"\\]|\\.)*"(?:\s*:)?|\b-?\d+(?:\.\d+)?\b|\btrue\b|\bfalse\b|\bnull\b)/g).map((part, i) => {
    if (/^".*:$/.test(part))
      return (
        <span className="text-muted-foreground" key={i}>
          {part}
        </span>
      );
    if (part.startsWith('"'))
      return (
        <span className="text-emerald-700 dark:text-emerald-400" key={i}>
          {part}
        </span>
      );
    if (/^(-?\d|true|false|null)/.test(part))
      return (
        <span className="text-amber-700 dark:text-amber-400" key={i}>
          {part}
        </span>
      );
    return part;
  });
}
