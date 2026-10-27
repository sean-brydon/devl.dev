"use client";

import {
  ArrowLeftIcon,
  BellIcon,
  CheckIcon,
  CreditCardIcon,
  KeyRoundIcon,
  MoveIcon,
  PaletteIcon,
  RotateCcwIcon,
  SettingsIcon,
  ShieldIcon,
  UploadIcon,
  UserIcon,
  UsersIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import {
  type ComponentType,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

export type AvatarPalette = "dusk" | "tide" | "ember" | "moss";

export interface AvatarCrop {
  palette: AvatarPalette;
  x: number;
  y: number;
  zoom: number;
}

export interface ProfileDraft {
  fullName: string;
  publicName: string;
  username: string;
  email: string;
  bio: string;
  timeZone: string;
  avatar: AvatarCrop | null;
}

export interface ProfileZone {
  id: string;
  city: string;
}

export interface ProfileSettingsProps {
  className?: string;
  profile?: ProfileDraft;
  domain?: string;
  takenUsernames?: string[];
  bioLimit?: number;
  zones?: ProfileZone[];
  onSave?: (profile: ProfileDraft) => void | Promise<void>;
  onNavigate?: (section: string) => void;
}

type UsernameStatus = "current" | "checking" | "available" | "taken" | "invalid";

const easeOut = [0.23, 1, 0.32, 1] as const;
const spring = { type: "spring", stiffness: 520, damping: 42 } as const;
const press = "transition-[background-color,color,box-shadow,scale] duration-150 ease-out motion-safe:active:scale-[0.97]";
const stageSpan = 136;
const zoomRange = [1, 2.4] as const;
const artBleed = 1.3;

const palettes: Record<AvatarPalette, { label: string; stops: [string, string, string]; swatch: string }> = {
  dusk: {
    label: "Dusk",
    stops: ["text-indigo-600", "text-fuchsia-500", "text-amber-300"],
    swatch: "from-indigo-600 via-fuchsia-500 to-amber-300",
  },
  tide: {
    label: "Tide",
    stops: ["text-blue-700", "text-teal-400", "text-lime-200"],
    swatch: "from-blue-700 via-teal-400 to-lime-200",
  },
  ember: {
    label: "Ember",
    stops: ["text-rose-700", "text-orange-500", "text-yellow-300"],
    swatch: "from-rose-700 via-orange-500 to-yellow-300",
  },
  moss: {
    label: "Moss",
    stops: ["text-emerald-800", "text-emerald-500", "text-lime-300"],
    swatch: "from-emerald-800 via-emerald-500 to-lime-300",
  },
};

const navGroups: { label: string; items: { id: string; label: string; icon: ComponentType<{ className?: string }> }[] }[] = [
  {
    label: "Account",
    items: [
      { id: "profile", label: "Profile", icon: UserIcon },
      { id: "appearance", label: "Appearance", icon: PaletteIcon },
      { id: "notifications", label: "Notifications", icon: BellIcon },
      { id: "security", label: "Security", icon: ShieldIcon },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "general", label: "General", icon: SettingsIcon },
      { id: "members", label: "Members & roles", icon: UsersIcon },
      { id: "billing", label: "Billing", icon: CreditCardIcon },
    ],
  },
  {
    label: "Developer",
    items: [{ id: "api", label: "API keys & webhooks", icon: KeyRoundIcon }],
  },
];

const defaultZones: ProfileZone[] = [
  { id: "Pacific/Honolulu", city: "Honolulu" },
  { id: "America/Los_Angeles", city: "Los Angeles" },
  { id: "America/Denver", city: "Denver" },
  { id: "America/Chicago", city: "Chicago" },
  { id: "America/New_York", city: "New York" },
  { id: "America/Sao_Paulo", city: "São Paulo" },
  { id: "Europe/London", city: "London" },
  { id: "Europe/Lisbon", city: "Lisbon" },
  { id: "Europe/Stockholm", city: "Stockholm" },
  { id: "Europe/Berlin", city: "Berlin" },
  { id: "Africa/Lagos", city: "Lagos" },
  { id: "Africa/Nairobi", city: "Nairobi" },
  { id: "Asia/Dubai", city: "Dubai" },
  { id: "Asia/Kolkata", city: "Mumbai" },
  { id: "Asia/Singapore", city: "Singapore" },
  { id: "Asia/Tokyo", city: "Tokyo" },
  { id: "Australia/Sydney", city: "Sydney" },
  { id: "Pacific/Auckland", city: "Auckland" },
];

const defaultProfile: ProfileDraft = {
  fullName: "Ada Lindqvist",
  publicName: "Ada",
  username: "adalindqvist",
  email: "ada@ridgeline.app",
  bio: "Design engineer on the platform team. I care about fast tools, tidy changelogs and good coffee.",
  timeZone: "Europe/Stockholm",
  avatar: { palette: "dusk", x: 0, y: 0, zoom: 1 },
};

const defaultTaken = ["ada", "adal", "lindqvist", "admin", "support", "hello", "team", "ridgeline", "design"];

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

function useSafeId() {
  return useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0]).toUpperCase();
}

