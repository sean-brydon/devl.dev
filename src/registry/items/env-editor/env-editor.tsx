"use client";

import { CheckIcon, ClipboardPasteIcon, EyeIcon, EyeOffIcon, LockIcon, PlusIcon, Trash2Icon, Undo2Icon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ClipboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface EnvEnvironment {
  id: string;
  name: string;
}

export interface EnvVariable {
  key: string;
  values: Record<string, string | undefined>;
  secret?: boolean;
}

export interface EnvEditorProps {
  environments: EnvEnvironment[];
  variables: EnvVariable[];
  project?: string;
  onSave?: (variables: EnvVariable[]) => void | Promise<void>;
  className?: string;
}

type Row = EnvVariable & { uid: string; removed?: boolean };

const MASK = "••••••••";
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const spring = { type: "spring", stiffness: 480, damping: 38 } as const;

const isSecret = (v: EnvVariable) =>
  v.secret ?? (!/^(NEXT_PUBLIC_|PUBLIC_|VITE_)/.test(v.key) && /SECRET|TOKEN|KEY|PASSWORD|_URL$|DSN/.test(v.key));

let seq = 0;
const toRows = (vars: EnvVariable[]): Row[] => vars.map((v) => ({ ...v, values: { ...v.values }, uid: `v${++seq}` }));

function parseDotenv(text: string) {
  const entries: [string, string][] = [];
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.replace(/^export\s+/, "").match(/^([^=\s]+)\s*=\s*(.*)$/);
    if (!m || !KEY_RE.test(m[1])) {
      skipped++;
      continue;
    }
    let value = m[2].replace(/\s+#.*$/, "");
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    entries.push([m[1], value]);
  }
  return { entries, skipped };
}

function IconButton({ label, onClick, children, className }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={label}
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-[color,background-color,scale,opacity] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground",
              className,
            )}
            onClick={onClick}
            type="button"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}

