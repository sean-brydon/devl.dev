"use client";

import {
  CheckIcon,
  ChevronUpIcon,
  CopyIcon,
  EllipsisIcon,
  HandIcon,
  LayoutGridIcon,
  MessageSquareIcon,
  MicIcon,
  MicOffIcon,
  MonitorUpIcon,
  PhoneOffIcon,
  PresentationIcon,
  SendHorizontalIcon,
  SmilePlusIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UsersIcon,
  VideoIcon,
  VideoOffIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
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
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export type CallHue = "rose" | "amber" | "emerald" | "sky" | "violet" | "orange" | "teal" | "indigo";

export interface CallPerson {
  id: string;
  name: string;
  title?: string;
  hue: CallHue;
  muted?: boolean;
  cameraOff?: boolean;
  host?: boolean;
}

export interface CallMessage {
  id: string;
  authorId: string;
  text: string;
  time: string;
}

export interface VideoCallProps {
  className?: string;
  title?: string;
  you?: CallPerson;
  participants?: CallPerson[];
  dropIns?: CallPerson[];
  messages?: CallMessage[];
  scriptedMessages?: { authorId: string; text: string }[];
  elapsedSeconds?: number;
  autoplay?: boolean;
  startTime?: string;
  meetingCode?: string;
}

const spring = { type: "spring", stiffness: 420, damping: 40, mass: 1 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;
const press = "transition-[color,background-color,box-shadow,scale] duration-150 ease-out active:scale-[0.97]";
const menuPop =
  "transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100";
const REACTIONS = ["👏", "🎉", "❤️", "😂", "👍", "🤔"];

const hues: Record<CallHue, { wash: string; glowA: string; glowB: string; avatar: string; solid: string }> = {
  rose: {
    wash: "bg-rose-50 dark:bg-rose-950/60",
    glowA: "bg-rose-300/55 dark:bg-rose-500/22",
    glowB: "bg-orange-200/70 dark:bg-orange-400/14",
    avatar: "bg-rose-500/15 text-rose-700 dark:bg-rose-400/20 dark:text-rose-200",
    solid: "bg-rose-600 text-white dark:bg-rose-500",
  },
  amber: {
    wash: "bg-amber-50 dark:bg-amber-950/60",
    glowA: "bg-amber-300/55 dark:bg-amber-500/22",
    glowB: "bg-orange-200/70 dark:bg-orange-400/14",
    avatar: "bg-amber-500/15 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200",
    solid: "bg-amber-600 text-white dark:bg-amber-500",
  },
  emerald: {
    wash: "bg-emerald-50 dark:bg-emerald-950/60",
    glowA: "bg-emerald-300/55 dark:bg-emerald-500/22",
    glowB: "bg-teal-200/70 dark:bg-teal-400/14",
    avatar: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200",
    solid: "bg-emerald-600 text-white dark:bg-emerald-500",
  },
  sky: {
    wash: "bg-sky-50 dark:bg-sky-950/60",
    glowA: "bg-sky-300/55 dark:bg-sky-500/22",
    glowB: "bg-indigo-200/70 dark:bg-indigo-400/14",
    avatar: "bg-sky-500/15 text-sky-700 dark:bg-sky-400/20 dark:text-sky-200",
    solid: "bg-sky-600 text-white dark:bg-sky-500",
  },
  violet: {
    wash: "bg-violet-50 dark:bg-violet-950/60",
    glowA: "bg-violet-300/55 dark:bg-violet-500/22",
    glowB: "bg-fuchsia-200/70 dark:bg-fuchsia-400/14",
    avatar: "bg-violet-500/15 text-violet-700 dark:bg-violet-400/20 dark:text-violet-200",
    solid: "bg-violet-600 text-white dark:bg-violet-500",
  },
  orange: {
    wash: "bg-orange-50 dark:bg-orange-950/60",
    glowA: "bg-orange-300/55 dark:bg-orange-500/22",
    glowB: "bg-rose-200/70 dark:bg-rose-400/14",
    avatar: "bg-orange-500/15 text-orange-700 dark:bg-orange-400/20 dark:text-orange-200",
    solid: "bg-orange-600 text-white dark:bg-orange-500",
  },
  teal: {
    wash: "bg-teal-50 dark:bg-teal-950/60",
    glowA: "bg-teal-300/55 dark:bg-teal-500/22",
    glowB: "bg-cyan-200/70 dark:bg-cyan-400/14",
    avatar: "bg-teal-500/15 text-teal-700 dark:bg-teal-400/20 dark:text-teal-200",
    solid: "bg-teal-600 text-white dark:bg-teal-500",
  },
  indigo: {
    wash: "bg-indigo-50 dark:bg-indigo-950/60",
    glowA: "bg-indigo-300/55 dark:bg-indigo-500/22",
    glowB: "bg-violet-200/70 dark:bg-violet-400/14",
    avatar: "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-200",
    solid: "bg-indigo-600 text-white dark:bg-indigo-500",
  },
};

const defaultYou: CallPerson = { id: "you", name: "Noor Haddad", title: "Product design", hue: "teal" };

const defaultParticipants: CallPerson[] = [
  { id: "tomas", name: "Tomás Aguilar", title: "Design lead", hue: "sky", host: true },
  { id: "priya", name: "Priya Raman", title: "Product", hue: "violet" },
  { id: "kenji", name: "Kenji Mori", title: "Engineering", hue: "amber", cameraOff: true },
  { id: "ada", name: "Ada Okoye", title: "Research", hue: "emerald", muted: true },
  { id: "lena", name: "Lena Fischer", title: "Engineering", hue: "rose" },
];

const defaultDropIns: CallPerson[] = [
  { id: "felix", name: "Felix Brandt", title: "Support", hue: "orange", muted: true },
  { id: "sol", name: "Sol Marín", title: "Marketing", hue: "indigo" },
  { id: "ines", name: "Inês Duarte", title: "Data", hue: "rose", cameraOff: true, muted: true },
];

const defaultMessages: CallMessage[] = [
  { id: "m1", authorId: "tomas", text: "Agenda: onboarding v3 flows, then empty states. Figma link in the invite.", time: "10:31" },
  { id: "m2", authorId: "priya", text: "Can we look at step 3 first? Support flagged it twice this week.", time: "10:33" },
];

const defaultScript = [
  { authorId: "lena", text: "The skip link on step 2 is tiny on mobile, fwiw" },
  { authorId: "ada", text: "Agree. 4 of 6 interviewees missed it entirely." },
  { authorId: "tomas", text: "Let's take that as an action item. Noor, can you own it?" },
];

const dropScript: { op: "join" | "leave"; index: number }[] = [
  { op: "join", index: 0 },
  { op: "join", index: 1 },
  { op: "leave", index: 0 },
  { op: "join", index: 2 },
  { op: "leave", index: 1 },
  { op: "leave", index: 2 },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function firstName(name: string) {
  return name.split(" ")[0];
}

function clock(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

function timeLabel(start: string, elapsed: number) {
  const [h, m] = start.split(":").map(Number);
  const mins = (h * 60 + m + Math.floor(elapsed / 60)) % (24 * 60);
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

function gridShape(n: number) {
  const wide = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;
  const narrow = n <= 2 ? 1 : 2;
  return { c: wide, r: Math.ceil(n / wide), cs: narrow, rs: Math.ceil(n / narrow) };
}

type Live = CallPerson & { hand?: boolean };

function PersonAvatar({ person, size = 7, className }: { person: CallPerson; size?: 6 | 7 | 8 | 16; className?: string }) {
  const sizes = {
    6: "[--avatar-size:--spacing(6)]",
    7: "[--avatar-size:--spacing(7)]",
    8: "[--avatar-size:--spacing(8)]",
    16: "[--avatar-size:--spacing(16)]",
  };
  return (
    <Avatar className={cn(sizes[size], className)}>
      <AvatarFallback className={cn("font-semibold", hues[person.hue].avatar)}>{initials(person.name)}</AvatarFallback>
    </Avatar>
  );
}

function SpeakingBars({ reduce }: { reduce: boolean | null }) {
  return (
    <span aria-hidden className="flex h-3 items-center gap-[2px]">
      {[0, 1, 2].map((i) => (
        <motion.span
          animate={reduce ? { scaleY: 0.7 } : { scaleY: [0.35, 1, 0.5, 0.85, 0.35] }}
          className="h-3 w-[3px] origin-center rounded-full bg-emerald-500 dark:bg-emerald-400"
          key={i}
          transition={reduce ? { duration: 0 } : { duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

function Ambient({ hue }: { hue: CallHue }) {
  return (
    <div aria-hidden className={cn("absolute inset-0", hues[hue].wash)}>
      <div className={cn("absolute -top-1/3 -left-1/4 h-full w-3/4 rounded-full blur-3xl", hues[hue].glowA)} />
      <div className={cn("absolute -right-1/4 -bottom-1/2 h-full w-3/4 rounded-full blur-3xl", hues[hue].glowB)} />
    </div>
  );
}

function TileAvatar({ person, live, speaking, compact }: { person: CallPerson; live: boolean; speaking: boolean; compact?: boolean }) {
  const reduce = useReducedMotionSafe();
  return (
    <div className="relative flex items-center justify-center">
      {speaking &&
        !reduce &&
        [0, 1].map((i) => (
          <motion.span
            animate={{ opacity: [0.45, 0], scale: [1, 1.45] }}
            aria-hidden
            className={cn("absolute inset-0 rounded-full", live ? hues[person.hue].solid : "bg-emerald-500/40")}
            key={i}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: i * 0.8 }}
          />
        ))}
      <span
        className={cn(
          "relative flex size-12 items-center justify-center rounded-full font-semibold text-base tracking-tight",
          !compact && "@[15rem]/tile:size-18 @[15rem]/tile:text-2xl @[26rem]/tile:size-22 @[26rem]/tile:text-3xl",
          live ? hues[person.hue].solid : hues[person.hue].avatar,
        )}
      >
        {initials(person.name)}
      </span>
    </div>
  );
}

function ScreenShare() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted p-[6%]">
      <div className="flex aspect-video max-h-full w-full max-w-full flex-col gap-[5%] overflow-hidden rounded-lg border bg-card p-[4%] shadow-xs/5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-orange-500 dark:bg-orange-400" />
          <span className="truncate font-medium text-[clamp(9px,1.6cqw,14px)]">Onboarding v3 · flow review</span>
        </div>
        <div className="flex flex-1 items-center gap-[4%]">
          {["Welcome", "Workspace", "Invite", "Done"].map((step, i) => (
            <div className="flex flex-1 flex-col gap-[8%] self-stretch rounded-md border bg-background p-[4%]" key={step}>
              <span className="truncate text-[clamp(7px,1.1cqw,11px)] text-muted-foreground">
                {i + 1}. {step}
              </span>
              <span className="h-[10%] w-3/4 rounded-sm bg-muted" />
              <span className="h-[10%] w-1/2 rounded-sm bg-muted" />
              <span
                className={cn(
                  "mt-auto h-[14%] rounded-sm",
                  i === 2 ? "bg-orange-500/70 dark:bg-orange-400/60" : "bg-primary/15",
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type Tile = { kind: "person"; person: Live; isYou: boolean } | { kind: "screen" };

function tileKey(t: Tile) {
  return t.kind === "screen" ? "screen" : t.person.id;
}

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

function CallTile({
  tile,
  speaking,
  compact,
  style,
  className,
  you,
  ns,
}: {
  tile: Tile;
  speaking: boolean;
  compact?: boolean;
  style?: CSSProperties;
  className?: string;
  you: CallPerson;
  ns?: string;
}) {
  const reduce = useReducedMotionSafe();
  const [radius, radiusProbe] = useThemeRadius(1.6);
  const p = tile.kind === "person" ? tile.person : null;
  const label = tile.kind === "screen" ? `${firstName(you.name)}'s screen` : tile.isYou ? "You" : p?.name;

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      aria-label={tile.kind === "screen" ? "Your shared screen" : `${p?.name}${p?.muted ? ", muted" : ""}${speaking ? ", speaking" : ""}`}
      className={cn("relative shrink-0", className)}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16, ease: easeOut } }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      layout={!reduce && !!ns}
      layoutId={ns ? `${ns}-${tileKey(tile)}` : undefined}
      role="group"
      style={{ borderRadius: radius, ...style }}
      transition={reduce ? { duration: 0.15 } : spring}
    >
      {radiusProbe}
      <div className="@container/tile absolute inset-0 overflow-hidden rounded-[inherit] bg-muted">
        {tile.kind === "screen" ? (
          <ScreenShare />
        ) : p ? (
          <>
            {!p.cameraOff && <Ambient hue={p.hue} />}
            <motion.div className="absolute inset-0 flex items-center justify-center" layout={!reduce}>
              <TileAvatar compact={compact} live={!p.cameraOff} person={p} speaking={speaking} />
            </motion.div>
          </>
        ) : null}

        {p?.hand && (
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-2 left-2 flex h-6 items-center gap-1 rounded-full bg-amber-400 px-2 font-medium text-amber-950 text-xs"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            layout={!reduce}
            transition={{ duration: 0.2, ease: easeOut }}
          >
            <HandIcon className="size-3.5" />
            {!compact && <span className="hidden @[10rem]/tile:inline">Hand raised</span>}
          </motion.span>
        )}

        {p && (p.muted || p.cameraOff) && (
          <motion.span className="absolute top-2 right-2 flex items-center gap-1" layout={!reduce}>
            {p.cameraOff && !compact && (
              <span className="flex size-6 items-center justify-center rounded-full bg-background/85 text-muted-foreground shadow-xs/5 backdrop-blur-sm">
                <VideoOffIcon aria-hidden className="size-3.5" />
              </span>
            )}
            {p.muted && (
              <span className="flex size-6 items-center justify-center rounded-full bg-background/85 text-destructive-foreground shadow-xs/5 backdrop-blur-sm">
                <MicOffIcon aria-hidden className="size-3.5" />
              </span>
            )}
          </motion.span>
        )}

        <motion.span
          className="absolute bottom-2 left-2 flex h-6 max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-md bg-background/85 px-2 font-medium text-foreground text-xs shadow-xs/5 backdrop-blur-sm"
          layout={!reduce}
        >
          {tile.kind === "screen" && <MonitorUpIcon className="size-3.5 shrink-0 text-muted-foreground" />}
          {speaking && <SpeakingBars reduce={reduce} />}
          <span className={cn("truncate", compact && "max-w-16")}>{label}</span>
        </motion.span>
      </div>
      <motion.span
        animate={{ opacity: speaking ? 1 : 0 }}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] ring-2 ring-emerald-500 ring-inset dark:ring-emerald-400"
        initial={false}
        transition={{ duration: reduce ? 0 : 0.2, ease: easeOut }}
      />
    </motion.div>
  );
}

function ControlButton({
  label,
  shortcut,
  onClick,
  tone = "default",
  children,
  badge,
  className,
  pressed,
}: {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  tone?: "default" | "off" | "on";
  children: ReactNode;
  badge?: number;
  className?: string;
  pressed?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={label}
            aria-pressed={pressed}
            className={cn(
              "relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:size-[18px]",
              press,
              tone === "off" && "bg-destructive text-white hover:bg-destructive/90",
              tone === "on" && "bg-primary text-primary-foreground hover:bg-primary/90",
              tone === "default" && "bg-secondary text-secondary-foreground hover:bg-accent",
              className,
            )}
            onClick={onClick}
            type="button"
          />
        }
      >
        {children}
        <AnimatePresence>
          {badge ? (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 font-medium text-[10px] text-primary-foreground tabular-nums ring-2 ring-background"
              exit={{ opacity: 0, scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15, ease: easeOut }}
            >
              {badge}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </TooltipTrigger>
      <TooltipPopup className="flex items-center gap-2" side="top" sideOffset={8}>
        <span className="flex items-center gap-2">
          {label}
          {shortcut && <Kbd className="h-4 min-w-4 text-[10px]">{shortcut}</Kbd>}
        </span>
      </TooltipPopup>
    </Tooltip>
  );
}

const MICS = ["Studio Display microphone", "MacBook Pro microphone", "AirPods Pro"];
const CAMERAS = ["FaceTime HD camera", "Studio Display camera"];

function DeviceSplit({ kind, devices, children }: { kind: string; devices: string[]; children: ReactNode }) {
  const [device, setDevice] = useState(devices[0]);
  return (
    <div className="flex shrink-0 items-center rounded-full bg-secondary">
      {children}
      <Menu>
        <MenuTrigger
          aria-label={`${kind} settings`}
          className={cn(
            "-ms-0.5 hidden h-10 w-7 cursor-pointer items-center justify-center rounded-e-full pe-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:text-foreground @md:flex [&_svg]:size-4",
          )}
        >
          <ChevronUpIcon />
        </MenuTrigger>
        <MenuPopup align="start" className={cn("w-60", menuPop)} side="top" sideOffset={10}>
          <MenuGroup>
            <MenuGroupLabel>{kind}</MenuGroupLabel>
            <MenuRadioGroup onValueChange={(v) => setDevice(v as string)} value={device}>
              {devices.map((d) => (
                <MenuRadioItem key={d} value={d}>
                  {d}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuGroup>
        </MenuPopup>
      </Menu>
    </div>
  );
}

type Reaction = { id: number; emoji: string; name: string; x: number };
type Toast = { id: number; text: string; person?: CallPerson; icon?: ReactNode };

export function VideoCall({
  className,
  title = "Design crit · Onboarding v3",
  you = defaultYou,
  participants = defaultParticipants,
  dropIns = defaultDropIns,
  messages: initialMessages = defaultMessages,
  scriptedMessages = defaultScript,
  elapsedSeconds = 1453,
  autoplay = true,
  startTime = "10:20",
  meetingCode = "kst-wqpf-ndr",
}: VideoCallProps) {
  const reduce = useReducedMotionSafe();
  const rootRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const counter = useRef(0);

  const [people, setPeople] = useState<Record<string, Live>>(() =>
    Object.fromEntries([you, ...participants, ...dropIns].map((p) => [p.id, { ...p }])),
  );
  const [inCall, setInCall] = useState<string[]>(() => [...participants.map((p) => p.id), you.id]);
  const [speakerId, setSpeakerId] = useState<string | null>(participants.find((p) => !p.muted)?.id ?? null);
  const [layout, setLayout] = useState<"grid" | "spotlight">("grid");
  const [panel, setPanel] = useState<null | "chat" | "people">(null);
  const [messages, setMessages] = useState(initialMessages);
  const [unread, setUnread] = useState(0);
  const [draft, setDraft] = useState("");
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [elapsed, setElapsed] = useState(elapsedSeconds);
  const [sharing, setSharing] = useState(false);
  const [left, setLeft] = useState(false);
  const [feedback, setFeedback] = useState<null | "up" | "down">(null);
  const [reactOpen, setReactOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wide, setWide] = useState(true);

  const me = people[you.id];
  const nextId = () => {
    counter.current += 1;
    return counter.current;
  };

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= 896));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const showToast = (t: Omit<Toast, "id">) => setToast({ ...t, id: nextId() });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const addReaction = (emoji: string, name: string) => {
    const r = { id: nextId(), emoji, name, x: 8 + Math.random() * 30 };
    setReactions((all) => [...all.slice(-7), r]);
  };

  const tickRef = useRef(0);
  const state = useRef({ inCall, people, panel });
  const elapsedRef = useRef(elapsed);
  elapsedRef.current = elapsed;
  state.current = { inCall, people, panel };

  useEffect(() => {
    if (left) return;
    const t = setInterval(() => {
      setElapsed((e) => e + 1);
      if (!autoplay) return;
      tickRef.current += 1;
      const tick = tickRef.current;
      const { inCall: ids, people: ppl, panel: openPanel } = state.current;

      if (tick % 3 === 0) {
        const talkers = ids.filter((id) => id !== you.id && !ppl[id]?.muted);
        if (talkers.length) {
          setSpeakerId((cur) => {
            const pool = talkers.filter((id) => id !== cur);
            return pool.length ? pool[Math.floor(Math.random() * pool.length)] : talkers[0];
          });
        } else setSpeakerId(null);
      }

      if (tick % 8 === 4 && dropIns.length) {
        const step = dropScript[Math.floor(tick / 8) % dropScript.length];
        const person = dropIns[step.index % dropIns.length];
        if (step.op === "join" && !ids.includes(person.id)) {
          setInCall((cur) => [...cur.filter((id) => id !== you.id), person.id, you.id]);
          showToast({ text: `${firstName(person.name)} joined`, person });
        } else if (step.op === "leave" && ids.includes(person.id)) {
          setInCall((cur) => cur.filter((id) => id !== person.id));
          setSpeakerId((cur) => (cur === person.id ? null : cur));
          showToast({ text: `${firstName(person.name)} left`, person });
        }
      }

      if (tick % 5 === 2) {
        const others = ids.filter((id) => id !== you.id);
        const who = ppl[others[Math.floor(Math.random() * others.length)]];
        if (who) addReaction(REACTIONS[Math.floor(Math.random() * 5)], firstName(who.name));
      }

      const line = tick % 14 === 10 ? scriptedMessages[Math.floor(tick / 14)] : undefined;
      if (line && ids.includes(line.authorId)) {
        setMessages((m) => [...m, { id: `s${tick}`, authorId: line.authorId, text: line.text, time: timeLabel(startTime, elapsedRef.current) }]);
        if (openPanel !== "chat") setUnread((u) => u + 1);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [left, autoplay]);

  const sheetOpen = !wide && !!panel && !left;
  useEffect(() => {
    if (sheetOpen) sheetRef.current?.focus({ preventScroll: true });
  }, [sheetOpen]);

  useEffect(() => {
    if (panel === "chat") {
      setUnread(0);
      const box = chatEndRef.current?.parentElement;
      box?.scrollTo({ top: box.scrollHeight });
    }
  }, [panel, messages.length]);

  const patchMe = (patch: Partial<Live>) => setPeople((p) => ({ ...p, [you.id]: { ...p[you.id], ...patch } }));
  const toggleMic = () => patchMe({ muted: !me.muted });
  const toggleCam = () => patchMe({ cameraOff: !me.cameraOff });
  const toggleHand = () => {
    patchMe({ hand: !me.hand });
    if (!me.hand) showToast({ text: "You raised your hand", icon: <HandIcon className="size-3.5" /> });
  };
  const toggleShare = () => {
    setSharing((s) => !s);
    if (!sharing) {
      setLayout("spotlight");
      showToast({ text: "You're presenting to everyone", icon: <MonitorUpIcon className="size-3.5" /> });
    } else setLayout("grid");
  };
  const muteAll = () => {
    setPeople((p) =>
      Object.fromEntries(Object.entries(p).map(([id, v]) => [id, id === you.id ? v : { ...v, muted: true }])),
    );
    setSpeakerId(null);
    showToast({ text: "Everyone else is muted", icon: <MicOffIcon className="size-3.5" /> });
  };
  const removePerson = (id: string) => {
    setInCall((cur) => cur.filter((x) => x !== id));
    setSpeakerId((cur) => (cur === id ? null : cur));
    showToast({ text: `${firstName(people[id].name)} was removed`, person: people[id] });
  };
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: `u${nextId()}`, authorId: you.id, text, time: timeLabel(startTime, elapsed) }]);
    setDraft("");
  };
  const leave = () => {
    setLeft(true);
    setPanel(null);
    setSharing(false);
    setReactions([]);
    setToast(null);
  };
  const rejoin = () => {
    setLeft(false);
    setFeedback(null);
    setLayout("grid");
  };

  const ordered = [...inCall].sort((a, b) => Number(!!people[b]?.hand) - Number(!!people[a]?.hand));
  const tiles: Tile[] = [
    ...(sharing ? [{ kind: "screen" } as Tile] : []),
    ...ordered.map((id) => ({ kind: "person", person: people[id], isYou: id === you.id }) as Tile),
  ];
  const shape = gridShape(tiles.length);
  const spotKey = sharing ? "screen" : speakerId && inCall.includes(speakerId) ? speakerId : ordered[0];
  const spotTile = tiles.find((t) => tileKey(t) === spotKey) ?? tiles[0];
  const stripTiles = tiles.filter((t) => t !== spotTile);
  const host = participants.find((p) => p.host);

  const panelBody =
    panel === "chat" ? (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <MessageSquareIcon className="size-4.5" />
              </span>
              <span className="font-medium">No messages yet</span>
              <span className="text-pretty text-muted-foreground text-xs">
                Only people in the call can see chat. It disappears when the call ends.
              </span>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => {
                  const author = people[m.authorId];
                  const grouped = messages[i - 1]?.authorId === m.authorId;
                  return (
                    <motion.li
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("flex gap-2.5", grouped && "-mt-3")}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                      key={m.id}
                      transition={{ duration: 0.2, ease: easeOut }}
                    >
                      {grouped ? (
                        <span className="w-7 shrink-0" />
                      ) : author ? (
                        <PersonAvatar person={author} />
                      ) : null}
                      <div className="flex min-w-0 flex-col gap-0.5">
                        {!grouped && (
                          <span className="flex items-baseline gap-2">
                            <span className="font-medium text-xs">
                              {m.authorId === you.id ? "You" : author?.name}
                            </span>
                            <span className="text-muted-foreground text-xs tabular-nums">{m.time}</span>
                          </span>
                        )}
                        <p className="text-pretty break-words">{m.text}</p>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
          <div ref={chatEndRef} />
        </div>
        <form
          className="border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <InputGroup>
            <InputGroupInput
              aria-label="Message everyone"
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message everyone"
              value={draft}
            />
            <InputGroupAddon align="inline-end">
              <Button aria-label="Send message" disabled={!draft.trim()} size="icon-xs" type="submit" variant="ghost">
                <SendHorizontalIcon />
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </form>
      </div>
    ) : (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="font-medium text-muted-foreground text-xs">
            In call · <span className="tabular-nums">{inCall.length}</span>
          </span>
          <Button className={press} onClick={muteAll} size="xs" variant="outline">
            <MicOffIcon /> Mute all
          </Button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
          <AnimatePresence initial={false}>
            {ordered.map((id) => {
              const p = people[id];
              const isYou = id === you.id;
              return (
                <motion.li
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 rounded-lg px-2 py-2"
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                  initial={{ opacity: 0 }}
                  key={id}
                  layout={reduce ? false : "position"}
                  transition={spring}
                >
                  <PersonAvatar person={p} size={8} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-1.5 truncate font-medium">
                      <span className="truncate">{p.name}</span>
                      {isYou && <span className="font-normal text-muted-foreground text-xs">you</span>}
                      {p.host && (
                        <span className="rounded-full bg-muted px-1.5 py-px font-medium text-[10px] text-muted-foreground">
                          Host
                        </span>
                      )}
                    </span>
                    <span className="truncate text-muted-foreground text-xs">{p.title}</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-muted-foreground [&_svg]:size-4">
                    {p.hand && <HandIcon aria-label="Hand raised" className="text-amber-500 dark:text-amber-400" />}
                    {p.cameraOff && <VideoOffIcon aria-label="Camera off" />}
                    {p.muted ? (
                      <MicOffIcon aria-label="Muted" className="text-destructive-foreground" />
                    ) : speakerId === id ? (
                      <span className="flex size-4 items-center justify-center">
                        <SpeakingBars reduce={reduce} />
                      </span>
                    ) : (
                      <MicIcon aria-label="Mic on" />
                    )}
                  </span>
                  {!isYou && (
                    <Menu>
                      <MenuTrigger
                        aria-label={`Options for ${p.name}`}
                        render={<Button className="-me-1" size="icon-sm" variant="ghost" />}
                      >
                        <EllipsisIcon />
                      </MenuTrigger>
                      <MenuPopup align="end" className={cn("w-44", menuPop)}>
                        <MenuItem
                          disabled={p.muted}
                          onClick={() => setPeople((all) => ({ ...all, [id]: { ...all[id], muted: true } }))}
                        >
                          <MicOffIcon /> Mute
                        </MenuItem>
                        <MenuItem onClick={() => setSpeakerId(id)}>
                          <PresentationIcon /> Spotlight
                        </MenuItem>
                        <MenuSeparator />
                        <MenuItem onClick={() => removePerson(id)} variant="destructive">
                          <XIcon /> Remove from call
                        </MenuItem>
                      </MenuPopup>
                    </Menu>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
        <div className="border-t p-3">
          <Button className={cn("w-full", press)} onClick={() => setCopied(true)} variant="outline">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
                exit={{ opacity: 0, scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.95 }}
                key={copied ? "copied" : "copy"}
                transition={{ duration: 0.15, ease: easeOut }}
              >
                {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                {copied ? "Link copied" : "Copy invite link"}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
      </div>
    );

  return (
    <TooltipProvider delay={500}>
      <div
        className={cn(
          "@container relative isolate flex h-[760px] w-full flex-col overflow-hidden bg-background text-foreground text-sm",
          className,
        )}
        onKeyDown={(e) => {
          if (e.key === "Escape" && panel && !wide) setPanel(null);
          const target = e.target as HTMLElement;
          if (left || e.metaKey || e.ctrlKey || e.altKey || target.closest("input, textarea")) return;
          if (e.key === "m") toggleMic();
          if (e.key === "v") toggleCam();
        }}
        ref={rootRef}
      >
        <header className="flex h-14 shrink-0 items-center gap-3 px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-heading font-semibold">{title}</span>
              <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <span className="tabular-nums">{timeLabel(startTime, elapsed)}</span>
                <span aria-hidden>·</span>
                <span className="truncate">
                  {left ? "You left" : <><span className="tabular-nums">{inCall.length}</span> in call</>}
                </span>
              </span>
            </div>
            {!left && (
              <span className="flex h-6 shrink-0 items-center gap-1.5 rounded-md bg-destructive/10 px-2 font-medium text-destructive-foreground text-xs tabular-nums">
                <span className="relative flex size-1.5">
                  {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-destructive/60" />}
                  <span className="relative size-1.5 rounded-full bg-destructive" />
                </span>
                {clock(elapsed)}
              </span>
            )}
          </div>
          {!left && (
            <div className="flex items-center gap-2">
              <div aria-label="Layout" className="relative hidden h-8 items-center rounded-lg bg-muted p-0.5 @md:flex" role="radiogroup">
                {(
                  [
                    { value: "grid", label: "Grid", icon: <LayoutGridIcon /> },
                    { value: "spotlight", label: "Spotlight", icon: <PresentationIcon /> },
                  ] as const
                ).map((o) => (
                  <button
                    aria-checked={layout === o.value}
                    aria-label={`${o.label} layout`}
                    className="relative flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 font-medium text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5"
                    key={o.value}
                    onClick={() => setLayout(o.value)}
                    role="radio"
                    type="button"
                  >
                    {layout === o.value && (
                      <motion.span
                        className="absolute inset-0 rounded-md bg-background shadow-xs/5 dark:bg-input"
                        layoutId="vc-layout-pill"
                        transition={reduce ? { duration: 0 } : spring}
                      />
                    )}
                    <span
                      className={cn(
                        "relative flex items-center gap-1.5 transition-colors",
                        layout === o.value ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {o.icon}
                      <span className="hidden @3xl:inline">{o.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        <div className="flex min-h-0 flex-1 gap-3 px-3 pb-0 @md:px-4">
          <LayoutGroup id="vc-stage">
            <section aria-label="Participants" className="@container/stage relative min-w-0 flex-1">
              {left ? (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="flex h-full flex-col items-center justify-center gap-6 rounded-2xl border bg-card px-6 text-center"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  transition={{ duration: 0.25, ease: easeOut }}
                >
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <PhoneOffIcon className="size-5" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-balance font-heading font-semibold text-lg">You left the call</h2>
                    <p className="text-muted-foreground">
                      {title} · <span className="tabular-nums">{clock(elapsed)}</span>
                    </p>
                  </div>
                  <Button className={press} onClick={rejoin}>
                    Rejoin
                  </Button>
                  <div className="flex min-h-9 flex-col items-center gap-2">
                    <AnimatePresence initial={false} mode="popLayout">
                      {feedback ? (
                        <motion.span
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex h-9 items-center gap-1.5 text-muted-foreground text-xs"
                          initial={{ opacity: 0, scale: 0.97 }}
                          key="thanks"
                          transition={{ duration: 0.2, ease: easeOut }}
                        >
                          <CheckIcon className="size-3.5 text-success-foreground" /> Thanks, that helps us tune call quality.
                        </motion.span>
                      ) : (
                        <motion.div
                          className="flex items-center gap-2 text-muted-foreground text-xs"
                          exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
                          key="ask"
                        >
                          How was the audio and video?
                          <Button aria-label="Good" className={press} onClick={() => setFeedback("up")} size="icon-sm" variant="outline">
                            <ThumbsUpIcon />
                          </Button>
                          <Button aria-label="Poor" className={press} onClick={() => setFeedback("down")} size="icon-sm" variant="outline">
                            <ThumbsDownIcon />
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ) : (
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.div
                    animate={{ opacity: 1, scale: 1 }}
                    className="size-full"
                    exit={{ opacity: 0, transition: { duration: 0.12, ease: easeOut } }}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
                    key={layout}
                    transition={{ duration: 0.2, ease: easeOut }}
                  >
                    {layout === "grid" ? (
                      <div
                        className="flex h-full flex-wrap content-center justify-center gap-2 [--cc:var(--cs)] [--rr:var(--rs)] @xl/stage:[--cc:var(--c)] @xl/stage:[--rr:var(--r)]"
                        style={{ "--c": shape.c, "--r": shape.r, "--cs": shape.cs, "--rs": shape.rs } as CSSProperties}
                      >
                        <AnimatePresence initial={false} mode="popLayout">
                          {tiles.map((t) => (
                            <CallTile
                              key={tileKey(t)}
                              ns="grid"
                              speaking={t.kind === "person" && t.person.id === speakerId && !t.person.muted}
                              style={{
                                width: "calc((100% - (var(--cc) - 1) * var(--spacing) * 2) / var(--cc))",
                                height: "calc((100% - (var(--rr) - 1) * var(--spacing) * 2) / var(--rr))",
                              }}
                              tile={t}
                              you={you}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col gap-2">
                        <div className="relative min-h-0 flex-1">
                          <AnimatePresence initial={false} mode="popLayout">
                            {spotTile && (
                              <CallTile
                                className="size-full"
                                key={tileKey(spotTile)}
                                speaking={spotTile.kind === "person" && spotTile.person.id === speakerId && !spotTile.person.muted}
                                tile={spotTile}
                                you={you}
                              />
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="-mx-1 -mb-1 flex h-26 shrink-0 justify-center-safe gap-2 overflow-x-auto p-1 [scrollbar-width:none] @xl/stage:h-30">
                          <AnimatePresence initial={false} mode="popLayout">
                            {stripTiles.map((t) => (
                              <CallTile
                                className="aspect-[4/3] h-full"
                                compact
                                key={tileKey(t)}
                                ns="strip"
                                speaking={t.kind === "person" && t.person.id === speakerId && !t.person.muted}
                                tile={t}
                                you={you}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}

              <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
                <AnimatePresence>
                  {reactions.map((r) => (
                    <motion.div
                      animate={
                        reduce
                          ? { opacity: [0, 1, 1, 0] }
                          : { opacity: [0, 1, 1, 0], y: -260, x: [0, 10, -6, 4], scale: [0.9, 1.05, 1, 1] }
                      }
                      className="absolute bottom-3 flex flex-col items-center gap-1"
                      initial={{ opacity: 0, y: 0, scale: 0.9 }}
                      key={r.id}
                      onAnimationComplete={() => setReactions((all) => all.filter((x) => x.id !== r.id))}
                      style={{ left: `${r.x}%` }}
                      transition={{ duration: reduce ? 1.6 : 2.4, ease: easeOut, times: [0, 0.12, 0.7, 1] }}
                    >
                      <span className="text-3xl leading-none drop-shadow-sm">{r.emoji}</span>
                      <span className="rounded-md bg-background/85 px-1.5 py-px font-medium text-[10px] text-foreground shadow-xs/5 backdrop-blur-sm">{r.name}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-3">
                <AnimatePresence mode="popLayout">
                  {toast && (
                    <motion.div
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="flex h-8 max-w-full items-center gap-2 rounded-full border bg-popover ps-1 pe-3 text-popover-foreground text-xs shadow-lg/5"
                      exit={{ opacity: 0, y: -4, scale: 0.97, transition: { duration: 0.15, ease: easeOut } }}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
                      key={toast.id}
                      transition={{ duration: 0.22, ease: easeOut }}
                    >
                      {toast.person ? (
                        <PersonAvatar person={toast.person} size={6} />
                      ) : (
                        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          {toast.icon}
                        </span>
                      )}
                      <span className="truncate font-medium">{toast.text}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>
          </LayoutGroup>

          <AnimatePresence initial={false}>
            {wide && panel && !left && (
              <motion.aside
                animate={{ opacity: 1, x: 0 }}
                aria-label={panel === "chat" ? "Chat" : "People"}
                className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border bg-card"
                exit={{ opacity: 0, x: 16, transition: { duration: 0.15, ease: easeOut } }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: 16 }}
                key="dock"
                transition={{ duration: 0.22, ease: easeOut }}
              >
                <PanelHeader messages={messages.length} onClose={() => setPanel(null)} onTab={setPanel} panel={panel} people={inCall.length} />
                {panelBody}
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        <footer className="flex h-[72px] shrink-0 items-center gap-3 px-4">
          <div className="hidden min-w-0 flex-1 items-center gap-2 text-muted-foreground text-xs @4xl:flex">
            <button
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2 font-mono outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setCopied(true)}
              type="button"
            >
              {copied ? <CheckIcon className="size-3.5 text-success-foreground" /> : <CopyIcon className="size-3.5" />}
              {meetingCode}
            </button>
            <span className="truncate">
              Hosted by {host ? (host.id === you.id ? "you" : firstName(host.name)) : "you"}
            </span>
          </div>
          {left ? (
            <div className="flex-1" />
          ) : (
            <div className="mx-auto flex items-center gap-2 @4xl:mx-0" role="toolbar" aria-label="Call controls">
              <DeviceSplit devices={MICS} kind="Microphone">
                <ControlButton
                  className={me.muted ? undefined : "bg-transparent"}
                  label={me.muted ? "Unmute" : "Mute"}
                  onClick={toggleMic}
                  pressed={me.muted}
                  shortcut="M"
                  tone={me.muted ? "off" : "default"}
                >
                  {me.muted ? <MicOffIcon /> : <MicIcon />}
                </ControlButton>
              </DeviceSplit>
              <DeviceSplit devices={CAMERAS} kind="Camera">
                <ControlButton
                  className={me.cameraOff ? undefined : "bg-transparent"}
                  label={me.cameraOff ? "Turn camera on" : "Turn camera off"}
                  onClick={toggleCam}
                  pressed={me.cameraOff}
                  shortcut="V"
                  tone={me.cameraOff ? "off" : "default"}
                >
                  {me.cameraOff ? <VideoOffIcon /> : <VideoIcon />}
                </ControlButton>
              </DeviceSplit>
              <ControlButton
                className="hidden @md:flex"
                label={sharing ? "Stop presenting" : "Present screen"}
                onClick={toggleShare}
                pressed={sharing}
                tone={sharing ? "on" : "default"}
              >
                <MonitorUpIcon />
              </ControlButton>
              <Popover onOpenChange={setReactOpen} open={reactOpen}>
                <PopoverTrigger
                  aria-label="Send a reaction"
                  className={cn(
                    "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-secondary text-secondary-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-popup-open:bg-accent [&_svg]:size-[18px]",
                    press,
                  )}
                >
                  <SmilePlusIcon />
                </PopoverTrigger>
                <PopoverPopup className={cn("rounded-full before:rounded-full", menuPop)} side="top" sideOffset={10} tooltipStyle>
                  <div aria-label="Reactions" className="flex items-center gap-0.5 py-0.5" role="group">
                    {REACTIONS.map((emoji) => (
                      <button
                        aria-label={`React ${emoji}`}
                        className="flex size-9 cursor-pointer items-center justify-center rounded-full text-xl outline-none transition-[background-color,scale] duration-150 ease-out hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.92]"
                        key={emoji}
                        onClick={() => addReaction(emoji, "You")}
                        type="button"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverPopup>
              </Popover>
              <ControlButton
                className="hidden @md:flex"
                label={me.hand ? "Lower hand" : "Raise hand"}
                onClick={toggleHand}
                pressed={!!me.hand}
                tone={me.hand ? "on" : "default"}
              >
                <HandIcon />
              </ControlButton>
              <ControlButton
                badge={panel === "chat" ? 0 : unread}
                className="@4xl:hidden"
                label="Chat"
                onClick={() => setPanel(panel === "chat" ? null : "chat")}
                pressed={panel === "chat"}
                tone={panel === "chat" ? "on" : "default"}
              >
                <MessageSquareIcon />
              </ControlButton>
              <Menu>
                <MenuTrigger
                  aria-label="More options"
                  className={cn(
                    "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-secondary text-secondary-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-popup-open:bg-accent [&_svg]:size-[18px]",
                    press,
                  )}
                >
                  <EllipsisIcon />
                </MenuTrigger>
                <MenuPopup align="center" className={cn("w-52", menuPop)} side="top" sideOffset={10}>
                  <div className="@md:hidden">
                    <MenuItem onClick={toggleShare}>
                      <MonitorUpIcon /> {sharing ? "Stop presenting" : "Present screen"}
                    </MenuItem>
                    <MenuItem onClick={toggleHand}>
                      <HandIcon /> {me.hand ? "Lower hand" : "Raise hand"}
                    </MenuItem>
                  </div>
                  <MenuItem onClick={() => setPanel("people")}>
                    <UsersIcon /> People
                  </MenuItem>
                  <MenuSeparator />
                  <MenuGroup>
                    <MenuGroupLabel>Layout</MenuGroupLabel>
                    <MenuRadioGroup onValueChange={(v) => setLayout(v as "grid" | "spotlight")} value={layout}>
                      <MenuRadioItem value="grid">Grid</MenuRadioItem>
                      <MenuRadioItem value="spotlight">Spotlight</MenuRadioItem>
                    </MenuRadioGroup>
                  </MenuGroup>
                </MenuPopup>
              </Menu>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      aria-label="Leave call"
                      className={cn(
                        "ms-1 flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-destructive px-3.5 font-medium text-white outline-none hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background @md:px-4",
                        press,
                      )}
                      onClick={leave}
                      type="button"
                    />
                  }
                >
                  <PhoneOffIcon className="size-[18px]" />
                  <span className="hidden @md:inline">Leave</span>
                </TooltipTrigger>
                <TooltipPopup side="top" sideOffset={8}>
                  Leave call
                </TooltipPopup>
              </Tooltip>
            </div>
          )}
          <div className="hidden flex-1 items-center justify-end gap-2 @4xl:flex">
            {!left && (
              <>
                <ControlButton
                  badge={panel === "chat" ? 0 : unread}
                  label="Chat"
                  onClick={() => setPanel(panel === "chat" ? null : "chat")}
                  pressed={panel === "chat"}
                  tone={panel === "chat" ? "on" : "default"}
                >
                  <MessageSquareIcon />
                </ControlButton>
                <ControlButton
                  label="People"
                  onClick={() => setPanel(panel === "people" ? null : "people")}
                  pressed={panel === "people"}
                  tone={panel === "people" ? "on" : "default"}
                >
                  <UsersIcon />
                </ControlButton>
              </>
            )}
          </div>
        </footer>

        <AnimatePresence>
          {!wide && panel && !left && (
            <>
              <motion.div
                animate={{ opacity: 1 }}
                aria-hidden
                className="absolute inset-0 z-40 bg-black/32"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key="scrim"
                onClick={() => setPanel(null)}
                transition={{ duration: 0.2, ease: easeOut }}
              />
              <motion.aside
                animate={{ y: 0 }}
                aria-label={panel === "chat" ? "Chat" : "People"}
                aria-modal
                ref={sheetRef}
                tabIndex={-1}
                className="absolute inset-x-0 top-16 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-2xl border-t bg-card shadow-lg/10 outline-none"
                exit={{ y: "100%", transition: { duration: 0.2, ease: easeOut } }}
                initial={{ y: "100%" }}
                key="sheet"
                role="dialog"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 42 }}
              >
                <PanelHeader messages={messages.length} onClose={() => setPanel(null)} onTab={setPanel} panel={panel} people={inCall.length} />
                {panelBody}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}

function PanelHeader({
  panel,
  onTab,
  onClose,
  messages,
  people,
}: {
  panel: "chat" | "people";
  onTab: (p: "chat" | "people") => void;
  onClose: () => void;
  messages: number;
  people: number;
}) {
  const reduce = useReducedMotionSafe();
  return (
    <div className="flex h-13 shrink-0 items-center gap-2 border-b ps-2 pe-2">
      <div className="flex items-center gap-0.5" role="tablist">
        {(
          [
            { value: "chat", label: "Chat", count: messages },
            { value: "people", label: "People", count: people },
          ] as const
        ).map((t) => (
          <button
            aria-selected={panel === t.value}
            className="relative flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
            key={t.value}
            onClick={() => onTab(t.value)}
            role="tab"
            type="button"
          >
            {panel === t.value && (
              <motion.span
                className="absolute inset-0 rounded-lg bg-accent"
                layoutId="vc-panel-tab"
                transition={reduce ? { duration: 0 } : spring}
              />
            )}
            <span className={cn("relative transition-colors", panel === t.value ? "text-foreground" : "text-muted-foreground")}>
              {t.label}
            </span>
            <span className="relative text-muted-foreground text-xs tabular-nums">{t.count}</span>
          </button>
        ))}
      </div>
      <Button aria-label="Close panel" className="ms-auto" onClick={onClose} size="icon-sm" variant="ghost">
        <XIcon />
      </Button>
    </div>
  );
}