function clampCrop(crop: AvatarCrop): AvatarCrop {
  const zoom = Math.max(zoomRange[0], Math.min(zoomRange[1], crop.zoom));
  const limit = 50 * (zoom * artBleed - 1);
  const clamp = (v: number) => Math.max(-limit, Math.min(limit, v));
  return { ...crop, zoom, x: clamp(crop.x), y: clamp(crop.y) };
}

function artTransform(crop: AvatarCrop) {
  return `translate(${50 + crop.x} ${50 + crop.y}) scale(${crop.zoom * artBleed}) translate(-50 -50)`;
}

function sameCrop(a: AvatarCrop | null, b: AvatarCrop | null) {
  if (!a || !b) return a === b;
  return a.palette === b.palette && a.x === b.x && a.y === b.y && a.zoom === b.zoom;
}

function validateUsername(value: string): string | null {
  if (value.length < 3) return "Use at least 3 characters.";
  if (value.length > 24) return "Keep it to 24 characters or fewer.";
  if (!/^[a-z0-9-]+$/.test(value)) return "Use lowercase letters, numbers and hyphens.";
  if (/^-|-$/.test(value)) return "Start and end with a letter or number.";
  return null;
}

function suggestionsFor(value: string, fullName: string, taken: Set<string>) {
  const base = value.replace(/[^a-z0-9]/g, "").slice(0, 16) || "ada";
  const last = fullName.trim().split(/\s+/).slice(1).join("").toLowerCase().replace(/[^a-z]/g, "");
  return [last ? `${base}-${last[0]}` : `${base}-hq`, `${base}${base.length + 21}`, `hey-${base}`, `${base}-studio`]
    .filter((s) => !taken.has(s) && !validateUsername(s) && s !== value)
    .slice(0, 3);
}

function offsetMinutes(timeZone: string, date: Date) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;
  const match = part?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

function formatOffset(minutes: number) {
  if (minutes === 0) return "UTC";
  const abs = Math.abs(minutes);
  const m = abs % 60;
  return `UTC${minutes > 0 ? "+" : "−"}${Math.floor(abs / 60)}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

function formatDiff(minutes: number) {
  if (minutes === 0) return "same as your browser";
  const abs = Math.abs(minutes);
  const m = abs % 60;
  return `${Math.floor(abs / 60)}h${m ? ` ${m}m` : ""} ${minutes > 0 ? "ahead of" : "behind"} your browser`;
}

function AvatarArt({ palette, initials, uid }: { palette: AvatarPalette; initials: string; uid: string }) {
  const p = palettes[palette];
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" x2="1" y1="0" y2="1">
          <stop className={p.stops[0]} offset="0" stopColor="currentColor" />
          <stop className={p.stops[1]} offset="1" stopColor="currentColor" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`}>
          <stop className={p.stops[2]} offset="0" stopColor="currentColor" stopOpacity="0.9" />
          <stop className={p.stops[2]} offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect fill={`url(#${uid}-bg)`} height="100" width="100" />
      <circle cx="68" cy="30" fill={`url(#${uid}-glow)`} r="30" />
      <circle className={p.stops[2]} cx="68" cy="30" fill="currentColor" r="8" />
      <path d="M0 66 Q 20 54 42 63 T 100 56 V100 H0Z" fill="black" fillOpacity="0.14" />
      <path d="M0 80 Q 28 68 56 78 T 100 72 V100 H0Z" fill="black" fillOpacity="0.2" />
      <text
        dominantBaseline="central"
        fill="white"
        fontSize="22"
        fontWeight="600"
        letterSpacing="-0.4"
        textAnchor="middle"
        x="50"
        y="50"
      >
        {initials}
      </text>
    </>
  );
}

