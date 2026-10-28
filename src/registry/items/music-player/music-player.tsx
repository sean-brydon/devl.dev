"use client";

import {
  CompassIcon,
  GripVerticalIcon,
  HeartIcon,
  HomeIcon,
  ListMusicIcon,
  MenuIcon,
  MicVocalIcon,
  PauseIcon,
  PlayIcon,
  RadioIcon,
  Repeat1Icon,
  RepeatIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  Volume1Icon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from "lucide-react";
import {
  AnimatePresence,
  type DragControls,
  motion,
  Reorder,
  useDragControls,
  useReducedMotion,
} from "motion/react";
import { type KeyboardEvent, type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export type CoverArt = "sunset" | "ocean" | "forest" | "dusk" | "citrus" | "rose" | "aurora" | "slate";

export interface LyricLine {
  time: number;
  text: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  art: CoverArt;
  lyrics?: LyricLine[];
}

export interface MusicPlaylist {
  id: string;
  name: string;
  art: CoverArt;
  trackIds: string[];
}

export interface MusicPlayerProps {
  className?: string;
  appName?: string;
  tracks?: MusicTrack[];
  playlists?: MusicPlaylist[];
  initialTrackId?: string;
  initialPosition?: number;
  autoPlay?: boolean;
}

const spring = { type: "spring", stiffness: 520, damping: 46, mass: 1 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;
const press = "transition-[color,background-color,box-shadow,scale] duration-150 ease-out active:scale-[0.97]";
const ring = "outline-none focus-visible:ring-2 focus-visible:ring-ring";

const arts: Record<CoverArt, string> = {
  sunset: "from-amber-300 via-orange-500 to-rose-700",
  ocean: "from-sky-300 via-blue-600 to-indigo-950",
  forest: "from-lime-300 via-emerald-600 to-teal-950",
  dusk: "from-fuchsia-400 via-violet-700 to-indigo-950",
  citrus: "from-yellow-200 via-lime-400 to-emerald-600",
  rose: "from-pink-200 via-rose-400 to-red-700",
  aurora: "from-teal-200 via-cyan-500 to-violet-800",
  slate: "from-stone-200 via-stone-500 to-stone-900",
};

function Motif({ art }: { art: CoverArt }) {
  const common = { "aria-hidden": true, className: "absolute inset-0 size-full", viewBox: "0 0 100 100", preserveAspectRatio: "xMidYMid slice" } as const;
  switch (art) {
    case "sunset":
      return (
        <svg {...common}>
          <circle className="fill-amber-100/90" cx="50" cy="62" r="22" />
          <rect className="fill-rose-950/35" height="36" width="100" x="0" y="66" />
          {[
            [72, 34],
            [78, 24],
            [84, 15],
            [90, 7],
          ].map(([y, w]) => (
            <rect className="fill-amber-100/50" height="1.6" key={y} rx="0.8" width={w} x={50 - w / 2} y={y} />
          ))}
        </svg>
      );
    case "ocean":
      return (
        <svg {...common}>
          {[52, 62, 72, 82].map((y, i) => (
            <path
              className="fill-none stroke-white/40"
              d={`M-5 ${y} Q 12 ${y - 7} 25 ${y} T 55 ${y} T 85 ${y} T 115 ${y}`}
              key={y}
              strokeWidth={2.2 - i * 0.3}
            />
          ))}
          <circle className="fill-white/70" cx="74" cy="26" r="7" />
        </svg>
      );
    case "forest":
      return (
        <svg {...common}>
          <path className="fill-black/25" d="M-10 100 L28 34 L66 100Z" />
          <path className="fill-white/15" d="M30 100 L64 44 L98 100Z" />
          <path className="fill-black/30" d="M55 100 L84 56 L113 100Z" />
        </svg>
      );
    case "dusk":
      return (
        <svg {...common}>
          {[
            [18, 20],
            [34, 12],
            [80, 18],
            [62, 30],
            [12, 44],
            [88, 46],
          ].map(([x, y]) => (
            <circle className="fill-white/70" cx={x} cy={y} key={`${x}-${y}`} r="0.9" />
          ))}
          <circle className="fill-amber-50/90" cx="58" cy="58" r="20" />
          <circle className="fill-violet-700" cx="66" cy="52" r="17" />
        </svg>
      );
    case "citrus":
      return (
        <svg {...common}>
          {[34, 26, 18, 10].map((r) => (
            <circle className="fill-none stroke-white/45" cx="36" cy="64" key={r} r={r} strokeWidth="1.6" />
          ))}
          <circle className="fill-yellow-100/80" cx="36" cy="64" r="5" />
        </svg>
      );
    case "rose":
      return (
        <svg {...common}>
          <path className="fill-white/20" d="M20 70c-8-22 10-44 32-40s34 26 22 42-46 20-54-2z" />
          <circle className="fill-none stroke-white/55" cx="50" cy="52" r="14" strokeWidth="1.5" />
        </svg>
      );
    case "aurora":
      return (
        <svg {...common}>
          <path className="fill-none stroke-white/35" d="M-5 40 C 25 20, 55 60, 105 30" strokeWidth="9" />
          <path className="fill-none stroke-emerald-200/40" d="M-5 58 C 30 38, 60 76, 105 50" strokeWidth="6" />
          <path className="fill-black/30" d="M0 100 L0 84 L18 76 L34 86 L52 72 L70 84 L86 74 L100 82 L100 100Z" />
        </svg>
      );
    case "slate":
      return (
        <svg {...common}>
          {[20, 40, 60, 80].map((v) => (
            <g key={v}>
              <line className="stroke-white/20" x1={v} x2={v} y1="0" y2="100" />
              <line className="stroke-white/20" x1="0" x2="100" y1={v} y2={v} />
            </g>
          ))}
          <rect className="fill-white/75" height="20" width="20" x="40" y="40" />
        </svg>
      );
  }
}

function Cover({ art, className }: { art: CoverArt; className?: string }) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden bg-linear-to-br", arts[art], className)}>
      <Motif art={art} />
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-black/10 ring-inset dark:ring-white/10" />
    </span>
  );
}

function time(s: number) {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

function waveform(seed: string, n: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
  return Array.from({ length: n }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const grit = (h % 1000) / 1000;
    const swell = 0.55 + 0.45 * Math.sin((i / n) * Math.PI * 3.2 + (seed.length % 5));
    const v = 0.18 + 0.82 * (0.45 * swell + 0.55 * grit) * Math.min(1, (i + 2) / 5) * Math.min(1, (n - i + 1) / 5);
    return Math.max(0.12, Math.min(1, v));
  });
}

function EqBars({ playing, className }: { playing: boolean; className?: string }) {
  const reduce = useReducedMotionAfterMount();
  return (
    <span aria-hidden className={cn("flex h-3 items-end gap-[2px]", className)}>
      {[0.6, 1, 0.75].map((h, i) => (
        <motion.span
          animate={playing && !reduce ? { scaleY: [h, 0.3, 1, 0.5, h] } : { scaleY: h * 0.6 }}
          className="h-3 w-[3px] origin-bottom rounded-full bg-current"
          key={i}
          transition={playing && !reduce ? { duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.18 } : { duration: 0.2 }}
        />
      ))}
    </span>
  );
}

function Scrubber({
  track,
  position,
  onSeek,
  bars = 72,
}: {
  track: MusicTrack;
  position: number;
  onSeek: (s: number) => void;
  bars?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const heights = waveform(track.id, bars);
  const pct = Math.min(100, (position / track.duration) * 100);

  const at = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return 0;
    return Math.min(1, Math.max(0, (clientX - box.left) / box.width));
  };

  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 15 : 5;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") onSeek(Math.min(track.duration - 1, position + step));
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") onSeek(Math.max(0, position - step));
    else if (e.key === "Home") onSeek(0);
    else if (e.key === "End") onSeek(track.duration - 1);
    else return;
    e.preventDefault();
  };

  const layer = (cls: string) => (
    <div className={cn("absolute inset-0 flex items-center gap-[2px]", cls)}>
      {heights.map((h, i) => (
        <span className="min-w-0 flex-1 rounded-full bg-current" key={i} style={{ height: `${Math.round(h * 100)}%` }} />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div
        aria-label="Seek"
        aria-valuemax={Math.round(track.duration)}
        aria-valuemin={0}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${time(position)} of ${time(track.duration)}`}
        className={cn("group/scrub relative h-12 cursor-pointer touch-none select-none rounded-md", ring, "focus-visible:ring-offset-4 focus-visible:ring-offset-background")}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          onSeek(at(e.clientX) * track.duration);
        }}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const f = at(e.clientX);
          if (dragging) onSeek(f * track.duration);
          if (e.pointerType === "mouse") setHover(f);
        }}
        onPointerCancel={() => setDragging(false)}
        onPointerUp={() => setDragging(false)}
        ref={ref}
        role="slider"
        tabIndex={0}
      >
        {layer("text-foreground/15")}
        {hover !== null && layer("text-foreground/35")}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
          {layer("text-foreground")}
        </div>
        {hover !== null && (
          <div className="pointer-events-none absolute inset-0" style={{ clipPath: `inset(0 ${100 - hover * 100}% 0 0)` }}>
            {layer("text-foreground/35")}
          </div>
        )}
        <span
          className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
          style={{ left: `${pct}%` }}
        />
        {hover !== null && (
          <span
            className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-md border bg-popover px-1.5 py-0.5 font-medium text-popover-foreground text-xs tabular-nums shadow-md/5"
            style={{ left: `${hover * 100}%` }}
          >
            {time(hover * track.duration)}
          </span>
        )}
      </div>
      <div className="flex justify-between text-muted-foreground text-xs tabular-nums">
        <span>{time(position)}</span>
        <span>-{time(track.duration - position)}</span>
      </div>
    </div>
  );
}

function QueueRow({
  track,
  index,
  total,
  onPlay,
  onRemove,
  onMove,
}: {
  track: MusicTrack;
  index: number;
  total: number;
  onPlay: () => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const controls: DragControls = useDragControls();
  const reduce = useReducedMotionAfterMount();
  return (
    <Reorder.Item
      as="li"
      className="group/row relative flex items-center gap-1 rounded-xl bg-background pe-1 [&:has(:focus-visible)]:bg-accent"
      dragControls={controls}
      dragListener={false}
      exit={reduce ? { opacity: 0, transition: { duration: 0.12 } } : { opacity: 0, scale: 0.97, transition: { duration: 0.15, ease: easeOut } }}
      initial={false}
      layout={reduce ? undefined : "position"}
      transition={spring}
      value={track}
      whileDrag={{ scale: 1.02, boxShadow: "0 8px 24px -8px rgb(0 0 0 / 0.25)", zIndex: 10 }}
    >
      <button
        aria-label={`Reorder ${track.title}. Use arrow keys to move.`}
        className={cn(
          "flex h-12 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground/60 hover:text-foreground active:cursor-grabbing",
          ring,
        )}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" && index > 0) {
            e.preventDefault();
            onMove(-1);
          } else if (e.key === "ArrowDown" && index < total - 1) {
            e.preventDefault();
            onMove(1);
          }
        }}
        onPointerDown={(e) => controls.start(e)}
        type="button"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <button
        className={cn("flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg py-1.5 pe-1 text-left hover:bg-accent/60", ring, press, "active:scale-[0.99]")}
        onClick={onPlay}
        type="button"
      >
        <Cover art={track.art} className="size-9 rounded-md" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{track.title}</span>
          <span className="truncate text-muted-foreground text-xs">{track.artist}</span>
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">{time(track.duration)}</span>
      </button>
      <button
        aria-label={`Remove ${track.title} from queue`}
        className={cn(
          "relative flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-100 hover:bg-accent hover:text-foreground after:absolute after:-inset-1.5 after:content-[''] focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100",
          ring,
        )}
        onClick={onRemove}
        type="button"
      >
        <XIcon className="size-3.5" />
      </button>
    </Reorder.Item>
  );
}

const defaultTracks: MusicTrack[] = [
  {
    id: "t1",
    title: "Paper Lanterns",
    artist: "Wren & the Low Tide",
    album: "Harbour Lights",
    duration: 214,
    art: "sunset",
    lyrics: [
      { time: 0, text: "♪" },
      { time: 8, text: "Streetlights hum a song we never learned" },
      { time: 14, text: "Your coat still smells of rain and turning leaves" },
      { time: 20, text: "We count the windows burning on the hill" },
      { time: 26, text: "And name the ones still waiting up for us" },
      { time: 33, text: "Paper lanterns, drifting over water" },
      { time: 39, text: "Every little light a thing we didn't say" },
      { time: 45, text: "Paper lanterns, hold on a little longer" },
      { time: 51, text: "Till the tide comes in and carries them away" },
      { time: 60, text: "♪" },
      { time: 70, text: "The ferry horn is calling out the hour" },
      { time: 76, text: "You laugh the way you did when we were nine" },
      { time: 82, text: "I fold the evening up and keep it small" },
      { time: 88, text: "A pocket full of maybe, one of mine" },
      { time: 96, text: "Paper lanterns, drifting over water" },
      { time: 102, text: "Every little light a thing we didn't say" },
      { time: 108, text: "Paper lanterns, hold on a little longer" },
      { time: 114, text: "Till the tide comes in and carries them away" },
      { time: 124, text: "♪" },
      { time: 140, text: "And if the dark gets heavy, let it" },
      { time: 148, text: "We were never meant to hold the sky" },
      { time: 156, text: "Paper lanterns…" },
      { time: 164, text: "…carry us away" },
      { time: 176, text: "♪" },
    ],
  },
  {
    id: "t2",
    title: "Low Orbit",
    artist: "Pale Static",
    album: "Satellite Summer",
    duration: 187,
    art: "dusk",
    lyrics: [
      { time: 0, text: "♪" },
      { time: 12, text: "Radio static where your voice used to be" },
      { time: 19, text: "I keep the dial right where you left it" },
      { time: 26, text: "Low orbit, circling the kitchen light" },
      { time: 33, text: "Too far to land and too close to forget it" },
      { time: 44, text: "♪" },
      { time: 58, text: "Low orbit, low orbit" },
      { time: 64, text: "Spinning slow so I can see you twice" },
      { time: 76, text: "♪" },
    ],
  },
  { id: "t3", title: "Fieldnotes", artist: "Marisol Vega", album: "Green Hours", duration: 241, art: "forest" },
  { id: "t4", title: "Saltwater Radio", artist: "The Quiet Coast", album: "Long Weekend", duration: 198, art: "ocean" },
  { id: "t5", title: "Citrus Season", artist: "Bloom Arcade", album: "Sugar & Static", duration: 176, art: "citrus" },
  { id: "t6", title: "Velvet Hour", artist: "June Okafor", album: "Night Swim", duration: 229, art: "rose" },
  { id: "t7", title: "Northern Hearts", artist: "Atlas Frame", album: "Polar", duration: 263, art: "aurora" },
  { id: "t8", title: "Concrete Garden", artist: "Mono Theory", album: "Grey Matter", duration: 205, art: "slate" },
  { id: "t9", title: "Afterglow", artist: "Wren & the Low Tide", album: "Harbour Lights", duration: 192, art: "sunset" },
];

const defaultPlaylists: MusicPlaylist[] = [
  { id: "p1", name: "Late night drives", art: "dusk", trackIds: ["t2", "t6", "t7", "t1", "t8"] },
  { id: "p2", name: "Sunday reset", art: "citrus", trackIds: ["t5", "t3", "t4", "t9"] },
  { id: "p3", name: "Deep focus", art: "slate", trackIds: ["t8", "t3", "t7", "t4"] },
  { id: "p4", name: "Harbour Lights", art: "sunset", trackIds: ["t1", "t9"] },
];

type Pane = "playing" | "queue" | "lyrics";
type Repeat = "off" | "all" | "one";

export function MusicPlayer({
  className,
  appName = "Murmur",
  tracks = defaultTracks,
  playlists = defaultPlaylists,
  initialTrackId,
  initialPosition = 47,
  autoPlay = true,
}: MusicPlayerProps) {
  const reduce = useReducedMotionAfterMount();
  const first = tracks.find((t) => t.id === initialTrackId) ?? tracks[0];
  const [current, setCurrent] = useState<MusicTrack>(first);
  const [queue, setQueue] = useState<MusicTrack[]>(() => tracks.filter((t) => t.id !== first.id));
  const [history, setHistory] = useState<MusicTrack[]>([]);
  const [position, setPosition] = useState(initialPosition);
  const [playing, setPlaying] = useState(autoPlay);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<Repeat>("off");
  const [liked, setLiked] = useState<string[]>(["t2", "t6"]);
  const [volume, setVolume] = useState(72);
  const [muted, setMuted] = useState(false);
  const [side, setSide] = useState<"queue" | "lyrics">("lyrics");
  const [pane, setPane] = useState<Pane>("playing");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [activePlaylist, setActivePlaylist] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const preShuffle = useRef<string[] | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const mobileLyricsRef = useRef<HTMLDivElement>(null);
  const state = useRef({ queue, history, current, repeat });
  state.current = { queue, history, current, repeat };

  const goTo = (track: MusicTrack, rest: MusicTrack[], dir: 1 | -1 = 1, pushHistory = true) => {
    if (pushHistory) setHistory((h) => [...h, state.current.current]);
    setDirection(dir);
    setCurrent(track);
    setQueue(rest);
    setPosition(0);
  };

  const next = (auto = false) => {
    const { queue: q, history: h, repeat: r, current: c } = state.current;
    if (auto && r === "one") {
      setPosition(0);
      return;
    }
    if (q.length) goTo(q[0], q.slice(1));
    else if (r === "all" && h.length) {
      setHistory([]);
      goTo(h[0], [...h.slice(1), c], 1, false);
    } else {
      setPlaying(false);
      setPosition(c.duration);
    }
  };

  const prev = () => {
    if (position > 3 || history.length === 0) {
      setPosition(0);
      return;
    }
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    goTo(last, [current, ...queue], -1, false);
  };

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setPosition((p) => Math.min(state.current.current.duration, p + 0.25));
    }, 250);
    return () => clearInterval(t);
  }, [playing, current.id]);

  useEffect(() => {
    if (playing && position >= current.duration) next(true);
  }, [position, playing, current.duration]);

  useEffect(() => {
    if (drawer) drawerRef.current?.focus({ preventScroll: true });
  }, [drawer]);

  const lyrics = current.lyrics ?? [];
  const activeLine = lyrics.reduce((acc, l, i) => (l.time <= position ? i : acc), -1);

  useEffect(() => {
    for (const box of [lyricsRef.current, mobileLyricsRef.current]) {
      if (!box || box.offsetParent === null) continue;
      const line = box.querySelector<HTMLElement>(`[data-line="${activeLine}"]`);
      if (!line) continue;
      const top = line.offsetTop - box.clientHeight / 2 + line.clientHeight / 2;
      box.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
    }
  }, [activeLine, current.id, side, pane, reduce]);

  const toggleShuffle = () => {
    if (!shuffle) {
      preShuffle.current = queue.map((t) => t.id);
      const copy = [...queue];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      setQueue(copy);
    } else if (preShuffle.current) {
      const order = preShuffle.current;
      setQueue((q) => [...q].sort((a, b) => (order.indexOf(a.id) + 1 || 999) - (order.indexOf(b.id) + 1 || 999)));
    }
    setShuffle((s) => !s);
  };

  const playFromQueue = (index: number) => {
    const q = queue;
    setHistory((h) => [...h, current, ...q.slice(0, index)]);
    goTo(q[index], q.slice(index + 1), 1, false);
    setPlaying(true);
  };

  const playPlaylist = (p: MusicPlaylist) => {
    const list = p.trackIds.map((id) => tracks.find((t) => t.id === id)).filter(Boolean) as MusicTrack[];
    if (!list.length) return;
    setActivePlaylist(p.id);
    goTo(list[0], list.slice(1));
    setPlaying(true);
    setDrawer(false);
  };

  const move = (index: number, dir: -1 | 1) => {
    setQueue((q) => {
      const copy = [...q];
      const [item] = copy.splice(index, 1);
      copy.splice(index + dir, 0, item);
      return copy;
    });
  };

  const isLiked = liked.includes(current.id);
  const toggleLike = () => setLiked((l) => (isLiked ? l.filter((x) => x !== current.id) : [...l, current.id]));
  const queueTime = queue.reduce((s, t) => s + t.duration, 0);
  const VolumeIcon = muted || volume === 0 ? VolumeXIcon : volume < 50 ? Volume1Icon : Volume2Icon;

  const playButton = (size: "lg" | "sm") => (
    <button
      aria-label={playing ? "Pause" : "Play"}
      className={cn(
        "relative flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs/5 hover:bg-primary/90",
        ring,
        "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        press,
        "active:scale-[0.95]",
        size === "lg" ? "size-14" : "size-9",
      )}
      onClick={() => {
        if (!playing && position >= current.duration) setPosition(0);
        setPlaying((p) => !p);
      }}
      type="button"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          className="flex"
          exit={{ opacity: 0, scale: 0.7, filter: "blur(2px)" }}
          initial={{ opacity: 0, scale: 0.7, filter: "blur(2px)" }}
          key={playing ? "pause" : "play"}
          transition={{ duration: 0.15, ease: easeOut }}
        >
          {playing ? (
            <PauseIcon className={cn("fill-current", size === "lg" ? "size-6" : "size-4")} />
          ) : (
            <PlayIcon className={cn("fill-current", size === "lg" ? "ms-0.5 size-6" : "ms-px size-4")} />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );

  const iconButton = (label: string, onClick: () => void, icon: ReactNode, active?: boolean, className?: string) => (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-accent [&_svg]:size-5",
        ring,
        press,
        active === undefined ? "text-foreground" : active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      {active && <span className="absolute bottom-1 size-1 rounded-full bg-foreground" />}
    </button>
  );

  const lyricsList = (refObj: RefObject<HTMLDivElement | null>, big?: boolean) =>
    lyrics.length === 0 ? (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <MicVocalIcon className="size-4.5" />
        </span>
        <span className="font-medium">No lyrics for this one</span>
        <span className="text-pretty text-muted-foreground text-xs">
          {current.artist} hasn't shared lyrics for “{current.title}” yet.
        </span>
      </div>
    ) : (
      <div
        className="relative h-full overflow-y-auto px-5 [mask-image:linear-gradient(to_bottom,transparent,#000_15%,#000_85%,transparent)] [scrollbar-width:none]"
        ref={refObj}
      >
        <ol className="flex flex-col gap-1 py-[45%]">
          {lyrics.map((l, i) => {
            const state = i === activeLine ? "now" : i < activeLine ? "past" : "next";
            return (
              <li data-line={i} key={`${l.time}-${i}`}>
                <button
                  className={cn(
                    "w-full cursor-pointer text-pretty rounded-lg px-2 py-1.5 text-left font-semibold tracking-tight transition-colors duration-300 ease-out hover:text-foreground",
                    ring,
                    big ? "text-2xl" : "text-xl leading-snug",
                    state === "now" && "text-foreground",
                    state === "past" && "text-muted-foreground/50",
                    state === "next" && "text-muted-foreground",
                  )}
                  onClick={() => {
                    setPosition(l.time);
                    setPlaying(true);
                  }}
                  type="button"
                >
                  {l.text}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    );

  const queueList = (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-1 pb-2">
        <span className="font-medium text-muted-foreground text-xs">Now playing</span>
        <div className="mt-1.5 flex items-center gap-3 rounded-xl bg-accent/60 p-1.5 pe-3">
          <Cover art={current.art} className="size-9 rounded-md" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{current.title}</span>
            <span className="truncate text-muted-foreground text-xs">{current.artist}</span>
          </span>
          <EqBars className="text-foreground" playing={playing} />
        </div>
      </div>
      <div className="flex items-center justify-between px-4 pt-2 pb-1">
        <span className="font-medium text-muted-foreground text-xs">
          Up next · <span className="tabular-nums">{queue.length}</span> songs, <span className="tabular-nums">{Math.round(queueTime / 60)}</span> min
        </span>
        {queue.length > 0 && (
          <Button className={press} onClick={() => setQueue([])} size="xs" variant="ghost">
            Clear
          </Button>
        )}
      </div>
      {queue.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 pb-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <ListMusicIcon className="size-4.5" />
          </span>
          <span className="font-medium">Queue's empty</span>
          <span className="text-pretty text-muted-foreground text-xs">Pick a playlist to keep the music going.</span>
        </div>
      ) : (
        <Reorder.Group axis="y" className="relative min-h-0 flex-1 overflow-y-auto px-2 pb-3" onReorder={setQueue} values={queue}>
          <AnimatePresence initial={false} mode="popLayout">
            {queue.map((t, i) => (
              <QueueRow
                index={i}
                key={t.id}
                onMove={(d) => move(i, d)}
                onPlay={() => playFromQueue(i)}
                onRemove={() => setQueue((q) => q.filter((x) => x.id !== t.id))}
                total={queue.length}
                track={t}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
    </div>
  );

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-3">
      <div className="flex items-center gap-2.5 px-1.5 pt-1">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <EqBars className="text-primary-foreground" playing={false} />
        </span>
        <span className="font-heading font-semibold">{appName}</span>
      </div>
      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {[
          { label: "Home", icon: <HomeIcon />, active: true },
          { label: "Browse", icon: <CompassIcon /> },
          { label: "Radio", icon: <RadioIcon /> },
        ].map((n) => (
          <button
            aria-current={n.active ? "page" : undefined}
            className={cn(
              "flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left [&_svg]:size-4 [&_svg]:opacity-80",
              ring,
              press,
              n.active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            key={n.label}
            type="button"
          >
            {n.icon}
            {n.label}
          </button>
        ))}
      </nav>
      <div className="flex min-h-0 flex-col gap-1">
        <span className="px-2.5 font-medium text-muted-foreground text-xs">Playlists</span>
        <button
          aria-current={activePlaylist === "liked" || undefined}
          className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-accent", ring, press)}
          onClick={() => {
            const list = liked.map((id) => tracks.find((t) => t.id === id)).filter(Boolean) as MusicTrack[];
            if (list.length) {
              setActivePlaylist("liked");
              goTo(list[0], list.slice(1));
              setPlaying(true);
              setDrawer(false);
            }
          }}
          type="button"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-rose-400 to-fuchsia-600 text-white">
            <HeartIcon className="size-4 fill-current" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={cn("truncate", activePlaylist === "liked" ? "font-medium" : "")}>Liked songs</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {liked.length} {liked.length === 1 ? "song" : "songs"}
            </span>
          </span>
          {activePlaylist === "liked" && <EqBars className="me-1.5 text-foreground" playing={playing} />}
        </button>
        {playlists.map((p) => (
          <button
            aria-current={activePlaylist === p.id || undefined}
            className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-accent", ring, press)}
            key={p.id}
            onClick={() => playPlaylist(p)}
            type="button"
          >
            <Cover art={p.art} className="size-9 rounded-md" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={cn("truncate", activePlaylist === p.id && "font-medium")}>{p.name}</span>
              <span className="text-muted-foreground text-xs tabular-nums">{p.trackIds.length} songs</span>
            </span>
            {activePlaylist === p.id && <EqBars className="me-1.5 text-foreground" playing={playing} />}
          </button>
        ))}
      </div>
    </div>
  );

  const nowPlaying = (
    <div className="flex w-full max-w-md flex-col gap-5 @3xl:gap-6">
      <div className="relative mx-auto aspect-square w-full max-w-[min(100%,300px)] @3xl:max-w-[320px]">
        <AnimatePresence initial={false}>
          <motion.div
            animate={{ opacity: 1 }}
            aria-hidden
            className="absolute inset-4 -z-10"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key={current.id}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <Cover art={current.art} className="size-full scale-110 rounded-full opacity-45 blur-3xl dark:opacity-35" />
          </motion.div>
        </AnimatePresence>
        <AnimatePresence custom={direction} initial={false} mode="popLayout">
          <motion.div
            animate={{ opacity: 1, x: 0, scale: playing ? 1 : 0.96 }}
            className="size-full"
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -direction * 32, scale: 0.94 }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * 32, scale: 0.94 }}
            key={current.id}
            transition={{ duration: 0.28, ease: easeOut }}
          >
            <Cover art={current.art} className="size-full rounded-2xl shadow-lg/15" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex min-w-0 flex-col gap-0.5"
              exit={{ opacity: 0, y: reduce ? 0 : -4, transition: { duration: 0.1, ease: easeOut } }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
              key={current.id}
              transition={{ duration: 0.2, ease: easeOut }}
            >
              <h2 className="truncate font-heading font-semibold text-xl tracking-tight">{current.title}</h2>
              <p className="truncate text-muted-foreground">
                {current.artist} · {current.album}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
        <button
          aria-label={isLiked ? "Remove from liked songs" : "Add to liked songs"}
          aria-pressed={isLiked}
          className={cn(
            "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-accent",
            ring,
            press,
            isLiked ? "text-rose-500 dark:text-rose-400" : "text-muted-foreground hover:text-foreground",
          )}
          onClick={toggleLike}
          type="button"
        >
          <motion.span
            animate={isLiked && !reduce ? { scale: [1, 1.25, 1] } : { scale: 1 }}
            className="flex"
            key={String(isLiked)}
            transition={{ duration: 0.3, ease: easeOut }}
          >
            <HeartIcon className={cn("size-5", isLiked && "fill-current")} />
          </motion.span>
        </button>
      </div>

      <Scrubber onSeek={setPosition} position={position} track={current} />

      <div className="flex items-center justify-between">
        {iconButton("Shuffle", toggleShuffle, <ShuffleIcon />, shuffle)}
        <div className="flex items-center gap-2">
          {iconButton("Previous", prev, <SkipBackIcon className="fill-current" />)}
          {playButton("lg")}
          {iconButton("Next", () => next(), <SkipForwardIcon className="fill-current" />)}
        </div>
        {iconButton(
          repeat === "one" ? "Repeat one" : repeat === "all" ? "Repeat all" : "Repeat",
          () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")),
          repeat === "one" ? <Repeat1Icon /> : <RepeatIcon />,
          repeat !== "off",
        )}
      </div>

      <div className="flex items-center gap-2 text-muted-foreground">
        {iconButton(muted ? "Unmute" : "Mute", () => setMuted((m) => !m), <VolumeIcon className="!size-4.5" />, undefined, "size-8 text-muted-foreground")}
        <Slider
          aria-label="Volume"
          className="flex-1 [&_[data-slot=slider-control]]:min-w-0"
          max={100}
          onValueChange={(v) => {
            setVolume(Array.isArray(v) ? v[0] : (v as number));
            setMuted(false);
          }}
          value={muted ? 0 : volume}
        />
        <span className="w-7 text-right text-xs tabular-nums">{muted ? 0 : volume}</span>
      </div>
    </div>
  );

  const paneTabs: { value: Pane; label: string }[] = [
    { value: "playing", label: "Playing" },
    { value: "queue", label: "Up next" },
    { value: "lyrics", label: "Lyrics" },
  ];

  return (
    <div
      className={cn("@container relative isolate flex h-[760px] w-full overflow-hidden bg-background text-foreground text-sm", className)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && drawer) setDrawer(false);
      }}
    >
      <aside className="hidden w-60 shrink-0 overflow-y-auto border-r bg-muted/40 @5xl:block">{sidebar}</aside>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              aria-hidden
              className="absolute inset-0 z-40 bg-black/32 @5xl:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="scrim"
              onClick={() => setDrawer(false)}
              transition={{ duration: 0.2, ease: easeOut }}
            />
            <motion.div
              animate={{ x: 0 }}
              aria-label="Library"
              aria-modal
              className="absolute inset-y-0 left-0 z-50 w-72 max-w-[85%] overflow-y-auto border-r bg-background outline-none @5xl:hidden"
              exit={{ x: "-100%" }}
              initial={{ x: "-100%" }}
              key="drawer"
              ref={drawerRef}
              role="dialog"
              tabIndex={-1}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 42 }}
            >
              <Button aria-label="Close library" className="absolute top-3 right-3" onClick={() => setDrawer(false)} size="icon-sm" variant="ghost">
                <XIcon />
              </Button>
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 px-3 @5xl:hidden">
          <Button aria-label="Open library" onClick={() => setDrawer(true)} size="icon-sm" variant="ghost">
            <MenuIcon />
          </Button>
          <span className="font-heading font-semibold">{appName}</span>
          <div aria-label="View" className="relative ms-auto flex h-8 items-center rounded-lg bg-muted p-0.5 @3xl:hidden" role="tablist">
            {paneTabs.map((t) => (
              <button
                aria-selected={pane === t.value}
                className={cn("relative flex h-7 cursor-pointer items-center rounded-md px-2.5 font-medium text-xs", ring)}
                key={t.value}
                onClick={() => setPane(t.value)}
                role="tab"
                type="button"
              >
                {pane === t.value && (
                  <motion.span
                    className="absolute inset-0 rounded-md bg-background shadow-xs/5 dark:bg-input"
                    layoutId="mp-pane"
                    transition={reduce ? { duration: 0 } : spring}
                  />
                )}
                <span className={cn("relative transition-colors", pane === t.value ? "text-foreground" : "text-muted-foreground")}>{t.label}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <main
            className={cn(
              "min-w-0 flex-1 overflow-y-auto px-5 pt-4 pb-8 @3xl:flex @3xl:items-center @3xl:justify-center @3xl:px-8 @3xl:py-8",
              pane === "playing" ? "flex justify-center" : "hidden",
            )}
          >
            {nowPlaying}
          </main>

          {pane !== "playing" && (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col @3xl:hidden">
              <div className="min-h-0 flex-1">{pane === "queue" ? queueList : lyricsList(mobileLyricsRef, true)}</div>
            </div>
          )}

          <aside className="hidden w-80 shrink-0 flex-col border-l @3xl:flex">
            <div aria-label="Side panel" className="flex h-13 shrink-0 items-center gap-0.5 px-3" role="tablist">
              {(
                [
                  { value: "lyrics", label: "Lyrics", icon: <MicVocalIcon /> },
                  { value: "queue", label: "Up next", icon: <ListMusicIcon /> },
                ] as const
              ).map((t) => (
                <button
                  aria-selected={side === t.value}
                  className={cn("relative flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 font-medium [&_svg]:size-4", ring)}
                  key={t.value}
                  onClick={() => setSide(t.value)}
                  role="tab"
                  type="button"
                >
                  {side === t.value && (
                    <motion.span
                      className="absolute inset-0 rounded-lg bg-accent"
                      layoutId="mp-side"
                      transition={reduce ? { duration: 0 } : spring}
                    />
                  )}
                  <span className={cn("relative flex items-center gap-1.5 transition-colors", side === t.value ? "text-foreground" : "text-muted-foreground")}>
                    {t.icon}
                    {t.label}
                    {t.value === "queue" && <span className="text-muted-foreground text-xs tabular-nums">{queue.length}</span>}
                  </span>
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1">{side === "queue" ? queueList : lyricsList(lyricsRef)}</div>
          </aside>
        </div>

        <AnimatePresence initial={false}>
          {pane !== "playing" && (
            <motion.div
              animate={{ y: 0, opacity: 1 }}
              className="relative shrink-0 border-t bg-background @3xl:hidden"
              exit={{ y: 12, opacity: 0, transition: { duration: 0.15 } }}
              initial={reduce ? { opacity: 0 } : { y: 12, opacity: 0 }}
              transition={{ duration: 0.22, ease: easeOut }}
            >
              <span className="absolute inset-x-0 top-0 h-0.5 bg-muted">
                <span className="block h-full origin-left bg-primary transition-transform duration-250 ease-linear" style={{ transform: `scaleX(${position / current.duration})` }} />
              </span>
              <div className="flex items-center gap-3 px-3 py-2.5">
                <button className={cn("flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg text-left", ring)} onClick={() => setPane("playing")} type="button">
                  <Cover art={current.art} className="size-10 rounded-md" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{current.title}</span>
                    <span className="truncate text-muted-foreground text-xs">{current.artist}</span>
                  </span>
                </button>
                {playButton("sm")}
                {iconButton("Next", () => next(), <SkipForwardIcon className="fill-current" />)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
