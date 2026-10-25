"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import {
  ArrowDownUpIcon,
  CloudUploadIcon,
  LayoutGridIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
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
  onOpenFolder?: (folder: FileFolder) => void;
  className?: string;
}

const tone: Record<FolderTone, string> = {
  orange: "text-orange-600 dark:text-orange-500",
  yellow: "text-yellow-500 dark:text-yellow-400",
  lime: "text-lime-600 dark:text-lime-500",
  teal: "text-teal-600 dark:text-teal-500",
  blue: "text-blue-600 dark:text-blue-500",
  violet: "text-violet-600 dark:text-violet-500",
  rose: "text-rose-600 dark:text-rose-500",
  slate: "text-slate-500 dark:text-slate-400",
  neutral: "text-muted-foreground/56",
};

const memberTone: Record<string, string> = {
  AK: "bg-orange-500/16 text-orange-600 dark:text-orange-400",
  JS: "bg-teal-500/16 text-teal-600 dark:text-teal-400",
  MV: "bg-info/16 text-info-foreground",
  LO: "bg-violet-500/20 text-violet-600 dark:text-violet-400",
  RB: "bg-rose-500/16 text-rose-600 dark:text-rose-400",
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

function FolderGlyph({ folderTone, small, layoutId }: { folderTone: FolderTone; small?: boolean; layoutId: string }) {
  return (
    <motion.span
      aria-hidden
      className={cn("relative block shrink-0", tone[folderTone], small ? "h-6 w-7" : "h-14 w-17")}
      layoutId={layoutId}
      transition={spring}
    >
      <svg className="absolute inset-0 size-full overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 68 56">
        <path d="M0 8a6 6 0 0 1 6-6h17.5a6 6 0 0 1 4.6 2.2L32 9h30a6 6 0 0 1 6 6v35a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6Z" fill="currentColor" opacity="0.36" />
        {!small && (
          <>
            <rect className="fill-card" height="30" rx="3" width="44" x="10" y="12" />
            <rect fill="currentColor" height="2.5" opacity="0.3" rx="1.25" width="24" x="15" y="18" />
            <rect fill="currentColor" height="2.5" opacity="0.2" rx="1.25" width="30" x="15" y="24" />
          </>
        )}
        <path d="M0 22a6 6 0 0 1 6-6h56a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6Z" fill="currentColor" />
      </svg>
    </motion.span>
  );
}

function TemplatePreview({ kind }: { kind: FileTemplate["kind"] }) {
  const line = "h-1 rounded-full bg-muted-foreground/24";
  switch (kind) {
    case "doc":
      return (
        <div className="flex flex-col gap-1.5 p-3">
          <span className="h-1.5 w-1/2 rounded-full bg-foreground/48" />
          {[92, 80, 86, 60].map((w) => (
            <span className={line} key={w} style={{ width: `${w}%` }} />
          ))}
        </div>
      );
    case "brief":
      return (
        <div className="flex flex-col gap-1.5 p-3">
          <span className="h-4 w-full rounded bg-orange-500/24" />
          <span className="h-1.5 w-2/3 rounded-full bg-foreground/48" />
          {[88, 70].map((w) => (
            <span className={line} key={w} style={{ width: `${w}%` }} />
          ))}
        </div>
      );
    case "sheet":
      return (
        <div className="grid grid-cols-4 gap-px p-3">
          {Array.from({ length: 16 }, (_, i) => (
            <span
              className={cn(
                "h-2.5",
                i < 4 ? "bg-foreground/20" : i === 6 || i === 11 ? "bg-success/40" : "bg-muted-foreground/12",
              )}
              key={i}
            />
          ))}
        </div>
      );
    case "roadmap":
      return (
        <div className="flex flex-col gap-1.5 p-3">
          {[
            [0, 45, "bg-info/48"],
            [20, 50, "bg-teal-500/48"],
            [40, 40, "bg-orange-500/48"],
            [55, 35, "bg-violet-500/56"],
          ].map(([l, w, c]) => (
            <span className={cn("h-2 rounded-full", c as string)} key={String(c)} style={{ marginLeft: `${l}%`, width: `${w}%` }} />
          ))}
        </div>
      );
    case "board":
      return (
        <div className="grid grid-cols-3 gap-1.5 p-3">
          {["bg-violet-500/40", "bg-teal-500/32", "bg-orange-500/28", "bg-info/28", "bg-violet-500/40", "bg-rose-500/28"].map((c, i) => (
            <span className={cn("h-4 rounded-sm", c, i % 2 ? "rotate-2" : "-rotate-2")} key={i} />
          ))}
        </div>
      );
    case "moodboard":
      return (
        <div className="grid h-full grid-cols-3 grid-rows-2 gap-1 p-2">
          <span className="row-span-2 rounded-sm bg-linear-to-br from-orange-500/60 to-violet-500/50" />
          <span className="rounded-sm bg-linear-to-br from-info/50 to-teal-500/40" />
          <span className="rounded-sm bg-linear-to-br from-rose-500/40 to-orange-500/30" />
          <span className="col-span-2 rounded-sm bg-linear-to-r from-teal-500/40 to-info/30" />
        </div>
      );
  }
}

function Members({ ids, size = "size-5" }: { ids: string[]; size?: string }) {
  if (ids.length === 0) return <span className="text-muted-foreground text-xs">Only you</span>;
  return (
    <span className="flex -space-x-1">
      {ids.slice(0, 3).map((m) => (
        <Avatar className={cn(size, "bg-card ring-2 ring-card")} key={m}>
          <AvatarFallback className={cn("text-[8px]", memberTone[m] ?? "bg-muted")}>{m}</AvatarFallback>
        </Avatar>
      ))}
      {ids.length > 3 && (
        <span className={cn(size, "flex items-center justify-center rounded-full bg-muted text-[8px] text-muted-foreground ring-2 ring-card")}>
          +{ids.length - 3}
        </span>
      )}
    </span>
  );
}

type SortKey = "name" | "edited" | "size" | "files";

export function Drive({
  title = "Files",
  folders: initialFolders = defaultFolders,
  templates = defaultTemplates,
  usedGb = 42.6,
  totalGb = 100,
  defaultView = "grid",
  onOpenFolder,
  className,
}: DriveProps) {
  const [folders, setFolders] = useState(initialFolders);
  const [tab, setTab] = useState<"all" | "recent" | "shared" | "starred">("all");
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
    { id: "all", label: "All files", count: folders.length },
    { id: "recent", label: "Recent", count: folders.filter((f) => f.editedMinutesAgo < 1440).length },
    { id: "shared", label: "Shared", count: folders.filter((f) => f.shared).length },
    { id: "starred", label: "Starred", count: folders.filter((f) => f.starred).length },
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
    setFolders((fs) => [
      { id: `new-${n}`, name, files: 0, sizeMb: 0, tone: "neutral", editedMinutesAgo: 0, members: [] },
      ...fs,
    ]);
    setTab("all");
    setQuery("");
    setCreated(name);
  };
  const toggleStar = (id: string) => setFolders((fs) => fs.map((f) => (f.id === id ? { ...f, starred: !f.starred } : f)));
  const sortLabel = { name: "Name", edited: "Last edited", size: "Size", files: "File count" }[sort];
  const usedPct = Math.min(100, (usedGb / totalGb) * 100);
  const grid = view === "grid";

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn(
          "@container relative flex h-[760px] w-full flex-col overflow-hidden bg-background text-foreground text-sm",
          className,
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-6 pb-10 @3xl:px-8 @3xl:pt-8">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="font-heading font-semibold text-2xl tracking-tight">{title}</h1>
                <div className="mt-2 flex items-center gap-2.5 text-muted-foreground text-xs">
                  <span className="relative h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-muted @md:w-32">
                    <motion.span
                      animate={{ scaleX: usedPct / 100 }}
                      className="absolute inset-0 origin-left rounded-full bg-foreground/72"
                      initial={{ scaleX: 0 }}
                      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
                    />
                  </span>
                  <span className="whitespace-nowrap tabular-nums">
                    {usedGb}
                    <span className="@md:hidden">/</span>
                    <span className="hidden @md:inline"> of </span>
                    {totalGb} GB<span className="hidden @md:inline"> used</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button aria-label="Upload" variant="outline">
                  <CloudUploadIcon />
                  <span className="hidden @md:inline">Upload</span>
                </Button>
                <Button onClick={newFolder}>
                  <PlusIcon />
                  New folder
                </Button>
              </div>
            </div>

            <section aria-labelledby={`${group}-tpl`}>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="font-medium" id={`${group}-tpl`}>
                  New from template
                </h2>
                <Button size="xs" variant="ghost">
                  Browse all
                </Button>
              </div>
              <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] @3xl:mx-0 @3xl:grid @3xl:grid-cols-7 @3xl:px-0">
                <button
                  className="group/tpl flex w-32 shrink-0 snap-start cursor-pointer flex-col gap-2 text-left outline-none @3xl:w-auto"
                  onClick={() => setCreated("Untitled")}
                  type="button"
                >
                  <span className="flex h-20 items-center justify-center rounded-xl border border-dashed text-muted-foreground transition-colors group-hover/tpl:border-foreground/24 group-hover/tpl:bg-accent group-hover/tpl:text-foreground group-focus-visible/tpl:ring-2 group-focus-visible/tpl:ring-ring">
                    <PlusIcon className="size-5" />
                  </span>
                  <span className="px-0.5 font-medium text-xs">Blank</span>
                </button>
                {templates.map((t) => (
                  <motion.button
                    className="group/tpl flex w-32 shrink-0 snap-start cursor-pointer flex-col gap-2 text-left outline-none @3xl:w-auto"
                    key={t.id}
                    onClick={() => setCreated(t.name)}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="block h-20 overflow-hidden rounded-xl border bg-muted/48 transition-[translate,box-shadow] group-hover/tpl:-translate-y-0.5 group-hover/tpl:shadow-xs/5 group-focus-visible/tpl:ring-2 group-focus-visible/tpl:ring-ring dark:bg-muted">
                      <TemplatePreview kind={t.kind} />
                    </span>
                    <span className="truncate px-0.5 font-medium text-xs">{t.name}</span>
                  </motion.button>
                ))}
              </div>
            </section>

            <div className="flex flex-col gap-3">
              <LayoutGroup id={`${group}-tabs`}>
                <div className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 [scrollbar-width:none] @3xl:mx-0 @3xl:px-0" role="tablist">
                  {tabs.map((t) => (
                    <button
                      aria-selected={tab === t.id}
                      className={cn(
                        "relative flex h-9 shrink-0 cursor-pointer items-center gap-1.5 px-2.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      role="tab"
                      type="button"
                    >
                      {t.label}
                      <span className="text-muted-foreground text-xs tabular-nums">{t.count}</span>
                      {tab === t.id && (
                        <motion.span
                          className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-foreground"
                          layoutId="files-tab"
                          transition={spring}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </LayoutGroup>

              <div className="flex items-center gap-2">
                <InputGroup className="max-w-72 flex-1">
                  <InputGroupAddon>
                    <SearchIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-label="Search folders"
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search folders"
                    value={query}
                  />
                  {query && (
                    <InputGroupAddon align="inline-end">
                      <Button aria-label="Clear search" onClick={() => setQuery("")} size="icon-xs" variant="ghost">
                        <XIcon />
                      </Button>
                    </InputGroupAddon>
                  )}
                </InputGroup>
                <div className="ms-auto flex items-center gap-2">
                  <Menu>
                    <MenuTrigger render={<Button aria-label={`Sort by ${sortLabel}`} variant="outline" />}>
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
                            <motion.span
                              className="absolute inset-0 rounded-md bg-background shadow-sm/5 dark:bg-input"
                              layoutId="files-view"
                              transition={spring}
                            />
                          )}
                          <Icon className="relative size-4" />
                        </button>
                      ))}
                    </div>
                  </LayoutGroup>
                </div>
              </div>
            </div>

            <LayoutGroup id={`${group}-folders`}>
              {!grid && visible.length > 0 && (
                <motion.div
                  animate={{ opacity: 1 }}
                  className="-mb-4 hidden grid-cols-[minmax(0,1fr)_6rem_6rem_7rem_2rem] gap-4 px-3 text-muted-foreground text-xs @2xl:grid"
                  initial={{ opacity: 0 }}
                >
                  <span>Name</span>
                  <span>Size</span>
                  <span>Members</span>
                  <span>Edited</span>
                  <span />
                </motion.div>
              )}
              <motion.ul
                className={cn(grid ? "grid grid-cols-2 gap-3 @2xl:grid-cols-3 @4xl:grid-cols-4" : "flex flex-col gap-1")}
                layout
                transition={spring}
              >
                <AnimatePresence mode="popLayout">
                  {visible.map((f) => (
                    <motion.li
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        "group/folder relative border bg-card transition-[scale] duration-150 ease-out has-[>[data-hit]:active]:scale-[0.985]",
                        grid ? "rounded-2xl" : "rounded-xl border-transparent hover:border-border",
                      )}
                      exit={{ opacity: 0, scale: 0.96 }}
                      initial={{ opacity: 0, scale: 0.96 }}
                      key={f.id}
                      layout
                      style={{ borderRadius: grid ? 16 : 12 }}
                      transition={spring}
                    >
                      <button
                        data-hit=""
                        aria-label={`Open ${f.name}`}
                        className="absolute inset-0 z-0 cursor-pointer rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => onOpenFolder?.(f)}
                        type="button"
                      />
                      {grid ? (
                        <motion.div
                          animate={{ opacity: 1 }}
                          className="pointer-events-none relative flex flex-col p-3 @md:p-4"
                          initial={{ opacity: 0 }}
                          key="grid"
                          layout="position"
                          transition={{ opacity: { duration: 0.2, delay: 0.08 }, layout: spring }}
                        >
                          <FolderGlyph folderTone={f.tone} layoutId={`${group}-glyph-${f.id}`} />
                          <span className="mt-4 truncate font-medium">
                            {f.name}
                          </span>
                          <span className="mt-0.5 text-muted-foreground text-xs tabular-nums">
                            {f.files === 0 ? "No files yet" : `${f.files} files · ${formatSize(f.sizeMb)}`}
                          </span>
                          <div className="mt-4 flex items-center justify-between border-t pt-3">
                            <Members ids={f.members} />
                            <span className="flex items-center gap-1 text-muted-foreground text-xs">
                              {f.shared && <UsersRoundIcon aria-label="Shared" className="size-3" />}
                              {formatAgo(f.editedMinutesAgo)}
                            </span>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          animate={{ opacity: 1 }}
                          className="pointer-events-none relative grid h-12 grid-cols-[minmax(0,1fr)_2rem] items-center gap-4 px-3 @2xl:grid-cols-[minmax(0,1fr)_6rem_6rem_7rem_2rem]"
                          initial={{ opacity: 0 }}
                          key="list"
                          layout="position"
                          transition={{ opacity: { duration: 0.2, delay: 0.08 }, layout: spring }}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <FolderGlyph folderTone={f.tone} layoutId={`${group}-glyph-${f.id}`} small />
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate font-medium">
                                {f.name}
                              </span>
                              <span className="text-muted-foreground text-xs tabular-nums">
                                {f.files === 0 ? "No files yet" : `${f.files} files`}
                                {f.files > 0 && <span className="@2xl:hidden"> · {formatSize(f.sizeMb)}</span>}
                              </span>
                            </span>
                          </span>
                          <span className="hidden text-muted-foreground tabular-nums @2xl:block">{f.sizeMb ? formatSize(f.sizeMb) : "—"}</span>
                          <span className="hidden @2xl:block">
                            <Members ids={f.members} />
                          </span>
                          <span className="hidden text-muted-foreground @2xl:block">{formatAgo(f.editedMinutesAgo)}</span>
                        </motion.div>
                      )}
                      <motion.button
                        aria-label={f.starred ? `Unstar ${f.name}` : `Star ${f.name}`}
                        aria-pressed={Boolean(f.starred)}
                        className={cn(
                          "absolute z-10 flex size-8 cursor-pointer items-center justify-center rounded-lg outline-none transition-opacity hover:bg-accent focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring",
                          grid ? "top-2 right-2" : "top-2 right-2",
                          f.starred ? "text-warning opacity-100" : "text-muted-foreground opacity-0 group-hover/folder:opacity-100 pointer-coarse:opacity-100",
                        )}
                        layout="position"
                        onClick={() => toggleStar(f.id)}
                        transition={spring}
                        type="button"
                      >
                        <motion.span animate={{ scale: f.starred ? [1, 1.3, 1] : 1 }} transition={{ duration: 0.3 }}>
                          <StarIcon className={cn("size-4", f.starred && "fill-current")} />
                        </motion.span>
                      </motion.button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
              {visible.length === 0 && (
                <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed py-12 text-center">
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
          </div>
        </div>

        <AnimatePresence>
          {created && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-x-4 bottom-4 z-20 mx-auto flex max-w-sm items-center gap-3 rounded-xl border bg-popover px-3 py-2.5 shadow-lg/10"
              exit={{ opacity: 0, y: 12 }}
              initial={{ opacity: 0, y: 12 }}
              role="status"
              transition={spring}
            >
              <span className="flex size-7 items-center justify-center rounded-lg bg-success/12 text-success-foreground">
                <PlusIcon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">
                Created <span className="font-medium">{created}</span>
              </span>
              <Button onClick={() => setCreated(null)} size="xs" variant="ghost">
                Open
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

