"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import {
  ArrowDownUpIcon,
  ChevronsUpDownIcon,
  ClockIcon,
  CloudUploadIcon,
  HouseIcon,
  LayoutGridIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  Trash2Icon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { cn } from "@/lib/utils";

export type FolderTone = "orange" | "yellow" | "lime" | "teal" | "blue" | "violet" | "rose" | "slate" | "neutral";

export interface FileFolder {
  id: string;
  name: string;
  files: number;
  sizeMb: number;
  tone: FolderTone;
  editedMinutesAgo: number;
  members: string[];
  shared?: boolean;
  starred?: boolean;
}

export interface FileTemplate {
  id: string;
  name: string;
  kind: "doc" | "brief" | "sheet" | "roadmap" | "board" | "moodboard";
}

export interface DriveProps {
  title?: string;
  folders?: FileFolder[];
  templates?: FileTemplate[];
  usedGb?: number;
  totalGb?: number;
  defaultView?: "grid" | "list";
  workspace?: string;
  onOpenFolder?: (folder: FileFolder) => void;
  className?: string;
}

const tone: Record<FolderTone, string> = {
  orange: "text-orange-500 dark:text-orange-400",
  yellow: "text-amber-500 dark:text-amber-400",
  lime: "text-lime-600",
  teal: "text-teal-600 dark:text-teal-500",
  blue: "text-blue-500 dark:text-blue-400",
  violet: "text-violet-500 dark:text-violet-400",
  rose: "text-rose-500 dark:text-rose-400",
  slate: "text-slate-500 dark:text-slate-400",
  neutral: "text-muted-foreground/64",
};

const memberTone: Record<string, string> = {
  AK: "bg-orange-500/16 text-orange-700 dark:text-orange-300",
  JS: "bg-teal-500/16 text-teal-700 dark:text-teal-300",
  MV: "bg-blue-500/16 text-blue-700 dark:text-blue-300",
  LO: "bg-violet-500/18 text-violet-700 dark:text-violet-300",
  RB: "bg-rose-500/16 text-rose-700 dark:text-rose-300",
};

const spring = { type: "spring", stiffness: 380, damping: 34 } as const;

const defaultFolders: FileFolder[] = [
  { id: "brand", name: "Brand refresh", files: 128, sizeMb: 2380, tone: "orange", editedMinutesAgo: 12, members: ["AK", "JS", "MV"], shared: true, starred: true },
  { id: "research", name: "User research", files: 64, sizeMb: 912, tone: "teal", editedMinutesAgo: 95, members: ["LO", "JS"], shared: true },
  { id: "finance", name: "Finance 2026", files: 37, sizeMb: 48, tone: "lime", editedMinutesAgo: 1440, members: ["RB"] },
  { id: "launch", name: "Orbit 3 launch", files: 211, sizeMb: 5120, tone: "rose", editedMinutesAgo: 30, members: ["AK", "MV", "LO", "RB"], shared: true, starred: true },
  { id: "legal", name: "Contracts", files: 19, sizeMb: 22, tone: "slate", editedMinutesAgo: 8640, members: ["RB", "AK"] },
  { id: "hiring", name: "Hiring loop", files: 42, sizeMb: 156, tone: "violet", editedMinutesAgo: 300, members: ["JS", "LO"], shared: true },
  { id: "offsite", name: "Offsite photos", files: 486, sizeMb: 14200, tone: "yellow", editedMinutesAgo: 20160, members: ["MV"] },
  { id: "eng", name: "Engineering RFCs", files: 73, sizeMb: 31, tone: "blue", editedMinutesAgo: 180, members: ["AK", "JS"], starred: true },
];

const defaultTemplates: FileTemplate[] = [
  { id: "notes", name: "Meeting notes", kind: "doc" },
  { id: "brief", name: "Project brief", kind: "brief" },
  { id: "budget", name: "Budget", kind: "sheet" },
  { id: "roadmap", name: "Roadmap", kind: "roadmap" },
  { id: "retro", name: "Retro board", kind: "board" },
  { id: "mood", name: "Moodboard", kind: "moodboard" },
];

