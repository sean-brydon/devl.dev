"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  BookOpenIcon,
  BotIcon,
  CheckIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  FileTextIcon,
  GlobeIcon,
  InboxIcon,
  LibraryIcon,
  LoaderCircleIcon,
  LockIcon,
  type LucideIcon,
  MenuIcon,
  PanelRightIcon,
  PaperclipIcon,
  PlusIcon,
  RotateCwIcon,
  SearchIcon,
  SquareTerminalIcon,
  WrenchIcon,
  XIcon,
} from "lucide-react";
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Kbd } from "@/components/ui/kbd";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface WorkspaceTask {
  id: string;
  title: string;
  state: "running" | "done" | "idle";
  time: string;
}

export interface WorkspaceToolCall {
  id: string;
  tool: string;
  detail: string;
  icon: LucideIcon;
  ms: number;
  output?: string;
}

export interface WorkspaceSource {
  id: string;
  title: string;
  domain: string;
  cited: number;
  tone: string;
}

export interface SplitShellProps {
  tasks?: WorkspaceTask[];
  toolCalls?: WorkspaceToolCall[];
  sources?: WorkspaceSource[];
  defaultPanelWidth?: number;
  minPanelWidth?: number;
  maxPanelWidth?: number;
  children?: ReactNode;
  className?: string;
}

const spring = { type: "spring", stiffness: 420, damping: 38 } as const;

const defaultTasks: WorkspaceTask[] = [
  { id: "t1", title: "Competitive scan: note apps", state: "running", time: "now" },
  { id: "t2", title: "Draft Q4 pricing memo", state: "done", time: "1h" },
  { id: "t3", title: "Summarise churn interviews", state: "done", time: "Tue" },
  { id: "t4", title: "Onboarding email rewrite", state: "idle", time: "Mon" },
  { id: "t5", title: "Clean up the roadmap doc", state: "idle", time: "Oct 18" },
];

const defaultToolCalls: WorkspaceToolCall[] = [
  { id: "c1", tool: "web.search", detail: "note taking app pricing 2026", icon: SearchIcon, ms: 820, output: "14 results · 6 kept" },
  { id: "c2", tool: "browser.open", detail: "quillpad.app/pricing", icon: GlobeIcon, ms: 1640, output: "Read 3 plan cards, 1 FAQ" },
  { id: "c3", tool: "browser.open", detail: "notably.io/plans", icon: GlobeIcon, ms: 1310, output: "Read 4 plan cards" },
  { id: "c4", tool: "files.read", detail: "churn-interviews.md", icon: FileTextIcon, ms: 410, output: "38 quotes tagged 'price'" },
  { id: "c5", tool: "python.run", detail: "compare_plans.py", icon: SquareTerminalIcon, ms: 2280, output: "Table: 3 apps × 5 columns" },
  { id: "c6", tool: "doc.write", detail: "Draft summary", icon: BookOpenIcon, ms: 1900, output: "412 words" },
];

const defaultSources: WorkspaceSource[] = [
  { id: "s1", title: "Quillpad · Plans and pricing", domain: "quillpad.app", cited: 4, tone: "bg-orange-500/14 text-orange-800 dark:text-orange-400" },
  { id: "s2", title: "Notably plans for teams", domain: "notably.io", cited: 3, tone: "bg-teal-500/14 text-teal-800 dark:text-teal-400" },
  { id: "s3", title: "Driftnote changelog: October", domain: "driftnote.co", cited: 2, tone: "bg-info/14 text-info-foreground" },
  { id: "s4", title: "churn-interviews.md", domain: "Orbit files", cited: 5, tone: "bg-violet-500/18 text-violet-700 dark:text-violet-400" },
  { id: "s5", title: "The state of note apps, 2026", domain: "fieldnotes.blog", cited: 1, tone: "bg-rose-500/14 text-rose-700 dark:text-rose-400" },
];

