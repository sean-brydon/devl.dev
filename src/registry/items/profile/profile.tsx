"use client";

import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  BarChart2Icon,
  BellIcon,
  BellRingIcon,
  BookmarkIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisIcon,
  HeartIcon,
  LinkIcon,
  MapPinIcon,
  MessageCircleIcon,
  PinIcon,
  Repeat2Icon,
  ShareIcon,
  XIcon,
} from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { Fragment, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Menu, MenuCheckboxItem, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";

export type ProfileHue = "amber" | "rose" | "violet" | "teal" | "sky" | "orange" | "emerald" | "indigo" | "fuchsia";

export interface ProfileArt {
  glyph: string;
  hue: ProfileHue;
  caption: string;
}

export interface ProfilePost {
  id: string;
  text: string;
  time: string;
  pinned?: boolean;
  media?: ProfileArt[];
  link?: { domain: string; title: string; hue: ProfileHue };
  replyTo?: { name: string; handle: string; text: string; hue: ProfileHue };
  replies: number;
  reposts: number;
  likes: number;
  views: string;
  liked?: boolean;
}

export interface ProfileUser {
  name: string;
  handle: string;
  bio: string;
  location: string;
  website: string;
  joined: string;
  following: number;
  followers: number;
  posts: number;
  verified?: boolean;
  followsYou?: boolean;
}

export interface ProfileSuggestion {
  name: string;
  handle: string;
  hue: ProfileHue;
  note: string;
}

export interface ProfileProps {
  className?: string;
  user?: ProfileUser;
  posts?: ProfilePost[];
  replies?: ProfilePost[];
  media?: ProfileArt[];
  suggestions?: ProfileSuggestion[];
  mutuals?: string[];
  initiallyFollowing?: boolean;
  onBack?: () => void;
}

const spring = { type: "spring", stiffness: 520, damping: 44, mass: 1 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;
const press = "transition-[color,background-color,box-shadow,scale,opacity] duration-150 ease-out active:scale-[0.97]";

const hues: Record<ProfileHue, { art: string; avatar: string }> = {
  amber: { art: "from-amber-200 via-amber-300 to-orange-400", avatar: "from-amber-300 to-orange-500" },
  rose: { art: "from-rose-200 via-rose-300 to-pink-500", avatar: "from-rose-300 to-pink-500" },
  violet: { art: "from-violet-300 via-violet-400 to-indigo-500", avatar: "from-violet-400 to-indigo-500" },
  teal: { art: "from-teal-200 via-teal-300 to-emerald-500", avatar: "from-teal-300 to-emerald-500" },
  sky: { art: "from-sky-200 via-sky-300 to-blue-500", avatar: "from-sky-300 to-blue-500" },
  orange: { art: "from-orange-200 via-orange-300 to-red-400", avatar: "from-orange-300 to-red-500" },
  emerald: { art: "from-emerald-200 via-emerald-300 to-teal-600", avatar: "from-emerald-300 to-teal-600" },
  indigo: { art: "from-indigo-300 via-indigo-400 to-violet-700", avatar: "from-indigo-400 to-violet-700" },
  fuchsia: { art: "from-fuchsia-200 via-fuchsia-300 to-purple-500", avatar: "from-fuchsia-300 to-purple-500" },
};

const defaultUser: ProfileUser = {
  name: "Wren Halloway",
  handle: "wrenmakes",
  bio: "Illustrator and type nerd. Drawing one letter a day for all of 2026. Running @nightjar.studio with two cats and a lot of tracing paper.",
  location: "Lisbon",
  website: "wrenhalloway.studio",
  joined: "Joined March 2019",
  following: 312,
  followers: 18402,
  posts: 1204,
  verified: true,
  followsYou: true,
};

const defaultPosts: ProfilePost[] = [
  {
    id: "p1",
    pinned: true,
    text: "Day 297 of #letteraday: a lowercase g that took four tries. The ear kept wanting to be a question mark. Prints of the whole alphabet go up in December.",
    time: "Oct 22",
    media: [{ glyph: "g", hue: "amber", caption: "Day 297 · lowercase g" }],
    replies: 48,
    reposts: 212,
    likes: 2318,
    views: "41K",
  },
  {
    id: "p2",
    text: "Hot take: kerning is just vibes with a ruler.",
    time: "3h",
    replies: 96,
    reposts: 140,
    likes: 842,
    views: "18K",
  },
  {
    id: "p3",
    text: "Wrote up how I pull colour palettes out of the old matchbox labels my grandad kept in a biscuit tin. Five palettes, free to use.",
    time: "Oct 20",
    link: { domain: "wrenhalloway.studio", title: "Palettes from the matchbox drawer", hue: "orange" },
    replies: 22,
    reposts: 88,
    likes: 604,
    views: "12K",
  },
  {
    id: "p4",
    text: "Studio window at 7am, and the same view at 7pm. I should be drawing but look at it.",
    time: "Oct 18",
    media: [
      { glyph: "", hue: "rose", caption: "Morning" },
      { glyph: "", hue: "indigo", caption: "Dusk" },
    ],
    replies: 31,
    reposts: 45,
    likes: 1290,
    views: "22K",
    liked: true,
  },
  {
    id: "p5",
    text: "Reminder that @mira.draws is running a free lettering session on Sunday. Bring a pencil and low expectations, that’s the whole vibe.",
    time: "Oct 16",
    replies: 9,
    reposts: 64,
    likes: 377,
    views: "8.1K",
  },
];

const defaultReplies: ProfilePost[] = [
  {
    id: "r1",
    replyTo: { name: "Mira Castell", handle: "mira.draws", text: "What pens are you using for the ink studies? They look so soft.", hue: "teal" },
    text: "A 0.3 fineliner for outlines and a brush pen that’s about 80% dried out. The dry one is the secret.",
    time: "1h",
    replies: 4,
    reposts: 3,
    likes: 129,
    views: "2.4K",
  },
  {
    id: "r2",
    replyTo: { name: "Otto Brennan", handle: "ottotype", text: "Serif or sans for a bakery that’s been open since 1962?", hue: "sky" },
    text: "Chunky slab, slightly too tight, like it was hand-painted on the window by someone in a hurry. Bakeries deserve swagger.",
    time: "Oct 21",
    replies: 12,
    reposts: 8,
    likes: 301,
    views: "5.6K",
  },
  {
    id: "r3",
    replyTo: { name: "Priya Nair", handle: "priyanair", text: "Do you plan the whole alphabet or wing it day by day?", hue: "fuchsia" },
    text: "Wing it, then quietly redraw the ones that don’t match. Q has been redrawn six times. Q knows what it did.",
    time: "Oct 19",
    replies: 6,
    reposts: 2,
    likes: 188,
    views: "3.1K",
  },
];

const defaultMedia: ProfileArt[] = [
  { glyph: "g", hue: "amber", caption: "Day 297 · lowercase g" },
  { glyph: "&", hue: "violet", caption: "Day 290 · ampersand" },
  { glyph: "R", hue: "teal", caption: "Day 284 · capital R" },
  { glyph: "Q", hue: "rose", caption: "Day 276 · Q, sixth attempt" },
  { glyph: "a", hue: "sky", caption: "Day 268 · double-storey a" },
  { glyph: "M", hue: "orange", caption: "Day 259 · capital M" },
  { glyph: "?", hue: "emerald", caption: "Day 251 · question mark" },
  { glyph: "k", hue: "fuchsia", caption: "Day 243 · lowercase k" },
  { glyph: "S", hue: "indigo", caption: "Day 237 · capital S" },
];

const defaultSuggestions: ProfileSuggestion[] = [
  { name: "Mira Castell", handle: "mira.draws", hue: "teal", note: "Follows you" },
  { name: "Otto Brennan", handle: "ottotype", hue: "sky", note: "Type designer" },
  { name: "Nightjar Studio", handle: "nightjar.studio", hue: "indigo", note: "Wren’s studio" },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const compact = (n: number) =>
  n >= 10_000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : n.toLocaleString("en-US");

function Tween({ value, format = (n: number) => Math.round(n).toLocaleString("en-US") }: { value: number; format?: (n: number) => string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, format);
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { type: "spring", stiffness: 220, damping: 30 });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

function Count({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const prev = useRef(value);
  const dir = value >= prev.current ? 1 : -1;
  useEffect(() => {
    prev.current = value;
  }, [value]);
  return (
    <span className="relative inline-flex h-4 min-w-[1ch] overflow-hidden tabular-nums">
      <AnimatePresence custom={dir} initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          custom={dir}
          exit={reduce ? { opacity: 0 } : { y: dir * -12, opacity: 0 }}
          initial={reduce ? { opacity: 0 } : { y: dir * 12, opacity: 0 }}
          key={value}
          transition={{ duration: 0.18, ease: easeOut }}
        >
          {compact(value)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Art({ art, className, large }: { art: ProfileArt; className?: string; large?: boolean }) {
  const scene = !art.glyph;
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-gradient-to-br text-white",
        hues[art.hue].art,
        className,
      )}
    >
      {scene ? (
        <>
          <span
            className={cn(
              "absolute top-[28%] left-1/2 aspect-square w-[26%] -translate-x-1/2 rounded-full",
              art.hue === "indigo" ? "bg-amber-100/90 shadow-[0_0_40px_10px] shadow-amber-100/30" : "bg-amber-100 shadow-[0_0_60px_20px] shadow-amber-50/60",
            )}
          />
          <svg className="absolute inset-x-0 bottom-0 h-[46%] w-full" preserveAspectRatio="none" viewBox="0 0 100 40">
            <path className="fill-black/15" d="M0 18 L12 12 L22 16 L34 6 L46 14 L58 9 L70 15 L82 8 L100 14 V40 H0Z" />
            <path className="fill-black/25" d="M0 26 Q20 18 40 24 T80 22 T100 24 V40 H0Z" />
          </svg>
          <span className="absolute inset-0 border-[6px] border-black/10" />
        </>
      ) : (
        <>
          <span className="absolute -top-1/4 -left-1/4 size-3/4 rounded-full bg-white/20 blur-2xl" />
          <span
            className={cn(
              "relative font-heading font-semibold leading-none drop-shadow-sm",
              large ? "text-[min(40cqw,14rem)]" : "text-[min(52cqw,9rem)]",
            )}
          >
            {art.glyph}
          </span>
        </>
      )}
    </span>
  );
}

function RichText({ text }: { text: string }) {
  const parts = text.split(/([@#][\w.]+\w)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^[@#]/.test(p) ? (
          <span className="text-info-foreground" key={i}>
            {p}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export function Profile({
  className,
  user = defaultUser,
  posts: initialPosts = defaultPosts,
  replies: initialReplies = defaultReplies,
  media = defaultMedia,
  suggestions = defaultSuggestions,
  mutuals = ["Mira Castell", "Otto Brennan"],
  initiallyFollowing = false,
  onBack,
}: ProfileProps) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [following, setFollowing] = useState(initiallyFollowing);
  const [bell, setBell] = useState(false);
  const [tab, setTab] = useState<"posts" | "replies" | "media">("posts");
  const [posts, setPosts] = useState(initialPosts);
  const [replies, setReplies] = useState(initialReplies);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);
  const copyProfileLink = () => {
    navigator.clipboard?.writeText(`https://${user.website}/@${user.handle}`).catch(() => {});
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1600);
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  // Sticky elements report their stuck position, so a plain marker above the tabs is measured instead.
  const tabsRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });
  const barBg = useTransform(scrollY, [96, 150], [0, 1]);
  const [compactBar, setCompactBar] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setCompactBar(y > 150));

  const followers = user.followers + (following && !initiallyFollowing ? 1 : 0) - (!following && initiallyFollowing ? 1 : 0);

  const toggleLike = (list: "posts" | "replies", id: string) => {
    const fn = (all: ProfilePost[]) =>
      all.map((p) => (p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p));
    if (list === "posts") setPosts(fn);
    else setReplies(fn);
  };

  const switchTab = (t: typeof tab) => {
    setTab(t);
    const el = scrollRef.current;
    const tabs = tabsRef.current;
    if (el && tabs && el.scrollTop > tabs.offsetTop - 56) el.scrollTo({ top: tabs.offsetTop - 56 });
  };

  const mutualText =
    mutuals.length === 0
      ? null
      : mutuals.length === 1
        ? `Followed by ${mutuals[0]}`
        : `Followed by ${mutuals[0]}, ${mutuals[1]}${mutuals.length > 2 ? ` and ${mutuals.length - 2} others` : ""}`;

  return (
    <div
      className={cn(
        "@container relative isolate flex h-[760px] w-full overflow-hidden bg-background text-foreground text-sm",
        className,
      )}
    >
      <div className="relative min-w-0 flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="mx-auto flex max-w-[1000px] justify-center gap-6">
          <main className="relative w-full max-w-[600px] min-w-0 @3xl:border-x">
            <div className="sticky top-0 z-20 flex h-14 items-center gap-3 px-3">
              <motion.span aria-hidden className="absolute inset-0 -z-10 border-b bg-background/85 backdrop-blur-md" style={{ opacity: barBg }} />
              {onBack && (
                <Button
                  aria-label="Back"
                  className={cn(
                    "transition-colors",
                    compactBar ? "" : "bg-black/30 text-white backdrop-blur-sm hover:bg-black/40",
                  )}
                  onClick={onBack}
                  size="icon-sm"
                  variant="ghost"
                >
                  <ArrowLeftIcon />
                </Button>
              )}
              <motion.div className="flex min-w-0 flex-col" style={{ opacity: barBg }}>
                <span className="truncate font-heading font-semibold">{user.name}</span>
                <span className="text-muted-foreground text-xs tabular-nums">{user.posts.toLocaleString("en-US")} posts</span>
              </motion.div>
              <AnimatePresence>
                {compactBar && (
                  <motion.div
                    animate={{ opacity: 1, scale: 1 }}
                    className="ms-auto"
                    exit={{ opacity: 0, scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: easeOut }}
                  >
                    <Button
                      className={press}
                      onClick={() => setFollowing((f) => !f)}
                      size="sm"
                      variant={following ? "outline" : "default"}
                    >
                      {following ? "Following" : "Follow"}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Cover />

            <div className="flex flex-col gap-3 px-4 pb-4">
              <div className="flex items-end justify-between gap-3">
                <span className="-mt-12 rounded-full bg-background p-1 @3xl:-mt-14">
                  <Avatar className="[--avatar-size:--spacing(22)] @3xl:[--avatar-size:--spacing(26)]">
                    <AvatarFallback
                      className={cn("bg-gradient-to-br font-heading font-semibold text-2xl text-white @3xl:text-3xl", hues.violet.avatar)}
                    >
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </span>
                <div className="flex items-center gap-2 pb-1">
                  <Menu>
                    <MenuTrigger
                      render={
                        <Button
                          aria-label={`More options for @${user.handle}`}
                          className={cn("size-9 rounded-full before:rounded-full sm:size-9", press)}
                          size="icon"
                          variant="outline"
                        />
                      }
                    >
                      <AnimatePresence initial={false} mode="popLayout">
                        <motion.span
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex"
                          exit={{ opacity: 0, scale: 0.8 }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          key={copied ? "copied" : "more"}
                          transition={{ duration: 0.15, ease: easeOut }}
                        >
                          {copied ? <CheckIcon className="text-success-foreground" /> : <EllipsisIcon />}
                        </motion.span>
                      </AnimatePresence>
                    </MenuTrigger>
                    <MenuPopup align="end" className="w-56">
                      <MenuItem onClick={copyProfileLink}>
                        <LinkIcon /> Copy link to profile
                      </MenuItem>
                      <MenuSeparator />
                      <MenuCheckboxItem checked={muted} onCheckedChange={setMuted} variant="switch">
                        Mute @{user.handle}
                      </MenuCheckboxItem>
                    </MenuPopup>
                  </Menu>
                  <FollowButton
                    bell={bell}
                    following={following}
                    name={user.name}
                    onBell={() => setBell((b) => !b)}
                    onToggle={() => {
                      setFollowing((f) => !f);
                      if (following) setBell(false);
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <h2 className="flex items-center gap-1.5 font-heading font-semibold text-xl tracking-tight">
                  {user.name}
                  {user.verified && <BadgeCheckIcon aria-label="Verified" className="size-5 fill-info text-background" />}
                </h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>@{user.handle}</span>
                  {user.followsYou && (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-[11px] text-muted-foreground">Follows you</span>
                  )}
                  {muted && (
                    <span className="rounded-md bg-warning/12 px-1.5 py-0.5 font-medium text-[11px] text-warning-foreground">Muted</span>
                  )}
                  <span aria-live="polite" className="sr-only">
                    {copied ? "Profile link copied" : ""}
                  </span>
                </div>
              </div>

              <p className="text-pretty leading-relaxed">
                <RichText text={user.bio} />
              </p>

              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <MapPinIcon aria-hidden className="size-4" />
                  {user.location}
                </li>
                <li className="flex items-center gap-1.5">
                  <LinkIcon aria-hidden className="size-4" />
                  <a
                    className="rounded-sm text-info-foreground underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    href={`https://${user.website}`}
                    onClick={(e) => e.preventDefault()}
                  >
                    {user.website}
                  </a>
                </li>
                <li className="flex items-center gap-1.5">
                  <CalendarDaysIcon aria-hidden className="size-4" />
                  {user.joined}
                </li>
              </ul>

              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  <span className="font-medium tabular-nums">{user.following.toLocaleString("en-US")}</span>{" "}
                  <span className="text-muted-foreground">Following</span>
                </span>
                <span>
                  <span className="font-medium">
                    <Tween value={followers} />
                  </span>{" "}
                  <span className="text-muted-foreground">Followers</span>
                </span>
              </div>

              {mutualText && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <span className="flex -space-x-1.5">
                    {mutuals.slice(0, 3).map((m, i) => (
                      <Avatar className="ring-2 ring-background [--avatar-size:--spacing(5)]" key={m}>
                        <AvatarFallback
                          className={cn("bg-gradient-to-br font-semibold text-[10px] text-white", hues[(["teal", "sky", "rose"] as const)[i % 3]].avatar)}
                        >
                          {m[0]}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </span>
                  <span className="truncate">{mutualText}</span>
                </div>
              )}
            </div>

            <div aria-hidden ref={tabsRef} />
            <div className="sticky top-14 z-10 border-b bg-background">
              <div aria-label="Profile sections" className="flex" role="tablist">
                {(
                  [
                    ["posts", "Posts"],
                    ["replies", "Replies"],
                    ["media", "Media"],
                  ] as const
                ).map(([value, label]) => {
                  const on = tab === value;
                  return (
                    <button
                      aria-controls={`${uid}-panel`}
                      aria-selected={on}
                      className={cn(
                        "relative flex h-12 flex-1 cursor-pointer items-center justify-center outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent",
                        on ? "font-medium text-foreground" : "text-muted-foreground",
                      )}
                      id={`${uid}-tab-${value}`}
                      key={value}
                      onClick={() => switchTab(value)}
                      onKeyDown={(e) => {
                        const order = ["posts", "replies", "media"] as const;
                        const i = order.indexOf(value);
                        const next = e.key === "ArrowRight" ? order[(i + 1) % 3] : e.key === "ArrowLeft" ? order[(i + 2) % 3] : null;
                        if (next) {
                          e.preventDefault();
                          switchTab(next);
                          document.getElementById(`${uid}-tab-${next}`)?.focus();
                        }
                      }}
                      role="tab"
                      tabIndex={on ? 0 : -1}
                      type="button"
                    >
                      {label}
                      {on && (
                        <motion.span
                          className="absolute bottom-0 left-1/2 h-[3px] w-12 -translate-x-1/2 rounded-full bg-foreground"
                          layoutId={`${uid}-tab`}
                          transition={reduce ? { duration: 0 } : spring}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div aria-labelledby={`${uid}-tab-${tab}`} className="min-h-[656px]" id={`${uid}-panel`} role="tabpanel">
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  key={tab}
                  transition={{ duration: 0.12 }}
                >
                  {tab === "posts" && (
                    <ul className="divide-y">
                      {posts.map((p) => (
                        <PostItem
                          key={p.id}
                          onLike={() => toggleLike("posts", p.id)}
                          onOpenMedia={(art) => {
                            const i = media.findIndex((m) => m.caption === art.caption);
                            if (i >= 0) setLightbox(i);
                          }}
                          post={p}
                          user={user}
                        />
                      ))}
                    </ul>
                  )}
                  {tab === "replies" && (
                    <ul className="divide-y">
                      {replies.map((p) => (
                        <PostItem key={p.id} onLike={() => toggleLike("replies", p.id)} post={p} user={user} />
                      ))}
                    </ul>
                  )}
                  {tab === "media" && (
                    <ul className="grid grid-cols-3 gap-1 p-1">
                      {media.map((m, i) => (
                        <li className="@container" key={m.caption}>
                          <button
                            aria-label={`Open ${m.caption}`}
                            className={cn(
                              "group/media relative block aspect-square w-full cursor-pointer overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                              press,
                            )}
                            onClick={() => setLightbox(i)}
                            type="button"
                          >
                            <Art art={m} className="size-full transition-transform duration-300 ease-out [@media(hover:hover)]:group-hover/media:scale-[1.03]" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          <aside className="sticky top-0 hidden w-[300px] shrink-0 flex-col gap-4 self-start py-4 @5xl:flex">
            <section aria-labelledby={`${uid}-sugg`} className="rounded-2xl border bg-card p-4 shadow-xs/5">
              <h3 className="font-heading font-semibold" id={`${uid}-sugg`}>
                You might like
              </h3>
              <ul className="mt-3 flex flex-col gap-3">
                {suggestions.map((s) => {
                  const on = suggested.includes(s.handle);
                  return (
                    <li className="flex items-center gap-3" key={s.handle}>
                      <Avatar className="[--avatar-size:--spacing(9)]">
                        <AvatarFallback className={cn("bg-gradient-to-br font-semibold text-white text-xs", hues[s.hue].avatar)}>
                          {initials(s.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium">{s.name}</span>
                        <span className="truncate text-muted-foreground text-xs">{s.note}</span>
                      </div>
                      <Button
                        aria-pressed={on}
                        className={cn("min-w-[5.5rem]", press)}
                        onClick={() => setSuggested((all) => (on ? all.filter((h) => h !== s.handle) : [...all, s.handle]))}
                        size="sm"
                        variant={on ? "ghost" : "outline"}
                      >
                        {on ? "Following" : "Follow"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section aria-labelledby={`${uid}-alpha`} className="rounded-2xl border bg-card p-4 shadow-xs/5">
              <div className="flex items-baseline justify-between">
                <h3 className="font-heading font-semibold" id={`${uid}-alpha`}>
                  Letter a day
                </h3>
                <span className="text-muted-foreground text-xs tabular-nums">297 / 365</span>
              </div>
              <div aria-hidden className="mt-3 grid grid-cols-[repeat(15,minmax(0,1fr))] gap-[3px]">
                {Array.from({ length: 60 }, (_, i) => (
                  <span
                    className={cn(
                      "aspect-square rounded-[2px]",
                      i > 51
                        ? "bg-muted"
                        : i === 51
                          ? "bg-amber-400 ring-2 ring-amber-400/30"
                          : i % 7 === 3 && i < 49
                            ? "bg-muted"
                            : "bg-violet-500/80 dark:bg-violet-400/80",
                    )}
                    key={i}
                  />
                ))}
              </div>
              <p className="mt-3 text-muted-foreground text-xs">The last 60 days. Seven skipped, all of them Mondays.</p>
            </section>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-3 gap-y-1 px-4 text-muted-foreground text-xs">
              {["Terms", "Privacy", "Cookies", "Accessibility"].map((l) => (
                <a
                  className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  href="#top"
                  key={l}
                  onClick={(e) => e.preventDefault()}
                >
                  {l}
                </a>
              ))}
              <span>© 2026 Ripple</span>
            </nav>
          </aside>
        </div>
      </div>

      <Lightbox
        index={lightbox}
        items={media}
        onChange={setLightbox}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}

function Cover() {
  return (
    <div aria-hidden className="relative -mt-14 h-[168px] overflow-hidden @3xl:h-[200px]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 90% at 10% 15%, var(--color-amber-200) 0%, transparent 60%), radial-gradient(45% 80% at 88% 0%, var(--color-rose-300) 0%, transparent 65%), radial-gradient(70% 90% at 62% 115%, var(--color-violet-400) 0%, transparent 60%), linear-gradient(120deg, var(--color-orange-200), var(--color-rose-300) 50%, var(--color-violet-300))",
        }}
      />
      <svg className="absolute inset-0 size-full opacity-30 mix-blend-soft-light" preserveAspectRatio="none" viewBox="0 0 600 200">
        {Array.from({ length: 9 }, (_, i) => (
          <path
            d={`M-20 ${40 + i * 18} C 120 ${10 + i * 20}, 260 ${90 + i * 14}, 420 ${40 + i * 18} S 640 ${20 + i * 16}, 640 ${30 + i * 18}`}
            fill="none"
            key={i}
            stroke="white"
            strokeWidth="1.2"
          />
        ))}
      </svg>
      <div className="absolute inset-0 dark:bg-black/15" />
    </div>
  );
}

function FollowButton({
  following,
  bell,
  name,
  onToggle,
  onBell,
}: {
  following: boolean;
  bell: boolean;
  name: string;
  onToggle: () => void;
  onBell: () => void;
}) {
  const reduce = useReducedMotion();
  const filterId = `follow-goo-${useId().replace(/:/g, "")}`;
  const [hover, setHover] = useState(false);
  const pillW = following ? 112 : 92;
  const total = following ? pillW + 44 : pillW;
  const move = reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 30, mass: 0.9 } as const;
  const label = following ? (hover ? "Unfollow" : "Following") : "Follow";

  return (
    <motion.div
      animate={{ width: total }}
      className="relative h-9 shrink-0"
      initial={false}
      style={{
        // Opaque colours only: an alpha fill would fringe through the goo threshold.
        ["--goo" as string]: following
          ? "color-mix(in srgb, var(--foreground) 10%, var(--background))"
          : "var(--primary)",
      }}
      transition={move}
    >
      <svg aria-hidden className="absolute size-0">
        <filter colorInterpolationFilters="sRGB" height="200%" id={filterId} width="160%" x="-30%" y="-50%">
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="5" />
          <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -12" />
        </filter>
      </svg>
      <span aria-hidden className="absolute inset-0" style={{ filter: `url(#${filterId})` }}>
        <motion.span
          animate={{ width: pillW }}
          className="absolute inset-y-0 right-0 rounded-full bg-(--goo) transition-[background-color] duration-200"
          initial={false}
          transition={move}
        />
        <motion.span
          animate={{ scale: following ? 1 : 0.6 }}
          className="absolute top-0 left-0 size-9 rounded-full bg-(--goo) transition-[background-color] duration-200"
          initial={false}
          transition={move}
        />
      </span>

      <AnimatePresence initial={false}>
        {following && (
          <motion.button
            animate={{ opacity: 1 }}
            aria-label={bell ? `Turn off notifications from ${name}` : `Get notified when ${name} posts`}
            aria-pressed={bell}
            className={cn(
              "absolute top-0 left-0 flex size-9 cursor-pointer items-center justify-center rounded-full text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              press,
            )}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            initial={{ opacity: 0 }}
            onClick={onBell}
            transition={{ duration: 0.15, delay: reduce ? 0 : 0.14 }}
            type="button"
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ rotate: 0, opacity: 1 }}
                initial={reduce ? { opacity: 0 } : { rotate: bell ? -18 : 0, opacity: 0 }}
                key={bell ? "on" : "off"}
                transition={{ type: "spring", stiffness: 500, damping: 14 }}
              >
                {bell ? <BellRingIcon className="size-4" /> : <BellIcon className="size-4" />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        )}
      </AnimatePresence>

      <motion.button
        animate={{ width: pillW }}
        aria-label={following ? `Unfollow ${name}` : `Follow ${name}`}
        aria-pressed={following}
        className={cn(
          "absolute top-0 right-0 flex h-9 cursor-pointer items-center justify-center rounded-full font-medium outline-none transition-[color,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]",
          following ? (hover ? "text-destructive-foreground" : "text-foreground") : "text-primary-foreground",
        )}
        onBlur={() => setHover(false)}
        onClick={() => {
          onToggle();
          setHover(false);
        }}
        onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
        onPointerLeave={() => setHover(false)}
        initial={false}
        transition={move}
        type="button"
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(2px)" }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(2px)" }}
            key={label}
            transition={{ duration: 0.16, ease: easeOut }}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}

function PostItem({
  post,
  user,
  onLike,
  onOpenMedia,
}: {
  post: ProfilePost;
  user: ProfileUser;
  onLike: () => void;
  onOpenMedia?: (art: ProfileArt) => void;
}) {
  const [reposted, setReposted] = useState(false);
  const [saved, setSaved] = useState(false);

  const header = (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="truncate font-medium">{user.name}</span>
      {user.verified && <BadgeCheckIcon aria-label="Verified" className="size-4 shrink-0 fill-info text-background" />}
      <span className="truncate text-muted-foreground">@{user.handle}</span>
      <span aria-hidden className="text-muted-foreground">
        ·
      </span>
      <span className="shrink-0 text-muted-foreground">{post.time}</span>
    </div>
  );

  return (
    <li className="flex flex-col gap-2 px-4 py-3.5">
      {post.pinned && (
        <span className="flex items-center gap-1.5 ps-8 font-medium text-muted-foreground text-xs">
          <PinIcon className="size-3.5" /> Pinned
        </span>
      )}
      {post.replyTo && (
        <div className="relative flex gap-3">
          <span aria-hidden className="absolute top-11 bottom-[-0.875rem] left-[19px] w-0.5 rounded-full bg-border" />
          <Avatar className="[--avatar-size:--spacing(10)]">
            <AvatarFallback className={cn("bg-gradient-to-br font-semibold text-white text-xs", hues[post.replyTo.hue].avatar)}>
              {initials(post.replyTo.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-medium">{post.replyTo.name}</span>
              <span className="truncate text-muted-foreground">@{post.replyTo.handle}</span>
            </div>
            <p className="text-pretty">{post.replyTo.text}</p>
          </div>
        </div>
      )}
      <article className="flex gap-3">
        <Avatar className="[--avatar-size:--spacing(10)]">
          <AvatarFallback className={cn("bg-gradient-to-br font-heading font-semibold text-white text-xs", hues.violet.avatar)}>
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {header}
          {post.replyTo && (
            <span className="-mt-0.5 text-muted-foreground text-xs">
              Replying to <span className="text-info-foreground">@{post.replyTo.handle}</span>
            </span>
          )}
          <p className="text-pretty leading-relaxed">
            <RichText text={post.text} />
          </p>
          {post.media && post.media.length > 0 && (
            <div className={cn("mt-1.5 grid gap-1 overflow-hidden rounded-2xl border", post.media.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
              {post.media.map((m) => (
                <button
                  aria-label={`Open image: ${m.caption}`}
                  className={cn(
                    "@container block cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    post.media && post.media.length > 1 ? "aspect-[4/5]" : "aspect-[16/10]",
                  )}
                  disabled={!m.glyph || !onOpenMedia}
                  key={m.caption}
                  onClick={() => onOpenMedia?.(m)}
                  type="button"
                >
                  <Art art={m} className="size-full" />
                </button>
              ))}
            </div>
          )}
          {post.link && (
            <a
              className={cn(
                "mt-1.5 flex overflow-hidden rounded-2xl border outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring",
              )}
              href={`https://${post.link.domain}`}
              onClick={(e) => e.preventDefault()}
            >
              <span aria-hidden className={cn("flex w-24 shrink-0 items-end gap-0.5 bg-gradient-to-br p-2.5 @md:w-32", hues[post.link.hue].art)}>
                {["bg-amber-100", "bg-orange-500", "bg-red-700", "bg-teal-700", "bg-indigo-950"].map((c) => (
                  <span className={cn("h-7 flex-1 rounded-sm ring-1 ring-black/10", c)} key={c} />
                ))}
              </span>
              <span className="flex min-w-0 flex-col justify-center gap-0.5 px-3 py-3">
                <span className="truncate text-muted-foreground text-xs">{post.link.domain}</span>
                <span className="line-clamp-2 font-medium">{post.link.title}</span>
              </span>
            </a>
          )}
          <div className="-ms-2 mt-1 flex items-center justify-between text-muted-foreground">
            <Stat icon={<MessageCircleIcon />} label={`${post.replies} replies`}>
              {compact(post.replies)}
            </Stat>
            <Action
              active={reposted}
              activeClass="text-emerald-600 dark:text-emerald-400"
              icon={<Repeat2Icon />}
              label={reposted ? "Undo repost" : "Repost"}
              onClick={() => setReposted((r) => !r)}
            >
              <Count value={post.reposts + (reposted ? 1 : 0)} />
            </Action>
            <LikeAction count={post.likes} liked={Boolean(post.liked)} onClick={onLike} />
            <Stat icon={<BarChart2Icon />} label={`${post.views} views`}>
              {post.views}
            </Stat>
            <div className="flex">
              <Action
                active={saved}
                activeClass="text-info-foreground"
                icon={<BookmarkIcon className={cn(saved && "fill-current")} />}
                label={saved ? "Remove bookmark" : "Bookmark"}
                onClick={() => setSaved((s) => !s)}
              />
              <ShareAction id={post.id} />
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}

function Stat({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <span aria-label={label} className="flex h-8 items-center gap-1.5 px-2 text-xs tabular-nums [&_svg]:size-4" role="img">
      {icon}
      <span aria-hidden>{children}</span>
    </span>
  );
}

function ShareAction({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return (
    <Action
      active={copied}
      activeClass="text-success-foreground"
      icon={
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            className="flex"
            exit={{ opacity: 0, scale: 0.8 }}
            initial={{ opacity: 0, scale: 0.8 }}
            key={copied ? "done" : "share"}
            transition={{ duration: 0.15, ease: easeOut }}
          >
            {copied ? <CheckIcon /> : <ShareIcon />}
          </motion.span>
        </AnimatePresence>
      }
      label={copied ? "Link copied" : "Copy link to post"}
      toggle={false}
      onClick={() => {
        navigator.clipboard?.writeText(`https://example.com/post/${id}`).catch(() => {});
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1600);
      }}
    />
  );
}

function Action({
  icon,
  label,
  children,
  active,
  activeClass,
  onClick,
  toggle = true,
}: {
  icon: ReactNode;
  label: string;
  children?: ReactNode;
  active?: boolean;
  activeClass?: string;
  onClick?: () => void;
  toggle?: boolean;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={toggle && onClick && active !== undefined ? active : undefined}
      className={cn(
        "flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-2 text-xs outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4",
        press,
        active && activeClass,
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

function LikeAction({ liked, count, onClick }: { liked: boolean; count: number; onClick: () => void }) {
  const reduce = useReducedMotion();
  const [pop, setPop] = useState(0);
  return (
    <button
      aria-label={liked ? "Unlike" : "Like"}
      aria-pressed={liked}
      className={cn(
        "group/like flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-2 text-xs outline-none hover:bg-rose-500/10 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-rose-400",
        press,
        liked && "text-rose-600 dark:text-rose-400",
      )}
      onClick={() => {
        if (!liked && !reduce) setPop((p) => p + 1);
        onClick();
      }}
      type="button"
    >
      <span className="relative flex size-4 items-center justify-center">
        <motion.span
          animate={pop ? { scale: [1, 1.3, 1] } : undefined}
          key={pop}
          transition={{ duration: 0.32, times: [0, 0.4, 1], ease: easeOut }}
        >
          <HeartIcon className={cn("size-4 transition-[fill] duration-150", liked && "fill-current")} />
        </motion.span>
        {pop > 0 && (
          <motion.span
            animate={{ scale: 1.9, opacity: 0 }}
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-rose-500 dark:border-rose-400"
            initial={{ scale: 0.6, opacity: 0.8 }}
            key={`ring-${pop}`}
            transition={{ duration: 0.4, ease: easeOut }}
          />
        )}
      </span>
      <Count value={count} />
    </button>
  );
}

function Lightbox({
  items,
  index,
  onChange,
  onClose,
}: {
  items: ProfileArt[];
  index: number | null;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = index !== null;
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);
  const item = index !== null ? items[index] : null;
  const go = (d: number) => index !== null && onChange((index + d + items.length) % items.length);

  return (
    <AnimatePresence>
      {open && item && (
        <motion.div
          animate={{ opacity: 1 }}
          aria-label={item.caption}
          aria-modal
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 p-4 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
          role="dialog"
          transition={{ duration: 0.2, ease: easeOut }}
        >
          <button
            aria-label="Close"
            className="absolute top-3 right-3 flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            <XIcon className="size-4" />
          </button>
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="@container w-full max-w-[440px]"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
            transition={{ duration: 0.22, ease: easeOut }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                animate={{ opacity: 1 }}
                className="@container"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key={item.caption}
                transition={{ duration: 0.15 }}
              >
                <Art art={item} className="aspect-square w-full rounded-2xl" large />
              </motion.div>
            </AnimatePresence>
          </motion.div>
          <div className="flex items-center gap-3 text-white" onClick={(e) => e.stopPropagation()}>
            <button
              aria-label="Previous"
              className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/10 outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
              onClick={() => go(-1)}
              type="button"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <span className="min-w-44 text-center text-sm">
              {item.caption}
              <span className="block text-white/60 text-xs tabular-nums">
                {(index ?? 0) + 1} of {items.length}
              </span>
            </span>
            <button
              aria-label="Next"
              className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/10 outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
              onClick={() => go(1)}
              type="button"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