function formatSize(mb: number) {
  return mb >= 1000 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

function formatAgo(min: number) {
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  if (min < 1440) return `${Math.round(min / 60)}h ago`;
  if (min < 10080) return `${Math.round(min / 1440)}d ago`;
  return `${Math.round(min / 10080)}w ago`;
}

function FolderGlyph({ folderTone, className, layoutId }: { folderTone: FolderTone; className?: string; layoutId?: string }) {
  return (
    <motion.span aria-hidden className={cn("relative block shrink-0", tone[folderTone], className)} layoutId={layoutId} transition={spring}>
      <svg className="absolute inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 16">
        <path d="M0 2.5A2.5 2.5 0 0 1 2.5 0h4.3a2 2 0 0 1 1.5.7L9.6 2.2h7.9A2.5 2.5 0 0 1 20 4.7v8.8a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 0 13.5Z" fill="currentColor" opacity="0.45" />
        <path d="M0 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7.5a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 0 13.5Z" fill="currentColor" />
      </svg>
    </motion.span>
  );
}

function TemplatePreview({ kind }: { kind: FileTemplate["kind"] }) {
  const line = "h-[3px] rounded-full bg-foreground/12";
  switch (kind) {
    case "doc":
      return (
        <span className="flex flex-col gap-1">
          <span className="h-1 w-2/3 rounded-full bg-foreground/40" />
          {[92, 80, 86].map((w) => (
            <span className={line} key={w} style={{ width: `${w}%` }} />
          ))}
        </span>
      );
    case "brief":
      return (
        <span className="flex flex-col gap-1">
          <span className="h-2.5 w-full rounded-[calc(var(--radius)*0.3)] bg-orange-500/20" />
          <span className="h-1 w-1/2 rounded-full bg-foreground/40" />
          <span className={line} style={{ width: "80%" }} />
        </span>
      );
    case "sheet":
      return (
        <span className="grid grid-cols-4 gap-px overflow-hidden rounded-[calc(var(--radius)*0.3)]">
          {Array.from({ length: 12 }, (_, i) => (
            <span className={cn("h-1.5", i < 4 ? "bg-foreground/20" : i === 6 ? "bg-emerald-500/40" : "bg-foreground/8")} key={i} />
          ))}
        </span>
      );
    case "roadmap":
      return (
        <span className="flex flex-col gap-1">
          {[
            [0, 50, "bg-blue-500/40"],
            [24, 48, "bg-teal-500/40"],
            [50, 44, "bg-violet-500/40"],
          ].map(([l, w, c]) => (
            <span className={cn("h-1.5 rounded-full", c as string)} key={String(c)} style={{ marginLeft: `${l}%`, width: `${w}%` }} />
          ))}
        </span>
      );
    case "board":
      return (
        <span className="grid grid-cols-3 gap-1">
          {["bg-amber-400/40", "bg-teal-500/30", "bg-violet-500/30", "bg-violet-500/30", "bg-amber-400/40", "bg-foreground/10"].map((c, i) => (
            <span className={cn("h-2 rounded-[calc(var(--radius)*0.2)]", c)} key={i} />
          ))}
        </span>
      );
    case "moodboard":
      return (
        <span className="grid h-full grid-cols-3 grid-rows-2 gap-0.5">
          <span className="row-span-2 rounded-[calc(var(--radius)*0.2)] bg-linear-to-b from-amber-400/60 to-rose-500/50" />
          <span className="rounded-[calc(var(--radius)*0.2)] bg-teal-500/40" />
          <span className="rounded-[calc(var(--radius)*0.2)] bg-foreground/16" />
          <span className="col-span-2 rounded-[calc(var(--radius)*0.2)] bg-blue-500/30" />
        </span>
      );
  }
}

function Members({ ids }: { ids: string[] }) {
  if (ids.length === 0) return <span className="text-muted-foreground text-xs">Only you</span>;
  return (
    <span className="flex -space-x-1">
      {ids.slice(0, 3).map((m) => (
        <Avatar className="size-5 bg-card ring-2 ring-card" key={m}>
          <AvatarFallback className={cn("font-medium text-[8px]", memberTone[m] ?? "bg-muted")}>{m}</AvatarFallback>
        </Avatar>
      ))}
      {ids.length > 3 && (
        <span className="flex size-5 items-center justify-center rounded-full bg-muted font-medium text-[8px] text-muted-foreground ring-2 ring-card tabular-nums">
          +{ids.length - 3}
        </span>
      )}
    </span>
  );
}

type SortKey = "name" | "edited" | "size" | "files";
type Tab = "all" | "recent" | "shared" | "starred";

function useThemeRadius(scale: number) {
  const probe = useRef<HTMLSpanElement>(null);
  const [radius, setRadius] = useState(scale * 10);
  useLayoutEffect(() => {
    const el = probe.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setRadius(el.offsetWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const marker = (
    <span
      aria-hidden
      className="pointer-events-none invisible absolute h-0"
      ref={probe}
      style={{ width: `calc(var(--radius) * ${scale})` }}
    />
  );
  return [radius, marker] as const;
}

export function Drive({
  title = "Files",
  folders: initialFolders = defaultFolders,
  templates = defaultTemplates,
  usedGb = 42.6,
  totalGb = 100,
  defaultView = "grid",
  workspace = "Northwind",
  onOpenFolder,
  className,
}: DriveProps) {
  const [radius, radiusProbe] = useThemeRadius(1.2);
  const [folders, setFolders] = useState(initialFolders);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("edited");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState(defaultView);
  const [created, setCreated] = useState<string | null>(null);
  const group = useId();

  useEffect(() => {
    if (!created) return;
    const t = setTimeout(() => setCreated(null), 2800);
    return () => clearTimeout(t);
  }, [created]);

  const tabs = [
    { id: "all", label: "All files", icon: HouseIcon, count: folders.length },
    { id: "recent", label: "Recent", icon: ClockIcon, count: folders.filter((f) => f.editedMinutesAgo < 1440).length },
    { id: "shared", label: "Shared", icon: UsersRoundIcon, count: folders.filter((f) => f.shared).length },
    { id: "starred", label: "Starred", icon: StarIcon, count: folders.filter((f) => f.starred).length },
  ] as const;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = folders.filter((f) => {
      if (tab === "recent" && f.editedMinutesAgo >= 1440) return false;
      if (tab === "shared" && !f.shared) return false;
      if (tab === "starred" && !f.starred) return false;
      return !q || f.name.toLowerCase().includes(q);
    });
    const by: Record<SortKey, (a: FileFolder, b: FileFolder) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      edited: (a, b) => b.editedMinutesAgo - a.editedMinutesAgo,
      size: (a, b) => a.sizeMb - b.sizeMb,
      files: (a, b) => a.files - b.files,
    };
    const sorted = [...list].sort(by[sort]);
    return dir === "desc" ? sorted.reverse() : sorted;
  }, [folders, tab, query, sort, dir]);

  const newFolder = () => {
    const n = folders.filter((f) => f.id.startsWith("new-")).length + 1;
    const name = n === 1 ? "Untitled folder" : `Untitled folder ${n}`;
    setFolders((fs) => [{ id: `new-${n}`, name, files: 0, sizeMb: 0, tone: "neutral", editedMinutesAgo: 0, members: [] }, ...fs]);
    setTab("all");
    setQuery("");
    setCreated(name);
  };
  const toggleStar = (id: string) => setFolders((fs) => fs.map((f) => (f.id === id ? { ...f, starred: !f.starred } : f)));
  const sortLabel = { name: "Name", edited: "Last edited", size: "Size", files: "File count" }[sort];
  const usedPct = Math.min(100, (usedGb / totalGb) * 100);
  const grid = view === "grid";
  const heading = tab === "all" ? title : tabs.find((t) => t.id === tab)?.label;
  const starred = folders.filter((f) => f.starred);

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn("@container relative flex h-[760px] w-full overflow-hidden bg-background text-foreground text-sm", className)}>
        <aside className="hidden w-56 shrink-0 flex-col border-r bg-muted/30 px-3 py-3 @3xl:flex">
          <button
            className="flex h-9 cursor-pointer items-center gap-2 rounded-lg px-1.5 text-left outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <svg aria-hidden className="size-3.5" fill="none" viewBox="0 0 16 16">
                <path d="M2 9.5c2 2.7 10 2.7 12 0" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                <path d="M4 5h8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{workspace}</span>
            <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
          </button>

          <LayoutGroup id={`${group}-nav`}>
            <nav aria-label="Drive" className="mt-4 flex flex-col gap-px">
              {tabs.map((t) => {
                const on = tab === t.id;
                return (
                  <button
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "relative flex h-8 cursor-pointer items-center gap-2.5 rounded-md px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      on ? "font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    type="button"
                  >
                    {on && <motion.span className="absolute inset-0 rounded-md bg-accent" layoutId={`${group}-nav-on`} transition={spring} />}
                    <t.icon className="relative size-4 shrink-0 opacity-80" />
                    <span className="relative flex-1 truncate">{t.label}</span>
                    <span className="relative text-muted-foreground text-xs tabular-nums">{t.count}</span>
                  </button>
                );
              })}
              <button
                className="flex h-8 cursor-pointer items-center gap-2.5 rounded-md px-2 text-left text-muted-foreground outline-none hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                type="button"
              >
                <Trash2Icon className="size-4 shrink-0 opacity-80" />
                Trash
              </button>
            </nav>
          </LayoutGroup>

          {starred.length > 0 && (
            <div className="mt-6">
              <p className="px-2 pb-1.5 font-medium text-muted-foreground text-xs">Quick access</p>
              <ul className="flex flex-col gap-px">
                <AnimatePresence initial={false}>
                  {starred.map((f) => (
                    <motion.li
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      initial={{ opacity: 0, height: 0 }}
                      key={f.id}
                      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                    >
                      <button
                        className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 text-left text-muted-foreground outline-none hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => onOpenFolder?.(f)}
                        type="button"
                      >
                        <FolderGlyph className="h-3 w-3.5" folderTone={f.tone} />
                        <span className="truncate">{f.name}</span>
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          )}

          <div className="mt-auto rounded-lg px-2 pt-4 pb-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium">Storage</span>
              <span className="text-muted-foreground tabular-nums">{Math.round(usedPct)}%</span>
            </div>
            <span className="relative mt-2 block h-1 overflow-hidden rounded-full bg-foreground/8">
              <motion.span
                animate={{ scaleX: usedPct / 100 }}
                className="absolute inset-0 origin-left rounded-full bg-foreground/72"
                initial={{ scaleX: 0 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
              />
            </span>
            <p className="mt-2 text-muted-foreground text-xs tabular-nums">
              {usedGb} GB of {totalGb} GB used
            </p>
            <button className="mt-1 cursor-pointer rounded-sm font-medium text-xs outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring" type="button">
              Get more space
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 @3xl:px-6">
            <InputGroup className="max-w-md flex-1">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput aria-label="Search folders" onChange={(e) => setQuery(e.target.value)} placeholder="Search folders" value={query} />
              <InputGroupAddon align="inline-end">
                {query ? (
                  <Button aria-label="Clear search" onClick={() => setQuery("")} size="icon-xs" variant="ghost">
                    <XIcon />
                  </Button>
                ) : (
                  <Kbd className="hidden @md:inline-flex">/</Kbd>
                )}
              </InputGroupAddon>
            </InputGroup>
            <div className="ms-auto flex items-center gap-2">
              <Button aria-label="Upload" onClick={() => setCreated("Upload started")} variant="outline">
                <CloudUploadIcon />
                <span className="hidden @lg:inline">Upload</span>
              </Button>
              <Button aria-label="New folder" onClick={newFolder}>
                <PlusIcon />
                <span className="hidden @lg:inline">New folder</span>
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-6xl flex-col px-4 pt-6 pb-12 @3xl:px-8 @3xl:pt-8">
              <h1 className="font-heading font-semibold text-2xl tracking-tight">{heading}</h1>

              <LayoutGroup id={`${group}-pills`}>
                <div className="-mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] @3xl:hidden" role="tablist">
                  {tabs.map((t) => (
                    <button
                      aria-selected={tab === t.id}
                      className={cn(
                        "relative flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 font-medium text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        tab === t.id ? "border-transparent text-background" : "text-muted-foreground",
                      )}
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      role="tab"
                      type="button"
                    >
                      {tab === t.id && <motion.span className="absolute inset-0 rounded-full bg-foreground" layoutId={`${group}-pill`} transition={spring} />}
                      <span className="relative">{t.label}</span>
                      <span className="relative tabular-nums opacity-64">{t.count}</span>
                    </button>
                  ))}
                </div>
              </LayoutGroup>

              {tab === "all" && !query && templates.length > 0 && (
                <section aria-labelledby={`${group}-tpl`} className="mt-6">
                  <div className="flex h-8 items-center justify-between">
                    <h2 className="font-medium" id={`${group}-tpl`}>
                      Start something new
                    </h2>
                    <Button className="-me-2 text-muted-foreground" size="xs" variant="ghost">
                      All templates
                    </Button>
                  </div>
                  <div className="-mx-4 mt-2 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] @6xl:mx-0 @6xl:grid @6xl:grid-cols-[auto_repeat(5,minmax(0,1fr))] @6xl:px-0 @6xl:[&>*:nth-child(n+7)]:hidden">
                    <button
                      className="group/tpl flex h-14 w-28 shrink-0 snap-start cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 text-left text-muted-foreground outline-none transition-[background-color,color,scale] duration-150 ease-out hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] @6xl:w-auto @6xl:pe-5"
                      onClick={() => setCreated("Untitled doc")}
                      type="button"
                    >
                      <span className="flex h-9 w-8 shrink-0 items-center justify-center">
                        <PlusIcon className="size-4" />
                      </span>
                      <span className="truncate font-medium">Blank</span>
                    </button>
                    {templates.map((t) => (
                      <button
                        className="flex h-14 w-44 shrink-0 snap-start cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 text-left outline-none transition-[border-color,box-shadow,scale] duration-150 ease-out hover:border-foreground/16 hover:shadow-xs/5 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] @6xl:w-auto"
                        key={t.id}
                        onClick={() => setCreated(t.name)}
                        type="button"
                      >
                        <span className="flex h-9 w-8 shrink-0 flex-col justify-center overflow-hidden rounded-[calc(var(--radius)*0.5)] border bg-background p-1">
                          <TemplatePreview kind={t.kind} />
                        </span>
                        <span className="truncate font-medium">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section aria-labelledby={`${group}-folders-h`} className="mt-8">
                <div className="flex h-8 items-center gap-2">
                  <h2 className="font-medium" id={`${group}-folders-h`}>
                    Folders
                  </h2>
                  <span className="text-muted-foreground text-xs tabular-nums">{visible.length}</span>
                  <div className="ms-auto flex items-center gap-1">
                    <Menu>
                      <MenuTrigger render={<Button aria-label={`Sort by ${sortLabel}`} className="text-muted-foreground" size="sm" variant="ghost" />}>
                        <ArrowDownUpIcon />
                        <span className="hidden @md:inline">{sortLabel}</span>
                      </MenuTrigger>
                      <MenuPopup align="end" className="w-48">
                        <MenuGroup>
                          <MenuGroupLabel>Sort by</MenuGroupLabel>
                          <MenuRadioGroup onValueChange={(v) => setSort(v as SortKey)} value={sort}>
                            <MenuRadioItem value="name">Name</MenuRadioItem>
                            <MenuRadioItem value="edited">Last edited</MenuRadioItem>
                            <MenuRadioItem value="size">Size</MenuRadioItem>
                            <MenuRadioItem value="files">File count</MenuRadioItem>
                          </MenuRadioGroup>
                        </MenuGroup>
                        <MenuSeparator />
                        <MenuGroup>
                          <MenuGroupLabel>Order</MenuGroupLabel>
                          <MenuRadioGroup onValueChange={(v) => setDir(v as "asc" | "desc")} value={dir}>
                            <MenuRadioItem value="asc">{sort === "name" ? "A to Z" : sort === "edited" ? "Oldest first" : "Smallest first"}</MenuRadioItem>
                            <MenuRadioItem value="desc">{sort === "name" ? "Z to A" : sort === "edited" ? "Newest first" : "Largest first"}</MenuRadioItem>
                          </MenuRadioGroup>
                        </MenuGroup>
                      </MenuPopup>
                    </Menu>
                    <LayoutGroup id={`${group}-view`}>
                      <div aria-label="Layout" className="flex rounded-lg bg-muted p-0.5" role="radiogroup">
                        {(
                          [
                            ["grid", LayoutGridIcon, "Grid"],
                            ["list", ListIcon, "List"],
                          ] as const
                        ).map(([v, Icon, label]) => (
                          <button
                            aria-checked={view === v}
                            aria-label={`${label} view`}
                            className={cn(
                              "relative flex size-7 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              view === v ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                            )}
                            key={v}
                            onClick={() => setView(v)}
                            role="radio"
                            type="button"
                          >
                            {view === v && (
                              <motion.span className="absolute inset-0 rounded-md bg-background shadow-xs/5 dark:bg-input" layoutId={`${group}-view-on`} transition={spring} />
                            )}
                            <Icon className="relative size-3.5" />
                          </button>
                        ))}
                      </div>
                    </LayoutGroup>
                  </div>
                </div>

                <LayoutGroup id={`${group}-folders`}>
                  <motion.div
                    className={cn("mt-3", !grid && "overflow-hidden rounded-xl border bg-card")}
                    layout
                    style={{ borderRadius: radius }}
                    transition={spring}
                  >
                    {radiusProbe}
                    {!grid && visible.length > 0 && (
                      <div className="hidden h-9 grid-cols-[minmax(0,1fr)_7rem_6rem_6rem_2.5rem] items-center gap-4 border-b bg-muted/40 ps-4 pe-2 font-medium text-muted-foreground text-xs @2xl:grid">
                        <span>Name</span>
                        <span>Shared with</span>
                        <span>Edited</span>
                        <span className="text-end">Size</span>
                        <span />
                      </div>
                    )}
                    <ul className={cn(grid ? "grid grid-cols-2 gap-3 @2xl:grid-cols-3 @5xl:grid-cols-4" : "flex flex-col")}>
                      <AnimatePresence mode="popLayout">
                        {visible.map((f, i) => (
                          <motion.li
                            animate={{ opacity: 1, scale: 1 }}
                            className={cn(
                              "group/folder relative transition-[background-color,border-color,scale] duration-150 ease-out has-[>[data-hit]:active]:scale-[0.985]",
                              grid ? "rounded-xl border bg-card hover:border-foreground/16" : cn("hover:bg-accent/40", i > 0 && "border-t"),
                            )}
                            exit={{ opacity: 0, scale: 0.96 }}
                            initial={{ opacity: 0, scale: 0.96 }}
                            key={f.id}
                            layout
                            style={{ borderRadius: grid ? radius : 0 }}
                            transition={spring}
                          >
                            <button
                              aria-label={`Open ${f.name}`}
                              className="absolute inset-0 z-0 cursor-pointer rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                              data-hit=""
                              onClick={() => onOpenFolder?.(f)}
                              type="button"
                            />
                            {grid ? (
                              <motion.div
                                animate={{ opacity: 1 }}
                                className="pointer-events-none relative flex flex-col p-3.5"
                                initial={{ opacity: 0 }}
                                key="grid"
                                layout="position"
                                transition={{ opacity: { duration: 0.2, delay: 0.06 }, layout: spring }}
                              >
                                <FolderGlyph className="h-6 w-7.5" folderTone={f.tone} layoutId={`${group}-glyph-${f.id}`} />
                                <span className="mt-5 truncate pe-6 font-medium">{f.name}</span>
                                <span className="mt-0.5 text-muted-foreground text-xs tabular-nums">
                                  {f.files === 0 ? "No files yet" : `${f.files} files · ${formatSize(f.sizeMb)}`}
                                </span>
                                <div className="mt-4 flex h-5 items-center justify-between">
                                  <Members ids={f.members} />
                                  <span className="text-muted-foreground text-xs tabular-nums">{formatAgo(f.editedMinutesAgo)}</span>
                                </div>
                              </motion.div>
                            ) : (
                              <motion.div
                                animate={{ opacity: 1 }}
                                className="pointer-events-none relative grid h-13 grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-4 ps-4 pe-2 @2xl:grid-cols-[minmax(0,1fr)_7rem_6rem_6rem_2.5rem]"
                                initial={{ opacity: 0 }}
                                key="list"
                                layout="position"
                                transition={{ opacity: { duration: 0.2, delay: 0.06 }, layout: spring }}
                              >
                                <span className="flex min-w-0 items-center gap-3">
                                  <FolderGlyph className="h-4 w-5" folderTone={f.tone} layoutId={`${group}-glyph-${f.id}`} />
                                  <span className="flex min-w-0 flex-col">
                                    <span className="truncate font-medium">{f.name}</span>
                                    <span className="text-muted-foreground text-xs tabular-nums @2xl:hidden">
                                      {f.files === 0 ? "No files yet" : `${f.files} files · ${formatSize(f.sizeMb)}`}
                                    </span>
                                  </span>
                                </span>
                                <span className="hidden @2xl:block">
                                  <Members ids={f.members} />
                                </span>
                                <span className="hidden text-muted-foreground tabular-nums @2xl:block">{formatAgo(f.editedMinutesAgo)}</span>
                                <span className="hidden text-end text-muted-foreground tabular-nums @2xl:block">{f.sizeMb ? formatSize(f.sizeMb) : "—"}</span>
                              </motion.div>
                            )}
                            <motion.button
                              aria-label={f.starred ? `Unstar ${f.name}` : `Star ${f.name}`}
                              aria-pressed={Boolean(f.starred)}
                              className={cn(
                                "absolute z-10 flex size-8 cursor-pointer items-center justify-center rounded-md outline-none transition-opacity hover:bg-accent focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring",
                                grid ? "top-2 right-2" : "top-2.5 right-2",
                                f.starred ? "text-amber-500 opacity-100 dark:text-amber-400" : "text-muted-foreground opacity-0 group-hover/folder:opacity-100 pointer-coarse:opacity-100",
                              )}
                              layout="position"
                              onClick={() => toggleStar(f.id)}
                              transition={spring}
                              type="button"
                            >
                              <motion.span animate={{ scale: f.starred ? [1, 1.25, 1] : 1 }} transition={{ duration: 0.28 }}>
                                <StarIcon className={cn("size-4", f.starred && "fill-current")} />
                              </motion.span>
                            </motion.button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  </motion.div>
                  {visible.length === 0 && (
                    <div className="mt-3 flex flex-col items-center gap-1 rounded-xl border border-dashed py-14 text-center">
                      <SearchIcon className="mb-2 size-5 text-muted-foreground" />
                      <span className="font-medium">No folders match</span>
                      <span className="text-muted-foreground text-xs">
                        {query ? `Nothing called “${query.trim()}”` : "Nothing here yet"}
                        {tab !== "all" && ` in ${tabs.find((t) => t.id === tab)?.label}`}.
                      </span>
                      <Button
                        className="mt-3"
                        onClick={() => {
                          setQuery("");
                          setTab("all");
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Show all files
                      </Button>
                    </div>
                  )}
                </LayoutGroup>
              </section>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {created && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-x-4 bottom-4 z-20 mx-auto flex max-w-xs items-center gap-3 rounded-xl border bg-popover py-1.5 ps-3.5 pe-1.5 shadow-lg/10"
              exit={{ opacity: 0, y: 12 }}
              initial={{ opacity: 0, y: 12 }}
              role="status"
              transition={spring}
            >
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{created}</span>
                {created !== "Upload started" && " created"}
              </span>
              <Button onClick={() => setCreated(null)} size="xs" variant="ghost">
                {created === "Upload started" ? "Dismiss" : "Open"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
