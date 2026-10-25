"use client";

import {
  compile,
  defineFields,
  f,
  type QueryOf,
  sanitizeQuery,
  type ValueOf,
  validateQuery,
} from "@qnot/core";
import { QueryProvider, useQuery, useQueryStore, useRule, useStore } from "@qnot/react";
import {
  CheckIcon,
  CircleDashedIcon,
  CopyIcon,
  LinkIcon,
  ListFilterIcon,
  PlusIcon,
  SignalHighIcon,
  TagIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuPopup,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/menu";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const viewFields = defineFields({
  status: f.enum([
    { value: "backlog", label: "Backlog" },
    { value: "todo", label: "Todo" },
    { value: "in_progress", label: "In progress" },
    { value: "in_review", label: "In review" },
    { value: "done", label: "Done" },
  ]),
  assignee: f.enum([
    { value: "riley", label: "Riley" },
    { value: "noor", label: "Noor" },
    { value: "sam", label: "Sam" },
    { value: "kai", label: "Kai" },
  ]),
  priority: f.enum([
    { value: "urgent", label: "Urgent" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ]),
  labels: f.multiEnum([
    { value: "bug", label: "Bug" },
    { value: "feature", label: "Feature" },
    { value: "perf", label: "Performance" },
    { value: "design", label: "Design" },
  ]),
});

type ViewFields = typeof viewFields;
type FieldName = keyof ViewFields & string;
type ViewQuery = QueryOf<ViewFields>;

export interface ViewIssue {
  id: string;
  title: string;
  status: ValueOf<ViewFields["status"]>;
  assignee: ValueOf<ViewFields["assignee"]>;
  priority: ValueOf<ViewFields["priority"]>;
  labels: ValueOf<ViewFields["labels"]>;
}

export interface SavedView {
  id: string;
  name: string;
  query: ViewQuery;
}

export interface SavedViewsProps {
  issues: readonly ViewIssue[];
  views: SavedView[];
  baseUrl?: string;
  me?: string;
  onViewsChange?: (views: SavedView[]) => void;
  className?: string;
}

const easeOut = [0.23, 1, 0.32, 1] as const;
const glide = { type: "spring", duration: 0.3, bounce: 0 } as const;
const fieldIcons: Record<FieldName, typeof TagIcon> = {
  status: CircleDashedIcon,
  assignee: UserRoundIcon,
  priority: SignalHighIcon,
  labels: TagIcon,
};
const fieldLabels: Record<FieldName, string> = { status: "Status", assignee: "Assignee", priority: "Priority", labels: "Labels" };

export function encodeView(query: ViewQuery) {
  const bytes = new TextEncoder().encode(JSON.stringify(query));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeView(hash: string): unknown {
  const b64 = hash.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))));
}