function Sidebar({ tasks, onClose }: { tasks: WorkspaceTask[]; onClose?: () => void }) {
  const [active, setActive] = useState(tasks[0]?.id);
  const group = useId();
  return (
    <LayoutGroup id={group}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex h-13 items-center gap-2 px-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BotIcon className="size-4" />
          </span>
          <span className="font-semibold">Orbit</span>
          <span className="text-muted-foreground text-xs">Workspace</span>
          {onClose && (
            <Button aria-label="Close navigation" className="ms-auto" onClick={onClose} size="icon-sm" variant="ghost">
              <XIcon />
            </Button>
          )}
        </div>
        <div className="px-3 pb-2">
          <Button className="w-full justify-start" variant="outline">
            <PlusIcon />
            New task
          </Button>
        </div>
        <nav aria-label="Workspace" className="flex flex-col gap-0.5 px-2 pb-2">
          {[
            { label: "Search", icon: SearchIcon, meta: <Kbd>⌘K</Kbd> },
            { label: "Inbox", icon: InboxIcon, meta: <span className="rounded-full bg-info/14 px-1.5 font-medium text-[11px] text-info-foreground tabular-nums">2</span> },
            { label: "Library", icon: LibraryIcon },
          ].map((n) => (
            <button
              className="flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              key={n.label}
              type="button"
            >
              <n.icon className="size-4 shrink-0" />
              <span className="flex-1">{n.label}</span>
              {n.meta}
            </button>
          ))}
        </nav>
        <div className="flex items-center justify-between px-5 pt-3 pb-1.5 text-muted-foreground text-xs">
          <span className="font-medium">Tasks</span>
          <span className="tabular-nums">{tasks.length}</span>
        </div>
        <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2">
          {tasks.map((t) => {
            const on = active === t.id;
            return (
              <li key={t.id}>
                <button
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "relative flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
                    on ? "text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                  onClick={() => setActive(t.id)}
                  type="button"
                >
                  {on && (
                    <motion.span
                      className="absolute inset-0 rounded-lg bg-background shadow-xs/5 ring-1 ring-border dark:bg-accent dark:ring-0"
                      layoutId="ws-task"
                      transition={spring}
                    />
                  )}
                  <span className="relative flex size-4 shrink-0 items-center justify-center">
                    {t.state === "running" ? (
                      <LoaderCircleIcon className="size-3.5 animate-spin text-info motion-reduce:animate-none" />
                    ) : t.state === "done" ? (
                      <CheckIcon className="size-3.5 text-success" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                    )}
                  </span>
                  <span className="relative min-w-0 flex-1 truncate">{t.title}</span>
                  <span className="relative text-muted-foreground text-xs tabular-nums">{t.time}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-2.5 p-3">
          <Avatar className="size-7">
            <AvatarFallback className="bg-orange-500/16 text-[11px] text-orange-800 dark:text-orange-400">DA</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate font-medium">Dara Achebe</div>
            <div className="truncate text-muted-foreground text-xs">Northwind Labs</div>
          </div>
          <ChevronsUpDownIcon className="size-4 text-muted-foreground" />
        </div>
      </div>
    </LayoutGroup>
  );
}

const compare = [
  { app: "Quillpad", price: "$8", seats: "Unlimited", ai: "Add-on $5", offline: true },
  { app: "Notably", price: "$10", seats: "Up to 50", ai: "Included", offline: false },
  { app: "Driftnote", price: "$6", seats: "Up to 20", ai: "None", offline: true },
];

const quotes = [
  { text: "We paid for Notably's AI on every seat and maybe three people used it.", who: "Ops lead, 30-person agency" },
  { text: "Half our week is on client sites with bad wifi. Offline was the deal breaker.", who: "Producer, events studio" },
];

const enter = { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } } as const;

function Cite({ n, label }: { n: number; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={`Source ${n}: ${label}`}
            className="relative ms-0.5 inline-flex size-4 -translate-y-px cursor-pointer items-center justify-center rounded bg-muted align-middle font-medium text-[10px] text-muted-foreground tabular-nums outline-none before:absolute before:-inset-2 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
          />
        }
      >
        {n}
      </TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}

function SkeletonLines({ rows, label }: { rows: number; label: string }) {
  return (
    <div aria-label={label} className="flex flex-col gap-2 rounded-xl border border-dashed p-3" role="status">
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <LoaderCircleIcon className="size-3 animate-spin motion-reduce:animate-none" />
        {label}
      </span>
      {Array.from({ length: rows }, (_, i) => (
        <span className="h-2 animate-pulse rounded-full bg-muted motion-reduce:animate-none" key={i} style={{ width: `${92 - i * 17}%` }} />
      ))}
    </div>
  );
}

function SampleThread({ running, step, total }: { running: boolean; step: number; total: number }) {
  const [draft, setDraft] = useState("");
  const composer = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const haveTable = step >= 3;
  useEffect(() => {
    const el = scroller.current;
    if (!el || step === 0) return;
    const t = setTimeout(() => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 240;
      if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
    }, 60);
    return () => clearTimeout(t);
  }, [step, reduce]);
  const haveQuotes = step >= 4;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto" ref={scroller}>
        <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 @3xl:px-6">
          <div className="ms-auto max-w-[85%] text-pretty rounded-2xl rounded-br-md bg-muted px-4 py-2.5">
            Scan the three note apps we lose deals to. Pricing, seat limits, AI and offline. Use the churn interviews for
            why people leave.
          </div>
          <div className="flex gap-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
              <BotIcon className="size-3.5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div className="flex h-5 items-center gap-2 text-muted-foreground text-xs">
                {running ? (
                  <LoaderCircleIcon className="size-3.5 animate-spin text-info motion-reduce:animate-none" />
                ) : (
                  <CheckIcon className="size-3.5 text-success" />
                )}
                <span className="tabular-nums">
                  {running ? `Working · step ${Math.min(step + 1, total)} of ${total}` : `Finished · ${total} steps · 9.4s`}
                </span>
              </div>
              <p className="text-pretty leading-relaxed">
                Notably costs the most per seat but bundles{" "}
                <span className="whitespace-nowrap">
                  AI
                  <Cite label="notably.io/plans" n={2} />,
                </span>{" "}
                and paying for AI nobody used is the top reason teams left. Quillpad is the closest match on seats and still
                works{" "}
                <span className="whitespace-nowrap">
                  offline
                  <Cite label="quillpad.app/pricing" n={1} />.
                </span>
              </p>

              {haveTable ? (
                <motion.div {...enter}>
                  <div className="hidden overflow-hidden rounded-xl border @3xl:block">
                    <table className="w-full text-left">
                      <thead className="bg-muted/60 text-muted-foreground text-xs">
                        <tr>
                          <th className="px-3 py-2 font-medium">App</th>
                          <th className="px-3 py-2 text-right font-medium">Per seat</th>
                          <th className="px-3 py-2 font-medium">Seats</th>
                          <th className="px-3 py-2 font-medium">AI</th>
                          <th className="px-3 py-2 text-center font-medium">Offline</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compare.map((r) => (
                          <tr className="border-t" key={r.app}>
                            <td className="px-3 py-2 font-medium">{r.app}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{r.price}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.seats}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.ai}</td>
                            <td className="px-3 py-2">
                              {r.offline ? (
                                <CheckIcon aria-label="Yes" className="mx-auto size-4 text-success" />
                              ) : (
                                <span aria-label="No" className="block text-center text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ul className="flex flex-col divide-y rounded-xl border @3xl:hidden">
                    {compare.map((r) => (
                      <li className="flex flex-col gap-0.5 px-3 py-2.5" key={r.app}>
                        <span className="flex items-baseline justify-between">
                          <span className="font-medium">{r.app}</span>
                          <span className="tabular-nums">
                            {r.price}
                            <span className="text-muted-foreground text-xs"> / seat</span>
                          </span>
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {r.seats} seats · AI {r.ai.toLowerCase()} · {r.offline ? "works offline" : "online only"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ) : (
                <SkeletonLines label="Comparing plans" rows={3} />
              )}

              <div className="flex flex-col gap-2">
                <h3 className="font-medium text-xs">Why teams left</h3>
                {haveQuotes ? (
                  <motion.ul className="flex flex-col gap-2" {...enter}>
                    {quotes.map((q) => (
                      <li className="flex gap-3 rounded-xl bg-muted/60 px-3 py-2.5" key={q.who}>
                        <span aria-hidden className="w-0.5 shrink-0 rounded-full bg-violet-500/48" />
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="text-pretty leading-relaxed">“{q.text}”</span>
                          <span className="text-muted-foreground text-xs">
                            {q.who}{" "}
                            <Cite label="churn-interviews.md" n={4} />
                          </span>
                        </span>
                      </li>
                    ))}
                  </motion.ul>
                ) : (
                  <SkeletonLines label="Reading churn-interviews.md" rows={2} />
                )}
              </div>

              <AnimatePresence initial={false}>
                {!running && (
                  <motion.div className="flex flex-col gap-3" {...enter} exit={{ opacity: 0 }}>
                    <p className="text-pretty leading-relaxed">
                      I saved the write-up to Research. Want a one-slide version for Thursday&apos;s pricing review?
                    </p>
                    <div className="flex max-w-sm items-center gap-3 rounded-xl border bg-card p-2.5 shadow-xs/5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-info/12 text-info-foreground">
                        <FileTextIcon className="size-4" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col leading-tight">
                        <span className="truncate font-medium">Note apps: competitive scan</span>
                        <span className="text-muted-foreground text-xs tabular-nums">Doc · 412 words · 5 sources</span>
                      </span>
                      <Button size="sm" variant="outline">
                        Open
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 pb-4 @3xl:px-6">
        <form
          className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-xs/5 transition-shadow focus-within:border-ring/64 focus-within:ring-[3px] focus-within:ring-ring/16"
          onSubmit={(e) => {
            e.preventDefault();
            setDraft("");
          }}
        >
          <Button aria-label="Attach" size="icon-sm" type="button" variant="ghost">
            <PaperclipIcon />
          </Button>
          <label className="sr-only" htmlFor={composer}>
            Message
          </label>
          <textarea
            className="field-sizing-content max-h-32 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/72"
            id={composer}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={running ? "Steer the task while it works…" : "Ask a follow-up…"}
            rows={1}
            value={draft}
          />
          <Button
            aria-label="Send"
            className="rounded-full transition-transform active:scale-[0.97]"
            disabled={!draft.trim()}
            size="icon-sm"
            type="submit"
          >
            <ArrowUpIcon />
          </Button>
        </form>
      </div>
    </div>
  );
}

function ToolsTab({ calls, step }: { calls: WorkspaceToolCall[]; step: number }) {
  const [open, setOpen] = useState<string | null>(null);
  const done = Math.min(step, calls.length);
  const elapsed = calls.slice(0, done).reduce((sum, c) => sum + c.ms, 0);
  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">
              {done === calls.length ? "All steps done" : `Step ${done + 1} of ${calls.length}`}
            </span>
            <span className="text-muted-foreground tabular-nums">{(elapsed / 1000).toFixed(1)}s tool time</span>
          </div>
          <div className="flex gap-1">
            {calls.map((c, i) => (
              <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted" key={c.id}>
                <motion.span
                  animate={{ scaleX: i < done ? 1 : i === done ? 0.85 : 0 }}
                  className={cn("absolute inset-0 origin-left rounded-full", i < done ? "bg-foreground/72" : "bg-info")}
                  initial={false}
                  key={i < done ? "done" : i === done ? "run" : "queued"}
                  transition={
                    i === done ? { duration: (c.ms + 1400) / 1000, ease: [0.23, 1, 0.32, 1] } : { duration: 0.2, ease: "easeOut" }
                  }
                />
              </span>
            ))}
          </div>
        </div>
      </div>
      <ol className="relative flex flex-col">
        <span aria-hidden className="absolute top-5 bottom-5 left-[19px] w-px bg-border" />
        {calls.map((c, i) => {
          const state = i < done ? "done" : i === done ? "running" : "queued";
          const expanded = open === c.id && state === "done";
          return (
            <li className="relative" key={c.id}>
              <button
                aria-expanded={state === "done" ? expanded : undefined}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  state === "done" ? "cursor-pointer hover:bg-accent" : "cursor-default",
                )}
                disabled={state !== "done"}
                onClick={() => setOpen(expanded ? null : c.id)}
                type="button"
              >
                <span
                  className={cn(
                    "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background transition-colors",
                    state === "running" && "border-info/48 text-info",
                    state === "queued" && "border-dashed text-muted-foreground/48",
                  )}
                >
                  {state === "running" ? (
                    <LoaderCircleIcon className="size-3.5 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <c.icon className={cn("size-3.5", state === "done" && "text-muted-foreground")} />
                  )}
                </span>
                <span className={cn("flex min-w-0 flex-1 flex-col gap-0.5 transition-opacity", state === "queued" && "opacity-48")}>
                  <span className="flex items-center gap-2">
                    <span className="font-medium font-mono text-xs">{c.tool}</span>
                    <span className="ms-auto text-muted-foreground text-xs tabular-nums">
                      {state === "running" ? (
                        <span className="text-info-foreground">running</span>
                      ) : state === "done" ? (
                        `${(c.ms / 1000).toFixed(1)}s`
                      ) : (
                        "queued"
                      )}
                    </span>
                  </span>
                  <span className="truncate text-muted-foreground text-xs">{c.detail}</span>
                </span>
                <ChevronRightIcon
                  className={cn(
                    "mt-1 size-3.5 shrink-0 text-muted-foreground transition-[rotate,opacity]",
                    expanded && "rotate-90",
                    state !== "done" && "opacity-0",
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    transition={spring}
                  >
                    <div className="mb-2 ms-11 me-2 rounded-lg bg-muted px-3 py-2 font-mono text-muted-foreground text-xs">
                      → {c.output ?? "ok"}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function BrowserTab({ reading }: { reading: boolean }) {
  const reduce = useReducedMotion();
  const plans = [
    { name: "Personal", price: "$0", note: "1 seat" },
    { name: "Team", price: "$8", note: "per seat / mo" },
    { name: "Business", price: "$14", note: "per seat / mo" },
  ];
  return (
    <div className="flex h-full flex-col p-3">
      <div className="flex items-center gap-1 pb-2">
        <Button aria-label="Back" size="icon-xs" variant="ghost">
          <ArrowLeftIcon />
        </Button>
        <Button aria-label="Forward" disabled size="icon-xs" variant="ghost">
          <ArrowRightIcon />
        </Button>
        <Button aria-label="Reload" size="icon-xs" variant="ghost">
          <RotateCwIcon />
        </Button>
        <div className="ms-1 flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-full bg-muted px-3 text-xs">
          <LockIcon className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate">
            quillpad.app<span className="text-muted-foreground">/pricing</span>
          </span>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto rounded-xl border bg-background [scrollbar-width:thin]">
        <div className="flex items-center gap-2 border-b px-4 py-2.5">
          <span className="size-3.5 rounded bg-orange-500" />
          <span className="font-semibold text-xs">Quillpad</span>
          <span className="ms-auto flex gap-3 text-[10px] text-muted-foreground">
            <span>Product</span>
            <span className="text-foreground">Pricing</span>
            <span>Blog</span>
          </span>
        </div>
        <div className="px-4 pt-5 pb-4 text-center">
          <div className="font-heading font-semibold text-base">Simple plans for every notebook</div>
          <div className="mt-1 text-[11px] text-muted-foreground">Billed yearly. Cancel any time.</div>
        </div>
        <div className="relative mx-4 grid grid-cols-3 gap-2">
          {plans.map((p, i) => (
            <div className={cn("rounded-lg border p-2.5", i === 1 && "border-orange-500/40 bg-orange-500/5")} key={p.name}>
              <div className="font-medium text-[11px]">{p.name}</div>
              <div className="mt-1 font-semibold text-base tabular-nums">{p.price}</div>
              <div className="text-[10px] text-muted-foreground">{p.note}</div>
              <div className="mt-2 flex flex-col gap-1">
                {[0, 1, 2].map((k) => (
                  <span className="h-1 rounded-full bg-muted" key={k} style={{ width: `${86 - k * 18}%` }} />
                ))}
              </div>
            </div>
          ))}
          {reading && (
            <motion.span
              animate={reduce ? undefined : { opacity: [0.5, 1, 0.5] }}
              className="pointer-events-none absolute -inset-1.5 rounded-xl border-2 border-info"
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="absolute -top-2.5 left-2 rounded-full bg-info px-2 py-0.5 font-medium text-[10px] text-white">
                Reading plan table
              </span>
            </motion.span>
          )}
        </div>
        <div className="mx-4 mt-5 rounded-lg border">
          {[
            ["Offline notebooks", true, true, true],
            ["Shared spaces", false, true, true],
            ["AI writing", false, "Add-on", "Add-on"],
            ["SSO & audit log", false, false, true],
          ].map(([label, ...cells], r) => (
            <div className={cn("grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center px-2.5 py-1.5 text-[10px]", r > 0 && "border-t")} key={String(label)}>
              <span className="text-muted-foreground">{label}</span>
              {cells.map((c, k) => (
                <span className="text-center" key={k}>
                  {c === true ? (
                    <CheckIcon className="mx-auto size-3 text-success" />
                  ) : c === false ? (
                    <span className="text-muted-foreground/60">—</span>
                  ) : (
                    c
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="mx-4 mt-5 mb-4 flex flex-col gap-2">
          <div className="font-medium text-[11px]">Questions</div>
          {["Can I switch plans later?", "Do you offer student pricing?", "What happens to my notes if I cancel?"].map((q) => (
            <div className="flex items-center justify-between rounded-md bg-muted/60 px-2.5 py-1.5 text-[10px]" key={q}>
              {q}
              <PlusIcon className="size-3 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SourcesTab({ sources }: { sources: WorkspaceSource[] }) {
  const [included, setIncluded] = useState(() => sources.map((s) => s.id));
  return (
    <div className="flex flex-col gap-1 p-3">
      <p className="px-2 pb-1 text-muted-foreground text-xs">
        <span className="tabular-nums">{included.length}</span> of {sources.length} used in the answer
      </p>
      {sources.map((s, i) => {
        const on = included.includes(s.id);
        const id = `src-${s.id}`;
        return (
          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-opacity hover:bg-accent",
              !on && "opacity-56",
            )}
            htmlFor={id}
            key={s.id}
          >
            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md font-semibold text-xs tabular-nums", s.tone)}>
              {i + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{s.title}</span>
              <span className="truncate text-muted-foreground text-xs">
                {s.domain} · cited {s.cited}×
              </span>
            </span>
            <Checkbox
              checked={on}
              id={id}
              onCheckedChange={(v) => setIncluded((x) => (v ? [...x, s.id] : x.filter((y) => y !== s.id)))}
            />
          </label>
        );
      })}
      <button
        className="mt-1 flex h-10 cursor-pointer items-center gap-3 rounded-lg border border-dashed px-2 text-muted-foreground outline-none transition-transform hover:border-foreground/24 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
        type="button"
      >
        <span className="flex size-7 items-center justify-center">
          <PlusIcon className="size-4" />
        </span>
        Add a link or file
      </button>
    </div>
  );
}

function WorkPanel({
  calls,
  sources,
  step,
  onClose,
}: {
  calls: WorkspaceToolCall[];
  sources: WorkspaceSource[];
  step: number;
  onClose: () => void;
}) {
  const running = step < calls.length;
  const reading = running && calls[step]?.tool.startsWith("browser");
  const [tab, setTab] = useState("tools");
  return (
    <Tabs className="h-full min-h-0 gap-0" onValueChange={(v) => setTab(v as string)} value={tab}>
      <div className="flex h-13 shrink-0 items-center gap-2 border-b px-3">
        <TabsList className="min-w-0 overflow-x-auto text-muted-foreground [scrollbar-width:none]" size="sm">
          <TabsTab value="tools">
            <WrenchIcon />
            Tools
            <span className="text-muted-foreground text-xs tabular-nums">{calls.length}</span>
          </TabsTab>
          <TabsTab value="browser">
            <GlobeIcon />
            Browser
            {reading && <span className="size-1.5 rounded-full bg-info" />}
          </TabsTab>
          <TabsTab value="sources">
            <BookOpenIcon />
            Sources
          </TabsTab>
        </TabsList>
        <Button aria-label="Close work panel" className="ms-auto" onClick={onClose} size="icon-sm" variant="ghost">
          <XIcon />
        </Button>
      </div>
      <TabsPanel className="min-h-0 overflow-y-auto" value="tools">
        <ToolsTab calls={calls} step={step} />
      </TabsPanel>
      <TabsPanel className="min-h-0" value="browser">
        <BrowserTab reading={Boolean(reading)} />
      </TabsPanel>
      <TabsPanel className="min-h-0 overflow-y-auto" value="sources">
        <SourcesTab sources={sources} />
      </TabsPanel>
    </Tabs>
  );
}

export function SplitShell({
  tasks = defaultTasks,
  toolCalls = defaultToolCalls,
  sources = defaultSources,
  defaultPanelWidth = 380,
  minPanelWidth = 300,
  maxPanelWidth = 600,
  children,
  className,
}: SplitShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [rootWidth, setRootWidth] = useState(1280);
  const [panelOpen, setPanelOpen] = useState(true);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [width, setWidth] = useState(defaultPanelWidth);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState(3);
  const panelId = useId();
  const drag = useRef<{ x: number; w: number } | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setRootWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (drawer) drawerRef.current?.focus();
  }, [drawer]);

  useEffect(() => {
    if (step >= toolCalls.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), reduce ? 400 : (toolCalls[step]?.ms ?? 1500) + 1400);
    return () => clearTimeout(t);
  }, [step, toolCalls, reduce]);

  const docked = rootWidth >= 1024;
  const sidebarWidth = rootWidth >= 768 ? 240 : 0;
  const maxW = Math.max(minPanelWidth, Math.min(maxPanelWidth, rootWidth - sidebarWidth - 400));
  const w = Math.min(Math.max(width, minPanelWidth), maxW);
  const showPanel = docked ? panelOpen : overlayOpen;

  const clamp = useCallback((v: number) => Math.min(Math.max(v, minPanelWidth), maxW), [minPanelWidth, maxW]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, w };
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setWidth(clamp(drag.current.w + (drag.current.x - e.clientX)));
  };
  const onPointerUp = () => {
    drag.current = null;
    setDragging(false);
  };
  const onHandleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta = e.shiftKey ? 64 : 16;
    if (e.key === "ArrowLeft") setWidth(clamp(w + delta));
    else if (e.key === "ArrowRight") setWidth(clamp(w - delta));
    else if (e.key === "Home") setWidth(maxW);
    else if (e.key === "End") setWidth(minPanelWidth);
    else if (e.key === "Enter") setWidth(defaultPanelWidth);
    else return;
    e.preventDefault();
  };

  const running = step < toolCalls.length;
  const liveId = tasks.find((t) => t.state === "running")?.id;
  const liveTasks = tasks.map((t) => (t.id === liveId ? { ...t, state: running ? ("running" as const) : ("done" as const) } : t));
  const togglePanel = () => (docked ? setPanelOpen((o) => !o) : setOverlayOpen((o) => !o));

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn(
          "@container relative isolate flex h-[760px] w-full overflow-hidden bg-sidebar text-foreground text-sm",
          dragging && "cursor-col-resize select-none",
          className,
        )}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          if (drawer) setDrawer(false);
          else if (overlayOpen) setOverlayOpen(false);
        }}
        ref={rootRef}
      >
        <aside aria-label="Sidebar" className="hidden w-60 shrink-0 @3xl:block">
          <Sidebar tasks={liveTasks} />
        </aside>

        <AnimatePresence>
          {drawer && (
            <>
              <motion.div
                animate={{ opacity: 1 }}
                aria-hidden
                className="absolute inset-0 z-40 bg-black/32 @3xl:hidden"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                onClick={() => setDrawer(false)}
              />
              <motion.div
                animate={{ x: 0 }}
                aria-label="Navigation"
                aria-modal="true"
                className="absolute inset-y-0 left-0 z-50 w-72 max-w-[85%] border-e bg-sidebar outline-none @3xl:hidden"
                exit={{ x: "-100%" }}
                initial={{ x: "-100%" }}
                ref={drawerRef}
                role="dialog"
                tabIndex={-1}
                transition={spring}
              >
                <Sidebar onClose={() => setDrawer(false)} tasks={liveTasks} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex min-w-0 flex-1 @3xl:py-2 @3xl:pe-2">
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background @3xl:rounded-2xl @3xl:border @3xl:shadow-xs/5">
            <header className="flex h-13 shrink-0 items-center gap-2 border-b px-3 @3xl:px-4">
              <Button
                aria-label="Open navigation"
                className="@3xl:hidden"
                onClick={() => setDrawer(true)}
                size="icon-sm"
                variant="ghost"
              >
                <MenuIcon />
              </Button>
              <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="hidden text-muted-foreground @md:inline">Research</span>
                <ChevronRightIcon aria-hidden className="hidden size-3.5 text-muted-foreground/60 @md:inline" />
                <span aria-current="page" className="truncate font-medium">
                  Competitive scan: note apps
                </span>
              </nav>
              <Badge className="hidden gap-1.5 @lg:inline-flex" variant={running ? "info" : "success"}>
                {running ? (
                  <LoaderCircleIcon className="size-3 animate-spin motion-reduce:animate-none" />
                ) : (
                  <CheckIcon className="size-3" />
                )}
                {running ? "Running" : "Done"}
              </Badge>
              {!running && (
                <Button className="hidden @2xl:inline-flex" onClick={() => setStep(0)} size="sm" variant="ghost">
                  <RotateCwIcon />
                  Re-run
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      aria-expanded={showPanel}
                      aria-label={showPanel ? "Hide work panel" : "Show work panel"}
                      onClick={togglePanel}
                      size="icon-sm"
                      variant={showPanel ? "secondary" : "ghost"}
                    />
                  }
                >
                  <PanelRightIcon />
                </TooltipTrigger>
                <TooltipPopup>{showPanel ? "Hide work panel" : "Show work panel"}</TooltipPopup>
              </Tooltip>
            </header>
            <div className="min-h-0 flex-1">
              {children ?? <SampleThread running={running} step={step} total={toolCalls.length} />}
            </div>
          </main>

          {docked && (
            <AnimatePresence initial={false}>
              {panelOpen && (
                <motion.div
                  animate={{ width: w + 8, opacity: 1 }}
                  className="flex shrink-0 overflow-hidden"
                  exit={{ width: 0, opacity: 0 }}
                  initial={{ width: 0, opacity: 0 }}
                  transition={dragging ? { duration: 0 } : spring}
                >
                  <div
                    aria-controls={panelId}
                    aria-label="Resize work panel"
                    aria-orientation="vertical"
                    aria-valuemax={maxW}
                    aria-valuemin={minPanelWidth}
                    aria-valuenow={Math.round(w)}
                    className="group/handle relative flex w-2 shrink-0 cursor-col-resize touch-none items-center justify-center outline-none before:absolute before:inset-y-0 before:-inset-x-2"
                    onDoubleClick={() => setWidth(defaultPanelWidth)}
                    onKeyDown={onHandleKey}
                    onPointerCancel={onPointerUp}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    role="separator"
                    tabIndex={0}
                  >
                    <motion.span
                      animate={{ height: dragging ? 56 : 32 }}
                      className={cn(
                        "w-1 rounded-full bg-muted-foreground/24 transition-colors group-hover/handle:bg-muted-foreground/48 group-focus-visible/handle:bg-ring",
                        dragging && "bg-info!",
                      )}
                      transition={spring}
                    />
                  </div>
                  <section
                    aria-label="Work panel"
                    className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-background shadow-xs/5"
                    id={panelId}
                    style={{ width: w }}
                  >
                    <WorkPanel calls={toolCalls} onClose={() => setPanelOpen(false)} sources={sources} step={step} />
                    <AnimatePresence>
                      {dragging && (
                        <motion.span
                          animate={{ opacity: 1, y: 0 }}
                          className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-2 py-0.5 font-mono text-[11px] text-background tabular-nums"
                          exit={{ opacity: 0, y: 4 }}
                          initial={{ opacity: 0, y: 4 }}
                        >
                          {Math.round(w)}px
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {!docked && (
          <AnimatePresence>
            {overlayOpen && (
              <>
                <motion.div
                  animate={{ opacity: 1 }}
                  aria-hidden
                  className="absolute inset-0 z-30 bg-black/24"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  onClick={() => setOverlayOpen(false)}
                />
                <motion.section
                  animate={{ x: 0 }}
                  aria-label="Work panel"
                  className="absolute inset-y-2 right-2 z-30 flex w-[min(400px,calc(100%-1rem))] flex-col overflow-hidden rounded-2xl border bg-background shadow-lg/10"
                  exit={{ x: "110%" }}
                  initial={{ x: "110%" }}
                  transition={spring}
                >
                  <WorkPanel calls={toolCalls} onClose={() => setOverlayOpen(false)} sources={sources} step={step} />
                </motion.section>
              </>
            )}
          </AnimatePresence>
        )}
      </div>
    </MotionConfig>
  );
}