export function EnvEditor({ environments, variables, project, onSave, className }: EnvEditorProps) {
  const reduce = useReducedMotion();
  const [baseline, setBaseline] = useState<Row[]>(() => toRows(variables));
  const [rows, setRows] = useState<Row[]>(() => baseline.map((r) => ({ ...r, values: { ...r.values } })));
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ uid: string; env: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importEnv, setImportEnv] = useState(environments[0]?.id ?? "");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [newKey, setNewKey] = useState<string | null>(null);
  const keyInput = useRef<HTMLInputElement>(null);

  const base = useMemo(() => new Map(baseline.map((r) => [r.uid, r])), [baseline]);

  const cellChanged = (r: Row, env: string) => {
    const b = base.get(r.uid);
    return !b || (b.values[env] ?? "") !== (r.values[env] ?? "");
  };

  const changes = useMemo(() => {
    let added = 0;
    let removed = 0;
    let edited = 0;
    for (const r of rows) {
      const b = base.get(r.uid);
      if (!b) {
        if (!r.removed) added++;
      } else if (r.removed) removed++;
      else if (environments.some((e) => (b.values[e.id] ?? "") !== (r.values[e.id] ?? ""))) edited++;
    }
    return { added, removed, edited, total: added + removed + edited };
  }, [rows, base, environments]);

  useEffect(() => {
    if (saving !== "saved") return;
    const t = setTimeout(() => setSaving("idle"), 1600);
    return () => clearTimeout(t);
  }, [saving]);

  useEffect(() => {
    if (newKey !== null) keyInput.current?.focus();
  }, [newKey]);

  const allRevealed = rows.filter(isSecret).every((r) => revealed.has(r.uid));

  const startEdit = (r: Row, env: string) => {
    if (r.removed) return;
    setEditing({ uid: r.uid, env });
    setDraft(r.values[env] ?? "");
  };

  const commitEdit = (save: boolean) => {
    if (!editing) return;
    if (save) {
      setRows((rs) =>
        rs.map((r) => (r.uid === editing.uid ? { ...r, values: { ...r.values, [editing.env]: draft === "" ? undefined : draft } } : r)),
      );
    }
    setEditing(null);
  };

  const parsed = useMemo(() => parseDotenv(importText), [importText]);
  const importSummary = useMemo(() => {
    let fresh = 0;
    let updated = 0;
    for (const [k, v] of parsed.entries) {
      const row = rows.find((r) => r.key === k && !r.removed);
      if (!row) fresh++;
      else if ((row.values[importEnv] ?? "") !== v) updated++;
    }
    return { fresh, updated };
  }, [parsed, rows, importEnv]);

  const applyImport = () => {
    setRows((rs) => {
      const next = rs.map((r) => ({ ...r, values: { ...r.values } }));
      for (const [k, v] of parsed.entries) {
        const row = next.find((r) => r.key === k && !r.removed);
        if (row) row.values[importEnv] = v;
        else next.push({ key: k, values: { [importEnv]: v }, uid: `v${++seq}` });
      }
      return next;
    });
    setImportText("");
    setImportOpen(false);
  };

  const onPaste = (e: ClipboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea")) return;
    const text = e.clipboardData.getData("text");
    if (!/^\s*(export\s+)?[A-Za-z_]\w*\s*=/m.test(text)) return;
    e.preventDefault();
    setImportText(text);
    setImportOpen(true);
  };

  const addVariable = () => {
    const key = (newKey ?? "").trim().toUpperCase();
    if (!KEY_RE.test(key) || rows.some((r) => r.key === key && !r.removed)) return;
    const row: Row = { key, values: {}, uid: `v${++seq}` };
    setRows((rs) => [...rs, row]);
    setNewKey(null);
    setTimeout(() => startEdit(row, environments[0].id), 0);
  };

  const discard = () => {
    setRows(baseline.map((r) => ({ ...r, values: { ...r.values } })));
    setEditing(null);
  };

  const save = async () => {
    setSaving("saving");
    const kept = rows.filter((r) => !r.removed);
    const clean = kept.map(({ key, values, secret }) => ({ key, values, secret }));
    await onSave?.(clean);
    setBaseline(kept.map((r) => ({ ...r, values: { ...r.values } })));
    setRows(kept);
    setSaving("saved");
  };

  const newKeyError =
    newKey && newKey.trim()
      ? !KEY_RE.test(newKey.trim())
        ? "Letters, digits and _ only"
        : rows.some((r) => r.key === newKey.trim().toUpperCase() && !r.removed)
          ? "Already exists"
          : null
      : null;

  const cols = `minmax(224px,1.5fr) repeat(${environments.length}, minmax(118px,1fr)) 36px`;
  const showFooter = changes.total > 0 || saving !== "idle";

  return (
    <TooltipProvider delay={500}>
      <div className={cn("flex w-full min-w-0 max-w-[640px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5", className)} onPaste={onPaste}>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium">Environment variables</h3>
            <p className="truncate text-muted-foreground text-xs">
              {project ? `${project} · ` : ""}
              {rows.filter((r) => !r.removed).length} variables<span className="max-sm:hidden"> · paste a .env anywhere here</span>
            </p>
          </div>
          <IconButton label={allRevealed ? "Hide all values" : "Reveal all values"} onClick={() => setRevealed(allRevealed ? new Set() : new Set(rows.map((r) => r.uid)))}>
            {allRevealed ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </IconButton>
          <Button aria-expanded={importOpen} onClick={() => setImportOpen((o) => !o)} size="sm" variant="outline">
            <ClipboardPasteIcon />
            Import<span className="-ms-1 max-sm:hidden">.env</span>
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {importOpen && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="mx-4 mb-3 flex flex-col gap-2.5 rounded-xl border bg-muted/40 p-3">
                <textarea
                  aria-label="Paste .env contents"
                  autoFocus
                  className="h-24 w-full resize-none rounded-lg border border-input bg-background px-2.5 py-2 font-mono text-xs leading-5 shadow-xs/5 outline-none ring-ring/24 placeholder:text-muted-foreground/72 focus-visible:border-ring focus-visible:ring-[3px] dark:bg-input/32"
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={"# Paste KEY=value lines\nREDIS_URL=redis://localhost:6379\nEMAIL_FROM=hello@northwind.dev"}
                  spellCheck={false}
                  value={importText}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-xs">Into</span>
                  <Select onValueChange={(v) => v && setImportEnv(String(v))} value={importEnv}>
                    <SelectTrigger aria-label="Target environment" className="h-7 w-auto min-w-32 text-xs sm:min-h-7 sm:text-xs" size="sm">
                      <SelectValue>{(v: string) => environments.find((e) => e.id === v)?.name}</SelectValue>
                    </SelectTrigger>
                    <SelectPopup>
                      {environments.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                  <span aria-live="polite" className="flex-1 text-muted-foreground text-xs tabular-nums">
                    {parsed.entries.length > 0 && (
                      <>
                        {importSummary.fresh > 0 && <span className="text-success-foreground">{importSummary.fresh} new</span>}
                        {importSummary.fresh > 0 && importSummary.updated > 0 && " · "}
                        {importSummary.updated > 0 && <span className="text-warning-foreground">{importSummary.updated} updated</span>}
                        {importSummary.fresh + importSummary.updated === 0 && "No changes"}
                      </>
                    )}
                    {parsed.skipped > 0 && <span> · {parsed.skipped} skipped</span>}
                  </span>
                  <Button onClick={() => setImportOpen(false)} size="sm" variant="ghost">
                    Cancel
                  </Button>
                  <Button disabled={importSummary.fresh + importSummary.updated === 0} onClick={applyImport} size="sm">
                    Add to table
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative overflow-x-auto border-t [scrollbar-width:thin]">
          <div className="min-w-fit" role="table">
            <div className="grid border-b bg-card bg-linear-to-r from-muted/40 to-muted/40 text-muted-foreground text-xs" role="row" style={{ gridTemplateColumns: cols }}>
              <div className="sticky left-0 z-10 bg-card bg-linear-to-r from-muted/40 to-muted/40 px-4 py-2 font-medium" role="columnheader">
                Key
              </div>
              {environments.map((e) => (
                <div className="px-3 py-2 font-medium" key={e.id} role="columnheader">
                  {e.name}
                </div>
              ))}
              <div role="columnheader">
                <span className="sr-only">Actions</span>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {rows.map((r) => {
                const isNew = !base.has(r.uid);
                const secret = isSecret(r);
                const shown = !secret || revealed.has(r.uid);
                const rowTone = r.removed ? "bg-destructive/6" : isNew ? "bg-success/6" : "";
                return (
                  <motion.div
                    animate={{ opacity: 1, height: "auto" }}
                    className={cn("group/row grid border-b last:border-b-0", rowTone)}
                    exit={{ opacity: 0, height: 0 }}
                    initial={reduce ? false : { opacity: 0, height: 0 }}
                    key={r.uid}
                    role="row"
                    style={{ gridTemplateColumns: cols }}
                    transition={reduce ? { duration: 0 } : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <div
                      className={cn(
                        "sticky left-0 z-10 flex min-w-0 items-center gap-1.5 bg-card py-1 ps-4 pe-2",
                        r.removed && "bg-[color-mix(in_srgb,var(--color-destructive)_6%,var(--color-card))]",
                        isNew && !r.removed && "bg-[color-mix(in_srgb,var(--color-success)_6%,var(--color-card))]",
                      )}
                      role="rowheader"
                    >
                      {secret ? <LockIcon aria-label="Secret" className="size-3 shrink-0 text-muted-foreground/70" /> : <span className="w-3 shrink-0" />}
                      <span className={cn("min-w-0 flex-1 truncate font-medium font-mono text-xs", r.removed && "text-muted-foreground line-through")} title={r.key}>
                        {r.key}
                      </span>
                      {isNew && !r.removed && (
                        <span className="shrink-0 rounded-full bg-success/12 px-1.5 font-medium text-[10px] text-success-foreground leading-4">new</span>
                      )}
                      {secret && !r.removed && (
                        <IconButton
                          label={shown ? `Hide ${r.key}` : `Reveal ${r.key}`}
                          onClick={() =>
                            setRevealed((s) => {
                              const n = new Set(s);
                              if (n.has(r.uid)) n.delete(r.uid);
                              else n.add(r.uid);
                              return n;
                            })
                          }
                        >
                          {shown ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
                        </IconButton>
                      )}
                    </div>

                    {environments.map((e) => {
                      const value = r.values[e.id];
                      const changed = !isNew && !r.removed && cellChanged(r, e.id);
                      const isEditing = editing?.uid === r.uid && editing.env === e.id;
                      const before = base.get(r.uid)?.values[e.id];
                      return (
                        <div className={cn("relative min-w-0 px-1.5 py-1.5", changed && "bg-warning/10")} key={e.id} role="cell">
                          {changed && <span aria-hidden className="absolute top-1/2 left-1 size-1 -translate-y-1/2 rounded-full bg-warning" />}
                          {isEditing ? (
                            <input
                              aria-label={`${r.key} in ${e.name}`}
                              autoFocus
                              className="h-7 w-full min-w-0 rounded-md border border-ring bg-background px-1.5 font-mono text-xs outline-none ring-[3px] ring-ring/24 dark:bg-input/32"
                              onBlur={() => commitEdit(true)}
                              onChange={(ev) => setDraft(ev.target.value)}
                              onFocus={(ev) => ev.currentTarget.select()}
                              onKeyDown={(ev) => {
                                if (ev.key === "Enter") commitEdit(true);
                                if (ev.key === "Escape") commitEdit(false);
                              }}
                              placeholder="Not set"
                              spellCheck={false}
                              value={draft}
                            />
                          ) : (
                            <button
                              aria-label={`Edit ${r.key} in ${e.name}${changed ? " (changed)" : ""}`}
                              className={cn(
                                "flex h-7 w-full min-w-0 items-center rounded-md px-1.5 text-start font-mono text-xs outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default [@media(hover:hover)]:hover:bg-accent",
                                r.removed && "text-muted-foreground line-through",
                              )}
                              disabled={r.removed}
                              onClick={() => startEdit(r, e.id)}
                              title={changed ? `Was: ${before === undefined ? "not set" : shown ? before : MASK}` : undefined}
                              type="button"
                            >
                              {value === undefined ? (
                                <span className="text-muted-foreground/60">—</span>
                              ) : shown ? (
                                <span className="truncate" title={value}>{value || <span className="text-muted-foreground">""</span>}</span>
                              ) : (
                                <span className="tracking-[0.12em] text-muted-foreground">{MASK}</span>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-center" role="cell">
                      {r.removed ? (
                        <IconButton label={`Restore ${r.key}`} onClick={() => setRows((rs) => rs.map((x) => (x.uid === r.uid ? { ...x, removed: false } : x)))}>
                          <Undo2Icon className="size-3.5" />
                        </IconButton>
                      ) : (
                        <IconButton
                          className="opacity-0 focus-visible:opacity-100 group-focus-within/row:opacity-100 pointer-coarse:opacity-100 [@media(hover:hover)]:group-hover/row:opacity-100"
                          label={`Delete ${r.key}`}
                          onClick={() =>
                            isNew ? setRows((rs) => rs.filter((x) => x.uid !== r.uid)) : setRows((rs) => rs.map((x) => (x.uid === r.uid ? { ...x, removed: true } : x)))
                          }
                        >
                          <Trash2Icon className="size-3.5" />
                        </IconButton>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <div className="sticky left-0 flex w-full max-w-[640px] items-center gap-2 border-t px-3 py-2">
              {newKey === null ? (
                <Button className="text-muted-foreground" onClick={() => setNewKey("")} size="sm" variant="ghost">
                  <PlusIcon />
                  Add variable
                </Button>
              ) : (
                <form
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onSubmit={(ev) => {
                    ev.preventDefault();
                    addVariable();
                  }}
                >
                  <input
                    aria-invalid={Boolean(newKeyError) || undefined}
                    aria-label="New variable name"
                    className="h-7 w-52 min-w-0 rounded-md border border-input bg-background px-2 font-mono text-xs uppercase shadow-xs/5 outline-none ring-ring/24 placeholder:normal-case placeholder:text-muted-foreground/72 focus-visible:border-ring focus-visible:ring-[3px] aria-invalid:border-destructive/50 dark:bg-input/32"
                    onBlur={() => !newKey?.trim() && setNewKey(null)}
                    onChange={(ev) => setNewKey(ev.target.value)}
                    onKeyDown={(ev) => ev.key === "Escape" && setNewKey(null)}
                    placeholder="NEW_VARIABLE"
                    ref={keyInput}
                    spellCheck={false}
                    value={newKey}
                  />
                  <Button disabled={!newKey.trim() || Boolean(newKeyError)} size="sm" type="submit" variant="outline">
                    Add
                  </Button>
                  {newKeyError && <span className="truncate text-destructive-foreground text-xs">{newKeyError}</span>}
                </form>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {showFooter && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={reduce ? { duration: 0 } : spring}
            >
              <div className="flex items-center gap-3 border-t bg-muted/40 px-4 py-2.5">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.p
                    animate={{ opacity: 1, y: 0 }}
                    className="min-w-0 flex-1 truncate text-xs"
                    exit={{ opacity: 0, y: -6 }}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    key={saving === "saved" ? "saved" : "dirty"}
                    transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  >
                    {saving === "saved" ? (
                      <span className="flex items-center gap-1.5 text-success-foreground">
                        <CheckIcon className="size-3.5" /> Saved · redeploy to apply
                      </span>
                    ) : (
                      <>
                        <span className="font-medium tabular-nums">
                          {changes.total} unsaved {changes.total === 1 ? "change" : "changes"}
                        </span>
                        <span className="text-muted-foreground tabular-nums max-sm:hidden">
                          {changes.added > 0 && ` · ${changes.added} added`}
                          {changes.edited > 0 && ` · ${changes.edited} edited`}
                          {changes.removed > 0 && ` · ${changes.removed} removed`}
                        </span>
                      </>
                    )}
                  </motion.p>
                </AnimatePresence>
                {saving !== "saved" && (
                  <>
                    <Button disabled={saving === "saving"} onClick={discard} size="sm" variant="ghost">
                      Discard
                    </Button>
                    <Button loading={saving === "saving"} onClick={save} size="sm">
                      Save changes
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