function optionsOf(field: FieldName) {
  return (viewFields[field].options ?? []) as readonly { value: string; label: string }[];
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
let counter = 0;

export function SavedViews({
  issues,
  views: initialViews,
  baseUrl = "https://app.northwind.dev/issues",
  me = "riley",
  onViewsChange,
  className,
}: SavedViewsProps) {
  const [views, setViews] = useState(initialViews);
  const [activeId, setActiveId] = useState(initialViews[0].id);
  const [drafts, setDrafts] = useState<Record<string, ViewQuery>>({});
  const active = views.find((v) => v.id === activeId) ?? views[0];
  const store = useQueryStore({ fields: viewFields, initial: active.query });

  const dropDraft = (id: string) =>
    setDrafts((d) => {
      const { [id]: _, ...rest } = d;
      return rest;
    });

  const changeViews = (next: SavedView[]) => {
    setViews(next);
    onViewsChange?.(next);
  };

  const switchTo = (id: string) => {
    const view = views.find((v) => v.id === id);
    if (!view) return;
    const current = store.getQuery();
    const next = { ...drafts };
    if (same(current, active.query)) delete next[active.id];
    else next[active.id] = current;
    setDrafts(next);
    setActiveId(id);
    store.reset(view.query);
    if (next[id]) store.setQuery(next[id]);
  };

  const addView = (name: string, query: ViewQuery) => {
    const view = { id: `view-${++counter}`, name, query };
    changeViews([...views, view]);
    setActiveId(view.id);
    store.reset(query);
  };

  return (
    <QueryProvider store={store}>
      <div
        className={cn(
          "flex h-[396px] w-full min-w-0 max-w-[600px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5",
          className,
        )}
      >
        <ViewTabs
          activeId={active.id}
          baseUrl={baseUrl}
          drafts={drafts}
          onCreate={(name) => addView(name, store.getQuery())}
          onOpenShared={(name, query) => addView(name, query)}
          onSwitch={switchTo}
          views={views}
        />
        <Toolbar
          active={active}
          me={me}
          onDiscard={() => {
            store.reset(active.query);
            dropDraft(active.id);
          }}
          onSave={(query) => {
            changeViews(views.map((v) => (v.id === active.id ? { ...v, query } : v)));
            store.reset(query);
            dropDraft(active.id);
          }}
        />
        <IssueList issues={issues} me={me} />
      </div>
    </QueryProvider>
  );
}

function ViewTabs({
  views,
  activeId,
  drafts,
  baseUrl,
  onSwitch,
  onCreate,
  onOpenShared,
}: {
  views: SavedView[];
  activeId: string;
  drafts: Record<string, ViewQuery>;
  baseUrl: string;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
  onOpenShared: (name: string, query: ViewQuery) => void;
}) {
  const reduce = useReducedMotion();
  const query = useQuery<ViewFields>();
  const active = views.find((v) => v.id === activeId);
  const dirty = active ? !same(query, active.query) : false;
  return (
    <div className="flex shrink-0 items-center gap-1 border-b ps-3 pe-2 pt-2">
      <div className="min-w-0 flex-1 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)] [scrollbar-width:none]">
        <Tabs onValueChange={(v) => onSwitch(String(v))} value={activeId}>
          <TabsList className="pe-6" variant="underline">
            {views.map((view) => (
              <TabsTab className="flex-none gap-1.5 px-2.5 text-xs sm:text-xs" key={view.id} value={view.id}>
                {view.name}
                <AnimatePresence initial={false}>
                  {(view.id === activeId ? dirty : view.id in drafts) && (
                    <motion.span
                      animate={{ opacity: 1, scale: 1 }}
                      aria-label="Unsaved changes"
                      className="size-1.5 rounded-full bg-warning"
                      exit={{ opacity: 0, scale: reduce ? 1 : 0.5 }}
                      initial={{ opacity: 0, scale: reduce ? 1 : 0.5 }}
                      role="img"
                      transition={{ duration: 0.15, ease: easeOut }}
                    />
                  )}
                </AnimatePresence>
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <ShareButton baseUrl={baseUrl} onOpen={onOpenShared} query={query} />
      <NewViewButton onCreate={onCreate} />
    </div>
  );
}

function NewViewButton({ onCreate }: { onCreate: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <Popover
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setName("");
      }}
      open={open}
    >
      <PopoverTrigger render={<Button aria-label="New view" className="mb-1" size="icon-sm" variant="ghost" />}>
        <PlusIcon />
      </PopoverTrigger>
      <PopoverPopup align="end" className="w-64">
        <form
          className="flex flex-col gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onCreate(name.trim());
            setOpen(false);
            setName("");
          }}
        >
          <div className="flex flex-col gap-0.5">
            <p className="font-medium text-sm">New view</p>
            <p className="text-muted-foreground text-xs">Starts from the filters you have now.</p>
          </div>
          <Input
            aria-label="View name"
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="Sprint triage"
            size="sm"
            value={name}
          />
          <Button className="self-end" disabled={!name.trim()} size="sm" type="submit">
            Create view
          </Button>
        </form>
      </PopoverPopup>
    </Popover>
  );
}

