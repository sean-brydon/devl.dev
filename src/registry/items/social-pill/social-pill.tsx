"use client";

import { CheckIcon, HeartIcon, MessageCircleIcon, Repeat2Icon, ShareIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en-US");
const format = (n: number) => (n < 10_000 ? full.format(n) : compact.format(n));

type Slot = { char: string; id: string };

function toSlots(value: number, previous: Slot[], version: number): Slot[] {
  return [...format(value)].reverse().map((char, i) => (previous[i]?.char === char ? previous[i] : { char, id: `${char}:${version}` }));
}

export function RollingCount({ value, className }: { value: number; className?: string }) {
  const [state, setState] = useState(() => ({ value, version: 0, direction: 1, slots: toSlots(value, [], 0) }));
  if (value !== state.value) {
    const version = state.version + 1;
    setState({ value, version, direction: value > state.value ? 1 : -1, slots: toSlots(value, state.slots, version) });
  }
  const reduce = useReducedMotion();
  const { direction } = state;
  const slots = [...state.slots].reverse();

  return (
    <span className={cn("relative inline-flex tabular-nums", className)}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="inline-flex">
        {slots.map((slot, i) => {
          const fromRight = slots.length - i;
          return (
            <span className="relative inline-flex h-[1lh] overflow-hidden" key={fromRight}>
              <AnimatePresence custom={direction} initial={false} mode="popLayout">
                <motion.span
                  animate={{ y: "0%", opacity: 1 }}
                  className="inline-block"
                  custom={direction}
                  exit={reduce ? { opacity: 0 } : { y: `${-100 * direction}%`, opacity: 0 }}
                  initial={reduce ? { opacity: 0 } : { y: `${100 * direction}%`, opacity: 0 }}
                  key={slot.id}
                  transition={{ type: "spring", stiffness: 420, damping: 34, delay: reduce ? 0 : (fromRight - 1) * 0.03 }}
                >
                  {slot.char}
                </motion.span>
              </AnimatePresence>
            </span>
          );
        })}
      </span>
    </span>
  );
}

function Burst({ trigger, className }: { trigger: number; className: string }) {
  const reduce = useReducedMotion();
  if (reduce || trigger === 0) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center" key={trigger}>
      <motion.span
        animate={{ scale: 1.9, opacity: 0, borderWidth: 0 }}
        className={cn("absolute size-5 rounded-full border-2 border-current", className)}
        initial={{ scale: 0.3, opacity: 0.9, borderWidth: 3 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      {Array.from({ length: 7 }, (_, i) => {
        const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;
        return (
          <motion.span
            animate={{ x: Math.cos(angle) * 16, y: Math.sin(angle) * 16, scale: 0, opacity: 0 }}
            className={cn("absolute size-1.5 rounded-full bg-current", className)}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            key={i}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.3, 1], delay: 0.05 }}
          />
        );
      })}
    </span>
  );
}

interface ActionProps {
  label: string;
  icon: ReactNode;
  count?: number;
  active?: boolean;
  activeClass: string;
  onClick: () => void;
  pop: number;
  burst?: boolean;
  toggle?: boolean;
}

function Action({ label, icon, count, active, activeClass, onClick, pop, burst, toggle }: ActionProps) {
  const reduce = useReducedMotion();
  return (
    <button
      aria-label={label}
      aria-pressed={toggle ? active : undefined}
      className={cn(
        "group/action relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 font-medium text-muted-foreground text-sm outline-none transition-[color,background-color,scale] duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] [&_svg]:size-4.5",
        active ? activeClass : "hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="relative flex size-5 items-center justify-center">
        {burst && <Burst className={activeClass} trigger={active ? pop : 0} />}
        <motion.span
          animate={reduce || pop === 0 ? { scale: 1, rotate: 0 } : { scale: [1, 0.8, 1.18, 1], rotate: active ? [0, -10, 6, 0] : 0 }}
          className="flex"
          key={pop}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          {icon}
        </motion.span>
      </span>
      {count !== undefined && <RollingCount className="min-w-[1ch]" value={count} />}
    </button>
  );
}

export interface SocialPillProps {
  likes?: number;
  comments?: number;
  reposts?: number;
  liked?: boolean;
  reposted?: boolean;
  onLikeChange?: (liked: boolean) => void;
  onRepostChange?: (reposted: boolean) => void;
  onComment?: () => void;
  onShare?: () => void;
  className?: string;
}

export function SocialPill({
  likes = 0,
  comments = 0,
  reposts = 0,
  liked: likedProp = false,
  reposted: repostedProp = false,
  onLikeChange,
  onRepostChange,
  onComment,
  onShare,
  className,
}: SocialPillProps) {
  const [liked, setLiked] = useState(likedProp);
  const [reposted, setReposted] = useState(repostedProp);
  const [pops, setPops] = useState({ like: 0, comment: 0, repost: 0, share: 0 });
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const bump = (key: keyof typeof pops) => setPops((p) => ({ ...p, [key]: p[key] + 1 }));

  return (
    <div
      className={cn("inline-flex items-center gap-0.5 rounded-full border bg-card p-1 shadow-xs/5", className)}
      role="group"
      aria-label="Reactions"
    >
      <Action
        activeClass="text-destructive-foreground"
        burst
        count={likes - (likedProp ? 1 : 0) + (liked ? 1 : 0)}
        active={liked}
        icon={<HeartIcon className={cn("transition-[fill]", liked && "fill-current")} />}
        label={liked ? "Unlike" : "Like"}
        onClick={() => {
          bump("like");
          setLiked(!liked);
          onLikeChange?.(!liked);
        }}
        pop={pops.like}
        toggle
      />
      <Action
        activeClass="text-info-foreground"
        count={comments}
        icon={<MessageCircleIcon />}
        label="Comment"
        onClick={() => {
          bump("comment");
          onComment?.();
        }}
        pop={pops.comment}
      />
      <Action
        activeClass="text-success-foreground"
        burst
        count={reposts - (repostedProp ? 1 : 0) + (reposted ? 1 : 0)}
        active={reposted}
        icon={<Repeat2Icon className={cn("transition-transform duration-500", reposted && "rotate-180")} />}
        label={reposted ? "Undo repost" : "Repost"}
        onClick={() => {
          bump("repost");
          setReposted(!reposted);
          onRepostChange?.(!reposted);
        }}
        pop={pops.repost}
        toggle
      />
      <Action
        activeClass="text-success-foreground"
        active={copied}
        icon={
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ scale: 1, opacity: 1 }}
              className="flex"
              exit={{ scale: 0.6, opacity: 0 }}
              initial={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
              key={copied ? "check" : "share"}
            >
              {copied ? <CheckIcon /> : <ShareIcon />}
            </motion.span>
          </AnimatePresence>
        }
        label={copied ? "Link copied" : "Share"}
        onClick={() => {
          bump("share");
          onShare?.();
          setCopied(true);
          clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setCopied(false), 1600);
        }}
        pop={pops.share}
      />
    </div>
  );
}
