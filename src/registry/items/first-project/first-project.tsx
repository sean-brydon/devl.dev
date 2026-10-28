"use client";

import {
  ArrowRightIcon,
  BookOpenIcon,
  BugIcon,
  FolderKanbanIcon,
  InboxIcon,
  LayersIcon,
  type LucideIcon,
  MapIcon,
  PlusIcon,
  RocketIcon,
  SearchIcon,
  SquareCheckIcon,
  UsersIcon,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  issues: number;
  tone: "violet" | "amber" | "sky" | "emerald" | "rose";
}

export interface ProjectRow {
  id: string;
  name: string;
  issues: number;
  icon: LucideIcon;
  tone?: ProjectTemplate["tone"];
  templateId?: string;
}

export interface FirstProjectProps {
  workspace?: string;
  user?: { name: string; initials: string };
  templates?: ProjectTemplate[];
  shortcut?: string;
  defaultProjects?: ProjectRow[];
  onCreate?: (template?: ProjectTemplate) => void;
  onOpenGuide?: () => void;
  className?: string;
}

const defaultTemplates: ProjectTemplate[] = [
  {
    id: "launch",
    name: "Product launch",
    description: "Milestones from beta to GA, with a launch-day checklist.",
    icon: RocketIcon,
    issues: 14,
    tone: "violet",
  },
  {
    id: "bugbash",
    name: "Bug bash",
    description: "A one-week sweep with triage, owners and a fix-by date.",
    icon: BugIcon,
    issues: 8,
    tone: "amber",
  },
  {
    id: "roadmap",
    name: "Quarterly roadmap",
    description: "Themes, bets and the issues that move each one forward.",
    icon: MapIcon,
    issues: 6,
    tone: "sky",
  },
];

const tones: Record<ProjectTemplate["tone"], string> = {
  violet: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  amber: "bg-amber-500/14 text-amber-700 dark:text-amber-300",
  sky: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  emerald: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  rose: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
};

const nav: { label: string; icon: LucideIcon; active?: boolean }[] = [
  { label: "Inbox", icon: InboxIcon },
  { label: "My issues", icon: SquareCheckIcon },
  { label: "Projects", icon: FolderKanbanIcon, active: true },
  { label: "Views", icon: LayersIcon },
  { label: "Members", icon: UsersIcon },
];

const ease = [0.23, 1, 0.32, 1] as const;
const spring = { type: "spring", stiffness: 380, damping: 34, mass: 0.9 } as const;

function Mark({ className }: { className?: string }) {
  return (
    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground", className)}>
      <svg aria-hidden className="size-4" fill="none" viewBox="0 0 28 28">
        <path d="M7 18.5 12 12l3.5 4.5 2-2.5 3.5 4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" />
      </svg>
    </span>
  );
}

