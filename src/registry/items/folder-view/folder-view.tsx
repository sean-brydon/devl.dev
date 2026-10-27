"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  ClockIcon,
  CloudUploadIcon,
  DownloadIcon,
  FileIcon,
  FilePlusIcon,
  FileTextIcon,
  FilmIcon,
  FolderInputIcon,
  HouseIcon,
  ImageIcon,
  LayoutGridIcon,
  ListIcon,
  PlayIcon,
  PlusIcon,
  PresentationIcon,
  Share2Icon,
  SheetIcon,
  StarIcon,
  Trash2Icon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type FolderFileKind = "doc" | "sheet" | "image" | "slides" | "pdf" | "video";

export interface FolderFile {
  id: string;
  name: string;
  kind: FolderFileKind;
  size: string;
  editedBy: string;
  edited: string;
  art?: "logos" | "moodboard" | "photo";
}

export interface SubFolder {
  id: string;
  name: string;
  files: FolderFile[];
}

export interface FolderViewProps {
  path?: string[];
  name?: string;
  files?: FolderFile[];
  folders?: SubFolder[];
  members?: string[];
  me?: string;
  defaultEmpty?: boolean;
  defaultView?: "grid" | "list";
  workspace?: string;
  className?: string;
}

const spring = { type: "spring", stiffness: 420, damping: 36 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;
const press = "transition-[box-shadow,scale] duration-150 ease-out active:scale-[0.97]";

const people: Record<string, string> = {
  AK: "bg-orange-500/16 text-orange-700 dark:text-orange-300",
  JS: "bg-teal-500/16 text-teal-700 dark:text-teal-300",
  MV: "bg-blue-500/16 text-blue-700 dark:text-blue-300",
  LO: "bg-violet-500/18 text-violet-700 dark:text-violet-300",
};

const defaultFiles: FolderFile[] = [
  { id: "f1", name: "Brand guidelines v3", kind: "doc", size: "48 KB", editedBy: "AK", edited: "12m ago" },
  { id: "f2", name: "Logo explorations", kind: "image", size: "6.2 MB", editedBy: "MV", edited: "1h ago", art: "logos" },
  { id: "f3", name: "Colour tokens", kind: "sheet", size: "212 KB", editedBy: "JS", edited: "3h ago" },
  { id: "f4", name: "Launch keynote", kind: "slides", size: "18 MB", editedBy: "AK", edited: "Yesterday" },
  { id: "f5", name: "Type specimen", kind: "pdf", size: "2.4 MB", editedBy: "LO", edited: "Yesterday" },
  { id: "f6", name: "Sizzle reel, cut 2", kind: "video", size: "412 MB", editedBy: "MV", edited: "Mon" },
  { id: "f7", name: "Moodboard: warm", kind: "image", size: "9.8 MB", editedBy: "LO", edited: "Mon", art: "moodboard" },
  { id: "f8", name: "Copy deck", kind: "doc", size: "36 KB", editedBy: "JS", edited: "Oct 18" },
  { id: "f9", name: "Asset inventory", kind: "sheet", size: "88 KB", editedBy: "AK", edited: "Oct 16" },
  { id: "f10", name: "Social templates", kind: "slides", size: "7.1 MB", editedBy: "MV", edited: "Oct 12" },
];

const defaultFolders: SubFolder[] = [
  { id: "press", name: "Press kit", files: [] },
  {
    id: "archive",
    name: "Archive 2025",
    files: [
      { id: "a1", name: "Old logo lockups", kind: "image", size: "3.1 MB", editedBy: "MV", edited: "Mar 4", art: "logos" },
      { id: "a2", name: "Brand audit", kind: "pdf", size: "5.6 MB", editedBy: "LO", edited: "Feb 21" },
      { id: "a3", name: "Agency shortlist", kind: "sheet", size: "64 KB", editedBy: "AK", edited: "Jan 30" },
    ],
  },
];

const uploads: Omit<FolderFile, "id" | "editedBy" | "edited">[] = [
  { name: "Press photos", kind: "image", size: "14 MB", art: "photo" },
  { name: "Founder headshots", kind: "image", size: "8.4 MB", art: "photo" },
  { name: "Fact sheet", kind: "pdf", size: "1.2 MB" },
];

const kindLabel: Record<FolderFileKind, string> = {
  doc: "Doc",
  sheet: "Sheet",
  image: "Image",
  slides: "Slides",
  pdf: "PDF",
  video: "Video",
};

const kindDot: Record<FolderFileKind, string> = {
  doc: "bg-blue-500",
  sheet: "bg-emerald-500",
  image: "bg-orange-500",
  slides: "bg-violet-500",
  pdf: "bg-red-500",
  video: "bg-pink-500",
};

const kindIcon: Record<FolderFileKind, { icon: typeof FileIcon; tint: string }> = {
  doc: { icon: FileTextIcon, tint: "bg-blue-500/12 text-blue-600 dark:text-blue-400" },
  sheet: { icon: SheetIcon, tint: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
  image: { icon: ImageIcon, tint: "bg-orange-500/12 text-orange-600 dark:text-orange-400" },
  slides: { icon: PresentationIcon, tint: "bg-violet-500/12 text-violet-600 dark:text-violet-400" },
  pdf: { icon: FileIcon, tint: "bg-red-500/12 text-red-600 dark:text-red-400" },
  video: { icon: FilmIcon, tint: "bg-pink-500/12 text-pink-600 dark:text-pink-400" },
};

const places = [
  { label: "All files", icon: HouseIcon },
  { label: "Recent", icon: ClockIcon },
  { label: "Shared", icon: UsersRoundIcon },
  { label: "Starred", icon: StarIcon },
  { label: "Trash", icon: Trash2Icon },
];

function ImageArt({ art = "photo" }: { art?: FolderFile["art"] }) {
  if (art === "logos") {
    return (
      <div className="absolute inset-0 grid grid-cols-2 gap-1.5 p-3">
        <span className="flex items-center justify-center rounded-lg bg-orange-500">
          <span className="size-5 rounded-full border-4 border-white" />
        </span>
        <span className="flex items-center justify-center rounded-lg bg-card ring-1 ring-border">
          <span className="size-4 rotate-45 rounded-[5px] border-[3px] border-orange-500" />
        </span>
        <span className="flex items-center justify-center rounded-lg bg-neutral-900 dark:bg-neutral-950 dark:ring-1 dark:ring-border">
          <span className="font-heading font-semibold text-orange-400 text-sm tracking-tight">orb</span>
        </span>
        <span className="flex items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/20">
          <span className="flex gap-0.5">
            <span className="size-2.5 rounded-full bg-orange-600 dark:bg-orange-400" />
            <span className="size-2.5 rounded-full bg-orange-600/40 dark:bg-orange-400/40" />
          </span>
        </span>
      </div>
    );
  }
  if (art === "moodboard") {
    return (
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-1.5 p-3">
        <span className="row-span-2 rounded-lg bg-linear-to-b from-amber-300 via-orange-400 to-rose-500" />
        <span className="rounded-lg bg-linear-to-br from-rose-200 to-orange-300 dark:from-rose-300 dark:to-orange-400" />
        <span className="flex items-end rounded-lg bg-stone-800 p-1.5 dark:ring-1 dark:ring-border">
          <span className="font-heading font-semibold text-[11px] text-amber-200 leading-none">Aa</span>
        </span>
        <span className="col-span-2 flex overflow-hidden rounded-lg">
          {["bg-amber-200", "bg-orange-400", "bg-rose-500", "bg-red-800", "bg-stone-800"].map((c) => (
            <span className={cn("flex-1", c)} key={c} />
          ))}
        </span>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 bg-linear-to-b from-sky-300 to-amber-100 dark:from-sky-800 dark:to-amber-200/60">
      <span className="absolute top-4 right-6 size-6 rounded-full bg-amber-50/90" />
      <span className="absolute inset-x-0 bottom-0 h-2/5 bg-emerald-700/80 [clip-path:polygon(0_40%,30%_10%,60%_45%,100%_0,100%_100%,0_100%)]" />
    </div>
  );
}

function Preview({ file }: { file: FolderFile }) {
  const line = "h-1 rounded-full bg-muted-foreground/20";
  switch (file.kind) {
    case "doc":
      return (
        <div className="absolute inset-x-5 top-4 bottom-0 flex flex-col gap-1.5 rounded-t-md bg-card px-3.5 pt-3.5 shadow-xs/5 ring-1 ring-border">
          <span className="h-1.5 w-2/3 rounded-full bg-foreground/56" />
          <span className="mb-1 h-1 w-1/3 rounded-full bg-muted-foreground/24" />
          {[94, 88, 92, 70, 0, 90, 84].map((w, i) =>
            w ? <span className={line} key={i} style={{ width: `${w}%` }} /> : <span className="h-1" key={i} />,
          )}
        </div>
      );
    case "sheet":
      return (
        <div className="absolute inset-x-5 top-4 bottom-0 overflow-hidden rounded-t-md bg-card shadow-xs/5 ring-1 ring-border">
          <div className="grid grid-cols-[1.4rem_repeat(4,1fr)] gap-px bg-border">
            {Array.from({ length: 35 }, (_, i) => {
              const row = Math.floor(i / 5);
              const col = i % 5;
              return (
                <span
                  className={cn(
                    "h-3.5",
                    row === 0 || col === 0 ? "bg-muted" : "bg-card",
                    col === 3 && row > 0 && "bg-success/16",
                    row === 3 && col === 3 && "bg-success/40",
                  )}
                  key={i}
                />
              );
            })}
          </div>
        </div>
      );
    case "image":
      return <ImageArt art={file.art} />;
    case "slides":
      return (
        <div className="absolute inset-x-4 top-1/2 flex aspect-video -translate-y-1/2 flex-col justify-end gap-1.5 overflow-hidden rounded-md bg-card p-3 shadow-xs/5 ring-1 ring-border">
          <span className="absolute top-3 right-3 size-6 rounded-full bg-violet-500/48" />
          <span className="h-2 w-3/5 rounded-full bg-foreground/64" />
          <span className="h-1 w-2/5 rounded-full bg-muted-foreground/28" />
        </div>
      );
    case "pdf":
      return (
        <div className="absolute inset-x-6 top-4 bottom-0 flex flex-col gap-1.5 rounded-t-md bg-card px-3.5 pt-4 shadow-xs/5 ring-1 ring-border">
          <span className="absolute top-2.5 right-2.5 rounded-[3px] bg-destructive px-1 font-bold text-[8px] text-white">PDF</span>
          <span className="font-heading font-semibold text-foreground/80 text-lg leading-none">Aa</span>
          <span className="h-1 w-1/2 rounded-full bg-muted-foreground/24" />
          <span className="mt-1 grid grid-cols-6 gap-1">
            {Array.from({ length: 12 }, (_, i) => (
              <span className="h-2.5 rounded-sm bg-muted" key={i} />
            ))}
          </span>
        </div>
      );
    case "video":
      return (
        <div className="absolute inset-0 overflow-hidden bg-neutral-900">
          <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,var(--color-indigo-500)_0%,transparent_60%)] opacity-50" />
          <span className="absolute top-4 right-4 left-1/2 aspect-video rounded-sm bg-linear-to-br from-orange-400 to-rose-500 opacity-90" />
          <svg aria-hidden className="absolute bottom-0 left-[18%] h-3/5 text-neutral-950" viewBox="0 0 40 60">
            <circle cx="20" cy="14" fill="currentColor" r="8" />
            <path d="M4 60c0-18 7-28 16-28s16 10 16 28Z" fill="currentColor" />
          </svg>
          <span className="absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-xs/5">
            <PlayIcon className="ms-0.5 size-4 fill-current" />
          </span>
          <span className="absolute inset-x-2 bottom-1.5 h-0.5 rounded-full bg-white/24">
            <span className="block h-full w-1/3 rounded-full bg-white/80" />
          </span>
          <span className="absolute right-2 bottom-3 rounded bg-black/60 px-1 font-mono text-[10px] text-white tabular-nums">1:42</span>
        </div>
      );
  }
}

const rollVariants = {
  from: (d: number) => ({ y: d * 12, opacity: 0 }),
  in: { y: 0, opacity: 1 },
  out: (d: number) => ({ y: d * -12, opacity: 0 }),
};

function RollingCount({ value }: { value: number }) {
  const prev = useRef(value);
  const dir = value >= prev.current ? 1 : -1;
  useEffect(() => {
    prev.current = value;
  }, [value]);
  return (
    <span className="relative inline-flex h-5 min-w-[1ch] justify-end overflow-hidden tabular-nums">
      <AnimatePresence custom={dir} initial={false} mode="popLayout">
        <motion.span
          animate="in"
          custom={dir}
          exit="out"
          initial="from"
          variants={rollVariants}
          key={value}
          transition={{ duration: 0.2, ease: easeOut }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function FolderGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={cn("shrink-0", className)} fill="none" viewBox="0 0 20 16">
      <path d="M0 2.5A2.5 2.5 0 0 1 2.5 0h4.3a2 2 0 0 1 1.5.7L9.6 2.2h7.9A2.5 2.5 0 0 1 20 4.7v8.8a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 0 13.5Z" fill="currentColor" opacity="0.4" />
      <path d="M0 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7.5a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 0 13.5Z" fill="currentColor" />
    </svg>
  );
}

function EmptyFolder({ name, onUpload, onNewDoc }: { name: string; onUpload: () => void; onNewDoc: () => void }) {
  const ghost = [
    { kind: "doc" as const, rotate: -10, x: -64, y: 10 },
    { kind: "image" as const, rotate: 8, x: 64, y: 12 },
    { kind: "sheet" as const, rotate: 0, x: 0, y: 0 },
  ];
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full flex-col items-center justify-center px-6 pb-10 text-center"
      exit={{ opacity: 0, y: 6 }}
      initial={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2, ease: easeOut }}
    >
      <div className="relative mb-8 h-36 w-64">
        {ghost.map((g, i) => (
          <motion.div
            animate={{ rotate: g.rotate, x: g.x, y: g.y, opacity: 1, scale: 1 }}
            className="absolute top-0 left-1/2 -ms-14 h-32 w-28 overflow-hidden rounded-xl border bg-card shadow-sm/5"
            initial={{ rotate: 0, x: 0, y: 12, opacity: 0, scale: 0.95 }}
            key={g.kind}
            transition={{ ...spring, delay: 0.05 + 0.04 * i }}
          >
            <span className="absolute inset-0 bg-muted/60 dark:bg-muted" />
            <div className="absolute inset-0 opacity-72 grayscale-[0.4]">
              <Preview file={{ id: g.kind, name: "", kind: g.kind, size: "", editedBy: "", edited: "", art: "moodboard" }} />
            </div>
          </motion.div>
        ))}
        <span className="absolute -bottom-3 left-1/2 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border bg-background shadow-xs/5">
          <PlusIcon className="size-4" />
        </span>
      </div>
      <h2 className="text-balance font-heading font-semibold text-lg">{name} is empty</h2>
      <p className="mt-1 max-w-xs text-pretty text-muted-foreground">
        Drop files anywhere on this page, or start a doc here. Everyone in the folder will see it.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button className={press} onClick={onUpload} variant="outline">
          <CloudUploadIcon />
          Upload files
        </Button>
        <Button className={press} onClick={onNewDoc}>
          <FilePlusIcon />
          New doc
        </Button>
      </div>
    </motion.div>
  );
}