function Toolbar({
  active,
  me,
  onSave,
  onDiscard,
}: {
  active: SavedView;
  me: string;
  onSave: (query: ViewQuery) => void;
  onDiscard: () => void;
}) {
  const reduce = useReducedMotion();
  const store = useStore<ViewFields>();
  const query = useQuery<ViewFields>();
  const dirty = !same(query, active.query);
  const chips = store.getGroup(store.rootId).children;

  const ruleFor = (field: FieldName) => {
    const index = query.children.findIndex((n) => n.kind === "rule" && n.field === field);
    return index === -1 ? null : chips[index];
  };

  const selected = (field: FieldName): string[] => {
    const id = ruleFor(field);
    if (!id) return [];
    const rule = store.getRule(id);
    const v = "value" in rule ? rule.value : null;
    return Array.isArray(v) ? v.map(String) : v == null ? [] : [String(v)];
  };

  const toggle = (field: FieldName, value: string) => {
    const id = ruleFor(field);
    if (!id) {
      store.addRule(store.rootId, { field, operator: field === "labels" ? "hasAny" : "in", value: [value] } as never);
      return;
    }
    setChipValues(store, id, toggled(selected(field), value));
  };

  return (
    <div className="flex shrink-0 items-start gap-2 border-b px-3 py-2.5">
      <div className="relative flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {chips.map((id) => (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="min-w-0 max-w-full"
              exit={{ opacity: 0, scale: 0.95, transition: { duration: reduce ? 0 : 0.12 } }}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.95 }}
              key={id}
              layout={reduce ? false : "position"}
              transition={reduce ? { duration: 0 } : { ...glide, opacity: { duration: 0.15 } }}
            >
              <Chip id={id} me={me} />
            </motion.div>
          ))}
          <motion.div key="add" layout={reduce ? false : "position"} transition={reduce ? { duration: 0 } : glide}>
            <Menu>
              <MenuTrigger
                render={<Button aria-label="Add filter" className={cn(chips.length > 0 && "px-2")} size="sm" variant="ghost" />}
              >
                <ListFilterIcon />
                {chips.length === 0 && "Filter"}
              </MenuTrigger>
              <MenuPopup align="start" className="w-48">
                <MenuGroup>
                  <MenuGroupLabel>Filter by</MenuGroupLabel>
                  {(Object.keys(fieldLabels) as FieldName[]).map((field) => {
                    const Icon = fieldIcons[field];
                    return (
                      <MenuSub key={field}>
                        <MenuSubTrigger>
                          <Icon />
                          {fieldLabels[field]}
                        </MenuSubTrigger>
                        <MenuSubPopup className="w-44">
                          {optionsOf(field).map((o) => (
                            <MenuCheckboxItem
                              checked={selected(field).includes(o.value)}
                              key={o.value}
                              onCheckedChange={() => toggle(field, o.value)}
                            >
                              {field === "assignee" && o.value === me ? "Me" : o.label}
                            </MenuCheckboxItem>
                          ))}
                        </MenuSubPopup>
                      </MenuSub>
                    );
                  })}
                </MenuGroup>
              </MenuPopup>
            </Menu>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          aria-hidden={!dirty || undefined}
          className={cn("transition-opacity duration-150", !dirty && "pointer-events-none opacity-0")}
          onClick={onDiscard}
          size="sm"
          tabIndex={dirty ? undefined : -1}
          variant="ghost"
        >
          Discard
        </Button>
        <Button disabled={!dirty} onClick={() => onSave(query)} size="sm">
          Save
        </Button>
      </div>
    </div>
  );
}

