"use client";

import {
  ArrowLeftIcon,
  BellIcon,
  CheckIcon,
  ChevronRightIcon,
  CreditCardIcon,
  KeyRoundIcon,
  MailIcon,
  MessagesSquareIcon,
  MonitorIcon,
  PaletteIcon,
  SettingsIcon,
  ShieldIcon,
  SmartphoneIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type SettingsSectionId =
  | "profile"
  | "appearance"
  | "notifications"
  | "security"
  | "general"
  | "members"
  | "billing"
  | "developer";

export type NotifyChannelId = "desktop" | "mobile" | "email" | "chat";
export type NotifyChannelMode = "all" | "mentions" | "off";
export type NotifyMedium = "email" | "push" | "chat";
export type DigestFrequency = "off" | "daily" | "weekly";

export interface NotifyEvent {
  id: string;
  label: string;
  hint: string;
  media: NotifyMedium[];
  pending: number;
  mention?: boolean;
}

export interface NotifySection {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  events: NotifyEvent[];
}

export interface NotifyQuietHours {
  enabled: boolean;
  from: number;
  to: number;
}

export interface NotificationSettingsProps {
  className?: string;
  channels?: Record<NotifyChannelId, NotifyChannelMode>;
  sections?: NotifySection[];
  quietHours?: NotifyQuietHours;
  digest?: DigestFrequency;
  onNavigate?: (section: SettingsSectionId) => void;
}

const easeOut = [0.23, 1, 0.32, 1] as const;

const navGroups: { label: string; items: { id: SettingsSectionId; label: string; icon: ReactNode }[] }[] = [
  {
    label: "Account",
    items: [
      { id: "profile", label: "Profile", icon: <UserIcon /> },
      { id: "appearance", label: "Appearance", icon: <PaletteIcon /> },
      { id: "notifications", label: "Notifications", icon: <BellIcon /> },
      { id: "security", label: "Security", icon: <ShieldIcon /> },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "general", label: "General", icon: <SettingsIcon /> },
      { id: "members", label: "Members & roles", icon: <UsersIcon /> },
      { id: "billing", label: "Billing", icon: <CreditCardIcon /> },
    ],
  },
  {
    label: "Developer",
    items: [{ id: "developer", label: "API keys & webhooks", icon: <KeyRoundIcon /> }],
  },
];


const channelMeta: { id: NotifyChannelId; label: string; icon: ReactNode; detail: string }[] = [
  { id: "desktop", label: "Desktop", icon: <MonitorIcon />, detail: "Banners from the Ridgeline desktop app and this browser." },
  { id: "mobile", label: "Mobile", icon: <SmartphoneIcon />, detail: "Push notifications on Pixel 9." },
  { id: "email", label: "Email", icon: <MailIcon />, detail: "Sent to ada@ridgeline.app." },
  { id: "chat", label: "Chat", icon: <MessagesSquareIcon />, detail: "Direct messages from the Ridgeline bot in your team chat." },
];

const modeMeta: Record<NotifyChannelMode, { label: string; dot: string; short: string }> = {
  all: { label: "Enabled for all", dot: "bg-success", short: "All activity" },
  mentions: { label: "Mentions only", dot: "bg-info", short: "Mentions only" },
  off: { label: "Off", dot: "bg-muted-foreground/40", short: "Off" },
};

const media: { id: NotifyMedium; label: string; icon: ReactNode }[] = [
  { id: "email", label: "Email", icon: <MailIcon /> },
  { id: "push", label: "Push", icon: <SmartphoneIcon /> },
  { id: "chat", label: "Chat", icon: <MessagesSquareIcon /> },
];

