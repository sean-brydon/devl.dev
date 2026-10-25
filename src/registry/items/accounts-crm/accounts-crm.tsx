"use client";

import {
  ArrowRightLeftIcon,
  BarChart3Icon,
  Building2Icon,
  CalendarCheckIcon,
  ChevronDownIcon,
  FilterIcon,
  HandshakeIcon,
  InboxIcon,
  MenuIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  Trash2Icon,
  Undo2Icon,
  UserRoundIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
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
  MenuTrigger,
} from "@/components/ui/menu";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type CrmStage = "lead" | "qualified" | "proposal" | "negotiation" | "won";
export type CrmHealth = "good" | "watch" | "risk";
export type CrmView = "all" | "mine" | "closing" | "risk";

export interface CrmOwner {
  id: string;
  name: string;
}

export interface CrmPipeline {
  id: string;
  name: string;
}

export interface CrmCompany {
  id: string;
  name: string;
  domain: string;
  pipeline: string;
  stage: CrmStage;
  arr: number;
  ownerId: string;
  health: CrmHealth;
  closeDate: string;
  lastTouch: string;
}

export interface AccountsCrmProps {
  className?: string;
  companies?: CrmCompany[];
  owners?: CrmOwner[];
  pipelines?: CrmPipeline[];
  currentUserId?: string;
  currentMonth?: string;
  productName?: string;
}