function ProfileAvatar({ crop, initials, className }: { crop: AvatarCrop | null; initials: string; className?: string }) {
  const uid = useSafeId();
  if (!crop) {
    return (
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border bg-muted font-medium text-muted-foreground [container-type:size]",
          className,
        )}
      >
        <span className="text-[38cqh] leading-none">{initials}</span>
      </span>
    );
  }
  return (
    <svg aria-hidden className={cn("shrink-0", className)} viewBox="0 0 100 100">
      <clipPath id={`${uid}-clip`}>
        <circle cx="50" cy="50" r="50" />
      </clipPath>
      <g clipPath={`url(#${uid}-clip)`}>
        <g transform={artTransform(crop)}>
          <AvatarArt initials={initials} palette={crop.palette} uid={uid} />
        </g>
      </g>
      <circle cx="50" cy="50" fill="none" r="49.5" stroke="black" strokeOpacity="0.08" />
    </svg>
  );
}

function CropStage({
  crop,
  initials,
  onChange,
}: {
  crop: AvatarCrop;
  initials: string;
  onChange: (crop: AvatarCrop) => void;
}) {
  const uid = useSafeId();
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const thirds = [100 / 3, 200 / 3];

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: crop.x, y: crop.y };
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    const el = ref.current;
    if (!start || !el) return;
    const k = stageSpan / el.clientWidth;
    onChange(clampCrop({ ...crop, x: start.x + (e.clientX - start.px) * k, y: start.y + (e.clientY - start.py) * k }));
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 8 : 2;
    const moves: Record<string, [number, number, number]> = {
      ArrowLeft: [-step, 0, 0],
      ArrowRight: [step, 0, 0],
      ArrowUp: [0, -step, 0],
      ArrowDown: [0, step, 0],
      "+": [0, 0, 0.1],
      "=": [0, 0, 0.1],
      "-": [0, 0, -0.1],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    onChange(clampCrop({ ...crop, x: crop.x + move[0], y: crop.y + move[1], zoom: crop.zoom + move[2] }));
  };

  return (
    <div
      aria-label="Photo framing. Drag or use the arrow keys to move, plus and minus to zoom."
      className="relative aspect-square w-full cursor-grab touch-none select-none overflow-hidden rounded-xl bg-muted outline-none ring-ring/24 focus-visible:ring-[3px] active:cursor-grabbing"
      onKeyDown={onKeyDown}
      onLostPointerCapture={endDrag}
      onPointerCancel={endDrag}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      ref={ref}
      role="group"
      tabIndex={0}
    >
      <svg aria-hidden className="size-full" viewBox="-18 -18 136 136">
        <clipPath id={`${uid}-circle`}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
        <g transform={artTransform(crop)}>
          <AvatarArt initials={initials} palette={crop.palette} uid={uid} />
        </g>
        <path
          className="fill-popover/72"
          d="M-18 -18 H118 V118 H-18Z M50 0 A50 50 0 1 0 50 100 A50 50 0 1 0 50 0Z"
          fillRule="evenodd"
        />
        <g
          className="transition-opacity duration-150 ease-out"
          clipPath={`url(#${uid}-circle)`}
          opacity={dragging ? 1 : 0}
          stroke="white"
          strokeOpacity="0.55"
          strokeWidth="0.35"
        >
          {thirds.map((t) => (
            <g key={t}>
              <line x1={t} x2={t} y1="0" y2="100" />
              <line x1="0" x2="100" y1={t} y2={t} />
            </g>
          ))}
        </g>
        <circle cx="50" cy="50" fill="none" r="50" stroke="white" strokeOpacity="0.9" strokeWidth="0.6" />
      </svg>
      <span
        className={cn(
          "pointer-events-none absolute bottom-2.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-popover/88 px-2.5 py-1 font-medium text-foreground text-xs shadow-xs/5 backdrop-blur-sm transition-opacity duration-150",
          dragging ? "opacity-0" : "opacity-100",
        )}
      >
        <MoveIcon className="size-3" />
        Drag to reposition
      </span>
    </div>
  );
}

