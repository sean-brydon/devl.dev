"use client";

import {
  ArrowRightIcon,
  Building2Icon,
  CalendarClockIcon,
  ChartNoAxesColumnIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleCheckIcon,
  Clock3Icon,
  CoffeeIcon,
  EyeIcon,
  InboxIcon,
  KanbanIcon,
  type LucideIcon,
  MailIcon,
  MoonIcon,
  PhoneIcon,
  ReplyIcon,
  SettingsIcon,
  SunriseIcon,
  UserMinusIcon,
  XIcon,
} from "lucide-react";
import {
  AnimatePresence,
  animate,
  MotionConfig,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type DealStage = "lead" | "qualified" | "proposal" | "negotiation" | "won";
export type Engagement = "hot" | "warm" | "cooling" | "cold";
export type FocusKind = "quiet" | "opened" | "champion" | "overdue" | "replied";
export type FocusAction = "email" | "call" | "snooze";

export interface PipelineStage {
  id: DealStage;
  label: string;
  probability: number;
}

export interface DealOwner {
  id: string;
  name: string;
  role?: string;
}

export interface DealContact {
  name: string;
  role: string;
  tag?: { label: string; tone: "good" | "bad" | "neutral" };
}

export interface DealActivity {
  label: string;
  when: string;
}

export interface Deal {
  id: string;
  company: string;
  domain: string;
  stage: DealStage;
  value: number;
  ownerId: string;
  daysInStage: number;
  engagement: Engagement;
  lastTouch: string;
  closeLabel: string;
  nextStep: string;
  contacts: DealContact[];
  activity: DealActivity[];
  note?: string;
}

export interface FocusSignal {
  id: string;
  dealId: string;
  kind: FocusKind;
  headline: string;
  detail: string;
  contact: string;
  tag: string;
}

export interface PipelineTodayProps {
  deals?: Deal[];
  signals?: FocusSignal[];
  owners?: DealOwner[];
  stages?: PipelineStage[];
  currentUserId?: string;
  workspace?: string;
  dateLabel?: string;
  greeting?: string;
  target?: number;
  forecastLabel?: string;
  onDealMove?: (dealId: string, stage: DealStage, index: number) => void;
  className?: string;
}

export const defaultStages: PipelineStage[] = [
  { id: "lead", label: "Lead", probability: 0.1 },
  { id: "qualified", label: "Qualified", probability: 0.25 },
  { id: "proposal", label: "Proposal", probability: 0.5 },
  { id: "negotiation", label: "Negotiation", probability: 0.75 },
  { id: "won", label: "Won", probability: 1 },
];

export const defaultOwners: DealOwner[] = [
  { id: "maren", name: "Maren Kole", role: "Account executive" },
  { id: "jonah", name: "Jonah Ifeanyi", role: "Account executive" },
  { id: "sofia", name: "Sofia Lindqvist", role: "Account executive" },
  { id: "ravi", name: "Ravi Castellano", role: "Sales lead" },
];

export const defaultDeals: Deal[] = [
  {
    id: "pemberton",
    company: "Pemberton & Vale",
    domain: "pembertonvale.law",
    stage: "lead",
    value: 12000,
    ownerId: "sofia",
    daysInStage: 4,
    engagement: "warm",
    lastTouch: "4d ago",
    closeLabel: "Jan 15",
    nextStep: "Discovery call with Priya to map their intake process",
    contacts: [{ name: "Priya Nair", role: "Operations director" }],
    activity: [{ label: "Inbound form: intake routing for 40 lawyers", when: "Oct 23" }],
  },
  {
    id: "mosswood",
    company: "Mosswood Bakery",
    domain: "mosswood.co",
    stage: "lead",
    value: 6400,
    ownerId: "ravi",
    daysInStage: 11,
    engagement: "cooling",
    lastTouch: "2w ago",
    closeLabel: "Feb 1",
    nextStep: "Send the three-location pricing sheet",
    contacts: [{ name: "Elsie Bram", role: "Owner" }],
    activity: [{ label: "Met at the regional food fair", when: "Oct 13" }],
  },
  {
    id: "wrenfield",
    company: "Wrenfield Clinics",
    domain: "wrenfield.health",
    stage: "lead",
    value: 22000,
    ownerId: "maren",
    daysInStage: 2,
    engagement: "hot",
    lastTouch: "Yesterday",
    closeLabel: "Dec 12",
    nextStep: "Confirm Thursday demo and invite their IT lead",
    contacts: [
      { name: "Hugo Ferrant", role: "Head of patient ops", tag: { label: "Champion", tone: "good" } },
      { name: "Bea Lund", role: "IT manager" },
    ],
    activity: [
      { label: "Hugo booked a demo for Thursday", when: "Yesterday" },
      { label: "Webinar sign-up", when: "Oct 21" },
    ],
  },
  {
    id: "oakhollow",
    company: "Oakhollow Studio",
    domain: "oakhollow.studio",
    stage: "qualified",
    value: 18000,
    ownerId: "maren",
    daysInStage: 6,
    engagement: "warm",
    lastTouch: "3d ago",
    closeLabel: "Dec 3",
    nextStep: "Scope the agency plan with Rosa",
    contacts: [{ name: "Rosa Quint", role: "Studio director", tag: { label: "Champion", tone: "good" } }],
    activity: [{ label: "Discovery call, 32 min", when: "Oct 24" }],
  },
  {
    id: "juniper",
    company: "Juniper Ridge Health",
    domain: "juniperridge.care",
    stage: "qualified",
    value: 39000,
    ownerId: "sofia",
    daysInStage: 8,
    engagement: "warm",
    lastTouch: "2d ago",
    closeLabel: "Nov 20",
    nextStep: "Security questionnaire due Friday",
    contacts: [{ name: "Owen Achebe", role: "Compliance lead" }],
    activity: [{ label: "Security questionnaire received", when: "Oct 25" }],
  },
  {
    id: "driftline",
    company: "Driftline Media",
    domain: "driftline.fm",
    stage: "qualified",
    value: 15500,
    ownerId: "maren",
    daysInStage: 5,
    engagement: "hot",
    lastTouch: "Today",
    closeLabel: "Nov 14",
    nextStep: "Price out 12 seats with the annual discount",
    contacts: [
      { name: "Mika Sato", role: "Head of production", tag: { label: "Champion", tone: "good" } },
      { name: "Jules Arden", role: "Finance" },
    ],
    activity: [
      { label: "Mika replied: ready to talk pricing", when: "Today, 8:12" },
      { label: "Trial reached 9 active seats", when: "Oct 24" },
    ],
  },
  {
    id: "brightwater",
    company: "Brightwater Labs",
    domain: "brightwater.bio",
    stage: "proposal",
    value: 46500,
    ownerId: "maren",
    daysInStage: 6,
    engagement: "hot",
    lastTouch: "Today",
    closeLabel: "Nov 12",
    nextStep: "Walk Theo through pricing options on a call",
    contacts: [
      { name: "Theo Marsh", role: "VP research ops", tag: { label: "Champion", tone: "good" } },
      { name: "Clara Ng", role: "Procurement", tag: { label: "Economic buyer", tone: "neutral" } },
    ],
    activity: [
      { label: "Theo opened the proposal (2nd time)", when: "Today, 9:41" },
      { label: "Theo opened the proposal", when: "Today, 8:05" },
      { label: "Proposal sent by you", when: "Oct 21" },
    ],
    note: "Budget is approved for Q4. Clara needs the DPA before signature.",
  },
  {
    id: "ferrovia",
    company: "Ferrovia Transit",
    domain: "ferrovia.city",
    stage: "proposal",
    value: 67000,
    ownerId: "maren",
    daysInStage: 19,
    engagement: "cooling",
    lastTouch: "8d ago",
    closeLabel: "Oct 24",
    nextStep: "Ask Lotte where procurement has it",
    contacts: [
      { name: "Lotte Vos", role: "Digital programme lead", tag: { label: "Champion", tone: "good" } },
      { name: "Bram Okon", role: "Procurement" },
    ],
    activity: [
      { label: "Lotte: sent to procurement", when: "Oct 19" },
      { label: "Proposal sent by you", when: "Oct 8" },
    ],
    note: "City budget cycle ends in December. Procurement wants three references.",
  },
  {
    id: "tessellate",
    company: "Tessellate Robotics",
    domain: "tessellate.dev",
    stage: "proposal",
    value: 52000,
    ownerId: "jonah",
    daysInStage: 3,
    engagement: "warm",
    lastTouch: "5h ago",
    closeLabel: "Oct 30",
    nextStep: "Legal review of the order form",
    contacts: [{ name: "Ada Whitlock", role: "CTO", tag: { label: "Champion", tone: "good" } }],
    activity: [{ label: "Order form sent to legal", when: "Today, 7:30" }],
  },
  {
    id: "halcyon",
    company: "Halcyon Freight",
    domain: "halcyonfreight.co",
    stage: "negotiation",
    value: 84000,
    ownerId: "maren",
    daysInStage: 12,
    engagement: "cold",
    lastTouch: "9d ago",
    closeLabel: "Oct 29",
    nextStep: "Send the security pack Ines asked for",
    contacts: [
      { name: "Ines Okafor", role: "Head of logistics IT", tag: { label: "Champion", tone: "good" } },
      { name: "Marcus Hale", role: "COO", tag: { label: "Economic buyer", tone: "neutral" } },
    ],
    activity: [
      { label: "Ines asked for the security pack", when: "Oct 18" },
      { label: "Redlines returned on the MSA", when: "Oct 15" },
    ],
    note: "Marcus wants go-live before peak season in January.",
  },
  {
    id: "quillstone",
    company: "Quillstone Analytics",
    domain: "quillstone.ai",
    stage: "negotiation",
    value: 120000,
    ownerId: "maren",
    daysInStage: 9,
    engagement: "cooling",
    lastTouch: "6d ago",
    closeLabel: "Nov 8",
    nextStep: "Find a new sponsor before the renewal date",
    contacts: [
      { name: "Dana Reyes", role: "Former VP data", tag: { label: "Left Oct 19", tone: "bad" } },
      { name: "Anil Bhatt", role: "CFO", tag: { label: "Economic buyer", tone: "neutral" } },
      { name: "Wren Castillo", role: "Data platform lead" },
    ],
    activity: [
      { label: "Dana's out-of-office: no longer with Quillstone", when: "Oct 21" },
      { label: "Renewal quote sent by you", when: "Oct 14" },
    ],
    note: "Renewal plus 40 seats. Wren runs the platform day to day and likes it.",
  },
  {
    id: "cinderpath",
    company: "Cinderpath Games",
    domain: "cinderpath.gg",
    stage: "negotiation",
    value: 28000,
    ownerId: "ravi",
    daysInStage: 4,
    engagement: "warm",
    lastTouch: "2d ago",
    closeLabel: "Nov 4",
    nextStep: "Agree on the multi-year discount",
    contacts: [{ name: "Leo Brandt", role: "Studio head" }],
    activity: [{ label: "Asked for a two-year price", when: "Oct 25" }],
  },
  {
    id: "saltmarsh",
    company: "Saltmarsh Outdoor",
    domain: "saltmarsh.shop",
    stage: "won",
    value: 31000,
    ownerId: "jonah",
    daysInStage: 19,
    engagement: "hot",
    lastTouch: "Today",
    closeLabel: "Oct 8",
    nextStep: "Kick-off with onboarding team",
    contacts: [{ name: "Nell Harper", role: "E-commerce lead" }],
    activity: [{ label: "Contract signed", when: "Oct 8" }],
  },
  {
    id: "larkspur",
    company: "Larkspur Energy",
    domain: "larkspur.energy",
    stage: "won",
    value: 74000,
    ownerId: "sofia",
    daysInStage: 25,
    engagement: "hot",
    lastTouch: "Yesterday",
    closeLabel: "Oct 2",
    nextStep: "Introduce the customer success manager",
    contacts: [{ name: "Ravi Mendes", role: "Grid operations" }],
    activity: [{ label: "Contract signed", when: "Oct 2" }],
  },
];

export const defaultSignals: FocusSignal[] = [
  {
    id: "s-brightwater",
    dealId: "brightwater",
    kind: "opened",
    headline: "opened the proposal twice today",
    detail: "Theo spent four minutes on pricing. A good moment to call.",
    contact: "Theo Marsh",
    tag: "Opened twice",
  },
  {
    id: "s-halcyon",
    dealId: "halcyon",
    kind: "quiet",
    headline: "went quiet 9 days ago",
    detail: "Ines asked for the security pack on Oct 18. Nothing since.",
    contact: "Ines Okafor",
    tag: "Quiet 9 days",
  },
  {
    id: "s-quillstone",
    dealId: "quillstone",
    kind: "champion",
    headline: "renewal in 12 days, champion left",
    detail: "Dana Reyes left on Oct 19. No new sponsor named yet.",
    contact: "Anil Bhatt",
    tag: "Champion left",
  },
  {
    id: "s-driftline",
    dealId: "driftline",
    kind: "replied",
    headline: "replied: ready to talk pricing",
    detail: "Mika wants options for 12 seats before Friday.",
    contact: "Mika Sato",
    tag: "Replied today",
  },
  {
    id: "s-ferrovia",
    dealId: "ferrovia",
    kind: "overdue",
    headline: "is 3 days past its close date",
    detail: "Still in Proposal. Move the date or nudge procurement.",
    contact: "Lotte Vos",
    tag: "3 days overdue",
  },
];

const ease = [0.23, 1, 0.32, 1] as const;
const glide = { type: "spring", stiffness: 520, damping: 42 } as const;
const land = { type: "spring", stiffness: 380, damping: 30 } as const;

const stageDot: Record<DealStage, string> = {
  lead: "bg-muted-foreground/50",
  qualified: "bg-sky-500 dark:bg-sky-400",
  proposal: "bg-amber-500 dark:bg-amber-400",
  negotiation: "bg-violet-500 dark:bg-violet-400",
  won: "bg-emerald-500 dark:bg-emerald-400",
};

const engagementMeta: Record<Engagement, { label: string; level: number; bar: string; text: string }> = {
  hot: { label: "Hot", level: 4, bar: "bg-emerald-500 dark:bg-emerald-400", text: "text-emerald-700 dark:text-emerald-300" },
  warm: { label: "Warm", level: 3, bar: "bg-emerald-500 dark:bg-emerald-400", text: "text-muted-foreground" },
  cooling: { label: "Cooling", level: 2, bar: "bg-amber-500 dark:bg-amber-400", text: "text-amber-700 dark:text-amber-300" },
  cold: { label: "Cold", level: 1, bar: "bg-rose-500 dark:bg-rose-400", text: "text-rose-700 dark:text-rose-300" },
};

const warmer: Record<Engagement, Engagement> = { cold: "cooling", cooling: "warm", warm: "hot", hot: "hot" };

const signalMeta: Record<FocusKind, { icon: LucideIcon; tile: string; text: string }> = {
  quiet: {
    icon: MoonIcon,
    tile: "bg-amber-500/12 text-amber-700 dark:bg-amber-400/14 dark:text-amber-300",
    text: "text-amber-700 dark:text-amber-300",
  },
  opened: {
    icon: EyeIcon,
    tile: "bg-sky-500/12 text-sky-700 dark:bg-sky-400/14 dark:text-sky-300",
    text: "text-sky-700 dark:text-sky-300",
  },
  champion: {
    icon: UserMinusIcon,
    tile: "bg-rose-500/12 text-rose-700 dark:bg-rose-400/14 dark:text-rose-300",
    text: "text-rose-700 dark:text-rose-300",
  },
  overdue: {
    icon: CalendarClockIcon,
    tile: "bg-orange-500/12 text-orange-700 dark:bg-orange-400/14 dark:text-orange-300",
    text: "text-orange-700 dark:text-orange-300",
  },
  replied: {
    icon: ReplyIcon,
    tile: "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/14 dark:text-emerald-300",
    text: "text-emerald-700 dark:text-emerald-300",
  },
};

const monogramTones = [
  "bg-amber-500/15 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200",
  "bg-sky-500/15 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200",
  "bg-violet-500/15 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200",
  "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200",
  "bg-rose-500/15 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200",
  "bg-teal-500/15 text-teal-800 dark:bg-teal-400/15 dark:text-teal-200",
  "bg-orange-500/15 text-orange-800 dark:bg-orange-400/15 dark:text-orange-200",
];

const ownerTones = [
  "bg-orange-500/20 text-orange-900 dark:bg-orange-400/25 dark:text-orange-100",
  "bg-teal-500/20 text-teal-900 dark:bg-teal-400/25 dark:text-teal-100",
  "bg-violet-500/20 text-violet-900 dark:bg-violet-400/25 dark:text-violet-100",
  "bg-sky-500/20 text-sky-900 dark:bg-sky-400/25 dark:text-sky-100",
];

const burstTones = [
  "bg-emerald-500 dark:bg-emerald-400",
  "bg-amber-500 dark:bg-amber-400",
  "bg-sky-500 dark:bg-sky-400",
  "bg-violet-500 dark:bg-violet-400",
  "bg-rose-500 dark:bg-rose-400",
  "bg-emerald-500 dark:bg-emerald-400",
];

const fullMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function money(n: number) {
  return fullMoney.format(Math.round(n));
}

function shortMoney(n: number) {
  const v = Math.round(n);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `$${v}`;
}

function signedMoney(n: number) {
  return `${n > 0 ? "+" : "−"}${money(Math.abs(n))}`;
}

function initials(name: string) {
  return name
    .replace(/[^A-Za-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function shortName(company: string) {
  return company.split(/\s+/)[0].replace(/[^A-Za-z-]/g, "");
}

function hashIndex(s: string, n: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % n;
}

function scaleOf(el: HTMLElement) {
  return el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
}

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

function moveDeal(list: Deal[], id: string, stage: DealStage, index: number, patch?: Partial<Deal>) {
  const moving = list.find((d) => d.id === id);
  if (!moving) return list;
  const rest = list.filter((d) => d.id !== id);
  const column = rest.filter((d) => d.stage === stage);
  const next: Deal = { ...moving, stage, ...(moving.stage !== stage ? { daysInStage: 0 } : {}), ...patch };
  const anchor = column[index];
  const at = anchor ? rest.indexOf(anchor) : column.length ? rest.indexOf(column[column.length - 1]) + 1 : rest.length;
  return [...rest.slice(0, at), next, ...rest.slice(at)];
}

type Rect = { left: number; top: number; width: number; rotate?: number; scale?: number };
type RectStore = RefObject<Map<string, Rect>>;

function Rolling({ value, format, reduce }: { value: number; format: (n: number) => string; reduce: boolean }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, format);
  useEffect(() => {
    if (reduce) {
      mv.jump(value);
      return;
    }
    const controls = animate(mv, value, { type: "spring", stiffness: 160, damping: 26 });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return (
    <motion.span aria-hidden className="tabular-nums">
      {text}
    </motion.span>
  );
}

function Monogram({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center font-semibold tracking-tight",
        monogramTones[hashIndex(name, monogramTones.length)],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

function OwnerAvatar({ owner, index, className }: { owner?: DealOwner; index: number; className?: string }) {
  return (
    <Avatar className={cn("[--avatar-size:--spacing(5)]", className)}>
      <AvatarFallback className={cn("font-semibold text-[9px]", ownerTones[index % ownerTones.length])}>
        {owner ? initials(owner.name) : "?"}
      </AvatarFallback>
    </Avatar>
  );
}

function SignalBars({ engagement }: { engagement: Engagement }) {
  const meta = engagementMeta[engagement];
  return (
    <span aria-hidden className="flex h-2.5 shrink-0 items-end gap-[2px]">
      {[0, 1, 2, 3].map((i) => (
        <span
          className={cn(
            "w-[3px] rounded-[1px] transition-colors duration-300",
            i < meta.level ? meta.bar : "bg-foreground/12",
          )}
          key={i}
          style={{ height: 4 + i * 2 }}
        />
      ))}
    </span>
  );
}

function Burst({ reduce }: { reduce: boolean }) {
  if (reduce) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2">
      {burstTones.map((tone, i) => {
        const angle = (i / burstTones.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <motion.span
            animate={{ x: Math.cos(angle) * 15, y: Math.sin(angle) * 15, opacity: [0, 1, 0], scale: [0.6, 1, 0.6] }}
            className={cn("absolute -top-[2px] -left-[2px] size-1 rounded-full", tone)}
            initial={{ x: 0, y: 0, opacity: 0 }}
            key={i}
            transition={{ duration: 0.6, ease, opacity: { duration: 0.6, times: [0, 0.2, 1] } }}
          />
        );
      })}
    </span>
  );
}

interface FaceProps {
  deal: Deal;
  owner?: DealOwner;
  ownerIndex: number;
  flag?: FocusSignal;
  celebrate?: number;
  touched?: number;
  reduce: boolean;
  className?: string;
}

function DealFace({ deal, owner, ownerIndex, flag, celebrate, touched, reduce, className }: FaceProps) {
  const engagement = engagementMeta[deal.engagement];
  const won = deal.stage === "won";
  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card p-2.5 shadow-xs/5 transition-[border-color,background-color,box-shadow] duration-200",
        className,
      )}
    >
      {celebrate ? (
        <motion.span
          animate={{ opacity: 0 }}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-emerald-500/12 dark:bg-emerald-400/12"
          initial={{ opacity: 1 }}
          key={`c${celebrate}`}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }}
        />
      ) : null}
      {touched ? (
        <motion.span
          animate={{ opacity: 0 }}
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-[inherit] ring-2 ring-sky-500/50 dark:ring-sky-400/50"
          initial={{ opacity: 1 }}
          key={`t${touched}`}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      ) : null}
      <div className="relative truncate font-medium">{deal.company}</div>
      <div className="relative mt-2 flex items-baseline justify-between gap-2">
        <span className="font-medium tabular-nums">{money(deal.value)}</span>
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            !won && deal.daysInStage >= 14 ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground",
          )}
        >
          {won ? deal.closeLabel : deal.daysInStage === 0 ? "Just moved" : `${deal.daysInStage}d in stage`}
        </span>
      </div>
      <div className="relative mt-1.5 flex h-[18px] items-center gap-1.5 text-xs">
        {won ? (
          <>
            <span className="relative flex size-3.5 shrink-0 items-center justify-center">
              <motion.span
                animate={{ scale: 1, opacity: 1 }}
                className="flex"
                initial={celebrate && !reduce ? { scale: 0.6, opacity: 0 } : false}
                key={`check-${celebrate ?? 0}`}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
              >
                <CircleCheckIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              </motion.span>
              {celebrate ? <Burst key={`burst-${celebrate}`} reduce={reduce} /> : null}
            </span>
            <span className="truncate text-emerald-700 dark:text-emerald-300">Closed won</span>
            <OwnerAvatar className="ms-auto [--avatar-size:18px]" index={ownerIndex} owner={owner} />
          </>
        ) : (
          <>
            <SignalBars engagement={deal.engagement} />
            {flag ? (
              <span className={cn("truncate", signalMeta[flag.kind].text)}>{flag.tag}</span>
            ) : (
              <span className={cn("truncate", deal.engagement === "warm" ? "text-muted-foreground" : engagement.text)}>
                {deal.lastTouch}
              </span>
            )}
            <OwnerAvatar className="ms-auto [--avatar-size:18px]" index={ownerIndex} owner={owner} />
          </>
        )}
      </div>
    </div>
  );
}