const digestItems: { value: DigestFrequency; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const hourItems = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${String(h).padStart(2, "0")}:00`,
}));

const defaultChannels: Record<NotifyChannelId, NotifyChannelMode> = {
  desktop: "off",
  mobile: "all",
  email: "all",
  chat: "mentions",
};

const defaultSections: NotifySection[] = [
  {
    id: "activity",
    label: "Activity",
    description: "Conversations and work that involves you.",
    enabled: true,
    events: [
      { id: "mentions", label: "Mentions", hint: "Someone @mentions you in a doc or comment.", media: ["email", "push", "chat"], pending: 3, mention: true },
      { id: "replies", label: "Replies", hint: "New replies on threads you started.", media: ["email", "push"], pending: 5 },
      { id: "assigned", label: "Assigned to you", hint: "A task lands on your plate.", media: ["email", "push"], pending: 2 },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    description: "Changes to projects you lead or follow.",
    enabled: true,
    events: [
      { id: "status", label: "Status changes", hint: "A task you follow moves to another column.", media: ["chat"], pending: 9 },
      { id: "due", label: "Due soon", hint: "A day before something of yours is due.", media: ["email", "push"], pending: 1 },
      { id: "created", label: "New projects", hint: "A project is created in one of your teams.", media: [], pending: 2 },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    description: "Invoices and plan limits for the Ridgeline workspace.",
    enabled: true,
    events: [
      { id: "invoice", label: "Invoices", hint: "A new invoice is ready to download.", media: ["email"], pending: 1 },
      { id: "failed", label: "Payment failed", hint: "A card is declined or about to expire.", media: ["email", "push"], pending: 0 },
      { id: "usage", label: "Usage over 80%", hint: "Seats or storage close to your plan limit.", media: ["email"], pending: 1 },
    ],
  },
];

const defaultQuiet: NotifyQuietHours = { enabled: true, from: 22, to: 8 };

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

function RidgelineShell({
  active,
  onNavigate,
  children,
  className,
}: {
  active: SettingsSectionId;
  onNavigate?: (section: SettingsSectionId) => void;
  children: ReactNode;
  className?: string;
}) {
  const pillsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = pillsRef.current;
    const el = scroller?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!scroller || !el || scroller.scrollWidth <= scroller.clientWidth) return;
    scroller.scrollLeft = el.offsetLeft - 16;
  }, [active]);

  return (
    <div className={cn("flex h-[760px] w-full bg-background text-foreground", className)}>
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 px-3 py-4 md:flex">
        <button
          className="flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-muted-foreground text-sm outline-none transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Ridgeline
        </button>
        <nav aria-label="Settings" className="flex flex-col">
          {navGroups.map((group) => (
            <div className="flex flex-col" key={group.label}>
              <span className="px-2 pt-5 pb-1.5 font-medium text-muted-foreground text-xs">{group.label}</span>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const current = item.id === active;
                  return (
                    <button
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
                        current ? "bg-accent font-medium text-foreground" : "text-foreground/80 hover:bg-accent/60",
                      )}
                      key={item.id}
                      onClick={() => onNavigate?.(item.id)}
                      type="button"
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 px-2 pt-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground font-medium text-[11px] text-background">
            AL
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-sm">Ada Lindqvist</span>
            <span className="truncate text-muted-foreground text-xs">ada@ridgeline.app</span>
          </span>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="md:hidden">
          <div className="flex h-12 items-center gap-2 border-b px-4">
            <button
              aria-label="Back to Ridgeline"
              className="-ms-1.5 flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
              type="button"
            >
              <ArrowLeftIcon className="size-4" />
            </button>
            <span className="font-medium text-sm">Settings</span>
          </div>
          <nav
            aria-label="Settings"
            className="overflow-x-auto border-b px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            ref={pillsRef}
          >
            <div className="flex w-max gap-1.5">
              {navGroups.flatMap((g) => g.items).map((item) => {
                const current = item.id === active;
                return (
                  <button
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex h-7 cursor-pointer items-center rounded-full px-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      current
                        ? "bg-foreground font-medium text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                    data-section={item.id}
                    key={item.id}
                    onClick={() => onNavigate?.(item.id)}
                    type="button"
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}


function SectionHeader({ title, description, action }: { title: string; description: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 className="font-medium text-sm">{title}</h2>
        <p className="text-pretty text-muted-foreground text-sm">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function RollingNumber({ value, reduce }: { value: number; reduce: boolean }) {
  return (
    <span className="relative inline-flex overflow-hidden align-bottom tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: reduce ? 0 : "-70%", opacity: 0 }}
          initial={{ y: reduce ? 0 : "70%", opacity: 0 }}
          key={value}
          transition={{ duration: 0.2, ease: easeOut }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function SaveStatus({ state, reduce }: { state: "idle" | "saving" | "saved"; reduce: boolean }) {
  return (
    <span aria-live="polite" className="inline-flex h-7 items-center text-xs">
      <AnimatePresence initial={false} mode="wait">
        {state !== "idle" && (
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "inline-flex items-center gap-1.5",
              state === "saved" ? "text-success-foreground" : "text-muted-foreground",
            )}
            exit={{ opacity: 0, y: reduce ? 0 : -3 }}
            initial={{ opacity: 0, y: reduce ? 0 : 3 }}
            key={state}
            transition={{ duration: 0.15, ease: easeOut }}
          >
            {state === "saved" ? <CheckIcon className="size-3.5" /> : <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />}
            {state === "saved" ? "Saved" : "Saving"}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function ChannelRow({
  channel,
  mode,
  open,
  onOpen,
  onMode,
  reduce,
}: {
  channel: (typeof channelMeta)[number];
  mode: NotifyChannelMode;
  open: boolean;
  onOpen: () => void;
  onMode: (mode: NotifyChannelMode) => void;
  reduce: boolean;
}) {
  const panelId = `channel-${channel.id}`;
  return (
    <div className="border-t first:border-t-0">
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40"
        onClick={onOpen}
        type="button"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground [&_svg]:size-4">
          {channel.icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium text-sm">{channel.label}</span>
          <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <span className={cn("size-1.5 rounded-full transition-colors duration-200", modeMeta[mode].dot)} />
            {modeMeta[mode].label}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          className="text-muted-foreground"
          initial={false}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 34 }}
        >
          <ChevronRightIcon className="size-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.22, ease: easeOut }}
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 pb-3.5 sm:ps-15">
              <p className="min-w-0 flex-1 basis-44 text-pretty text-muted-foreground text-xs">{channel.detail}</p>
              <SegmentedControl aria-label={`${channel.label} notifications`} size="sm">
                {(Object.keys(modeMeta) as NotifyChannelMode[]).map((m) => (
                  <SegmentedControlItem
                    aria-pressed={mode === m}
                    data-pressed={mode === m ? "" : undefined}
                    key={m}
                    onClick={() => onMode(m)}
                  >
                    {modeMeta[m].short}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuietTrack({ from, to }: { from: number; to: number }) {
  const segments = from < to ? [[from, to]] : [[from, 24], [0, to]];
  return (
    <div aria-hidden className="flex w-full max-w-64 flex-col gap-1">
      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
        {segments.map(([a, b], i) => (
          <span
            className="absolute inset-y-0 rounded-full bg-indigo-500 transition-[left,width] duration-200 ease-out dark:bg-indigo-400"
            key={i}
            style={{ left: `${(a / 24) * 100}%`, width: `${((b - a) / 24) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground/80">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  );
}

function HourSelect({ label, value, onChange }: { label: string; value: number; onChange: (h: number) => void }) {
  return (
    <Select items={hourItems} onValueChange={(v) => v != null && onChange(Number(v))} value={String(value)}>
      <SelectTrigger aria-label={label} className="w-24 min-w-0 font-mono tabular-nums" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {hourItems.map((h) => (
          <SelectItem className="font-mono tabular-nums" key={h.value} value={h.value}>
            {h.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

export function NotificationSettings({
  className,
  channels: initialChannels = defaultChannels,
  sections: initialSections = defaultSections,
  quietHours = defaultQuiet,
  digest: initialDigest = "weekly",
  onNavigate,
}: NotificationSettingsProps) {
  const reduce = useCalmMotion();
  const [channels, setChannels] = useState(initialChannels);
  const [openChannel, setOpenChannel] = useState<NotifyChannelId | null>(null);
  const [sections, setSections] = useState(initialSections);
  const [quiet, setQuiet] = useState(quietHours);
  const [digest, setDigest] = useState<DigestFrequency>(initialDigest);
  const [save, setSave] = useState<{ state: "idle" | "saving" | "saved"; tick: number }>({ state: "idle", tick: 0 });

  useEffect(() => {
    if (save.state === "idle") return;
    const t = setTimeout(
      () => setSave((s) => ({ ...s, state: s.state === "saving" ? "saved" : "idle" })),
      save.state === "saving" ? 500 : 1600,
    );
    return () => clearTimeout(t);
  }, [save.state, save.tick]);

  const touched = () => setSave((s) => ({ state: "saving", tick: s.tick + 1 }));

  const mediumOff: Record<NotifyMedium, boolean> = {
    email: channels.email === "off",
    push: channels.desktop === "off" && channels.mobile === "off",
    chat: channels.chat === "off",
  };

  const digestCount = sections.reduce(
    (n, s) =>
      s.enabled
        ? n +
          s.events.reduce(
            (m, e) =>
              e.media.includes("email") && !mediumOff.email && (channels.email === "all" || e.mention) ? m + e.pending : m,
            0,
          )
        : n,
    0,
  );

  const digestLine =
    digest === "off"
      ? "Off. Each email is sent as it happens."
      : mediumOff.email
        ? "Paused while email notifications are off."
        : null;

  const isDefault =
    JSON.stringify({ channels, sections, quiet, digest }) ===
    JSON.stringify({ channels: initialChannels, sections: initialSections, quiet: quietHours, digest: initialDigest });

  const restore = () => {
    setChannels(initialChannels);
    setSections(initialSections);
    setQuiet(quietHours);
    setDigest(initialDigest);
    setOpenChannel(null);
    touched();
  };

  const restoreLink = (
    <button
      className="cursor-pointer rounded-sm text-muted-foreground text-sm underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50 disabled:hover:text-muted-foreground disabled:hover:no-underline"
      disabled={isDefault}
      onClick={restore}
      type="button"
    >
      Restore defaults
    </button>
  );

  return (
    <RidgelineShell active="notifications" className={className} onNavigate={onNavigate}>
      <div className="mx-auto w-full max-w-2xl px-6 py-10 md:px-10">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-2xl tracking-tight">Notifications</h1>
            <p className="mt-1 text-muted-foreground text-sm">Choose what reaches you, and where.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 pt-1.5">
            <SaveStatus reduce={reduce} state={save.state} />
            <span className="hidden sm:inline-flex">{restoreLink}</span>
          </div>
        </div>

        <section className="mt-10">
          <SectionHeader description="How each channel reaches you. Everything always lands in your Ridgeline inbox." title="Where we notify you" />
          <div className="mt-3 overflow-hidden rounded-xl border bg-card">
            {channelMeta.map((c) => (
              <ChannelRow
                channel={c}
                key={c.id}
                mode={channels[c.id]}
                onMode={(m) => {
                  setChannels((all) => ({ ...all, [c.id]: m }));
                  touched();
                }}
                onOpen={() => setOpenChannel((o) => (o === c.id ? null : c.id))}
                open={openChannel === c.id}
                reduce={reduce}
              />
            ))}
          </div>
        </section>

        {sections.map((section) => (
          <section className="mt-10" key={section.id}>
            <SectionHeader
              action={
                <Switch
                  aria-label={`${section.label} notifications`}
                  checked={section.enabled}
                  onCheckedChange={(v) => {
                    setSections((all) => all.map((s) => (s.id === section.id ? { ...s, enabled: v } : s)));
                    touched();
                  }}
                />
              }
              description={section.description}
              title={section.label}
            />
            <div className="mt-3 overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center gap-4 border-b px-4 py-2.5 font-medium text-muted-foreground text-xs">
                <span className="flex-1">Event</span>
                <span aria-hidden className="flex">
                  {media.map((m) => (
                    <span className="w-9 text-center" key={m.id}>
                      {m.label}
                    </span>
                  ))}
                </span>
              </div>
              <ul className={cn("divide-y transition-opacity duration-200", !section.enabled && "opacity-50")}>
                {section.events.map((e) => (
                  <li className="flex items-center gap-4 px-4 py-3.5" key={e.id}>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-medium text-sm">{e.label}</span>
                      <span className="text-pretty text-muted-foreground text-xs">{e.hint}</span>
                    </div>
                    <ToggleGroup
                      aria-label={`Channels for ${e.label}`}
                      className="shrink-0"
                      disabled={!section.enabled}
                      multiple
                      onValueChange={(value) => {
                        setSections((all) =>
                          all.map((s) =>
                            s.id === section.id
                              ? { ...s, events: s.events.map((x) => (x.id === e.id ? { ...x, media: value as NotifyMedium[] } : x)) }
                              : s,
                          ),
                        );
                        touched();
                      }}
                      size="sm"
                      value={e.media}
                      variant="outline"
                    >
                      {media.map((m) => (
                        <ToggleGroupItem
                          aria-label={`${m.label} for ${e.label}${mediumOff[m.id] ? " (channel off)" : ""}`}
                          className="w-9 text-muted-foreground/50 data-pressed:text-foreground"
                          disabled={!section.enabled || mediumOff[m.id]}
                          key={m.id}
                          value={m.id}
                        >
                          {m.icon}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}

        <section className="mt-10">
          <SectionHeader description="When notifications can wait." title="Delivery" />
          <div className="mt-3 overflow-hidden rounded-xl border bg-card">
            <div>
              <label className="flex cursor-pointer items-center gap-4 px-4 py-3.5">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium text-sm">Quiet hours</span>
                  <span className="text-pretty text-muted-foreground text-xs">
                    {quiet.enabled
                      ? `Push and chat stay silent ${hourItems[quiet.from].label}–${hourItems[quiet.to].label}, every day.`
                      : "Mute push and chat overnight. Email waits for you anyway."}
                  </span>
                </span>
                <Switch
                  checked={quiet.enabled}
                  onCheckedChange={(v) => {
                    setQuiet((q) => ({ ...q, enabled: v }));
                    touched();
                  }}
                />
              </label>
              <AnimatePresence initial={false}>
                {quiet.enabled && (
                  <motion.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.22, ease: easeOut }}
                  >
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 pb-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <HourSelect
                          label="Quiet hours start"
                          onChange={(h) => {
                            if (h === quiet.to) return;
                            setQuiet((q) => ({ ...q, from: h }));
                            touched();
                          }}
                          value={quiet.from}
                        />
                        <span>to</span>
                        <HourSelect
                          label="Quiet hours end"
                          onChange={(h) => {
                            if (h === quiet.from) return;
                            setQuiet((q) => ({ ...q, to: h }));
                            touched();
                          }}
                          value={quiet.to}
                        />
                      </div>
                      <div className="min-w-40 flex-1">
                        <QuietTrack from={quiet.from} to={quiet.to} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-4 border-t px-4 py-3.5">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium text-sm">Email digest</span>
                <span aria-live="polite" className="text-pretty text-muted-foreground text-xs">
                  {digestLine ?? (
                    <>
                      Next digest {digest === "daily" ? "tomorrow" : "Monday"} 09:00 ·{" "}
                      <span className="font-medium text-foreground">
                        <RollingNumber reduce={reduce} value={digestCount} /> {digestCount === 1 ? "item" : "items"}
                      </span>
                    </>
                  )}
                </span>
              </div>
              <Select
                items={digestItems}
                onValueChange={(v) => {
                  if (!v) return;
                  setDigest(v as DigestFrequency);
                  touched();
                }}
                value={digest}
              >
                <SelectTrigger aria-label="Email digest" className="w-28 min-w-0" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {digestItems.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          </div>
        </section>
        <div className="mt-8 flex justify-center sm:hidden">{restoreLink}</div>
      </div>
    </RidgelineShell>
  );
}