function toggled(values: string[], value: string) {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

function setChipValues(store: ReturnType<typeof useStore<ViewFields>>, id: string, next: string[]) {
  if (next.length === 0) store.remove(id);
  else store.setRuleValue(id, next);
}

const Chip = memo(function Chip({ id, me }: { id: string; me: string }) {
  const store = useStore<ViewFields>();
  const { rule, remove } = useRule<ViewFields>(id);
  const field = rule.field as FieldName;
  const Icon = fieldIcons[field];
  const raw = "value" in rule ? rule.value : null;
  const values = Array.isArray(raw) ? raw.map(String) : raw == null ? [] : [String(raw)];
  const label = (v: string) => (field === "assignee" && v === me ? "me" : (optionsOf(field).find((o) => o.value === v)?.label ?? v));
  const verb = field === "labels" ? "include" : values.length > 1 ? "is any of" : "is";
  return (
    <div className="flex h-7 max-w-full items-stretch overflow-hidden rounded-lg border bg-background text-xs shadow-xs/5 dark:bg-input/32">
      <Menu>
        <MenuTrigger className="flex min-w-0 items-center gap-1.5 ps-2 pe-2 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-popup-open:bg-accent">
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="shrink-0 font-medium">{fieldLabels[field]}</span>
          <span className="shrink-0 text-muted-foreground">{verb}</span>
          <span className="truncate font-medium">{values.map(label).join(", ")}</span>
        </MenuTrigger>
        <MenuPopup align="start" className="w-44">
          {optionsOf(field).map((o) => (
            <MenuCheckboxItem
              checked={values.includes(o.value)}
              key={o.value}
              onCheckedChange={() => setChipValues(store, id, toggled(values, o.value))}
            >
              {field === "assignee" && o.value === me ? "Me" : o.label}
            </MenuCheckboxItem>
          ))}
        </MenuPopup>
      </Menu>
      <button
        aria-label={`Remove ${fieldLabels[field]} filter`}
        className="flex w-6 shrink-0 items-center justify-center border-s text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onClick={remove}
        type="button"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
});

function ShareButton({
  query,
  baseUrl,
  onOpen,
}: {
  query: ViewQuery;
  baseUrl: string;
  onOpen: (name: string, query: ViewQuery) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const link = `${baseUrl}#view=${encodeView(query)}`;

  const incoming = useMemo<{ error: string } | { query: ViewQuery; dropped: number; first?: string } | null>(() => {
    const value = pasted.trim();
    if (!value) return null;
    const hash = /#view=([\w-]+)/.exec(value)?.[1];
    if (!hash) return { error: "That link has no view in it" }
    let parsed: unknown;
    try {
      parsed = decodeView(hash);
    } catch {
      return { error: "That link is cut off or garbled" }
    }
    if (!parsed || typeof parsed !== "object" || (parsed as { kind?: unknown }).kind !== "group") {
      return { error: "That link isn't a filter" }
    }
    const candidate = parsed as ViewQuery;
    const problems = validateQuery(viewFields, candidate).filter((i) => i.severity === "error");
    if (problems.length === 0) return { query: candidate, dropped: 0 }
    const clean = sanitizeQuery(viewFields, candidate, {
      removeUnknown: true,
      removeInvalidRules: true,
      removeInvalidListValues: true,
      removeEmptyGroups: true,
    });
    return { query: clean, dropped: problems.length, first: problems[0].message }
  }, [pasted]);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger render={<Button aria-label="Share view" className="mb-1" size="icon-sm" variant="ghost" />}>
        <LinkIcon />
      </PopoverTrigger>
      <PopoverPopup align="end" className="w-[min(22rem,calc(100vw-2rem))]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="font-medium text-xs">Link to this view</p>
            <div className="flex items-center gap-1.5">
              <Input aria-label="Share link" className="min-w-0 flex-1 font-mono text-[11px]" readOnly size="sm" value={link} />
              <Button
                aria-label={copied ? "Copied" : "Copy link"}
                onClick={() => {
                  navigator.clipboard?.writeText(link).catch(() => {});
                  setCopied(true);
                  if (timer.current) clearTimeout(timer.current);
                  timer.current = setTimeout(() => setCopied(false), 1400);
                }}
                size="icon-sm"
                variant="outline"
              >
                {copied ? <CheckIcon className="text-success-foreground" /> : <CopyIcon />}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">The filter lives in the link, so it opens the same for anyone.</p>
          </div>
          <div className="flex flex-col gap-1.5 border-t pt-3">
            <p className="font-medium text-xs">Open a link someone sent you</p>
            <Input
              aria-invalid={(incoming && "error" in incoming) || undefined}
              aria-label="Paste a view link"
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Paste a link"
              size="sm"
              value={pasted}
            />
            {incoming && "error" in incoming && <p className="text-destructive-foreground text-xs">{incoming.error}.</p>}
            {incoming && "query" in incoming && (
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 text-muted-foreground text-xs">
                  {incoming.dropped
                    ? `${incoming.dropped} ${incoming.dropped === 1 ? "rule doesn't" : "rules don't"} fit (${incoming.first}) and will be left out.`
                    : `${incoming.query.children.length} ${incoming.query.children.length === 1 ? "filter" : "filters"}, ready to open.`}
                </p>
                <Button
                  onClick={() => {
                    onOpen("Shared view", incoming.query);
                    setPasted("");
                    setOpen(false);
                  }}
                  size="sm"
                  variant="outline"
                >
                  Open
                </Button>
              </div>
            )}
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}

function IssueList({ issues, me }: { issues: readonly ViewIssue[]; me: string }) {
  const reduce = useReducedMotion();
  const query = useQuery<ViewFields>();
  const visible = useMemo(() => issues.filter(compile<ViewFields, ViewIssue>(viewFields, query)), [issues, query]);
  const status = optionsOf("status");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="shrink-0 px-4 pt-2.5 pb-1 text-muted-foreground text-xs tabular-nums">
        {visible.length} {visible.length === 1 ? "issue" : "issues"}
      </p>
      <div className="relative min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
        <AnimatePresence initial={false}>
          {visible.map((issue) => (
            <motion.div
              animate={{ opacity: 1 }}
              className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 hover:bg-accent/50"
              exit={{ opacity: 0, transition: { duration: 0 } }}
              initial={{ opacity: 0 }}
              key={issue.id}
              transition={{ duration: reduce ? 0 : 0.15, ease: easeOut }}
            >
              <span className="w-14 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">{issue.id}</span>
              <span className="min-w-0 flex-1 truncate">{issue.title}</span>
              <span className="shrink-0 text-muted-foreground text-xs max-sm:hidden">
                {status.find((s) => s.value === issue.status)?.label}
              </span>
              <span className="w-10 shrink-0 text-end text-muted-foreground text-xs">
                {issue.assignee === me ? "Me" : optionsOf("assignee").find((o) => o.value === issue.assignee)?.label}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {visible.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
            <p className="font-medium text-xs">Nothing in this view</p>
            <p className="text-muted-foreground text-xs">Remove a filter to see more.</p>
          </div>
        )}
      </div>
    </div>
  );
}
