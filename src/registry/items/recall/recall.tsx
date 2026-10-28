"use client";

import { BrainIcon, CheckIcon, PauseIcon, PencilIcon, PlayIcon, Trash2Icon, Undo2Icon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface Memory {
  id: string;
  text: string;
  category: string;
  source?: string;
  paused?: boolean;
}

export interface RecallProps {
  memories: Memory[];
  assistantName?: string;
  categories?: string[];
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  onChange?: (memories: Memory[]) => void;
  undoMs?: number;
  className?: string;
}

const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

function IconButton({
  label,
  onClick,
  children,
  danger,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "relative flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-[color,background-color,scale] duration-150 ease-out after:absolute after:-inset-0.5 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] [&_svg]:size-3.5",
        danger ? "hover:bg-destructive/10 hover:text-destructive-foreground" : "hover:bg-accent hover:text-foreground",
      )}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function MemoryRow({
  memory,
  onSave,
  onTogglePause,
  onForget,
}: {
  memory: Memory;
  onSave: (text: string) => void;
  onTogglePause: () => void;
  onForget: () => void;
}) {
  const reduce = useReducedMotion();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memory.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const save = () => {
    const t = draft.trim();
    if (t) onSave(t);
    else setDraft(memory.text);
    setEditing(false);
  };

  return (
    <div className="group/mem relative flex items-start gap-2 rounded-xl px-2.5 py-2 transition-colors hover:bg-accent/50 has-focus-visible:bg-accent/50">
      <motion.span
        animate={{ scale: memory.paused ? 0.7 : 1 }}
        aria-hidden
        className={cn(
          "mt-[7px] size-1.5 shrink-0 rounded-full transition-colors",
          memory.paused ? "bg-muted-foreground/40" : "bg-success",
        )}
        transition={spring}
      />
      <div className="min-w-0 flex-1">
        {editing ? (
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input
              aria-label="Edit memory"
              className="h-7 min-w-0 flex-1 rounded-lg border border-ring bg-background px-2 text-sm outline-none ring-[3px] ring-ring/24 dark:bg-input/32"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDraft(memory.text);
                  setEditing(false);
                }
              }}
              ref={inputRef}
              value={draft}
            />
            <IconButton label="Save" onClick={save}>
              <CheckIcon />
            </IconButton>
            <IconButton
              label="Cancel"
              onClick={() => {
                setDraft(memory.text);
                setEditing(false);
              }}
            >
              <XIcon />
            </IconButton>
          </form>
        ) : (
          <>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.p
                animate={{ opacity: 1, filter: "blur(0px)" }}
                className={cn(
                  "text-pretty text-sm transition-colors",
                  memory.paused ? "text-muted-foreground" : "text-foreground",
                )}
                initial={reduce ? false : { opacity: 0, filter: "blur(3px)" }}
                key={memory.text}
                transition={{ duration: 0.25 }}
              >
                {memory.text}
              </motion.p>
            </AnimatePresence>
            <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground text-xs">
              <AnimatePresence initial={false}>
                {memory.paused && (
                  <motion.span
                    animate={{ opacity: 1, width: "auto" }}
                    className="overflow-hidden whitespace-nowrap rounded-full bg-warning/12 px-1.5 font-medium text-[10px] text-warning-foreground"
                    exit={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0 }}
                    initial={reduce ? false : { opacity: 0, width: 0 }}
                    transition={spring}
                  >
                    Paused
                  </motion.span>
                )}
              </AnimatePresence>
              {memory.source}
            </p>
          </>
        )}
      </div>
      {!editing && (
        <div className="flex shrink-0 items-center transition-opacity duration-150 group-focus-within/mem:opacity-100 group-hover/mem:opacity-100 [@media(hover:hover)]:opacity-0">
          <IconButton label="Edit memory" onClick={() => setEditing(true)}>
            <PencilIcon />
          </IconButton>
          <IconButton label={memory.paused ? "Resume memory" : "Pause memory"} onClick={onTogglePause}>
            {memory.paused ? <PlayIcon /> : <PauseIcon />}
          </IconButton>
          <IconButton danger label="Forget memory" onClick={onForget}>
            <Trash2Icon />
          </IconButton>
        </div>
      )}
    </div>
  );
}