function CropDialog({
  open,
  initial,
  initials,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  initial: AvatarCrop;
  initials: string;
  onOpenChange: (open: boolean) => void;
  onApply: (crop: AvatarCrop) => void;
}) {
  const [crop, setCrop] = useState(initial);
  const initialRef = useRef(initial);
  initialRef.current = initial;
  useEffect(() => {
    if (open) setCrop(initialRef.current);
  }, [open]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-semibold text-lg">Adjust photo</DialogTitle>
          <DialogDescription>Drag to reposition, then zoom to frame it.</DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-5">
          <div className="mx-auto w-full max-w-64">
            <CropStage crop={crop} initials={initials} onChange={setCrop} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Zoom out"
              className={press}
              disabled={crop.zoom <= zoomRange[0]}
              onClick={() => setCrop((c) => clampCrop({ ...c, zoom: c.zoom - 0.2 }))}
              size="icon-sm"
              variant="ghost"
            >
              <ZoomOutIcon />
            </Button>
            <Slider
              getAriaLabel={() => "Zoom"}
              max={zoomRange[1]}
              min={zoomRange[0]}
              onValueChange={(v) => setCrop((c) => clampCrop({ ...c, zoom: Array.isArray(v) ? v[0] : v }))}
              step={0.01}
              value={crop.zoom}
            />
            <Button
              aria-label="Zoom in"
              className={press}
              disabled={crop.zoom >= zoomRange[1]}
              onClick={() => setCrop((c) => clampCrop({ ...c, zoom: c.zoom + 0.2 }))}
              size="icon-sm"
              variant="ghost"
            >
              <ZoomInIcon />
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-sm">Image</span>
            <div aria-label="Image" className="flex gap-2" role="radiogroup">
              {(Object.keys(palettes) as AvatarPalette[]).map((key) => {
                const active = crop.palette === key;
                return (
                  <button
                    aria-checked={active}
                    aria-label={palettes[key].label}
                    className={cn(
                      "relative size-10 rounded-lg bg-gradient-to-br outline-none ring-offset-2 ring-offset-popover focus-visible:ring-2 focus-visible:ring-ring",
                      press,
                      palettes[key].swatch,
                      active && "ring-2 ring-foreground",
                    )}
                    key={key}
                    onClick={() => setCrop((c) => ({ ...c, palette: key }))}
                    role="radio"
                    type="button"
                  >
                    {active && (
                      <span className="absolute inset-0 flex items-center justify-center text-white">
                        <CheckIcon className="size-4" strokeWidth={2.5} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </DialogPanel>
        <DialogFooter>
          <Button
            className={cn(press, "sm:me-auto")}
            disabled={crop.zoom === 1 && crop.x === 0 && crop.y === 0}
            onClick={() => setCrop((c) => ({ ...c, x: 0, y: 0, zoom: 1 }))}
            variant="ghost"
          >
            <RotateCcwIcon />
            Reset
          </Button>
          <Button className={press} onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            className={press}
            onClick={() => {
              onApply(crop);
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function useUnwrappedAngle(angle: number | null) {
  const reduce = useReducedMotionSafe();
  const mv = useMotionValue(0);
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (angle === null) return;
    if (last.current === null || reduce) {
      last.current = angle;
      mv.set(angle);
      return;
    }
    const delta = ((((angle - last.current) % 360) + 540) % 360) - 180;
    last.current += delta;
    const controls = animate(mv, last.current, { type: "spring", stiffness: 140, damping: 18 });
    return () => controls.stop();
  }, [angle, reduce, mv]);
  return mv;
}

function MiniClock({ hours, minutes }: { hours: number | null; minutes: number | null }) {
  const ready = hours !== null && minutes !== null;
  const hour = useUnwrappedAngle(ready ? (hours % 12) * 30 + minutes * 0.5 : null);
  const minute = useUnwrappedAngle(ready ? minutes * 6 : null);
  const night = ready && (hours < 7 || hours >= 19);
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full border shadow-xs/5 transition-colors duration-300",
        night ? "border-indigo-900 bg-indigo-950 text-indigo-100" : "bg-background text-foreground",
      )}
    >
      <motion.span
        className={cn(
          "absolute bottom-1/2 left-[calc(50%-1px)] h-2 w-0.5 origin-bottom rounded-full bg-current transition-opacity",
          ready ? "opacity-100" : "opacity-0",
        )}
        style={{ rotate: hour }}
      />
      <motion.span
        className={cn(
          "absolute bottom-1/2 left-[calc(50%-0.75px)] h-3 w-[1.5px] origin-bottom rounded-full bg-current transition-opacity",
          ready ? "opacity-100" : "opacity-0",
        )}
        style={{ rotate: minute }}
      />
      <span className="absolute size-1 rounded-full bg-current" />
    </span>
  );
}

function DirtyDot({ show }: { show: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.span
          animate={{ opacity: 1, scale: 1 }}
          aria-label="Edited"
          className="size-1.5 rounded-full bg-warning"
          exit={{ opacity: 0, scale: 0.5 }}
          initial={{ opacity: 0, scale: 0.5 }}
          role="img"
          transition={{ duration: 0.16, ease: easeOut }}
        />
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  help,
  htmlFor,
  dirty,
  aside,
  children,
}: {
  label: string;
  help?: string;
  htmlFor?: string;
  dirty?: boolean;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <label className="font-medium text-sm" htmlFor={htmlFor}>
              {label}
            </label>
            <DirtyDot show={Boolean(dirty)} />
          </span>
          {help && <span className="text-pretty text-muted-foreground text-xs">{help}</span>}
        </div>
        {aside}
      </div>
      {children}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-medium text-sm">{title}</h2>
      {description && <p className="text-pretty text-muted-foreground text-sm">{description}</p>}
      {children}
    </section>
  );
}

function SettingsShell({
  active,
  account,
  onNavigate,
  overlay,
  children,
}: {
  active: string;
  account: ReactNode;
  onNavigate?: (section: string) => void;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const items = navGroups.flatMap((g) => g.items);
  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 px-3 py-4 md:flex">
        <button
          className="flex h-8 items-center gap-2 rounded-md px-2 text-muted-foreground text-sm outline-none ring-ring/24 transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:ring-[3px]"
          type="button"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Ridgeline
        </button>
        <nav aria-label="Settings">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-2 pt-5 pb-1.5 font-medium text-muted-foreground text-xs">{group.label}</div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const current = item.id === active;
                  const Icon = item.icon;
                  return (
                    <button
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none ring-ring/24 transition-colors focus-visible:ring-[3px]",
                        current ? "bg-accent font-medium text-foreground" : "text-foreground/80 hover:bg-accent/60",
                      )}
                      key={item.id}
                      onClick={() => onNavigate?.(item.id)}
                      type="button"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 px-2 pt-4">{account}</div>
      </aside>
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="md:hidden">
          <div className="flex h-12 items-center gap-2 border-b px-4">
            <button
              aria-label="Back to Ridgeline"
              className="-ms-1.5 flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none ring-ring/24 hover:bg-accent/60 hover:text-foreground focus-visible:ring-[3px]"
              type="button"
            >
              <ArrowLeftIcon className="size-4" />
            </button>
            <span className="font-medium text-sm">Settings</span>
          </div>
          <nav
            aria-label="Settings"
            className="flex gap-1.5 overflow-x-auto border-b px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item) => {
              const current = item.id === active;
              return (
                <button
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "h-7 shrink-0 rounded-full px-3 text-xs outline-none ring-ring/24 transition-colors focus-visible:ring-[3px]",
                    current ? "bg-foreground font-medium text-background" : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                  key={item.id}
                  onClick={() => onNavigate?.(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl px-6 py-10 md:px-10">{children}</div>
        </div>
        {overlay}
      </div>
    </>
  );
}

function UsernameStatusLine({
  status,
  message,
  suggestions,
  onPick,
  id,
}: {
  status: UsernameStatus;
  message: string | null;
  suggestions: string[];
  onPick: (value: string) => void;
  id: string;
}) {
  const reduce = useReducedMotionSafe();
  const content: Record<UsernameStatus, ReactNode> = {
    current: <span className="text-muted-foreground">This is your current username.</span>,
    checking: <span className="text-muted-foreground">Checking availability…</span>,
    available: (
      <span className="flex items-center gap-1 text-success-foreground">
        <CheckIcon className="size-3.5" />
        Available
      </span>
    ),
    taken: (
      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-destructive-foreground">
        <span>Taken, try</span>
        {suggestions.map((s, i) => (
          <motion.button
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "inline-flex h-6 items-center rounded-md border bg-background px-1.5 font-mono text-foreground text-xs outline-none ring-ring/24 hover:bg-accent focus-visible:ring-[3px]",
              press,
            )}
            initial={{ opacity: 0, y: reduce ? 0 : 3 }}
            key={s}
            onClick={() => onPick(s)}
            transition={{ duration: 0.18, ease: easeOut, delay: reduce ? 0 : 0.03 + i * 0.03 }}
            type="button"
          >
            {s}
          </motion.button>
        ))}
      </span>
    ),
    invalid: <span className="text-destructive-foreground">{message}</span>,
  };
  return (
    <div aria-live="polite" className="relative min-h-6 text-xs" id={id}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-6 items-center"
          exit={{ opacity: 0, y: reduce ? 0 : -3 }}
          initial={{ opacity: 0, y: reduce ? 0 : 3 }}
          key={status === "invalid" ? `invalid-${message}` : status}
          transition={{ duration: 0.16, ease: easeOut }}
        >
          {content[status]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function ProfileSettings({
  className,
  profile = defaultProfile,
  domain = "ridgeline.app",
  takenUsernames = defaultTaken,
  bioLimit = 160,
  zones = defaultZones,
  onSave,
  onNavigate,
}: ProfileSettingsProps) {
  const uid = useSafeId();
  const reduce = useReducedMotionSafe();
  const [baseline, setBaseline] = useState(profile);
  const [draft, setDraft] = useState(profile);
  const [cropOpen, setCropOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [checked, setChecked] = useState<{ value: string; taken: boolean } | null>(null);
  const [offsets, setOffsets] = useState<Record<string, number> | null>(null);
  const [localOffset, setLocalOffset] = useState<number | null>(null);
  const [clock, setClock] = useState<{ time: string; day: string; hours: number; minutes: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const emailRef = useRef<HTMLInputElement>(null);

  const taken = useMemo(() => new Set(takenUsernames.map((h) => h.toLowerCase())), [takenUsernames]);
  const usernameError = draft.username === baseline.username ? null : validateUsername(draft.username);

  useEffect(() => {
    if (draft.username === baseline.username || validateUsername(draft.username)) return;
    if (checked?.value === draft.username) return;
    const value = draft.username;
    const timer = setTimeout(() => setChecked({ value, taken: taken.has(value) }), 650);
    return () => clearTimeout(timer);
  }, [draft.username, baseline.username, checked, taken]);

  useEffect(() => {
    const now = new Date();
    setOffsets(Object.fromEntries(zones.map((z) => [z.id, offsetMinutes(z.id, now)])));
    setLocalOffset(-now.getTimezoneOffset());
  }, [zones]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: draft.timeZone,
        hour: "2-digit",
        minute: "2-digit",
        weekday: "short",
        hourCycle: "h23",
      }).formatToParts(now);
      const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
      const hours = Number(get("hour")) % 24;
      const minutes = Number(get("minute"));
      setClock({ time: `${get("hour")}:${get("minute")}`, day: get("weekday"), hours, minutes });
    };
    tick();
    const interval = setInterval(tick, 15000);
    return () => clearInterval(interval);
  }, [draft.timeZone]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  useEffect(() => {
    if (editingEmail) emailRef.current?.focus();
  }, [editingEmail]);

  const usernameStatus: UsernameStatus =
    draft.username === baseline.username
      ? "current"
      : usernameError
        ? "invalid"
        : checked?.value === draft.username
          ? checked.taken
            ? "taken"
            : "available"
          : "checking";

  const dirty = {
    avatar: !sameCrop(draft.avatar, baseline.avatar),
    fullName: draft.fullName !== baseline.fullName,
    publicName: draft.publicName !== baseline.publicName,
    username: draft.username !== baseline.username,
    email: draft.email !== baseline.email,
    bio: draft.bio !== baseline.bio,
    timeZone: draft.timeZone !== baseline.timeZone,
  };
  const dirtyCount = Object.values(dirty).filter(Boolean).length;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email);
  const blocker = !draft.fullName.trim()
    ? "Add your full name"
    : usernameStatus === "invalid"
      ? "Fix your username"
      : usernameStatus === "taken"
        ? "That username is taken"
        : usernameStatus === "checking"
          ? "Checking username…"
          : !emailValid
            ? "Enter a valid email"
            : draft.bio.length > bioLimit
              ? "Bio is too long"
              : null;

  const zone = zones.find((z) => z.id === draft.timeZone) ?? zones[0];
  const zoneOffset = offsets?.[zone.id] ?? null;
  const suggestions = usernameStatus === "taken" ? suggestionsFor(draft.username, draft.fullName, taken) : [];
  const initials = initialsOf(draft.fullName || baseline.fullName);
  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const bioLeft = bioLimit - draft.bio.length;

  const discard = () => {
    setDraft(baseline);
    setEditingEmail(false);
  };

  const save = async () => {
    if (blocker || saving) return;
    setSaving(true);
    const snapshot = draft;
    await Promise.all([onSave?.(snapshot), new Promise((r) => setTimeout(r, 900))]);
    if (!alive.current) return;
    setSaving(false);
    setBaseline(snapshot);
    setEditingEmail(false);
    setChecked(null);
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1600);
  };

  const ids = {
    fullName: `${uid}-full`,
    publicName: `${uid}-public`,
    username: `${uid}-username`,
    email: `${uid}-email`,
    bio: `${uid}-bio`,
    zone: `${uid}-zone`,
  };
  const barVisible = dirtyCount > 0 || saved;

  return (
    <div className={cn("flex h-[760px] w-full bg-background text-foreground", className)}>
      <SettingsShell
        account={
          <>
            <ProfileAvatar className="size-7" crop={draft.avatar} initials={initials} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-sm">{draft.fullName.trim() || baseline.fullName}</span>
              <span className="truncate text-muted-foreground text-xs">{baseline.email}</span>
            </div>
          </>
        }
        active="profile"
        onNavigate={onNavigate}
        overlay={
          <AnimatePresence>
            {barVisible && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4 md:px-6"
                exit={{ opacity: 0, y: reduce ? 0 : 16 }}
                initial={{ opacity: 0, y: reduce ? 0 : 24 }}
                transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 480, damping: 34 }}
              >
                <div className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-xl border bg-popover py-2 ps-4 pe-2 shadow-lg/5">
                  <AnimatePresence initial={false} mode="popLayout">
                    {saved && dirtyCount === 0 ? (
                      <motion.span
                        animate={{ opacity: 1, y: 0 }}
                        aria-live="polite"
                        className="flex min-h-8 flex-1 items-center gap-2 font-medium text-sm"
                        exit={{ opacity: 0, y: reduce ? 0 : -6 }}
                        initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                        key="saved"
                        transition={{ duration: 0.18, ease: easeOut }}
                      >
                        <CheckIcon className="size-4 text-success-foreground" />
                        Profile saved
                      </motion.span>
                    ) : (
                      <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        className="flex min-w-0 flex-1 items-center gap-2"
                        exit={{ opacity: 0, y: reduce ? 0 : -6 }}
                        initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                        key="dirty"
                        transition={{ duration: 0.18, ease: easeOut }}
                      >
                        <span aria-live="polite" className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium text-sm">
                            <span className="sm:hidden">Unsaved changes</span>
                            <span className="hidden sm:inline">You have unsaved changes</span>
                          </span>
                          {blocker && !saving && <span className="truncate text-warning-foreground text-xs">{blocker}</span>}
                        </span>
                        <Button className={press} disabled={saving} onClick={discard} size="sm" variant="ghost">
                          Discard
                        </Button>
                        <Button className={cn(press, "min-w-14")} disabled={Boolean(blocker)} loading={saving} onClick={save} size="sm">
                          Save
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        }
      >
        <h1 className="font-semibold text-2xl tracking-tight">Profile</h1>
        <p className="mt-1 text-muted-foreground text-sm">Manage how you appear to your team across Ridgeline.</p>

        <section className="mt-10 flex items-center gap-4">
          <ProfileAvatar className="size-16" crop={draft.avatar} initials={initials} />
          <div className="flex min-w-0 flex-col gap-2">
            <span className="flex items-center gap-2">
              <span className="font-medium text-sm">Profile picture</span>
              <DirtyDot show={dirty.avatar} />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button className={press} onClick={() => setCropOpen(true)} size="sm" variant="outline">
                <UploadIcon />
                Upload
              </Button>
              <Button className={press} disabled={!draft.avatar} onClick={() => set("avatar", null)} size="sm" variant="ghost">
                Remove
              </Button>
            </div>
            <span className="text-muted-foreground text-xs">PNG or JPG, up to 2 MB.</span>
          </div>
        </section>

        <div className="mt-10 flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field dirty={dirty.fullName} help="Visible to your team." htmlFor={ids.fullName} label="Full name">
              <Input
                aria-invalid={!draft.fullName.trim() || undefined}
                autoComplete="name"
                id={ids.fullName}
                maxLength={48}
                onChange={(e) => set("fullName", e.target.value)}
                value={draft.fullName}
              />
            </Field>
            <Field dirty={dirty.publicName} help="Shown on comments and mentions." htmlFor={ids.publicName} label="Public name">
              <Input
                autoComplete="nickname"
                id={ids.publicName}
                maxLength={32}
                onChange={(e) => set("publicName", e.target.value)}
                placeholder={draft.fullName.split(" ")[0]}
                value={draft.publicName}
              />
            </Field>
          </div>

          <Field dirty={dirty.username} help="Your profile link and @mention handle." htmlFor={ids.username} label="Username">
            <div className="flex flex-col gap-1">
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>{domain}/</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  aria-describedby={`${ids.username}-status`}
                  aria-invalid={usernameStatus === "taken" || usernameStatus === "invalid" || undefined}
                  autoCapitalize="none"
                  autoComplete="off"
                  className="[&_input]:ps-0.5!"
                  id={ids.username}
                  maxLength={28}
                  onChange={(e) => set("username", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  spellCheck={false}
                  value={draft.username}
                />
                <InputGroupAddon align="inline-end">
                  <span className="relative flex size-4 items-center justify-center">
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center"
                        exit={{ opacity: 0, scale: 0.8 }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        key={usernameStatus}
                        transition={{ duration: 0.15, ease: easeOut }}
                      >
                        {usernameStatus === "checking" && <Spinner className="size-4 text-muted-foreground" />}
                        {usernameStatus === "available" && <CheckIcon className="size-4 text-success-foreground" />}
                        {(usernameStatus === "taken" || usernameStatus === "invalid") && (
                          <XIcon className="size-4 text-destructive-foreground" />
                        )}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </InputGroupAddon>
              </InputGroup>
              <UsernameStatusLine
                id={`${ids.username}-status`}
                message={usernameError}
                onPick={(value) => {
                  setChecked({ value, taken: false });
                  set("username", value);
                }}
                status={usernameStatus}
                suggestions={suggestions}
              />
            </div>
          </Field>

          <Field
            aside={
              !editingEmail && (
                <Button className={cn(press, "-me-2")} onClick={() => setEditingEmail(true)} size="xs" variant="ghost">
                  Change
                </Button>
              )
            }
            dirty={dirty.email}
            help={dirty.email ? "We’ll send a link to confirm the new address." : "Used for sign-in and notifications."}
            htmlFor={ids.email}
            label="Email"
          >
            <InputGroup>
              <InputGroupInput
                aria-invalid={!emailValid || undefined}
                autoComplete="email"
                id={ids.email}
                onChange={(e) => set("email", e.target.value.trim())}
                readOnly={!editingEmail}
                ref={emailRef}
                type="email"
                value={draft.email}
              />
              <InputGroupAddon align="inline-end">
                <AnimatePresence initial={false} mode="popLayout">
                  {dirty.email ? (
                    <motion.span
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      key="pending"
                      transition={{ duration: 0.15, ease: easeOut }}
                    >
                      <Badge variant="warning">Unverified</Badge>
                    </motion.span>
                  ) : (
                    <motion.span
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      key="verified"
                      transition={{ duration: 0.15, ease: easeOut }}
                    >
                      <Badge variant="success">
                        <CheckIcon />
                        Verified
                      </Badge>
                    </motion.span>
                  )}
                </AnimatePresence>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Field
            aside={
              <span
                className={cn(
                  "text-xs tabular-nums transition-colors",
                  bioLeft < 0 ? "text-destructive-foreground" : bioLeft <= 20 ? "text-warning-foreground" : "text-muted-foreground",
                )}
                id={`${ids.bio}-count`}
              >
                {draft.bio.length}/{bioLimit}
              </span>
            }
            dirty={dirty.bio}
            help="A sentence or two about what you work on."
            htmlFor={ids.bio}
            label="Bio"
          >
            <Textarea
              aria-describedby={`${ids.bio}-count`}
              aria-invalid={bioLeft < 0 || undefined}
              className="**:[textarea]:resize-none"
              id={ids.bio}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="What you work on, what you’re into."
              value={draft.bio}
            />
          </Field>
        </div>

        <Section description="Teammates see your local time on your profile and in mentions." title="Time zone">
          <div className="mt-3 rounded-xl border bg-card">
            <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <MiniClock hours={clock?.hours ?? null} minutes={clock?.minutes ?? null} />
                <div className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2 text-sm">
                    <span>
                      It’s <span className="font-medium tabular-nums">{clock?.time ?? "––:––"}</span> for you
                    </span>
                    <DirtyDot show={dirty.timeZone} />
                  </span>
                  <span className="truncate text-muted-foreground text-xs tabular-nums">
                    {clock?.day ?? ""}
                    {zoneOffset !== null && ` · ${formatOffset(zoneOffset)}`}
                    {zoneOffset !== null && localOffset !== null && ` · ${formatDiff(zoneOffset - localOffset)}`}
                  </span>
                </div>
              </div>
              <Select
                items={zones.map((z) => ({ value: z.id, label: z.city }))}
                onValueChange={(value) => value && set("timeZone", value as string)}
                value={draft.timeZone}
              >
                <SelectTrigger aria-label="Time zone" className="sm:w-48" id={ids.zone} size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      <span className="flex w-full items-center justify-between gap-4">
                        {z.city}
                        <span className="font-mono text-muted-foreground text-xs tabular-nums">
                          {offsets ? formatOffset(offsets[z.id] ?? 0) : ""}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          </div>
        </Section>
        <div className="h-20" />
      </SettingsShell>

      <CropDialog
        initial={draft.avatar ?? { palette: "dusk", x: 0, y: 0, zoom: 1 }}
        initials={initials}
        onApply={(crop) => set("avatar", crop)}
        onOpenChange={setCropOpen}
        open={cropOpen}
      />
    </div>
  );
}