function Count({ value }: { value: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-flex h-5 min-w-5 items-center justify-center overflow-hidden rounded-full bg-muted px-1.5 font-medium text-muted-foreground text-xs tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
          initial={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
          key={value}
          transition={{ duration: 0.24, ease }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 6;
  const c = 2 * Math.PI * r;
  return (
    <svg aria-hidden className="size-4 -rotate-90" viewBox="0 0 16 16">
      <circle className="stroke-border" cx="8" cy="8" fill="none" r={r} strokeWidth="2" />
      <circle className="stroke-primary" cx="8" cy="8" fill="none" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - value)} strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function FirstProject({
  workspace = "Ridgeline",
  user = { name: "Ada Lindqvist", initials: "AL" },
  templates = defaultTemplates,
  shortcut = "C",
  defaultProjects = [],
  onCreate,
  onOpenGuide,
  className,
}: FirstProjectProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const [projects, setProjects] = useState<ProjectRow[]>(defaultProjects);
  const [editing, setEditing] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const empty = projects.length === 0;
  const tileId = `${uid}-tile`;

  const create = (template?: ProjectTemplate) => {
    const id = `${template?.id ?? "blank"}-${projects.length + 1}`;
    setProjects((list) => [
      {
        id,
        name: template?.name ?? "",
        issues: template?.issues ?? 0,
        icon: template?.icon ?? FolderKanbanIcon,
        tone: template?.tone,
        templateId: empty ? template?.id : undefined,
      },
      ...list,
    ]);
    setEditing(template ? null : id);
    setFresh(id);
    onCreate?.(template);
  };

  const rename = (id: string, name: string) => {
    setProjects((list) => list.map((p) => (p.id === id ? { ...p, name: name.trim() || "Untitled project" } : p)));
    setEditing(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if ((e.target as HTMLElement).closest("input, textarea, [contenteditable=true]")) return;
    if (e.key.toLowerCase() !== shortcut.toLowerCase()) return;
    e.preventDefault();
    create();
  };

  const layout = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 300, damping: 30 };

  return (
    <div
      className={cn("flex h-150 w-full max-w-275 overflow-hidden rounded-2xl border bg-sidebar p-2 text-foreground shadow-xs/5 outline-none", className)}
      onKeyDown={onKeyDown}
      tabIndex={-1}
    >
      <aside className="hidden w-52 shrink-0 flex-col gap-5 px-2 py-2 md:flex">
        <div className="flex items-center gap-2 px-1">
          <Mark />
          <span className="truncate font-semibold text-sm">{workspace}</span>
        </div>
        <nav aria-label="Workspace" className="flex flex-col gap-0.5">
          {nav.map(({ label, icon: Icon, active }) => (
            <span
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-lg px-2 text-sm",
                active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground",
              )}
              key={label}
            >
              <Icon aria-hidden className="size-4 opacity-80" />
              {label}
            </span>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2 px-1">
          <span className="flex size-6 items-center justify-center rounded-full bg-violet-500/15 font-medium text-[0.625rem] text-violet-700 dark:text-violet-300">
            {user.initials}
          </span>
          <span className="truncate text-sidebar-foreground text-sm">{user.name}</span>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
          <Mark className="md:hidden" />
          <h1 className="font-semibold text-sm">Projects</h1>
          <Count value={projects.length} />
          <div className="ms-auto flex items-center gap-1">
            <Button aria-label="Search projects" size="icon-sm" variant="ghost">
              <SearchIcon />
            </Button>
            <Button onClick={() => create()} size="sm" variant="outline">
              <PlusIcon />
              New project
            </Button>
          </div>
        </header>

        <LayoutGroup id={uid}>
          <div className="relative grid min-h-0 flex-1 overflow-y-auto">
            <AnimatePresence initial={false}>
              {empty ? (
                <motion.div
                  className="col-start-1 row-start-1 flex flex-col items-center justify-center px-4 py-10 text-center sm:px-6"
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                  key="empty"
                  transition={{ duration: 0.2, ease }}
                >
                  <motion.div
                    className="flex size-10 items-center justify-center rounded-xl border bg-card shadow-xs/5"
                    layoutId={tileId}
                    transition={layout}
                  >
                    <FolderKanbanIcon aria-hidden className="size-5" />
                  </motion.div>
                  <h2 className="mt-4 text-balance font-semibold text-lg">Plan your first project</h2>
                  <p className="mt-1.5 max-w-104 text-pretty text-muted-foreground text-sm">
                    Projects group issues around one outcome, like a launch or a migration, so the team can see what is left and when it ships.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <Button className="active:scale-[0.97]" onClick={() => create()}>
                      <PlusIcon />
                      Create project
                      <Kbd className="-me-1 bg-primary-foreground/16 text-primary-foreground max-sm:hidden">{shortcut.toUpperCase()}</Kbd>
                    </Button>
                    <Button className="active:scale-[0.97]" onClick={onOpenGuide} variant="outline">
                      <BookOpenIcon />
                      Read the guide
                    </Button>
                  </div>

                  <div className="mt-10 w-full max-w-160">
                    <div className="flex items-center gap-3 text-muted-foreground text-xs">
                      <span className="h-px flex-1 bg-border" />
                      Or start from a template
                      <span className="h-px flex-1 bg-border" />
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {templates.map((t) => (
                        <button
                          className="group flex items-center gap-2.5 rounded-xl sm:flex-col sm:items-stretch border bg-card p-3 text-left shadow-xs/5 outline-none transition-[background-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] [@media(hover:hover)]:hover:bg-accent/50"
                          key={t.id}
                          onClick={() => create(t)}
                          type="button"
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
                            <motion.span
                              className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", tones[t.tone])}
                              layoutId={`${uid}-tpl-${t.id}`}
                              transition={layout}
                            >
                              <t.icon aria-hidden className="size-4" />
                            </motion.span>
                            <span className="truncate font-medium text-sm">{t.name}</span>
                          </span>
                          <span className="line-clamp-2 text-muted-foreground text-xs max-sm:hidden">{t.description}</span>
                          <span className="flex shrink-0 items-center justify-between gap-2 text-muted-foreground text-xs tabular-nums sm:mt-auto">
                            {t.issues} issues
                            <ArrowRightIcon
                              aria-hidden
                              className="size-3.5 opacity-0 transition-[opacity,translate] duration-150 group-focus-visible:opacity-100 [@media(hover:hover)]:group-hover:translate-x-0.5 [@media(hover:hover)]:group-hover:opacity-100"
                            />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  animate={{ opacity: 1 }}
                  className="col-start-1 row-start-1 flex flex-col self-start"
                  initial={{ opacity: 0 }}
                  key="list"
                  transition={{ duration: 0.2, ease }}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b px-4 py-2 text-muted-foreground text-xs sm:grid-cols-[minmax(0,1fr)_6rem_6rem_5rem]">
                    <span>Name</span>
                    <span className="hidden sm:block">Lead</span>
                    <span className="hidden sm:block">Issues</span>
                    <span>Progress</span>
                  </div>
                  <ul aria-label="Projects">
                    <AnimatePresence initial={false}>
                      {projects.map((p, i) => {
                        const fromTile = i === projects.length - 1;
                        const id = p.templateId ? `${uid}-tpl-${p.templateId}` : fromTile ? tileId : undefined;
                        return (
                          <motion.li
                            animate={{ opacity: 1, y: 0 }}
                            className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_5rem]"
                            initial={reduce || id ? { opacity: id ? 1 : 0 } : { opacity: 0, y: -8 }}
                            key={p.id}
                            layout={reduce ? false : "position"}
                            transition={spring}
                          >
                            {fresh === p.id && (
                              <motion.span
                                animate={{ opacity: 0 }}
                                aria-hidden
                                className="pointer-events-none absolute inset-0 bg-accent"
                                initial={{ opacity: 1 }}
                                transition={{ duration: 1.2, delay: 0.25, ease: "easeOut" }}
                              />
                            )}
                            <span className="relative flex min-w-0 items-center gap-2.5">
                              <motion.span
                                className={cn(
                                  "flex size-7 shrink-0 items-center justify-center rounded-lg",
                                  p.tone ? tones[p.tone] : "border bg-card shadow-xs/5",
                                )}
                                layoutId={id}
                                transition={layout}
                              >
                                <p.icon aria-hidden className="size-4" />
                              </motion.span>
                              {editing === p.id ? (
                                <input
                                  aria-label="Project name"
                                  autoFocus
                                  className="h-7 min-w-0 flex-1 rounded-md bg-transparent px-1.5 -mx-1.5 font-medium text-sm outline-none ring-ring/40 placeholder:text-muted-foreground/72 focus-visible:ring-2"
                                  onBlur={(e) => rename(p.id, e.currentTarget.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
                                  }}
                                  placeholder="Name your project"
                                />
                              ) : (
                                <span className="truncate font-medium text-sm">{p.name || "Untitled project"}</span>
                              )}
                            </span>
                            <span className="relative hidden items-center gap-2 text-sm sm:flex">
                              <span className="flex size-5 items-center justify-center rounded-full bg-violet-500/15 font-medium text-[0.5625rem] text-violet-700 dark:text-violet-300">
                                {user.initials}
                              </span>
                              <span className="truncate text-muted-foreground">{user.name.split(" ")[0]}</span>
                            </span>
                            <span className="relative hidden text-muted-foreground text-sm tabular-nums sm:block">{p.issues}</span>
                            <span className="relative flex items-center gap-1.5 text-muted-foreground text-sm tabular-nums">
                              <ProgressRing value={0} />
                              0%
                            </span>
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ul>
                  <AnimatePresence>
                    {projects.length === 1 && (
                      <motion.p
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-wrap items-center gap-1.5 px-4 py-3 text-muted-foreground text-xs"
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0, y: reduce ? 0 : 4 }}
                        transition={{ duration: 0.24, delay: 0.3, ease }}
                      >
                        Next, add issues to it, or press <Kbd>{shortcut.toUpperCase()}</Kbd> for another project.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      </section>
    </div>
  );
}