export function Recall({
  memories: initial,
  assistantName = "your assistant",
  categories: categoriesProp,
  enabled: enabledProp,
  onEnabledChange,
  onChange,
  undoMs = 6000,
  className,
}: RecallProps) {
  const reduce = useReducedMotion();
  const chipId = useId();
  const switchId = useId();
  const [memories, setMemories] = useState(initial);
  const [enabledState, setEnabledState] = useState(enabledProp ?? true);
  const enabled = enabledProp ?? enabledState;
  const [filter, setFilter] = useState<string>("All");
  const [tray, setTray] = useState<{ memory: Memory; index: number }[]>([]);

  const categories = categoriesProp ?? [...new Set(initial.map((m) => m.category))];
  const listRef = useRef<HTMLDivElement>(null);

  // Set imperatively: an `inert` prop trips up hydration.
  useEffect(() => {
    if (listRef.current) listRef.current.inert = !enabled;
  }, [enabled]);

  useEffect(() => {
    if (!tray.length) return;
    const t = setTimeout(() => setTray([]), undoMs);
    return () => clearTimeout(t);
  }, [tray, undoMs]);

  const latestMemories = useRef(memories);
  latestMemories.current = memories;

  const update = (next: Memory[]) => {
    latestMemories.current = next;
    setMemories(next);
    onChange?.(next);
  };

  const patch = (id: string, p: Partial<Memory>) =>
    update(latestMemories.current.map((m) => (m.id === id ? { ...m, ...p } : m)));

  const forget = (id: string) => {
    const list = latestMemories.current;
    const index = list.findIndex((m) => m.id === id);
    if (index < 0) return;
    setTray((t) => [...t, { memory: list[index], index }]);
    update(list.filter((m) => m.id !== id));
  };

  const undo = () => {
    const next = [...latestMemories.current];
    for (const { memory, index } of [...tray].reverse()) {
      next.splice(Math.min(index, next.length), 0, memory);
    }
    update(next);
    setTray([]);
  };

  const shownCats = filter === "All" ? categories : [filter];
  const counts = Object.fromEntries(categories.map((c) => [c, memories.filter((m) => m.category === c).length]));

  return (
    <section
      aria-label="Memory"
      className={cn(
        "relative w-full max-w-[420px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5",
        className,
      )}
    >
      <header className="flex items-center gap-3 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
          <BrainIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-sm">Memory</h2>
          <p className="truncate text-muted-foreground text-xs">What {assistantName} remembers about you</p>
        </div>
        <label className="sr-only" htmlFor={switchId}>
          Use memory
        </label>
        <Switch
          checked={enabled}
          id={switchId}
          onCheckedChange={(v) => {
            setEnabledState(v);
            onEnabledChange?.(v);
          }}
        />
      </header>

      <AnimatePresence initial={false}>
        {!enabled && (
          <motion.p
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden px-4 text-muted-foreground text-xs"
            exit={{ height: 0, opacity: 0 }}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            transition={spring}
          >
            <span className="mb-3 block rounded-xl bg-warning/10 px-3 py-2 text-warning-foreground">
              Memory is off. {assistantName.charAt(0).toUpperCase() + assistantName.slice(1)} won't use or save anything
              new until you turn it back on.
            </span>
          </motion.p>
        )}
      </AnimatePresence>

      <div
        aria-disabled={!enabled}
        className={cn("transition-opacity duration-300", !enabled && "pointer-events-none opacity-45")}
        ref={listRef}
      >
        <div
          aria-label="Filter by category"
          className="flex gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="toolbar"
        >
          {["All", ...categories].map((c) => {
            const active = filter === c;
            return (
              <button
                aria-pressed={active}
                className={cn(
                  "relative flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 font-medium text-xs outline-none transition-[color,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                  active ? "border-transparent text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                key={c}
                onClick={() => setFilter(c)}
                type="button"
              >
                {active && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-primary"
                    layoutId={`${chipId}-chip`}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 30 }}
                  />
                )}
                <span className="relative">{c}</span>
                <span className="relative tabular-nums opacity-60">
                  {c === "All" ? memories.length : counts[c]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="h-[300px] overflow-y-auto border-t px-2 pb-16 [mask-image:linear-gradient(to_bottom,black_calc(100%-32px),transparent)]">
          <AnimatePresence initial={false} mode="popLayout">
            {shownCats.map((cat) => {
              const list = memories.filter((m) => m.category === cat);
              return (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  key={cat}
                  layout={!reduce}
                  transition={spring}
                >
                  <h3 className="px-2.5 pt-3 pb-1 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
                    {cat}
                  </h3>
                  <AnimatePresence initial={false}>
                    {list.map((m) => (
                      <motion.div
                        animate={{ opacity: 1, height: "auto" }}
                        className="overflow-hidden"
                        exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, x: -16 }}
                        initial={reduce ? false : { opacity: 0, height: 0 }}
                        key={m.id}
                        transition={spring}
                      >
                        <MemoryRow
                          memory={m}
                          onForget={() => forget(m.id)}
                          onSave={(text) => patch(m.id, { text })}
                          onTogglePause={() => patch(m.id, { paused: !m.paused })}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {list.length === 0 && (
                    <p className="px-2.5 py-2 text-muted-foreground text-xs">Nothing remembered here.</p>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {tray.length > 0 && (
          <motion.div
            animate={{ y: 0, opacity: 1 }}
            className="absolute inset-x-1.5 bottom-1.5 flex items-center gap-2 rounded-lg bg-primary py-1.5 ps-3 pe-1.5 text-primary-foreground text-sm shadow-md/10"
            exit={reduce ? { opacity: 0 } : { y: 20, opacity: 0 }}
            initial={reduce ? false : { y: 20, opacity: 0 }}
            role="status"
            transition={{ type: "spring", stiffness: 460, damping: 30 }}
          >
            <Trash2Icon className="size-3.5 shrink-0 opacity-70" />
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ opacity: 1, y: 0 }}
                className="min-w-0 flex-1 truncate"
                exit={{ opacity: 0, y: -8 }}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                key={tray.length}
                transition={spring}
              >
                {tray.length === 1 ? `Forgot “${tray[0].memory.text}”` : `Forgot ${tray.length} memories`}
              </motion.span>
            </AnimatePresence>
            <button
              className="relative flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 font-medium text-xs outline-none transition-[background-color,scale] duration-150 ease-out after:absolute after:-inset-y-0.5 after:inset-x-0 hover:bg-primary-foreground/12 focus-visible:ring-2 focus-visible:ring-primary-foreground/50 active:scale-[0.97]"
              onClick={undo}
              type="button"
            >
              <Undo2Icon className="size-3.5" />
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