const spring = { type: "spring", stiffness: 520, damping: 46, mass: 1 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;
const menuPop =
  "transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100";
const press = "transition-[color,background-color,box-shadow,scale] duration-150 ease-out active:scale-[0.97]";
const largerHitArea = "relative after:absolute after:-inset-3 after:content-['']";
const barSurface =
  "rounded-full bg-primary text-primary-foreground shadow-lg/15 dark:border dark:bg-popover dark:text-popover-foreground dark:shadow-lg/40";
const barButton = cn(
  "flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 outline-none hover:bg-primary-foreground/12 focus-visible:ring-2 focus-visible:ring-primary-foreground/40 data-popup-open:bg-primary-foreground/12 dark:data-popup-open:bg-accent dark:focus-visible:ring-ring dark:hover:bg-accent",
  press,
);

export const crmStages: { value: CrmStage; label: string; dot: string; pill: string }[] = [
  { value: "lead", label: "Lead", dot: "bg-muted-foreground/60", pill: "bg-muted text-muted-foreground" },
  { value: "qualified", label: "Qualified", dot: "bg-info", pill: "bg-info/10 text-info-foreground dark:bg-info/16" },
  { value: "proposal", label: "Proposal", dot: "bg-warning", pill: "bg-warning/10 text-warning-foreground dark:bg-warning/16" },
  {
    value: "negotiation",
    label: "Negotiation",
    dot: "bg-violet-500 dark:bg-violet-400",
    pill: "bg-violet-500/10 text-violet-700 dark:bg-violet-400/16 dark:text-violet-300",
  },
  { value: "won", label: "Won", dot: "bg-success", pill: "bg-success/10 text-success-foreground dark:bg-success/16" },
];

const healthMeta: Record<CrmHealth, { label: string; dot: string }> = {
  good: { label: "Healthy", dot: "bg-success" },
  watch: { label: "Watch", dot: "bg-warning" },
  risk: { label: "At risk", dot: "bg-destructive" },
};

const views: { value: CrmView; label: string; short: string }[] = [
  { value: "all", label: "All companies", short: "All" },
  { value: "mine", label: "My accounts", short: "Mine" },
  { value: "closing", label: "Closing this month", short: "Closing" },
  { value: "risk", label: "At risk", short: "At risk" },
];

const defaultOwners: CrmOwner[] = [
  { id: "o1", name: "Maren Kole" },
  { id: "o2", name: "Jonah Ifeanyi" },
  { id: "o3", name: "Sofia Lindqvist" },
  { id: "o4", name: "Ravi Castellano" },
];

const defaultPipelines: CrmPipeline[] = [
  { id: "new", name: "New business" },
  { id: "expansion", name: "Expansion" },
];

const defaultCompanies: CrmCompany[] = [
  { id: "c1", name: "Halcyon Freight", domain: "halcyonfreight.co", pipeline: "new", stage: "negotiation", arr: 84000, ownerId: "o1", health: "good", closeDate: "2026-10-29", lastTouch: "2h ago" },
  { id: "c2", name: "Brightwater Labs", domain: "brightwater.bio", pipeline: "new", stage: "proposal", arr: 46500, ownerId: "o2", health: "watch", closeDate: "2026-11-12", lastTouch: "Yesterday" },
  { id: "c3", name: "Oakhollow Studio", domain: "oakhollow.studio", pipeline: "new", stage: "qualified", arr: 18000, ownerId: "o1", health: "good", closeDate: "2026-12-03", lastTouch: "3d ago" },
  { id: "c4", name: "Pemberton & Vale", domain: "pembertonvale.law", pipeline: "new", stage: "lead", arr: 12000, ownerId: "o3", health: "good", closeDate: "2027-01-15", lastTouch: "1w ago" },
  { id: "c5", name: "Quillstone Analytics", domain: "quillstone.ai", pipeline: "new", stage: "negotiation", arr: 120000, ownerId: "o4", health: "risk", closeDate: "2026-10-31", lastTouch: "9d ago" },
  { id: "c6", name: "Saltmarsh Outdoor", domain: "saltmarsh.shop", pipeline: "new", stage: "won", arr: 31000, ownerId: "o2", health: "good", closeDate: "2026-10-08", lastTouch: "Today" },
  { id: "c7", name: "Ferrovia Transit", domain: "ferrovia.city", pipeline: "new", stage: "proposal", arr: 67000, ownerId: "o1", health: "risk", closeDate: "2026-10-24", lastTouch: "12d ago" },
  { id: "c8", name: "Juniper Ridge Health", domain: "juniperridge.care", pipeline: "new", stage: "qualified", arr: 39000, ownerId: "o3", health: "watch", closeDate: "2026-11-20", lastTouch: "4d ago" },
  { id: "c9", name: "Mosswood Bakery Co.", domain: "mosswood.bakery", pipeline: "new", stage: "lead", arr: 6400, ownerId: "o4", health: "good", closeDate: "2027-02-01", lastTouch: "2w ago" },
  { id: "c10", name: "Tessellate Robotics", domain: "tessellate.dev", pipeline: "expansion", stage: "proposal", arr: 52000, ownerId: "o1", health: "good", closeDate: "2026-10-30", lastTouch: "5h ago" },
  { id: "c11", name: "Cinderpath Games", domain: "cinderpath.gg", pipeline: "expansion", stage: "negotiation", arr: 28000, ownerId: "o2", health: "risk", closeDate: "2026-11-04", lastTouch: "6d ago" },
  { id: "c12", name: "Larkspur Energy", domain: "larkspur.energy", pipeline: "expansion", stage: "won", arr: 74000, ownerId: "o3", health: "good", closeDate: "2026-10-02", lastTouch: "Yesterday" },
  { id: "c13", name: "Driftline Media", domain: "driftline.fm", pipeline: "expansion", stage: "qualified", arr: 15500, ownerId: "o1", health: "watch", closeDate: "2026-12-10", lastTouch: "2d ago" },
];

const avatarTones = ["bg-orange-500/20 dark:bg-orange-400/20", "bg-teal-500/20 dark:bg-teal-400/20", "bg-amber-500/25 dark:bg-amber-400/20", "bg-info/20", "bg-success/20"];
const logoTones = [
  "bg-orange-500/16 dark:bg-orange-400/16",
  "bg-teal-500/16 dark:bg-teal-400/16",
  "bg-violet-500/16 dark:bg-violet-400/16",
  "bg-amber-500/20 dark:bg-amber-400/18",
  "bg-rose-500/16 dark:bg-rose-400/16",
  "bg-info/16",
  "bg-success/16",
];
const pipelineTones = ["bg-teal-500 dark:bg-teal-400", "bg-orange-500 dark:bg-orange-400", "bg-rose-500 dark:bg-rose-400", "bg-sky-500 dark:bg-sky-400"];

function initials(name: string) {
  return name
    .replace(/[^A-Za-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function hashIndex(s: string, n: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % n;
}

function money(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return `$${Math.round(n)}`;
}

function parseMoney(raw: string) {
  const t = raw.trim().toLowerCase().replace(/[$,\s]/g, "");
  const m = t.match(/^(\d+(?:\.\d+)?)([km]?)$/);
  if (!m) return null;
  const mult = m[2] === "k" ? 1000 : m[2] === "m" ? 1_000_000 : 1;
  return Math.round(Number(m[1]) * mult);
}

function shortDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function RollingNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, format);
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { type: "spring", stiffness: 140, damping: 24 });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

const formatCount = (n: number) => String(Math.round(n));

function OwnerAvatar({ owner, index, size = 6 }: { owner?: CrmOwner; index: number; size?: 5 | 6 | 7 }) {
  const sizes = { 5: "[--avatar-size:--spacing(5)]", 6: "[--avatar-size:--spacing(6)]", 7: "[--avatar-size:--spacing(7)]" };
  return (
    <Avatar className={sizes[size]}>
      <AvatarFallback className={avatarTones[index % avatarTones.length]}>
        {owner ? initials(owner.name) : "?"}
      </AvatarFallback>
    </Avatar>
  );
}

function ViewTabs({
  value,
  onChange,
  counts,
  className,
}: {
  value: CrmView;
  onChange: (v: CrmView) => void;
  counts: Record<CrmView, number>;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const reduce = useReducedMotion();

  const measure = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const tab = scroller?.querySelector<HTMLElement>(`[data-view="${value}"]`);
    if (!scroller || !tab || scroller.scrollWidth <= scroller.clientWidth) return;
    const box = tab.getBoundingClientRect();
    const view = scroller.getBoundingClientRect();
    const behavior = reduce ? "auto" : "smooth";
    if (box.left < view.left + 24) scroller.scrollBy({ left: box.left - view.left - 24, behavior });
    else if (box.right > view.right - 24) scroller.scrollBy({ left: box.right - view.right + 24, behavior });
  }, [value, reduce]);

  const mask = `linear-gradient(to right, transparent, #000 ${edges.left ? 28 : 0}px, #000 calc(100% - ${edges.right ? 36 : 0}px), transparent)`;

  return (
    <div
      className={cn("min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
      onScroll={measure}
      ref={scrollerRef}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      <Tabs onValueChange={(v) => onChange(v as CrmView)} value={value}>
        <TabsList aria-label="Saved views">
          {views.map((v) => (
            <TabsTab className="h-8 px-2.5 text-sm sm:h-8" data-view={v.value} key={v.value} value={v.value}>
              <span className="@lg:hidden">{v.short}</span>
              <span className="hidden @lg:inline">{v.label}</span>
              <span className="min-w-[1ch] text-muted-foreground text-xs tabular-nums">{counts[v.value]}</span>
            </TabsTab>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

function EditableCell({
  value,
  display,
  onCommit,
  label,
  autoEdit = false,
  inputClassName,
  className,
}: {
  value: string;
  display: ReactNode;
  onCommit: (raw: string) => boolean;
  label: string;
  autoEdit?: boolean;
  inputClassName?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(autoEdit);
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);

  const finish = (commit: boolean) => {
    if (commit && draft !== value && !onCommit(draft)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        aria-invalid={invalid || undefined}
        aria-label={label}
        autoFocus
        className={cn("min-w-24", inputClassName)}
        onBlur={() => finish(true)}
        onChange={(e) => {
          setDraft(e.target.value);
          setInvalid(false);
        }}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") finish(true);
          if (e.key === "Escape") {
            setDraft(value);
            setInvalid(false);
            setEditing(false);
          }
        }}
        size="sm"
        value={draft}
      />
    );
  }

  return (
    <button
      aria-label={`${label}: ${value}. Click to edit`}
      className={cn(
        "relative -mx-1.5 cursor-text rounded-md px-1.5 py-1 text-left outline-none transition-colors after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      type="button"
    >
      {display}
    </button>
  );
}

function StagePill({ stage }: { stage: CrmStage }) {
  const meta = crmStages.find((s) => s.value === stage) ?? crmStages[0];
  const reduce = useReducedMotion();
  return (
    <motion.span
      animate={{ opacity: 1, scale: 1 }}
      className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 font-medium text-xs", meta.pill)}
      initial={reduce ? { opacity: 0.6 } : { opacity: 0.6, scale: 0.95 }}
      key={stage}
      transition={{ duration: 0.18, ease: easeOut }}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </motion.span>
  );
}

const MotionRow = motion.create(TableRow);

export function AccountsCrm({
  className,
  companies: initialCompanies = defaultCompanies,
  owners = defaultOwners,
  pipelines = defaultPipelines,
  currentUserId = "o1",
  currentMonth = "2026-10",
  productName = "Kestrel",
}: AccountsCrmProps) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [pipeline, setPipeline] = useState(pipelines[0]?.id ?? "");
  const [view, setView] = useState<CrmView>("all");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<CrmStage | null>(null);
  const [healthFilter, setHealthFilter] = useState<CrmHealth[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [undo, setUndo] = useState<{ ids: string[]; snapshot: CrmCompany[] } | null>(null);
  const reduce = useReducedMotion();
  const drawerRef = useRef<HTMLDivElement>(null);
  const counter = useRef(0);

  useEffect(() => {
    if (drawer) drawerRef.current?.focus();
  }, [drawer]);

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(t);
  }, [undo]);

  const inPipeline = companies.filter((c) => c.pipeline === pipeline);

  const inView = (c: CrmCompany, v: CrmView) =>
    v === "all" ||
    (v === "mine" && c.ownerId === currentUserId) ||
    (v === "closing" && c.closeDate.startsWith(currentMonth) && c.stage !== "won") ||
    (v === "risk" && c.health === "risk");

  const counts = Object.fromEntries(
    views.map((v) => [v.value, inPipeline.filter((c) => inView(c, v.value)).length]),
  ) as Record<CrmView, number>;

  const q = query.trim().toLowerCase();
  const rows = inPipeline.filter(
    (c) =>
      inView(c, view) &&
      (!stageFilter || c.stage === stageFilter) &&
      (healthFilter.length === 0 || healthFilter.includes(c.health)) &&
      (!q || c.name.toLowerCase().includes(q) || c.domain.includes(q)),
  );

  const stageTotals = crmStages.map((s) => {
    const list = inPipeline.filter((c) => c.stage === s.value);
    return { ...s, count: list.length, total: list.reduce((sum, c) => sum + c.arr, 0) };
  });
  const pipelineValue = stageTotals.reduce((sum, t) => sum + t.total, 0);
  const openValue = stageTotals.filter((t) => t.value !== "won").reduce((sum, t) => sum + t.total, 0);

  const visibleIds = rows.map((r) => r.id);
  const selectedVisible = selected.filter((id) => visibleIds.includes(id));
  const allChecked = rows.length > 0 && selectedVisible.length === rows.length;
  const someChecked = selectedVisible.length > 0 && !allChecked;

  const update = (id: string, patch: Partial<CrmCompany>) =>
    setCompanies((all) => all.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const updateMany = (ids: string[], patch: Partial<CrmCompany>) =>
    setCompanies((all) => all.map((c) => (ids.includes(c.id) ? { ...c, ...patch } : c)));

  const addCompany = () => {
    counter.current += 1;
    const id = `new-${counter.current}`;
    setCompanies((all) => [
      {
        id,
        name: "Untitled company",
        domain: "—",
        pipeline,
        stage: "lead",
        arr: 0,
        ownerId: currentUserId,
        health: "good",
        closeDate: `${currentMonth}-28`,
        lastTouch: "Just now",
      },
      ...all,
    ]);
    setView("all");
    setStageFilter(null);
    setHealthFilter([]);
    setQuery("");
    setFreshId(id);
  };

  const deleteSelected = () => {
    setUndo({ ids: selectedVisible, snapshot: companies });
    setCompanies((all) => all.filter((c) => !selectedVisible.includes(c.id)));
    setSelected((s) => s.filter((id) => !selectedVisible.includes(id)));
  };

  const undoDelete = () => {
    if (!undo) return;
    setCompanies((cur) => {
      const added = cur.filter((c) => !undo.snapshot.some((x) => x.id === c.id));
      const restored = undo.snapshot
        .filter((c) => undo.ids.includes(c.id) || cur.some((x) => x.id === c.id))
        .map((c) => cur.find((x) => x.id === c.id) ?? c);
      return [...added, ...restored];
    });
    setUndo(null);
  };

  const clearFilters = () => {
    setStageFilter(null);
    setHealthFilter([]);
    setQuery("");
    setView("all");
  };

  const filterCount = healthFilter.length + (stageFilter ? 1 : 0);
  const listKey = [pipeline, view, stageFilter, healthFilter.join(","), q].join("|");
  const ownerIndex = (id: string) => Math.max(0, owners.findIndex((o) => o.id === id));
  const owner = (id: string) => owners.find((o) => o.id === id);
  const me = owner(currentUserId);

  const navItems: { label: string; icon: ReactNode; active?: boolean; badge?: number }[] = [
    { label: "Inbox", icon: <InboxIcon />, badge: 4 },
    { label: "Companies", icon: <Building2Icon />, active: true },
    { label: "People", icon: <UsersIcon /> },
    { label: "Deals", icon: <HandshakeIcon /> },
    { label: "Reports", icon: <BarChart3Icon /> },
  ];

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-3">
      <div className="flex items-center gap-2.5 px-1.5 pt-1">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ArrowRightLeftIcon className="size-4" />
        </span>
        <span className="font-heading font-semibold">{productName}</span>
      </div>
      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {navItems.map((n) => (
          <button
            aria-current={n.active ? "page" : undefined}
            className={cn(
              "flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4 [&_svg]:opacity-80",
              press,
              n.active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            key={n.label}
            type="button"
          >
            {n.icon}
            <span className="flex-1">{n.label}</span>
            {n.badge ? (
              <Badge size="sm" variant="secondary">
                {n.badge}
              </Badge>
            ) : null}
          </button>
        ))}
      </nav>
      <div className="flex flex-col gap-1">
        <span className="px-2.5 font-medium text-muted-foreground text-xs">Pipelines</span>
        {pipelines.map((p, i) => {
          const active = p.id === pipeline;
          const n = companies.filter((c) => c.pipeline === p.id).length;
          return (
            <button
              aria-pressed={active}
              className={cn(
                "relative flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                press,
                active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              key={p.id}
              onClick={() => {
                setPipeline(p.id);
                setSelected([]);
                setStageFilter(null);
                setDrawer(false);
              }}
              type="button"
            >
              {active && (
                <motion.span
                  className="absolute inset-0 -z-10 rounded-lg bg-accent"
                  layoutId={`${productName}-pipeline`}
                  transition={reduce ? { duration: 0 } : spring}
                />
              )}
              <span
                className={cn("size-2 rounded-full", pipelineTones[i % pipelineTones.length])}
              />
              <span className="flex-1">{p.name}</span>
              <span className="text-muted-foreground text-xs tabular-nums">{n}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-auto flex items-center gap-2.5 rounded-xl border bg-card p-2.5">
        <OwnerAvatar index={ownerIndex(currentUserId)} owner={me} size={7} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-xs">{me?.name}</span>
          <span className="text-muted-foreground text-xs">Account exec</span>
        </div>
      </div>
    </div>
  );

  const pipelineName = pipelines.find((p) => p.id === pipeline)?.name ?? "";
  const monthName = new Date(`${currentMonth}-01T12:00:00`).toLocaleDateString("en-US", { month: "long" });

  const empty: { icon: ReactNode; title: string; body: string; action?: { label: string; run: () => void }; good?: boolean } =
    q
      ? {
          icon: <SearchIcon />,
          title: `No companies match “${query.trim()}”`,
          body: "Check the spelling, or search by domain instead.",
          action: { label: "Clear search", run: () => setQuery("") },
        }
      : filterCount
        ? {
            icon: <FilterIcon />,
            title: "No companies match these filters",
            body: "Try removing a health or stage filter.",
            action: {
              label: "Clear filters",
              run: () => {
                setStageFilter(null);
                setHealthFilter([]);
              },
            },
          }
        : view === "risk"
          ? {
              icon: <ShieldCheckIcon />,
              title: "Nothing at risk",
              body: `Every account in ${pipelineName} is healthy or on watch.`,
              action: { label: "View all companies", run: () => setView("all") },
              good: true,
            }
          : view === "closing"
            ? {
                icon: <CalendarCheckIcon />,
                title: `Nothing closing in ${monthName}`,
                body: `No open deals in ${pipelineName} are due this month.`,
                action: { label: "View all companies", run: () => setView("all") },
              }
            : view === "mine"
              ? {
                  icon: <UserRoundIcon />,
                  title: "No accounts assigned to you",
                  body: "Pick yourself in the Owner column to take one on.",
                  action: { label: "View all companies", run: () => setView("all") },
                }
              : {
                  icon: <Building2Icon />,
                  title: `No companies in ${pipelineName} yet`,
                  body: "Add a company to start tracking this pipeline.",
                  action: { label: "New company", run: addCompany },
                };

  const toggleRow = (id: string, on: boolean) =>
    setSelected((s) => (on ? [...s, id] : s.filter((x) => x !== id)));
  const closingSoon = (c: CrmCompany) => c.closeDate.startsWith(currentMonth) && c.stage !== "won";

  const logoTile = (c: CrmCompany) => (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg font-semibold text-[11px] text-foreground/80",
        logoTones[hashIndex(c.name, logoTones.length)],
      )}
    >
      {initials(c.name) || "?"}
    </span>
  );

  const nameCell = (c: CrmCompany, className?: string) => (
    <EditableCell
      autoEdit={c.id === freshId}
      className={cn("truncate font-medium", className)}
      display={c.name}
      inputClassName="w-44"
      label="Company name"
      onCommit={(raw) => {
        const name = raw.trim();
        if (!name) return false;
        update(c.id, { name });
        if (c.id === freshId) setFreshId(null);
        return true;
      }}
      value={c.name}
    />
  );

  const arrCell = (c: CrmCompany) => (
    <EditableCell
      className="font-medium tabular-nums"
      display={money(c.arr)}
      inputClassName="ms-auto w-24 min-w-0 tabular-nums"
      label="ARR"
      onCommit={(raw) => {
        const n = parseMoney(raw);
        if (n === null) return false;
        update(c.id, { arr: n });
        return true;
      }}
      value={String(c.arr)}
    />
  );

  const stageMenu = (c: CrmCompany) => (
    <Menu>
      <MenuTrigger
        aria-label={`Stage for ${c.name}`}
        className="group/stage relative inline-flex cursor-pointer items-center gap-1 rounded-full outline-none after:absolute after:-inset-x-1 after:-inset-y-2 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring"
      >
        <StagePill stage={c.stage} />
        <ChevronDownIcon className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover/stage:opacity-100 group-data-popup-open/stage:opacity-100" />
      </MenuTrigger>
      <MenuPopup align="start" className={cn("w-44", menuPop)}>
        <MenuRadioGroup onValueChange={(v) => update(c.id, { stage: v as CrmStage })} value={c.stage}>
          {crmStages.map((s) => (
            <MenuRadioItem key={s.value} value={s.value}>
              <span className="flex items-center gap-2">
                <span className={cn("size-1.5 rounded-full", s.dot)} />
                {s.label}
              </span>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuPopup>
    </Menu>
  );

  const ownerMenu = (c: CrmCompany, compact = false) => {
    const o = owner(c.ownerId);
    return (
      <Menu>
        <MenuTrigger
          aria-label={`Owner of ${c.name}: ${o?.name ?? "none"}`}
          className={cn(
            "relative inline-flex cursor-pointer items-center gap-2 rounded-full p-0.5 outline-none transition-colors after:absolute after:content-[''] hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent",
            compact ? "-m-0.5 after:-inset-2" : "-mx-1 pe-2 after:-inset-y-1",
          )}
        >
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex"
            initial={reduce ? { opacity: 0.5 } : { opacity: 0.5, scale: 0.95 }}
            key={c.ownerId}
            transition={{ duration: 0.18, ease: easeOut }}
          >
            <OwnerAvatar index={ownerIndex(c.ownerId)} owner={o} />
          </motion.span>
          {!compact && <span className="text-xs">{o?.name.split(" ")[0]}</span>}
        </MenuTrigger>
        <MenuPopup align={compact ? "end" : "start"} className={cn("w-52", menuPop)}>
          <MenuGroup>
          <MenuGroupLabel>Assign owner</MenuGroupLabel>
          <MenuRadioGroup onValueChange={(v) => update(c.id, { ownerId: v as string })} value={c.ownerId}>
            {owners.map((ow, i) => (
              <MenuRadioItem key={ow.id} value={ow.id}>
                <span className="flex items-center gap-2">
                  <OwnerAvatar index={i} owner={ow} size={5} />
                  {ow.name}
                  {ow.id === currentUserId && <span className="text-muted-foreground text-xs">you</span>}
                </span>
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
          </MenuGroup>
        </MenuPopup>
      </Menu>
    );
  };

  const healthTag = (c: CrmCompany) => (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={cn("size-1.5 rounded-full", healthMeta[c.health].dot)} />
      {healthMeta[c.health].label}
    </span>
  );

  const rowMotion = (c: CrmCompany) => ({
    animate: { opacity: 1, y: 0 },
    exit: reduce
      ? { opacity: 0, transition: { duration: 0.12 } }
      : { opacity: 0, x: -16, transition: { duration: 0.16, ease: easeOut } },
    initial: reduce ? false : { opacity: 0, y: 6 },
    key: c.id,
    layout: reduce ? false : ("position" as const),
    transition: spring,
  });

  return (
    <div
      className={cn(
        "@container relative isolate flex h-[760px] w-full overflow-hidden bg-background text-foreground text-sm",
        className,
      )}
      onKeyDown={(e) => {
        if (e.key === "Escape" && drawer) setDrawer(false);
      }}
    >
      <aside className="hidden w-60 shrink-0 border-r bg-muted/40 @3xl:block">{sidebar}</aside>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              aria-hidden
              className="absolute inset-0 z-40 bg-black/32 @3xl:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="backdrop"
              transition={{ duration: 0.2, ease: easeOut }}
              onClick={() => setDrawer(false)}
            />
            <motion.div
              animate={{ x: 0 }}
              aria-label="Navigation"
              aria-modal
              className="absolute inset-y-0 left-0 z-50 w-72 max-w-[85%] border-r bg-background outline-none @3xl:hidden"
              exit={{ x: "-100%" }}
              initial={{ x: "-100%" }}
              key="drawer"
              ref={drawerRef}
              role="dialog"
              tabIndex={-1}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 42 }}
            >
              <Button
                aria-label="Close navigation"
                className="absolute top-3 right-3"
                onClick={() => setDrawer(false)}
                size="icon-sm"
                variant="ghost"
              >
                <XIcon />
              </Button>
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 @3xl:hidden">
          <Button aria-label="Open navigation" onClick={() => setDrawer(true)} size="icon-sm" variant="ghost">
            <MenuIcon />
          </Button>
          <span className="font-heading font-semibold">{productName}</span>
          <span className="truncate text-muted-foreground">/ {pipelineName}</span>
          <Button aria-label="New company" className={cn("ms-auto", press)} onClick={addCompany} size="icon-sm">
            <PlusIcon />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-5 px-4 pt-5 pb-28 @3xl:px-6 @3xl:pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 className="text-balance font-heading font-semibold text-xl tracking-tight">Companies</h2>
                <p className="text-muted-foreground">
                  {pipelineName} ·{" "}
                  <span className="text-foreground">
                    <RollingNumber format={money} value={openValue} />
                  </span>{" "}
                  open ARR across <RollingNumber format={formatCount} value={inPipeline.length} /> accounts
                </p>
              </div>
              <Button className={cn("hidden @3xl:inline-flex", press)} onClick={addCompany}>
                <PlusIcon /> New company
              </Button>
            </div>

            <section aria-label="Pipeline by stage" className="rounded-2xl border bg-card p-4 shadow-xs/5">
              <div className="flex h-2.5 gap-1 overflow-hidden rounded-full">
                {stageTotals.map((s) => (
                  <motion.span
                    animate={{ flexGrow: Math.max(s.total, pipelineValue * 0.015, 1) }}
                    className={cn(
                      "h-full min-w-0 basis-0 rounded-full transition-opacity",
                      s.dot,
                      stageFilter && stageFilter !== s.value && "opacity-30",
                    )}
                    initial={false}
                    key={s.value}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 32 }}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1 @3xl:grid-cols-5">
                {stageTotals.map((s) => {
                  const active = stageFilter === s.value;
                  return (
                    <button
                      aria-pressed={active}
                      className={cn(
                        "relative flex min-w-0 cursor-pointer flex-col items-start gap-0.5 rounded-xl px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring @3xl:px-2.5 @3xl:py-2",
                        press,
                        !active && "hover:bg-accent",
                      )}
                      key={s.value}
                      onClick={() => setStageFilter(active ? null : s.value)}
                      type="button"
                    >
                      {active && (
                        <motion.span
                          className="absolute inset-0 -z-10 rounded-xl bg-muted ring-1 ring-border"
                          layoutId={`${productName}-stage`}
                          transition={reduce ? { duration: 0 } : spring}
                        />
                      )}
                      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <span className={cn("size-1.5 rounded-full", s.dot)} />
                        {s.label}
                      </span>
                      <span className="flex items-baseline gap-1.5">
                        <span className="font-medium">
                          <RollingNumber format={money} value={s.total} />
                        </span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          <RollingNumber format={formatCount} value={s.count} />
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="flex flex-col gap-3 @6xl:flex-row @6xl:items-center">
              <ViewTabs
                className="-mx-4 px-4 @3xl:-mx-6 @3xl:px-6 @6xl:mx-0 @6xl:px-0"
                counts={counts}
                onChange={(v) => {
                  setView(v);
                  setSelected([]);
                }}
                value={view}
              />
              <div className="flex gap-2 @6xl:ms-auto">
                <InputGroup className="@6xl:w-56">
                  <InputGroupAddon>
                    <SearchIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-label="Search companies"
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search companies"
                    type="search"
                    value={query}
                  />
                </InputGroup>
                <Menu>
                  <MenuTrigger
                    aria-label={filterCount ? `Filter, ${filterCount} active` : "Filter"}
                    render={<Button className={cn("relative", press)} variant="outline" />}
                  >
                    <FilterIcon />
                    <span className="hidden @md:inline">Filter</span>
                    <AnimatePresence initial={false}>
                      {filterCount > 0 && (
                        <motion.span
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 font-medium text-[10px] text-primary-foreground tabular-nums ring-2 ring-background"
                          exit={{ opacity: 0, scale: 0.95 }}
                          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.15, ease: easeOut }}
                        >
                          {filterCount}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </MenuTrigger>
                  <MenuPopup align="end" className={cn("w-48", menuPop)}>
                    <MenuGroup>
                      <MenuGroupLabel>Health</MenuGroupLabel>
                      {(Object.keys(healthMeta) as CrmHealth[]).map((h) => (
                        <MenuCheckboxItem
                          checked={healthFilter.includes(h)}
                          key={h}
                          onCheckedChange={(on) =>
                            setHealthFilter((f) => (on ? [...f, h] : f.filter((x) => x !== h)))
                          }
                        >
                          <span className="flex items-center gap-2">
                            <span className={cn("size-1.5 rounded-full", healthMeta[h].dot)} />
                            {healthMeta[h].label}
                          </span>
                        </MenuCheckboxItem>
                      ))}
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuGroup>
                      <MenuGroupLabel>Stage</MenuGroupLabel>
                      <MenuRadioGroup
                        onValueChange={(v) => setStageFilter(v === "any" ? null : (v as CrmStage))}
                        value={stageFilter ?? "any"}
                      >
                        <MenuRadioItem value="any">Any stage</MenuRadioItem>
                        {crmStages.map((s) => (
                          <MenuRadioItem key={s.value} value={s.value}>
                            {s.label}
                          </MenuRadioItem>
                        ))}
                      </MenuRadioGroup>
                    </MenuGroup>
                  </MenuPopup>
                </Menu>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border bg-card shadow-xs/5">
              <div className="@3xl:hidden">
                <div className={cn("flex items-center gap-3 border-b px-4 py-2.5 text-muted-foreground text-xs", rows.length === 0 && "hidden")}>
                  <Checkbox
                    className={largerHitArea}
                    aria-label="Select all visible companies"
                    checked={allChecked}
                    indeterminate={someChecked}
                    onCheckedChange={(on) => setSelected(on ? visibleIds : [])}
                  />
                  <span className="flex-1 font-medium">
                    <RollingNumber format={formatCount} value={rows.length} /> companies
                  </span>
                  <span className="tabular-nums">
                    <RollingNumber format={money} value={rows.reduce((sum, c) => sum + c.arr, 0)} /> total
                  </span>
                </div>
                <ul className="divide-y">
                  <AnimatePresence initial={false} key={listKey}>
                    {rows.map((c) => {
                      const isSelected = selected.includes(c.id);
                      const { key, ...m } = rowMotion(c);
                      return (
                        <motion.li
                          key={key}
                          {...m}
                          className={cn("flex gap-3 px-4 py-3 transition-colors", isSelected && "bg-accent/60")}
                        >
                          <Checkbox
                            aria-label={`Select ${c.name}`}
                            checked={isSelected}
                            className={cn("mt-2", largerHitArea)}
                            onCheckedChange={(on) => toggleRow(c.id, on)}
                          />
                          {logoTile(c)}
                          <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <div className="flex items-start gap-3">
                              <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                                {nameCell(c, "max-w-full")}
                                <span className="truncate text-muted-foreground text-xs">{c.domain}</span>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-0.5">
                                {arrCell(c)}
                                <span
                                  className={cn(
                                    "text-xs tabular-nums",
                                    closingSoon(c) ? "font-medium text-foreground" : "text-muted-foreground",
                                  )}
                                >
                                  Close {shortDate(c.closeDate)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {stageMenu(c)}
                              {healthTag(c)}
                              <span className="ms-auto">{ownerMenu(c, true)}</span>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </div>

              <Table className="min-w-[880px] table-fixed" render={<div className="relative hidden w-full overflow-x-auto @3xl:block" />}>
                <TableHeader>
                  <TableRow className="not-in-data-[variant=card]:hover:bg-transparent dark:not-in-data-[variant=card]:hover:bg-transparent">
                    <TableHead className="sticky left-0 z-20 bg-card ps-4 has-[[role=checkbox]]:w-auto first:has-[[role=checkbox]]:pe-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          aria-label="Select all visible companies"
                          checked={allChecked}
                          className={largerHitArea}
                          indeterminate={someChecked}
                          onCheckedChange={(on) => setSelected(on ? visibleIds : [])}
                        />
                        Company
                      </div>
                    </TableHead>
                    <TableHead className="w-36">Stage</TableHead>
                    <TableHead className="w-28 pe-6 text-right">ARR</TableHead>
                    <TableHead className="w-32">Owner</TableHead>
                    <TableHead className="w-28">Health</TableHead>
                    <TableHead className="w-24">Close</TableHead>
                    <TableHead className="w-28 pe-4">Last touch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false} key={listKey}>
                    {rows.map((c) => {
                      const isSelected = selected.includes(c.id);
                      const { key, ...m } = rowMotion(c);
                      return (
                        <MotionRow
                          key={key}
                          {...m}
                          className="group/row"
                          data-state={isSelected ? "selected" : undefined}
                        >
                          <TableCell
                            className={cn(
                              "sticky left-0 z-10 py-2.5 ps-4 transition-colors has-[[role=checkbox]]:w-auto first:has-[[role=checkbox]]:pe-4",
                              isSelected
                                ? "bg-[color-mix(in_srgb,var(--background),var(--color-black)_4%)] dark:bg-[color-mix(in_srgb,var(--background),var(--color-white)_4%)]"
                                : "bg-card group-hover/row:bg-[color-mix(in_srgb,var(--background),var(--color-black)_2%)] dark:group-hover/row:bg-[color-mix(in_srgb,var(--background),var(--color-white)_2%)]",
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <Checkbox
                                aria-label={`Select ${c.name}`}
                                checked={isSelected}
                                className={largerHitArea}
                                onCheckedChange={(on) => toggleRow(c.id, on)}
                              />
                              {logoTile(c)}
                              <div className="flex min-w-0 flex-1 flex-col items-start">
                                {nameCell(c, "max-w-full py-0.5")}
                                <span className="max-w-full truncate text-muted-foreground text-xs">{c.domain}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{stageMenu(c)}</TableCell>
                          <TableCell className="pe-6 text-right">{arrCell(c)}</TableCell>
                          <TableCell>{ownerMenu(c)}</TableCell>
                          <TableCell>{healthTag(c)}</TableCell>
                          <TableCell
                            className={cn(
                              "text-xs tabular-nums",
                              closingSoon(c) ? "font-medium text-foreground" : "text-muted-foreground",
                            )}
                          >
                            {shortDate(c.closeDate)}
                          </TableCell>
                          <TableCell className="pe-4 text-muted-foreground text-xs">{c.lastTouch}</TableCell>
                        </MotionRow>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
              {rows.length === 0 && (
                <motion.div
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4 px-6 py-14 text-center"
                  initial={{ opacity: 0 }}
                  key={listKey}
                  transition={{ duration: 0.2, ease: easeOut }}
                >
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl [&_svg]:size-4.5",
                      empty.good ? "bg-success/10 text-success-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {empty.icon}
                  </span>
                  <div className="flex max-w-72 flex-col gap-1">
                    <span className="text-balance font-medium">{empty.title}</span>
                    <span className="text-pretty text-muted-foreground text-xs">{empty.body}</span>
                  </div>
                  {empty.action && (
                    <Button className={press} onClick={empty.action.run} size="sm" variant="outline">
                      {empty.action.label}
                    </Button>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-3">
          <AnimatePresence initial={false} mode="popLayout">
            {selectedVisible.length > 0 ? (
              <motion.div
                animate={{ y: 0, opacity: 1, scale: 1 }}
                aria-label="Bulk actions"
                className={cn(barSurface, "pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto p-1 [scrollbar-width:none]")}
                exit={{ y: 8, opacity: 0, scale: 0.97, transition: { duration: 0.12, ease: easeOut } }}
                initial={reduce ? { opacity: 0 } : { y: 16, opacity: 0, scale: 0.96 }}
                key="bulk"
                role="toolbar"
                transition={reduce ? { duration: 0.15 } : spring}
              >
                <span className="flex h-8 shrink-0 items-center gap-2 ps-2.5 pe-1.5 font-medium">
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground px-1.5 text-primary text-xs tabular-nums dark:bg-primary dark:text-primary-foreground">
                    <RollingNumber format={formatCount} value={selectedVisible.length} />
                  </span>
                  <span className="hidden @md:inline">selected</span>
                </span>
                <span className="h-5 w-px shrink-0 bg-primary-foreground/20 dark:bg-border" />
                <Menu>
                  <MenuTrigger className={barButton}>
                    <ArrowRightLeftIcon className="size-3.5 opacity-80" /> Move
                  </MenuTrigger>
                  <MenuPopup align="center" className={menuPop} side="top" sideOffset={8}>
                    <MenuGroup>
                      <MenuGroupLabel>Move to stage</MenuGroupLabel>
                      {crmStages.map((s) => (
                        <MenuItem key={s.value} onClick={() => updateMany(selectedVisible, { stage: s.value })}>
                          <span className="flex items-center gap-2">
                            <span className={cn("size-1.5 rounded-full", s.dot)} />
                            {s.label}
                          </span>
                        </MenuItem>
                      ))}
                    </MenuGroup>
                  </MenuPopup>
                </Menu>
                <Menu>
                  <MenuTrigger className={barButton}>
                    <UserRoundIcon className="size-3.5 opacity-80" /> Assign
                  </MenuTrigger>
                  <MenuPopup align="center" className={menuPop} side="top" sideOffset={8}>
                    <MenuGroup>
                      <MenuGroupLabel>Assign owner</MenuGroupLabel>
                      {owners.map((ow, i) => (
                        <MenuItem key={ow.id} onClick={() => updateMany(selectedVisible, { ownerId: ow.id })}>
                          <span className="flex items-center gap-2">
                            <OwnerAvatar index={i} owner={ow} size={5} />
                            {ow.name}
                          </span>
                        </MenuItem>
                      ))}
                    </MenuGroup>
                  </MenuPopup>
                </Menu>
                <button
                  className={cn(barButton, "hover:bg-destructive hover:text-white dark:hover:bg-destructive dark:hover:text-white")}
                  onClick={deleteSelected}
                  type="button"
                >
                  <Trash2Icon className="size-3.5 opacity-80" /> Delete
                </button>
                <button
                  aria-label="Clear selection"
                  className={cn(barButton, "w-8 justify-center px-0")}
                  onClick={() => setSelected([])}
                  type="button"
                >
                  <XIcon className="size-4" />
                </button>
              </motion.div>
            ) : undo ? (
              <motion.div
                animate={{ y: 0, opacity: 1, scale: 1 }}
                className={cn(barSurface, "pointer-events-auto flex items-center gap-1 p-1 ps-4")}
                exit={{ y: 8, opacity: 0, scale: 0.97, transition: { duration: 0.12, ease: easeOut } }}
                initial={reduce ? { opacity: 0 } : { y: 16, opacity: 0, scale: 0.96 }}
                key="undo"
                role="status"
                transition={reduce ? { duration: 0.15 } : spring}
              >
                <span className="pe-2 tabular-nums">
                  Deleted {undo.ids.length} {undo.ids.length === 1 ? "company" : "companies"}
                </span>
                <button className={barButton} onClick={undoDelete} type="button">
                  <Undo2Icon className="size-3.5 opacity-80" /> Undo
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