export function FolderView({
  path = ["Files", "Marketing"],
  name = "Brand refresh",
  files: initialFiles = defaultFiles,
  folders: initialFolders = defaultFolders,
  members = ["AK", "JS", "MV", "LO"],
  me = "AK",
  defaultEmpty = false,
  defaultView = "grid",
  workspace = "Northwind",
  className,
}: FolderViewProps) {
  const [view, setView] = useState(defaultView);
  const [contents, setContents] = useState<Record<string, FolderFile[]>>(() => ({
    root: defaultEmpty ? [] : initialFiles,
    ...Object.fromEntries(initialFolders.map((f) => [f.id, f.files])),
  }));
  const [at, setAt] = useState("root");
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | FolderFileKind>("all");
  const [toast, setToast] = useState<string | null>(null);
  const added = useRef(0);
  const id = useId();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const sub = initialFolders.find((f) => f.id === at);
  const title = sub?.name ?? name;
  const trail = sub ? [...path, name] : path;
  const files = contents[at] ?? [];
  const kinds = useMemo(() => (Object.keys(kindLabel) as FolderFileKind[]).filter((k) => files.some((f) => f.kind === k)), [files]);
  const activeFilter = filter !== "all" && kinds.includes(filter) ? filter : "all";
  const visible = files.filter((f) => activeFilter === "all" || f.kind === activeFilter);
  const showFolders = !sub && activeFilter === "all" && initialFolders.length > 0;
  const isEmpty = files.length === 0;
  const selecting = selected.length > 0;
  const allSelected = visible.length > 0 && visible.every((f) => selected.includes(f.id));

  const open = (target: string) => {
    setAt(target);
    setSelected([]);
    setFilter("all");
  };
  const toggle = (fid: string) => setSelected((s) => (s.includes(fid) ? s.filter((x) => x !== fid) : [...s, fid]));
  const flash = (msg: string) => {
    setToast(msg);
    setSelected([]);
  };
  const remove = () => {
    const n = selected.length;
    setContents((c) => ({ ...c, [at]: (c[at] ?? []).filter((f) => !selected.includes(f.id)) }));
    flash(`Moved ${n} ${n === 1 ? "file" : "files"} to trash`);
  };
  const add = (file: Omit<FolderFile, "id" | "editedBy" | "edited"> = uploads[added.current % uploads.length]) => {
    added.current += 1;
    const next: FolderFile = { ...file, id: `new-${added.current}`, editedBy: me, edited: "Just now" };
    setContents((c) => ({ ...c, [at]: [next, ...(c[at] ?? [])] }));
    setToast(`Added ${file.name} to ${title}`);
  };

  const onCardKey = (e: KeyboardEvent<HTMLDivElement>, fid: string) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle(fid);
    }
  };

  const grid = view === "grid";
  const listCols = "grid-cols-[1.75rem_minmax(0,1fr)_4.5rem] @2xl:grid-cols-[1.75rem_minmax(0,1fr)_5rem_6.5rem_6rem_4.5rem]";

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn("@container relative flex h-[760px] w-full overflow-hidden bg-background text-foreground text-sm", className)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && selecting) setSelected([]);
        }}
      >
        <aside className="hidden w-56 shrink-0 flex-col border-r bg-muted/30 px-3 py-3 @3xl:flex">
          <button
            className="flex h-9 cursor-pointer items-center gap-2 rounded-lg px-1.5 text-left outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
              <svg aria-hidden className="size-3.5" fill="none" viewBox="0 0 16 16">
                <path d="M2 9.5c2 2.7 10 2.7 12 0" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                <path d="M4 5h8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{workspace}</span>
            <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
          </button>
          <nav aria-label="Drive" className="mt-4 flex flex-col gap-px">
            {places.map((p) => (
              <button
                className="flex h-8 cursor-pointer items-center gap-2.5 rounded-md px-2 text-left text-muted-foreground outline-none hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                key={p.label}
                type="button"
              >
                <p.icon className="size-4 shrink-0 opacity-80" />
                {p.label}
              </button>
            ))}
          </nav>
          <div className="mt-6">
            <p className="px-2 pb-1.5 font-medium text-muted-foreground text-xs">{path[path.length - 1] ?? "Folders"}</p>
            <ul className="flex flex-col gap-px">
              <li>
                <button
                  aria-current={!sub ? "page" : undefined}
                  className={cn(
                    "flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    !sub ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                  onClick={() => open("root")}
                  type="button"
                >
                  <FolderGlyph className="h-3 w-3.5 text-orange-500 dark:text-orange-400" />
                  <span className="truncate">{name}</span>
                </button>
              </li>
              {initialFolders.map((f) => (
                <li key={f.id}>
                  <button
                    aria-current={at === f.id ? "page" : undefined}
                    className={cn(
                      "flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md ps-7 pe-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      at === f.id ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                    onClick={() => open(f.id)}
                    type="button"
                  >
                    <FolderGlyph className="h-3 w-3.5 text-muted-foreground/72" />
                    <span className="truncate">{f.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-auto px-2 pt-4 pb-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium">Storage</span>
              <span className="text-muted-foreground tabular-nums">43%</span>
            </div>
            <span className="relative mt-2 block h-1 overflow-hidden rounded-full bg-foreground/8">
              <span className="absolute inset-y-0 left-0 w-[43%] rounded-full bg-foreground/72" />
            </span>
            <p className="mt-2 text-muted-foreground text-xs tabular-nums">42.6 GB of 100 GB used</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 @3xl:px-6">
            <nav aria-label="Breadcrumb" className="-ms-1 flex min-w-0 flex-1 items-center gap-0.5 text-muted-foreground">
              {sub && (
                <button
                  aria-label={`Back to ${name}`}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring @md:hidden"
                  onClick={() => open("root")}
                  type="button"
                >
                  <ArrowLeftIcon className="size-4" />
                </button>
              )}
              {trail.map((p, i) => {
                const isParent = sub && i === trail.length - 1;
                return (
                  <span className={cn("flex min-w-0 items-center gap-0.5", i < trail.length - 1 && "hidden @md:flex")} key={`${p}-${i}`}>
                    <button
                      className="flex h-7 cursor-pointer items-center truncate rounded-md px-1.5 outline-none hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={isParent ? () => open("root") : undefined}
                      type="button"
                    >
                      {p}
                    </button>
                    <ChevronRightIcon aria-hidden className="size-3.5 shrink-0 opacity-56" />
                  </span>
                );
              })}
              <span aria-current="page" className="truncate px-1.5 font-medium text-foreground">
                {title}
              </span>
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              <div className="me-1 hidden -space-x-1 @2xl:flex">
                {members.map((m) => (
                  <Avatar className="size-6 bg-background ring-2 ring-background" key={m}>
                    <AvatarFallback className={cn("font-medium text-[9px]", people[m] ?? "bg-muted")}>{m}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <Button className={cn("hidden @md:inline-flex", press)} onClick={() => setToast(`Link to ${title} copied`)} variant="outline">
                <Share2Icon />
                Share
              </Button>
              <Button aria-label="Upload" className={press} onClick={() => add()}>
                <CloudUploadIcon />
                <span className="hidden @md:inline">Upload</span>
              </Button>
            </div>
          </header>

          <div className="flex items-center gap-3 px-4 pt-6 @3xl:px-8">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                sub ? "bg-muted text-muted-foreground" : "bg-orange-500/12 text-orange-500 dark:text-orange-400",
              )}
            >
              <FolderGlyph className="h-4 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-heading font-semibold text-xl tracking-tight">{title}</h1>
              <p className="text-muted-foreground text-xs tabular-nums">
                {files.length} {files.length === 1 ? "file" : "files"}
                {!sub && initialFolders.length > 0 && ` · ${initialFolders.length} folders`} · shared with {members.length}
              </p>
            </div>
          </div>

          <div className="mx-4 mt-4 flex h-11 shrink-0 items-center gap-3 border-b @3xl:mx-8">
            <AnimatePresence initial={false} mode="popLayout">
              {selecting ? (
                <motion.label
                  animate={{ opacity: 1, x: 0 }}
                  className="flex h-8 cursor-pointer items-center gap-2 font-medium"
                  exit={{ opacity: 0, x: -6 }}
                  htmlFor={`${id}-all`}
                  initial={{ opacity: 0, x: -6 }}
                  key="all"
                  transition={{ duration: 0.18, ease: easeOut }}
                >
                  <Checkbox
                    checked={allSelected}
                    id={`${id}-all`}
                    indeterminate={!allSelected}
                    onCheckedChange={() => setSelected(allSelected ? [] : visible.map((f) => f.id))}
                  />
                  Select all
                </motion.label>
              ) : isEmpty ? (
                <motion.span animate={{ opacity: 1 }} className="text-muted-foreground text-xs" initial={{ opacity: 0 }} key="none" transition={{ duration: 0.18 }}>
                  No files yet
                </motion.span>
              ) : (
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  aria-label="File type"
                  className="-mx-1 flex min-w-0 items-center gap-0.5 overflow-x-auto px-1 [scrollbar-width:none]"
                  exit={{ opacity: 0, x: -6 }}
                  initial={{ opacity: 0, x: -6 }}
                  key="filters"
                  role="radiogroup"
                  transition={{ duration: 0.18, ease: easeOut }}
                >
                  <LayoutGroup id={`${id}-filter`}>
                    {(["all", ...kinds] as const).map((k) => (
                      <button
                        aria-checked={activeFilter === k}
                        className={cn(
                          "relative flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 font-medium text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          activeFilter === k ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                        key={k}
                        onClick={() => setFilter(k)}
                        role="radio"
                        type="button"
                      >
                        {activeFilter === k && (
                          <motion.span className="absolute inset-0 rounded-md bg-accent" layoutId={`${id}-filter-on`} transition={{ type: "spring", stiffness: 520, damping: 40 }} />
                        )}
                        {k !== "all" && <span className={cn("relative size-1.5 rounded-full", kindDot[k])} />}
                        <span className="relative">{k === "all" ? "All" : kindLabel[k]}</span>
                        <span className="relative text-muted-foreground tabular-nums">{k === "all" ? files.length : files.filter((f) => f.kind === k).length}</span>
                      </button>
                    ))}
                  </LayoutGroup>
                </motion.div>
              )}
            </AnimatePresence>
            <LayoutGroup id={`${id}-view`}>
              <div aria-label="Layout" className="ms-auto flex shrink-0 rounded-lg bg-muted p-0.5" role="radiogroup">
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
                    {view === v && <motion.span className="absolute inset-0 rounded-md bg-background shadow-xs/5 dark:bg-input" layoutId={`${id}-view-on`} transition={spring} />}
                    <Icon className="relative size-3.5" />
                  </button>
                ))}
              </div>
            </LayoutGroup>
          </div>

          <div className="relative min-h-0 flex-1 overflow-y-auto">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="h-full"
                exit={{ opacity: 0, x: sub ? 8 : -8 }}
                initial={{ opacity: 0, x: sub ? 8 : -8 }}
                key={`${at}-${view}`}
                transition={{ duration: 0.18, ease: easeOut }}
              >
                {isEmpty ? (
                  <EmptyFolder name={title} onNewDoc={() => add({ name: "Untitled doc", kind: "doc", size: "1 KB" })} onUpload={() => add()} />
                ) : grid ? (
                  <>
                    {showFolders && (
                      <ul aria-label="Folders" className="grid grid-cols-2 gap-3 px-4 pt-5 @2xl:grid-cols-3 @5xl:grid-cols-4 @3xl:px-8">
                        {initialFolders.map((f) => {
                          const n = contents[f.id]?.length ?? 0;
                          return (
                            <li key={f.id}>
                              <button
                                className={cn(
                                  "flex h-14 w-full cursor-pointer items-center gap-3 rounded-xl border bg-card px-3.5 text-left outline-none hover:border-foreground/16 focus-visible:ring-2 focus-visible:ring-ring",
                                  press,
                                )}
                                onClick={() => open(f.id)}
                                type="button"
                              >
                                <FolderGlyph className="h-4 w-5 text-muted-foreground/72" />
                                <span className="flex min-w-0 flex-col">
                                  <span className="truncate font-medium">{f.name}</span>
                                  <span className="text-muted-foreground text-xs tabular-nums">{n ? `${n} ${n === 1 ? "file" : "files"}` : "Empty"}</span>
                                </span>
                                <ChevronRightIcon aria-hidden className="ms-auto hidden size-4 shrink-0 text-muted-foreground/60 @md:block" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <ul aria-label="Files" className="grid grid-cols-2 gap-3 px-4 pt-3 pb-28 @2xl:grid-cols-3 @5xl:grid-cols-4 @3xl:px-8 [&:first-child]:pt-5">
                      <AnimatePresence initial={false} mode="popLayout">
                        {visible.map((f) => {
                          const on = selected.includes(f.id);
                          return (
                            <motion.li animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} initial={{ opacity: 0, scale: 0.95 }} key={f.id} layout transition={spring}>
                              <div
                                aria-checked={on}
                                aria-label={`${f.name}, ${kindLabel[f.kind]}, ${f.size}`}
                                className={cn(
                                  "group/file relative flex cursor-pointer select-none flex-col overflow-hidden rounded-xl border bg-card outline-none transition-[box-shadow,border-color,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
                                  on ? "border-foreground/40 ring-3 ring-foreground/8" : "hover:border-foreground/16 hover:shadow-xs/5",
                                )}
                                onClick={() => toggle(f.id)}
                                onKeyDown={(e) => onCardKey(e, f.id)}
                                role="checkbox"
                                tabIndex={0}
                              >
                                <div className="relative h-28 overflow-hidden bg-muted/60 @md:h-32 dark:bg-muted/72">
                                  <motion.div animate={{ scale: on ? 0.94 : 1 }} className="absolute inset-0" transition={spring}>
                                    <Preview file={f} />
                                  </motion.div>
                                  <span
                                    className={cn(
                                      "absolute top-2 left-2 flex size-6 items-center justify-center rounded-md bg-background/88 shadow-xs/5 backdrop-blur transition-opacity duration-150",
                                      on || selecting ? "opacity-100" : "opacity-0 group-hover/file:opacity-100 group-focus-visible/file:opacity-100 pointer-coarse:opacity-100",
                                    )}
                                  >
                                    <Checkbox checked={on} className="pointer-events-none" tabIndex={-1} />
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1 border-t px-3 py-2.5">
                                  <span className="truncate font-medium">{f.name}</span>
                                  <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                    <span className={cn("size-1.5 shrink-0 rounded-full", kindDot[f.kind])} />
                                    <span className="truncate tabular-nums">
                                      {kindLabel[f.kind]} · {f.size}
                                    </span>
                                    <Avatar className="ms-auto size-4 shrink-0">
                                      <AvatarFallback className={cn("font-medium text-[7px]", people[f.editedBy] ?? "bg-muted")}>{f.editedBy}</AvatarFallback>
                                    </Avatar>
                                    <span className="hidden shrink-0 tabular-nums @md:inline">{f.edited}</span>
                                  </span>
                                </div>
                              </div>
                            </motion.li>
                          );
                        })}
                      </AnimatePresence>
                    </ul>
                  </>
                ) : (
                  <div className="px-4 pt-3 pb-28 @3xl:px-8">
                    <div className={cn("grid h-9 items-center gap-3 px-2 font-medium text-muted-foreground text-xs", listCols)}>
                      <span />
                      <span>Name</span>
                      <span className="hidden @2xl:block">Type</span>
                      <span className="hidden @2xl:block">Edited by</span>
                      <span className="hidden @2xl:block">Edited</span>
                      <span className="text-end">Size</span>
                    </div>
                    <ul aria-label="Files" className="border-t">
                      {showFolders &&
                        initialFolders.map((f) => {
                          const n = contents[f.id]?.length ?? 0;
                          return (
                            <li className="border-b" key={f.id}>
                              <button
                                className={cn("grid h-12 w-full cursor-pointer items-center gap-3 rounded-md px-2 text-left outline-none hover:bg-accent/48 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset", listCols)}
                                onClick={() => open(f.id)}
                                type="button"
                              >
                                <span />
                                <span className="flex min-w-0 items-center gap-3">
                                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                    <FolderGlyph className="h-3 w-3.5" />
                                  </span>
                                  <span className="truncate font-medium">{f.name}</span>
                                </span>
                                <span className="hidden text-muted-foreground @2xl:block">Folder</span>
                                <span className="hidden text-muted-foreground @2xl:block">—</span>
                                <span className="hidden text-muted-foreground @2xl:block">—</span>
                                <span className="text-end text-muted-foreground tabular-nums">{n ? `${n} ${n === 1 ? "file" : "files"}` : "Empty"}</span>
                              </button>
                            </li>
                          );
                        })}
                      <AnimatePresence initial={false} mode="popLayout">
                        {visible.map((f) => {
                          const on = selected.includes(f.id);
                          const K = kindIcon[f.kind];
                          return (
                            <motion.li
                              animate={{ opacity: 1 }}
                              className="border-b"
                              exit={{ opacity: 0 }}
                              initial={{ opacity: 0 }}
                              key={f.id}
                              layout="position"
                              transition={{ opacity: { duration: 0.15 }, layout: spring }}
                            >
                              <div
                                aria-checked={on}
                                aria-label={`${f.name}, ${kindLabel[f.kind]}, ${f.size}`}
                                className={cn(
                                  "grid h-12 cursor-pointer select-none items-center gap-3 rounded-md px-2 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                                  listCols,
                                  on ? "bg-accent" : "hover:bg-accent/48",
                                )}
                                onClick={() => toggle(f.id)}
                                onKeyDown={(e) => onCardKey(e, f.id)}
                                role="checkbox"
                                tabIndex={0}
                              >
                                <Checkbox checked={on} className="pointer-events-none" tabIndex={-1} />
                                <span className="flex min-w-0 items-center gap-3">
                                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", K.tint)}>
                                    <K.icon className="size-3.5" />
                                  </span>
                                  <span className="truncate font-medium">{f.name}</span>
                                </span>
                                <span className="hidden text-muted-foreground @2xl:block">{kindLabel[f.kind]}</span>
                                <span className="hidden items-center gap-2 text-muted-foreground @2xl:flex">
                                  <Avatar className="size-5 shrink-0">
                                    <AvatarFallback className={cn("font-medium text-[8px]", people[f.editedBy] ?? "bg-muted")}>{f.editedBy}</AvatarFallback>
                                  </Avatar>
                                  {f.editedBy === me ? "You" : f.editedBy}
                                </span>
                                <span className="hidden text-muted-foreground tabular-nums @2xl:block">{f.edited}</span>
                                <span className="text-end text-muted-foreground tabular-nums">{f.size}</span>
                              </div>
                            </motion.li>
                          );
                        })}
                      </AnimatePresence>
                    </ul>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {selecting && (
            <motion.div
              animate={{ y: 0, opacity: 1, scale: 1 }}
              aria-label="Bulk actions"
              className="absolute inset-x-3 bottom-4 z-20 mx-auto flex max-w-fit origin-bottom items-center gap-1 rounded-xl border bg-popover p-1 shadow-lg/10 @3xl:left-56"
              exit={{ y: 16, opacity: 0, scale: 0.96, transition: { duration: 0.15, ease: easeOut } }}
              initial={{ y: 16, opacity: 0, scale: 0.96 }}
              role="toolbar"
              transition={spring}
            >
              <span className="flex items-center gap-1 ps-2.5 pe-2 font-medium">
                <RollingCount value={selected.length} />
                <span>selected</span>
              </span>
              <span className="mx-1 h-5 w-px bg-border" />
              {(
                [
                  ["Share", Share2Icon, () => flash(`Link copied for ${selected.length} ${selected.length === 1 ? "file" : "files"}`)],
                  ["Move", FolderInputIcon, () => flash(`Moved to ${name} / Archive 2025`)],
                  ["Download", DownloadIcon, () => flash(`Zipping ${selected.length} ${selected.length === 1 ? "file" : "files"}…`)],
                ] as const
              ).map(([label, Icon, run]) => (
                <Tooltip key={label}>
                  <TooltipTrigger render={<Button aria-label={label} className={cn("@lg:w-auto @lg:px-2.5", press)} onClick={run} size="icon" variant="ghost" />}>
                    <Icon />
                    <span className="hidden @lg:inline">{label}</span>
                  </TooltipTrigger>
                  <TooltipPopup className="@lg:hidden">{label}</TooltipPopup>
                </Tooltip>
              ))}
              <Button
                aria-label="Delete"
                className={cn("text-destructive-foreground hover:bg-destructive/8 @lg:w-auto @lg:px-2.5", press)}
                onClick={remove}
                size="icon"
                variant="ghost"
              >
                <Trash2Icon />
                <span className="hidden @lg:inline">Delete</span>
              </Button>
              <span className="mx-1 h-5 w-px bg-border" />
              <Button aria-label="Clear selection" className={press} onClick={() => setSelected([])} size="icon" variant="ghost">
                <XIcon />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && !selecting && (
            <motion.div
              animate={{ y: 0, opacity: 1 }}
              className="absolute inset-x-3 bottom-4 z-20 mx-auto flex max-w-fit items-center gap-3 rounded-xl border bg-popover py-1.5 ps-3.5 pe-1.5 shadow-lg/10 @3xl:left-56"
              exit={{ y: 12, opacity: 0, transition: { duration: 0.15, ease: easeOut } }}
              initial={{ y: 12, opacity: 0 }}
              role="status"
              transition={spring}
            >
              <span className="truncate">{toast}</span>
              <Button className={press} onClick={() => setToast(null)} size="xs" variant="ghost">
                Dismiss
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