function FlipSlot({
  flipKey,
  rects,
  getScale,
  reduce,
  className,
  children,
}: {
  flipKey: string;
  rects: RectStore;
  getScale: () => number;
  reduce: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(0);
  const scale = useMotionValue(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const prev = rects.current.get(flipKey);
    rects.current.set(flipKey, { left: box.left, top: box.top, width: box.width });
    if (!prev || reduce || box.width === 0 || prev.width === 0) return;
    const s = getScale();
    const dx = (prev.left - box.left) / s;
    const dy = (prev.top - box.top) / s;
    const dropped = prev.rotate !== undefined;
    if (!dropped && Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    x.jump(dx + (dropped ? 0 : x.get()));
    y.jump(dy + (dropped ? 0 : y.get()));
    const transition = dropped ? land : glide;
    animate(x, 0, transition);
    animate(y, 0, transition);
    if (dropped) {
      rotate.jump(prev.rotate ?? 0);
      scale.jump(prev.scale ?? 1);
      animate(rotate, 0, land);
      animate(scale, 1, land);
    }
  });

  return (
    <li className={cn("relative", className)} ref={ref}>
      <motion.div style={{ x, y, rotate, scale }}>
        {children}
      </motion.div>
    </li>
  );
}

function SignalItem({
  signal,
  deal,
  stageLabel,
  resolving,
  reduce,
  onAct,
  onOpen,
  onHint,
}: {
  signal: FocusSignal;
  deal?: Deal;
  stageLabel: string;
  resolving?: FocusAction;
  reduce: boolean;
  onAct: (signal: FocusSignal, action: FocusAction) => void;
  onOpen: (dealId: string) => void;
  onHint: (dealId: string | null) => void;
}) {
  const meta = signalMeta[signal.kind];
  const Icon = meta.icon;
  const company = deal?.company ?? "";
  const outcome =
    resolving === "email"
      ? `Follow-up sent to ${signal.contact}`
      : resolving === "call"
        ? `Call with ${signal.contact} logged`
        : "Snoozed until tomorrow";

  return (
    <motion.li
      className="overflow-hidden"
      exit={reduce ? { opacity: 0, transition: { duration: 0.15 } } : { height: 0, opacity: 0 }}
      initial={false}
      onBlur={() => onHint(null)}
      onFocus={() => onHint(signal.dealId)}
      onMouseEnter={() => onHint(signal.dealId)}
      onMouseLeave={() => onHint(null)}
      transition={{ height: { duration: 0.32, ease }, opacity: { duration: 0.18 } }}
    >
      <div className="pb-2">
        <div className="relative rounded-xl border bg-card p-3 shadow-xs/5">
          <div aria-hidden={resolving ? true : undefined} className="flex gap-3">
            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", meta.tile)}>
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-pretty leading-5">
                <button
                  aria-label={`Open ${company}`}
                  className="relative cursor-pointer rounded-sm font-medium outline-none after:absolute after:-inset-1 after:content-[''] hover:underline hover:underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onOpen(signal.dealId)}
                  tabIndex={resolving ? -1 : undefined}
                  type="button"
                >
                  {shortName(company)}
                </button>{" "}
                {signal.headline}
              </p>
              <p className="mt-0.5 text-pretty text-muted-foreground text-xs leading-4">{signal.detail}</p>
              {deal ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
                  <span className={cn("size-1.5 rounded-full", stageDot[deal.stage])} />
                  {stageLabel} · {money(deal.value)}
                </p>
              ) : null}
            </div>
          </div>
          <div aria-hidden={resolving ? true : undefined} className="mt-2.5 flex flex-wrap gap-1.5">
            <Button
              aria-label={`Email ${signal.contact}`}
              disabled={Boolean(resolving)}
              onClick={() => onAct(signal, "email")}
              size="xs"
              variant="outline"
            >
              <MailIcon />
              Email
            </Button>
            <Button
              aria-label={`Log call with ${signal.contact}`}
              disabled={Boolean(resolving)}
              onClick={() => onAct(signal, "call")}
              size="xs"
              variant="outline"
            >
              <PhoneIcon />
              Log call
            </Button>
            <Button
              aria-label={`Snooze ${company} until tomorrow`}
              disabled={Boolean(resolving)}
              onClick={() => onAct(signal, "snooze")}
              size="xs"
              variant="ghost"
            >
              <Clock3Icon />
              Snooze
            </Button>
          </div>
          <AnimatePresence>
            {resolving ? (
              <motion.div
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center gap-3 rounded-[inherit] bg-card px-3"
                initial={{ opacity: 0 }}
                transition={{ duration: 0.16, ease }}
              >
                <motion.span
                  animate={{ scale: 1 }}
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full",
                    resolving === "snooze"
                      ? "bg-muted text-muted-foreground"
                      : "bg-emerald-500/14 text-emerald-700 dark:bg-emerald-400/16 dark:text-emerald-300",
                  )}
                  initial={{ scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 520, damping: 20 }}
                >
                  {resolving === "snooze" ? <Clock3Icon className="size-3.5" /> : <CheckIcon className="size-3.5" />}
                </motion.span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-pretty font-medium leading-5">{outcome}</span>
                  <span className="text-pretty text-muted-foreground text-xs">
                    {resolving === "snooze" ? `${company} is back in Focus at 9:00` : `${company} · touched just now`}
                  </span>
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.li>
  );
}

function DetailPanel({
  deal,
  owner,
  ownerIndex,
  stages,
  onClose,
  onMove,
  panelRef,
  headingId,
}: {
  deal: Deal;
  owner?: DealOwner;
  ownerIndex: number;
  stages: PipelineStage[];
  onClose: () => void;
  onMove: (stage: DealStage) => void;
  panelRef: RefObject<HTMLDivElement | null>;
  headingId: string;
}) {
  const at = stages.findIndex((s) => s.id === deal.stage);
  const stage = stages[at];
  const next = stages[at + 1];
  const champion = deal.contacts.find((c) => c.tag?.tone === "good") ?? deal.contacts[0];

  return (
    <div
      aria-labelledby={headingId}
      className="flex h-full min-h-0 flex-col outline-none"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
      ref={panelRef}
      role="region"
      tabIndex={-1}
    >
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <Monogram className="size-9 rounded-[10px] text-xs" name={deal.company} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="truncate font-heading font-semibold text-base" id={headingId}>
            {deal.company}
          </h2>
          <span className="truncate text-muted-foreground text-xs">{deal.domain}</span>
        </div>
        <Button aria-label="Close details" className="-me-1.5 -mt-1" onClick={onClose} size="icon-sm" variant="ghost">
          <XIcon />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 rounded-xl border p-3 text-xs">
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Value</dt>
            <dd className="font-medium text-sm tabular-nums">{money(deal.value)}</dd>
          </div>
          <div className="flex flex-col items-start gap-1">
            <dt className="text-muted-foreground">Stage</dt>
            <dd>
              <Menu>
                <MenuTrigger
                  aria-label={`Stage: ${stage?.label}. Change stage`}
                  className="-mx-1.5 -my-0.5 flex h-6 cursor-pointer items-center gap-1.5 rounded-md px-1.5 font-medium text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent"
                >
                  <span className={cn("size-1.5 rounded-full", stageDot[deal.stage])} />
                  {stage?.label}
                  <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                </MenuTrigger>
                <MenuPopup
                  align="start"
                  className="w-44 transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0"
                >
                  <MenuRadioGroup onValueChange={(v) => onMove(v as DealStage)} value={deal.stage}>
                    {stages.map((s) => (
                      <MenuRadioItem key={s.id} value={s.id}>
                        <span className="flex w-full items-center gap-2">
                          <span className={cn("size-1.5 rounded-full", stageDot[s.id])} />
                          <span className="flex-1">{s.label}</span>
                          <span className="font-mono text-muted-foreground text-xs">{Math.round(s.probability * 100)}%</span>
                        </span>
                      </MenuRadioItem>
                    ))}
                  </MenuRadioGroup>
                </MenuPopup>
              </Menu>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">Owner</dt>
            <dd className="flex min-w-0 items-center gap-1.5">
              <OwnerAvatar index={ownerIndex} owner={owner} />
              <span className="truncate font-medium text-sm">{owner?.name.split(" ")[0]}</span>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">{deal.stage === "won" ? "Closed" : "Close date"}</dt>
            <dd className="font-medium text-sm tabular-nums">{deal.closeLabel}</dd>
          </div>
        </dl>

        <section className="mt-5">
          <h3 className="font-medium text-muted-foreground text-xs">Next step</h3>
          <p className="mt-1.5 flex gap-2 text-pretty">
            <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            {deal.nextStep}
          </p>
        </section>

        <section className="mt-5">
          <h3 className="font-medium text-muted-foreground text-xs">Contacts</h3>
          <ul className="mt-2 flex flex-col gap-2.5">
            {deal.contacts.map((c, i) => (
              <li className="flex items-center gap-2.5" key={c.name}>
                <Avatar className="[--avatar-size:--spacing(7)]">
                  <AvatarFallback className={cn("font-semibold text-[10px]", ownerTones[(i + 2) % ownerTones.length])}>
                    {initials(c.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("truncate font-medium", c.tag?.tone === "bad" && "text-muted-foreground line-through decoration-foreground/30")}>
                    {c.name}
                  </span>
                  <span className="truncate text-muted-foreground text-xs">{c.role}</span>
                </span>
                {c.tag ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 font-medium text-[11px]",
                      c.tag.tone === "good" && "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/14 dark:text-emerald-300",
                      c.tag.tone === "bad" && "bg-rose-500/12 text-rose-700 dark:bg-rose-400/14 dark:text-rose-300",
                      c.tag.tone === "neutral" && "bg-muted text-muted-foreground",
                    )}
                  >
                    {c.tag.label}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-5">
          <h3 className="font-medium text-muted-foreground text-xs">Last touches</h3>
          <ol className="mt-2 flex flex-col">
            {deal.activity.slice(0, 3).map((a, i, list) => (
              <li className="relative flex gap-3 pb-3 last:pb-0" key={`${a.label}-${a.when}`}>
                {i < list.length - 1 ? <span aria-hidden className="absolute top-3 bottom-0 left-[3px] w-px bg-border" /> : null}
                <span
                  aria-hidden
                  className={cn("mt-1.5 size-[7px] shrink-0 rounded-full", i === 0 ? "bg-foreground/70" : "bg-foreground/20")}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-pretty">{a.label}</span>
                  <span className="text-muted-foreground text-xs">{a.when}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {deal.note ? (
          <section className="mt-5">
            <h3 className="font-medium text-muted-foreground text-xs">Notes</h3>
            <p className="mt-1.5 text-pretty rounded-xl bg-muted/60 p-3 text-sm dark:bg-muted/40">{deal.note}</p>
          </section>
        ) : null}
      </div>
      <div className="flex gap-2 border-t p-3">
        {next ? (
          <Button className="flex-1" onClick={() => onMove(next.id)} variant={next.id === "won" ? "default" : "outline"}>
            {next.id === "won" ? <CheckIcon /> : <ArrowRightIcon />}
            {next.id === "won" ? "Mark as won" : `Move to ${next.label}`}
          </Button>
        ) : (
          <span className="flex h-8 flex-1 items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300">
            <CircleCheckIcon className="size-4" />
            Closed won
          </span>
        )}
        {champion ? (
          <Button aria-label={`Email ${champion.name}`} size="icon" variant="outline">
            <MailIcon />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

type DragState = { id: string; width: number; height: number; origin: DealStage; pointerId: number };
type Lifted = { id: string; snapshot: Deal[] };

export function PipelineToday({
  deals: initialDeals = defaultDeals,
  signals = defaultSignals,
  owners = defaultOwners,
  stages = defaultStages,
  currentUserId = "maren",
  workspace = "Kestrel",
  dateLabel = "Tuesday, 27 October",
  greeting = "Good morning",
  target = 480000,
  forecastLabel = "Q4 weighted forecast",
  onDealMove,
  className,
}: PipelineTodayProps) {
  const reduce = useCalmMotion();
  const uid = useId();
  const [deals, setDeals] = useState(initialDeals);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [over, setOver] = useState<{ stage: DealStage; index: number } | null>(null);
  const [lifted, setLifted] = useState<Lifted | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileStage, setMobileStage] = useState<DealStage>("negotiation");
  const [tab, setTab] = useState<"board" | "focus">("board");
  const [handled, setHandled] = useState<string[]>([]);
  const [snoozed, setSnoozed] = useState<string[]>([]);
  const [resolving, setResolving] = useState<Record<string, FocusAction>>({});
  const [celebrate, setCelebrate] = useState<{ id: string; key: number } | null>(null);
  const [touched, setTouched] = useState<{ id: string; key: number } | null>(null);
  const [delta, setDelta] = useState<{ amount: number; key: number } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [hinted, setHinted] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const rects = useRef(new Map<string, Rect>());
  const pending = useRef<{ id: string; pointerId: number; x: number; y: number; el: HTMLElement } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const overRef = useRef<{ stage: DealStage; index: number } | null>(null);
  const grabOffset = useRef({ x: 0, y: 0 });
  const lastPointerX = useRef(0);
  const pendingFocus = useRef<string | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const counter = useRef(0);

  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const tiltTarget = useMotionValue(0);
  const tilt = useSpring(tiltTarget, { stiffness: 260, damping: 22 });

  const ids = { instructions: `${uid}-how`, detail: `${uid}-detail`, heading: `${uid}-heading`, rail: `${uid}-rail` };
  const order = stages.map((s) => s.id);
  const stageOf = (id: DealStage) => stages.find((s) => s.id === id) ?? stages[0];
  const prob = (id: DealStage) => stageOf(id).probability;
  const forecast = (list: Deal[]) => list.reduce((sum, d) => sum + d.value * prob(d.stage), 0);
  const ownerIndex = (id: string) => Math.max(0, owners.findIndex((o) => o.id === id));
  const ownerOf = (id: string) => owners.find((o) => o.id === id);
  const me = ownerOf(currentUserId);
  const getScale = () => (rootRef.current ? scaleOf(rootRef.current) : 1);

  const view = drag && over ? moveDeal(deals, drag.id, over.stage, over.index) : deals;
  const columns = Object.fromEntries(order.map((s) => [s, view.filter((d) => d.stage === s)])) as Record<DealStage, Deal[]>;
  const total = forecast(view);
  const won = view.filter((d) => d.stage === "won").reduce((sum, d) => sum + d.value, 0);

  const visibleSignals = signals.filter((s) => !handled.includes(s.id) && !snoozed.includes(s.id));
  const openSignals = visibleSignals.filter((s) => !resolving[s.id]);
  const flagFor = (dealId: string) => openSignals.find((s) => s.dealId === dealId);
  const selected = deals.find((d) => d.id === selectedId) ?? null;

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };

  useEffect(() => {
    const all = timers.current;
    return () => {
      for (const t of all) clearTimeout(t);
      all.clear();
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(() => rects.current.clear());
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    const el = [...(rootRef.current?.querySelectorAll<HTMLElement>(`[data-card-id="${id}"]`) ?? [])].find(
      (node) => node.offsetParent !== null,
    );
    if (el) {
      el.focus({ preventScroll: false });
      pendingFocus.current = null;
    }
  });

  useEffect(() => {
    if (selectedId) panelRef.current?.focus({ preventScroll: true });
  }, [selectedId]);

  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-drop-stage="${mobileStage}"]`);
    if (!row || !chip || row.scrollWidth <= row.clientWidth) return;
    const left = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
    row.scrollTo({ left: Math.max(0, left), behavior: reduce ? "auto" : "smooth" });
  }, [mobileStage, reduce]);

  const say = (text: string) => setAnnouncement((prev) => (prev === text ? `${text} ` : text));
  const nextKey = () => {
    counter.current += 1;
    return counter.current;
  };

  const settle = (before: Deal[], after: Deal[], id: string) => {
    const was = before.find((d) => d.id === id);
    const now = after.find((d) => d.id === id);
    if (!was || !now) return;
    const index = after.filter((d) => d.stage === now.stage).findIndex((d) => d.id === id);
    const diff = forecast(after) - forecast(before);
    setMobileStage(now.stage);
    if (was.stage === now.stage) {
      say(`${now.company} stays in ${stageOf(now.stage).label}, position ${index + 1}.`);
      return;
    }
    if (Math.round(diff) !== 0) {
      const key = nextKey();
      setDelta({ amount: diff, key });
      later(() => setDelta((d) => (d?.key === key ? null : d)), 2600);
    }
    if (now.stage === "won") {
      const stale = signals.filter((s) => s.dealId === id).map((s) => s.id);
      if (stale.length) setHandled((h) => [...h, ...stale.filter((s) => !h.includes(s))]);
      const key = nextKey();
      setCelebrate({ id, key });
      later(() => setCelebrate((c) => (c?.key === key ? null : c)), 1500);
    }
    say(
      `${now.company} moved to ${stageOf(now.stage).label}${now.stage === "won" ? ", closed won" : ""}. Forecast now ${money(forecast(after))}.`,
    );
    onDealMove?.(id, now.stage, index);
  };

  const commit = (id: string, stage: DealStage, index: number, base: Deal[] = deals) => {
    const original = base.find((d) => d.id === id);
    if (!original) return;
    const patch: Partial<Deal> =
      original.stage === stage ? {} : stage === "won" ? { closeLabel: "Today", lastTouch: "Just now" } : {};
    const after = moveDeal(base, id, stage, index, patch);
    setDeals(after);
    settle(base, after, id);
  };

  const moveFromPanel = (id: string, stage: DealStage) => {
    const len = deals.filter((d) => d.stage === stage && d.id !== id).length;
    commit(id, stage, len);
  };

  const endDrag = (dropped: boolean) => {
    const d = dragRef.current;
    const root = rootRef.current;
    if (!d || !root) return;
    const s = scaleOf(root);
    const box = root.getBoundingClientRect();
    rects.current.set(d.id, {
      left: box.left + dragX.get() * s,
      top: box.top + dragY.get() * s,
      width: d.width * s,
      rotate: tilt.get(),
      scale: 1.03,
    });
    const target = overRef.current;
    for (const key of [...rects.current.keys()]) if (key.startsWith("ph-")) rects.current.delete(key);
    dragRef.current = null;
    overRef.current = null;
    tiltTarget.jump(0);
    tilt.jump(0);
    setDrag(null);
    setOver(null);
    pendingFocus.current = d.id;
    if (root.hasPointerCapture(d.pointerId)) root.releasePointerCapture(d.pointerId);
    if (dropped && target) {
      commit(d.id, target.stage, target.index);
    } else {
      const deal = deals.find((x) => x.id === d.id);
      if (deal) say(`Move cancelled. ${deal.company} is back in ${stageOf(deal.stage).label}.`);
    }
  };

  const startDrag = (e: PointerEvent<HTMLElement>, p: NonNullable<typeof pending.current>) => {
    const root = rootRef.current;
    const deal = deals.find((d) => d.id === p.id);
    if (!root || !deal) return;
    const s = scaleOf(root);
    const rootBox = root.getBoundingClientRect();
    const box = p.el.getBoundingClientRect();
    grabOffset.current = { x: (p.x - box.left) / s, y: (p.y - box.top) / s };
    dragX.jump((e.clientX - rootBox.left) / s - grabOffset.current.x);
    dragY.jump((e.clientY - rootBox.top) / s - grabOffset.current.y);
    lastPointerX.current = e.clientX;
    const column = deals.filter((d) => d.stage === deal.stage);
    const state: DragState = { id: deal.id, width: box.width / s, height: box.height / s, origin: deal.stage, pointerId: p.pointerId };
    const start = { stage: deal.stage, index: column.findIndex((d) => d.id === deal.id) };
    dragRef.current = state;
    overRef.current = start;
    pending.current = null;
    root.setPointerCapture(p.pointerId);
    root.focus({ preventScroll: true });
    setDrag(state);
    setOver(start);
    say(`Picked up ${deal.company}. Drop it on a stage, or press Escape to cancel.`);
  };

  const onRootPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const root = rootRef.current;
    if (!d || !root || e.pointerId !== d.pointerId) return;
    const s = scaleOf(root);
    const box = root.getBoundingClientRect();
    dragX.set((e.clientX - box.left) / s - grabOffset.current.x);
    dragY.set((e.clientY - box.top) / s - grabOffset.current.y);
    if (!reduce) tiltTarget.set(Math.max(-5, Math.min(5, (e.clientX - lastPointerX.current) * 0.5)));
    lastPointerX.current = e.clientX;
    const zone = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-drop-stage]");
    if (!zone || !root.contains(zone)) return;
    const stage = zone.dataset.dropStage as DealStage;
    let index = deals.filter((x) => x.stage === stage && x.id !== d.id).length;
    if (zone.dataset.dropKind !== "chip") {
      const cards = [...zone.querySelectorAll<HTMLElement>("[data-card-id]")].filter((el) => el.dataset.cardId !== d.id);
      index = cards.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2 < e.clientY;
      }).length;
    }
    const prev = overRef.current;
    if (prev?.stage === stage && prev.index === index) return;
    overRef.current = { stage, index };
    setOver({ stage, index });
  };

  const onRootPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const root = rootRef.current;
    if (!d || !root || e.pointerId !== d.pointerId) return;
    const box = root.getBoundingClientRect();
    const inside = e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom;
    endDrag(inside);
  };

  const dropLifted = () => {
    if (!lifted) return;
    const origin = lifted.snapshot.find((d) => d.id === lifted.id);
    const current = deals.find((d) => d.id === lifted.id);
    setLifted(null);
    if (!origin || !current) return;
    const index = deals.filter((d) => d.stage === current.stage).findIndex((d) => d.id === current.id);
    const restored = origin.stage === current.stage ? origin : current;
    const base = lifted.snapshot;
    const after = moveDeal(base, current.id, current.stage, index, {
      daysInStage: restored.daysInStage,
      ...(origin.stage !== current.stage && current.stage === "won" ? { closeLabel: "Today", lastTouch: "Just now" } : {}),
    });
    setDeals(after);
    settle(base, after, current.id);
  };

  const cancelLifted = () => {
    if (!lifted) return;
    const deal = lifted.snapshot.find((d) => d.id === lifted.id);
    setDeals(lifted.snapshot);
    setLifted(null);
    pendingFocus.current = lifted.id;
    if (deal) {
      setMobileStage(deal.stage);
      say(`Move cancelled. ${deal.company} is back in ${stageOf(deal.stage).label}.`);
    }
  };

  const liveMove = (deal: Deal, stage: DealStage, index: number) => {
    const after = moveDeal(deals, deal.id, stage, index);
    const column = after.filter((d) => d.stage === stage);
    setDeals(after);
    setMobileStage(stage);
    pendingFocus.current = deal.id;
    say(`${stageOf(stage).label}, position ${column.findIndex((d) => d.id === deal.id) + 1} of ${column.length}.`);
  };

  const focusCard = (id: string, stage: DealStage) => {
    setMobileStage(stage);
    pendingFocus.current = id;
    const el = [...(rootRef.current?.querySelectorAll<HTMLElement>(`[data-card-id="${id}"]`) ?? [])].find(
      (node) => node.offsetParent !== null,
    );
    if (el) {
      el.focus();
      pendingFocus.current = null;
    }
  };

  const openDeal = (id: string) => {
    setSelectedId((cur) => (cur === id ? null : id));
  };

  const closeDetail = () => {
    if (selectedId) pendingFocus.current = selectedId;
    setSelectedId(null);
  };

  const onCardKeyDown = (e: KeyboardEvent<HTMLDivElement>, deal: Deal) => {
    if (dragRef.current) return;
    const column = deals.filter((d) => d.stage === deal.stage);
    const idx = column.findIndex((d) => d.id === deal.id);
    const at = order.indexOf(deal.stage);

    if (lifted?.id === deal.id) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const to = order[at + (e.key === "ArrowLeft" ? -1 : 1)];
        if (!to) return;
        liveMove(deal, to, Math.min(idx, deals.filter((d) => d.stage === to).length));
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const to = idx + (e.key === "ArrowUp" ? -1 : 1);
        if (to < 0 || to >= column.length) return;
        liveMove(deal, deal.stage, to);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        pendingFocus.current = deal.id;
        dropLifted();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cancelLifted();
      } else if (e.key === "Tab") {
        dropLifted();
      }
      return;
    }

    if (e.key === " ") {
      e.preventDefault();
      setLifted({ id: deal.id, snapshot: deals });
      say(
        `Picked up ${deal.company} in ${stageOf(deal.stage).label}. Left and right arrows change stage, up and down reorder, Space drops, Escape cancels.`,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      openDeal(deal.id);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const to = column[idx + (e.key === "ArrowUp" ? -1 : 1)];
      if (to) focusCard(to.id, to.stage);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const step = e.key === "ArrowLeft" ? -1 : 1;
      for (let i = at + step; i >= 0 && i < order.length; i += step) {
        const list = deals.filter((d) => d.stage === order[i]);
        if (list.length) {
          const to = list[Math.min(idx, list.length - 1)];
          focusCard(to.id, to.stage);
          break;
        }
      }
    }
  };

  const act = (signal: FocusSignal, action: FocusAction) => {
    if (resolving[signal.id]) return;
    const deal = deals.find((d) => d.id === signal.dealId);
    setResolving((r) => ({ ...r, [signal.id]: action }));
    railRef.current?.focus({ preventScroll: true });
    if (action !== "snooze") {
      setDeals((all) =>
        all.map((d) =>
          d.id === signal.dealId
            ? {
                ...d,
                engagement: warmer[d.engagement],
                lastTouch: "Just now",
                activity: [
                  {
                    label: action === "email" ? `You emailed ${signal.contact}` : `You logged a call with ${signal.contact}`,
                    when: "Just now",
                  },
                  ...d.activity,
                ],
              }
            : d,
        ),
      );
      setTouched({ id: signal.dealId, key: nextKey() });
    }
    const left = openSignals.length - 1;
    say(
      `${deal?.company ?? ""}: ${action === "email" ? `follow-up sent to ${signal.contact}` : action === "call" ? `call with ${signal.contact} logged` : "snoozed until tomorrow"}. ${left === 0 ? "Focus is clear." : `${left} left in Focus.`}`,
    );
    later(
      () => {
        setResolving((r) => {
          const { [signal.id]: _, ...rest } = r;
          return rest;
        });
        if (action === "snooze") setSnoozed((l) => [...l, signal.id]);
        else setHandled((l) => [...l, signal.id]);
      },
      reduce ? 800 : 1150,
    );
  };

  const firstName = me?.name.split(" ")[0] ?? "";
  const progress = Math.round((total / target) * 100);

  const navItems: { label: string; icon: LucideIcon; current?: boolean; badge?: boolean }[] = [
    { label: "Today", icon: SunriseIcon, current: true },
    { label: "Pipeline", icon: KanbanIcon },
    { label: "Accounts", icon: Building2Icon },
    { label: "Inbox", icon: InboxIcon, badge: true },
    { label: "Reports", icon: ChartNoAxesColumnIcon },
  ];

  const workspaceMenu = (trigger: ReactElement) => (
    <Menu>
      <MenuTrigger render={trigger} />
      <MenuPopup
        align="start"
        className="w-56 transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0"
        side="bottom"
      >
        <MenuGroup>
          <MenuGroupLabel>{workspace}</MenuGroupLabel>
          <MenuRadioGroup defaultValue="sales">
            <MenuRadioItem value="sales">Sales pipeline</MenuRadioItem>
            <MenuRadioItem value="renewals">Renewals</MenuRadioItem>
            <MenuRadioItem value="partners">Partnerships</MenuRadioItem>
          </MenuRadioGroup>
        </MenuGroup>
        <MenuSeparator />
        <MenuItem>
          <SettingsIcon />
          Workspace settings
        </MenuItem>
      </MenuPopup>
    </Menu>
  );

  const lane = (stage: PipelineStage) => {
    const list = columns[stage.id];
    const weighted = list.reduce((sum, d) => sum + d.value * stage.probability, 0);
    const isOver = drag !== null && over?.stage === stage.id;
    const isWon = stage.id === "won";
    return (
      <section
        aria-label={`${stage.label}: ${list.length} ${list.length === 1 ? "deal" : "deals"}, ${shortMoney(weighted)} ${isWon ? "closed" : "weighted"}`}
        className={cn(
          "flex min-h-0 min-w-0 flex-col rounded-2xl bg-muted/50 p-1 transition-colors duration-150 dark:bg-muted/30",
          isOver && (isWon ? "bg-emerald-500/10 dark:bg-emerald-400/10" : "bg-accent dark:bg-accent/70"),
          stage.id !== mobileStage && "hidden @5xl:flex",
        )}
        data-drop-stage={stage.id}
        key={stage.id}
      >
        <header aria-hidden className="flex items-start justify-between gap-2 px-2 pt-1.5 pb-2.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-1.5 font-medium">
              <span className={cn("size-1.5 shrink-0 rounded-full", stageDot[stage.id])} />
              <span className="truncate">{stage.label}</span>
              <span className="text-muted-foreground text-xs tabular-nums">{list.length}</span>
            </span>
            <span className="text-muted-foreground text-xs">
              <span className={cn("font-medium", isWon ? "text-emerald-700 dark:text-emerald-300" : "text-foreground/80")}>
                <Rolling format={shortMoney} reduce={reduce} value={weighted} />
              </span>{" "}
              {isWon ? "closed" : "weighted"}
            </span>
          </div>
          {isWon ? (
            <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <span className="mt-0.5 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
              {Math.round(stage.probability * 100)}%
            </span>
          )}
        </header>
        <ul className="-m-1 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-1 [scrollbar-width:thin]">
          {list.map((deal) => {
            if (drag?.id === deal.id) {
              return (
                <FlipSlot flipKey={`ph-${stage.id}`} getScale={getScale} key={`ph-${stage.id}`} reduce={reduce} rects={rects}>
                  <div
                    aria-hidden
                    className="rounded-xl border border-foreground/15 border-dashed bg-background/60 dark:bg-background/30"
                    data-placeholder
                    style={{ height: drag.height }}
                  />
                </FlipSlot>
              );
            }
            const isLifted = lifted?.id === deal.id;
            const isSelected = selectedId === deal.id;
            const flag = flagFor(deal.id);
            const owner = ownerOf(deal.ownerId);
            const engagement = engagementMeta[deal.engagement].label.toLowerCase();
            return (
              <FlipSlot flipKey={deal.id} getScale={getScale} key={deal.id} reduce={reduce} rects={rects}>
                <div
                  aria-controls={isSelected ? ids.detail : undefined}
                  aria-describedby={ids.instructions}
                  aria-expanded={isSelected}
                  aria-label={`${deal.company}, ${money(deal.value)}, ${stage.label}, ${
                    deal.stage === "won"
                      ? `closed ${deal.closeLabel}`
                      : `${deal.daysInStage === 0 ? "just moved here" : `${deal.daysInStage} days in stage`}, ${engagement}`
                  }, owner ${owner?.name ?? "unassigned"}${flag ? `, ${flag.tag}` : ""}`}
                  aria-roledescription="draggable deal"
                  className={cn(
                    "group/card block cursor-grab touch-pan-y select-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:cursor-grabbing",
                  )}
                  data-card-id={deal.id}
                  onClick={() => openDeal(deal.id)}
                  onKeyDown={(e) => onCardKeyDown(e, deal)}
                  onPointerCancel={() => {
                    pending.current = null;
                  }}
                  onPointerDown={(e) => {
                    if (e.button !== 0 || e.pointerType === "touch") return;
                    pending.current = { id: deal.id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, el: e.currentTarget };
                  }}
                  onPointerMove={(e) => {
                    const p = pending.current;
                    if (!p || dragRef.current || p.pointerId !== e.pointerId) return;
                    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 5) return;
                    startDrag(e, p);
                  }}
                  onPointerUp={() => {
                    pending.current = null;
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <motion.div
                    animate={{ scale: isLifted && !reduce ? 1.03 : 1, rotate: isLifted && !reduce ? -1.2 : 0 }}
                    transition={{ type: "spring", stiffness: 520, damping: 32 }}
                  >
                    <DealFace
                      celebrate={celebrate?.id === deal.id ? celebrate.key : undefined}
                      className={cn(
                        "[@media(hover:hover)]:group-hover/card:border-foreground/20",
                        hinted === deal.id && "border-foreground/25 bg-accent/40",
                        isSelected && "border-foreground/35 ring-1 ring-foreground/10",
                        isLifted && "border-foreground/30 shadow-lg/10",
                      )}
                      deal={deal}
                      flag={flag}
                      owner={owner}
                      ownerIndex={ownerIndex(deal.ownerId)}
                      reduce={reduce}
                      touched={touched?.id === deal.id ? touched.key : undefined}
                    />
                  </motion.div>
                </div>
              </FlipSlot>
            );
          })}
          {list.length === 0 ? (
            <li
              aria-hidden
              className="flex h-20 items-center justify-center rounded-xl border border-foreground/10 border-dashed text-muted-foreground text-xs"
            >
              Drop a deal here
            </li>
          ) : null}
        </ul>
      </section>
    );
  };

  const draggedDeal = drag ? deals.find((d) => d.id === drag.id) : undefined;

  const focusRail = (
    <div
      aria-labelledby={ids.rail}
      className="flex h-full min-h-0 flex-col outline-none"
      ref={railRef}
      role="region"
      tabIndex={-1}
    >
      <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex flex-col">
          <h2 className="flex items-center gap-2 font-heading font-semibold text-base" id={ids.rail}>
            Focus
            <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium font-sans text-muted-foreground text-xs tabular-nums">
              {openSignals.length}
            </span>
          </h2>
          <p className="text-muted-foreground text-xs">Who to act on today, and why</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 [scrollbar-width:thin]">
        {visibleSignals.length ? (
          <ul>
            <AnimatePresence initial={false}>
              {visibleSignals.map((s) => {
                const deal = deals.find((d) => d.id === s.dealId);
                return (
                  <SignalItem
                    deal={deal}
                    key={s.id}
                    onAct={act}
                    onHint={setHinted}
                    onOpen={(id) => {
                      setHinted(null);
                      openDeal(id);
                    }}
                    reduce={reduce}
                    resolving={resolving[s.id]}
                    signal={s}
                    stageLabel={deal ? stageOf(deal.stage).label : ""}
                  />
                );
              })}
            </AnimatePresence>
          </ul>
        ) : (
          <motion.div
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-5 py-10 text-center"
            initial={{ opacity: 0 }}
            transition={{ duration: 0.25, ease }}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CoffeeIcon className="size-4.5" />
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-balance font-medium">You're clear for today</span>
              <span className="text-pretty text-muted-foreground text-xs">
                {handled.length} handled{snoozed.length ? `, ${snoozed.length} snoozed until tomorrow` : ""}. New signals land
                here as they happen.
              </span>
            </div>
            {snoozed.length ? (
              <Button onClick={() => setSnoozed([])} size="xs" variant="outline">
                <Clock3Icon />
                Bring back snoozed
              </Button>
            ) : null}
          </motion.div>
        )}
      </div>
    </div>
  );

  return (
    <MotionConfig reducedMotion={reduce ? "always" : "never"}>
      <div
        className={cn(
          "@container relative isolate flex h-[760px] w-full overflow-hidden bg-background text-foreground text-sm outline-none",
          className,
        )}
        onKeyDown={(e) => {
          if (e.key === "Escape" && dragRef.current) {
            e.preventDefault();
            endDrag(false);
          }
        }}
        onLostPointerCapture={() => {
          if (dragRef.current) endDrag(false);
        }}
        onPointerCancel={() => {
          if (dragRef.current) endDrag(false);
        }}
        onPointerDown={(e) => {
          if (lifted && !(e.target as HTMLElement).closest(`[data-card-id="${lifted.id}"]`)) dropLifted();
        }}
        onPointerMove={onRootPointerMove}
        onScrollCapture={() => {
          if (!dragRef.current) rects.current.clear();
        }}
        onPointerUp={onRootPointerUp}
        ref={rootRef}
        tabIndex={-1}
      >
        <p className="sr-only" id={ids.instructions}>
          Press Space to pick up. Arrow keys move the deal between stages and up or down. Space or Enter drops it, Escape
          cancels. Press Enter to open details.
        </p>
        <p aria-live="polite" className="sr-only" role="status">
          {announcement}
        </p>

        <TooltipProvider delay={400}>
          <nav
            aria-label="Main"
            className="hidden w-14 shrink-0 flex-col items-center gap-1 border-e py-3 @3xl:flex"
          >
            {workspaceMenu(
              <button
                aria-label={`Switch workspace, current ${workspace}`}
                className="mb-3 flex size-9 cursor-pointer items-center justify-center rounded-xl bg-primary font-heading font-semibold text-primary-foreground outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]"
                type="button"
              >
                {workspace[0]}
              </button>,
            )}
            {navItems.map((n) => (
              <Tooltip key={n.label}>
                <TooltipTrigger
                  render={
                    <button
                      aria-current={n.current ? "page" : undefined}
                      aria-label={n.label}
                      className={cn(
                        "relative flex size-9 cursor-pointer items-center justify-center rounded-lg outline-none transition-[color,background-color,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                        n.current
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground",
                      )}
                      type="button"
                    />
                  }
                >
                  <n.icon className="size-4.5" />
                  {n.badge ? (
                    <span className="absolute top-2 right-2 size-1.5 rounded-full bg-rose-500 ring-2 ring-background dark:bg-rose-400" />
                  ) : null}
                </TooltipTrigger>
                <TooltipPopup side="right">{n.label}</TooltipPopup>
              </Tooltip>
            ))}
            <div className="mt-auto flex flex-col items-center gap-3">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      aria-label="Settings"
                      className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground"
                      type="button"
                    />
                  }
                >
                  <SettingsIcon className="size-4.5" />
                </TooltipTrigger>
                <TooltipPopup side="right">Settings</TooltipPopup>
              </Tooltip>
              <Avatar aria-label={me?.name} role="img" className="[--avatar-size:--spacing(7)]">
                <AvatarFallback className={cn("font-semibold text-[10px]", ownerTones[ownerIndex(currentUserId) % ownerTones.length])}>
                  {me ? initials(me.name) : "?"}
                </AvatarFallback>
              </Avatar>
            </div>
          </nav>
        </TooltipProvider>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 shrink-0 items-center justify-between border-b px-3 @3xl:hidden">
            {workspaceMenu(
              <button
                aria-label={`Switch workspace, current ${workspace}`}
                className="flex h-9 cursor-pointer items-center gap-2 rounded-lg px-1.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="button"
              >
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary font-heading font-semibold text-primary-foreground text-xs">
                  {workspace[0]}
                </span>
                {workspace}
                <ChevronDownIcon className="size-3.5 text-muted-foreground" />
              </button>,
            )}
            <div className="flex items-center gap-1">
              <Button aria-label="Inbox" className="relative" size="icon" variant="ghost">
                <InboxIcon />
                <span className="absolute top-2 right-2 size-1.5 rounded-full bg-rose-500 ring-2 ring-background dark:bg-rose-400" />
              </Button>
              <Avatar aria-label={me?.name} role="img" className="[--avatar-size:--spacing(7)]">
                <AvatarFallback className={cn("font-semibold text-[10px]", ownerTones[ownerIndex(currentUserId) % ownerTones.length])}>
                  {me ? initials(me.name) : "?"}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          <header className="flex shrink-0 flex-col gap-3 px-4 pt-4 pb-3 @3xl:flex-row @3xl:items-end @3xl:justify-between @3xl:px-6 @3xl:pt-5 @3xl:pb-4 @5xl:px-5">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-muted-foreground text-xs">{dateLabel}</span>
              <h1 className="text-balance font-heading font-semibold text-xl tracking-tight">
                {greeting}, {firstName}
              </h1>
              <p className="text-pretty text-muted-foreground">
                {openSignals.length === 0
                  ? "Nothing needs you right now. Nice work."
                  : `${openSignals.length} ${openSignals.length === 1 ? "account needs" : "accounts need"} you today.`}
                <span className="hidden @5xl:inline"> Drag deals as they move.</span>
              </p>
            </div>
            <div className="flex flex-col gap-0.5 @3xl:items-end">
              <span className="text-muted-foreground text-xs">{forecastLabel}</span>
              <div className="flex items-center gap-2 @3xl:flex-row-reverse">
                <span className="font-heading font-semibold text-2xl tracking-tight">
                  <Rolling format={money} reduce={reduce} value={total} />
                  <span className="sr-only">{money(total)}</span>
                </span>
                <AnimatePresence>
                  {delta ? (
                    <motion.span
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "rounded-full px-2 py-0.5 font-medium text-xs tabular-nums",
                        delta.amount > 0
                          ? "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/14 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground",
                      )}
                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      initial={{ opacity: 0, y: 4 }}
                      key={delta.key}
                      transition={{ duration: 0.2, ease }}
                    >
                      {signedMoney(delta.amount)}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
              <div
                aria-label={`${progress}% of target`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={Math.min(100, progress)}
                className="relative mt-1.5 mb-1 h-1 w-full overflow-hidden rounded-full bg-muted @3xl:w-56"
                role="meter"
              >
                <motion.div
                  animate={{ scaleX: Math.min(1, total / target) }}
                  className="absolute inset-0 origin-left rounded-full bg-foreground"
                  initial={false}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 32 }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-500 dark:bg-emerald-400"
                  style={{ width: `${Math.min(100, (won / target) * 100)}%` }}
                />
              </div>
              <span className="text-muted-foreground text-xs tabular-nums">
                {progress}% of {shortMoney(target)} target · <span className="text-emerald-700 dark:text-emerald-300">{shortMoney(won)} won</span>
              </span>
            </div>
          </header>

          <div className="shrink-0 px-4 pb-3 @5xl:hidden">
            <SegmentedControl aria-label="Show" className="w-full">
              {(["board", "focus"] as const).map((t) => (
                <SegmentedControlItem
                  aria-pressed={tab === t}
                  className="flex-1"
                  data-pressed={tab === t ? "" : undefined}
                  key={t}
                  onClick={() => setTab(t)}
                >
                  {t === "board" ? "Pipeline" : "Focus"}
                  {t === "focus" && openSignals.length ? (
                    <span className="text-muted-foreground text-xs tabular-nums">{openSignals.length}</span>
                  ) : null}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>

          <div className="flex min-h-0 flex-1 @5xl:relative @5xl:border-t">
            <div
              className={cn(
                "relative flex min-w-0 flex-1 flex-col @5xl:flex",
                tab !== "board" && "hidden",
              )}
            >
              <div className="shrink-0 px-4 pb-3 @5xl:hidden">
                <div
                  aria-label="Stage"
                  ref={chipsRef}
                  className="relative flex gap-1 overflow-x-auto rounded-xl bg-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  role="group"
                >
                  {stages.map((s) => {
                    const active = s.id === mobileStage;
                    const isOver = drag !== null && over?.stage === s.id;
                    return (
                      <button
                        aria-pressed={active}
                        className={cn(
                          "relative flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                          active ? "text-foreground" : "text-muted-foreground",
                          isOver && "bg-accent",
                        )}
                        data-drop-kind="chip"
                        data-drop-stage={s.id}
                        key={s.id}
                        onClick={() => setMobileStage(s.id)}
                        type="button"
                      >
                        {active ? (
                          <motion.span
                            className="absolute inset-0 -z-10 rounded-lg bg-background shadow-sm/5 dark:bg-input"
                            layoutId={`${uid}-stage`}
                            transition={glide}
                          />
                        ) : null}
                        <span className={cn("size-1.5 rounded-full", stageDot[s.id])} />
                        {s.label}
                        <span className="text-muted-foreground text-xs tabular-nums">{columns[s.id].length}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-x-auto px-4 pb-4 @3xl:px-6 @5xl:px-5 @5xl:pt-4">
                <div className="grid h-full grid-cols-1 gap-2 @5xl:min-w-[860px] @5xl:grid-cols-5">
                  {stages.map((s) => lane(s))}
                </div>
              </div>
              <AnimatePresence>
                {lifted ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3"
                    exit={{ opacity: 0, y: 4, transition: { duration: 0.12 } }}
                    initial={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.18, ease }}
                  >
                    <div className="flex items-center gap-3 rounded-full border bg-popover px-3 py-1.5 text-muted-foreground text-xs shadow-lg/5">
                      <span className="flex items-center gap-1">
                        <Kbd>←</Kbd>
                        <Kbd>→</Kbd> stage
                      </span>
                      <span className="flex items-center gap-1">
                        <Kbd>↑</Kbd>
                        <Kbd>↓</Kbd> order
                      </span>
                      <span className="flex items-center gap-1">
                        <Kbd>Space</Kbd> drop
                      </span>
                      <span className="hidden items-center gap-1 @md:flex">
                        <Kbd>Esc</Kbd> cancel
                      </span>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <aside
              className={cn(
                "min-h-0 flex-col bg-background @5xl:flex @5xl:w-[288px] @5xl:shrink-0 @5xl:border-s @[90rem]:w-[312px]",
                selected
                  ? "absolute inset-0 z-30 flex @5xl:static"
                  : tab === "focus"
                    ? "flex w-full"
                    : "hidden",
              )}
              id={ids.detail}
            >
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="flex min-h-0 flex-1 flex-col"
                initial={{ opacity: 0, x: 10 }}
                key={selected ? "detail" : "focus"}
                transition={{ duration: 0.2, ease }}
              >
                {selected ? (
                  <DetailPanel
                    deal={selected}
                    headingId={ids.heading}
                    onClose={closeDetail}
                    onMove={(stage) => moveFromPanel(selected.id, stage)}
                    owner={ownerOf(selected.ownerId)}
                    ownerIndex={ownerIndex(selected.ownerId)}
                    panelRef={panelRef}
                    stages={stages}
                  />
                ) : (
                  focusRail
                )}
              </motion.div>
            </aside>
          </div>
        </div>

        {drag && draggedDeal ? (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 z-50"
            style={{ x: dragX, y: dragY, rotate: tilt, width: drag.width }}
          >
            <motion.div
              animate={{ scale: 1.03 }}
              initial={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <DealFace
                className="cursor-grabbing border-foreground/20 shadow-xl/10 dark:shadow-xl/40"
                deal={draggedDeal}
                flag={flagFor(draggedDeal.id)}
                owner={ownerOf(draggedDeal.ownerId)}
                ownerIndex={ownerIndex(draggedDeal.ownerId)}
                reduce={reduce}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </div>
    </MotionConfig>
  );
}
