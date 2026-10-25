"use client";

import { ChevronDownIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type PointerEvent, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Stays false until mounted so the server render and the first client render match.
function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export interface VoiceNoteWord {
  text: string;
  start: number;
}

export interface VoiceNoteSender {
  name: string;
  initials: string;
  avatarClassName?: string;
}

export interface VoiceNoteProps {
  sender?: VoiceNoteSender;
  sentAt?: string;
  duration?: number;
  src?: string;
  peaks?: number[];
  transcript?: VoiceNoteWord[];
  speeds?: number[];
  defaultTranscriptOpen?: boolean;
  unplayed?: boolean;
  className?: string;
}

const defaultTranscript: VoiceNoteWord[] = (() => {
  const text =
    "Hey, quick one before standup. The venue moved us to the upstairs room, so the projector is sorted. Can you bring the clicker and two extension cords? I'll grab coffee for everyone on the way in. See you at ten!";
  let t = 0.35;
  return text.split(" ").map((word) => {
    const start = t;
    t += 0.18 + word.length * 0.045 + (/[.,?!]$/.test(word) ? 0.32 : 0);
    return { text: word, start: Math.round(start * 100) / 100 };
  });
})();

function seededPeaks(count: number, seed = 7) {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  return Array.from({ length: count }, (_, i) => {
    const phrase = 0.55 + 0.45 * Math.sin(i / 3.1) * Math.sin(i / 7.3 + 1);
    const v = 0.22 + Math.abs(phrase) * 0.6 + rand() * 0.28;
    return Math.min(1, Math.max(0.12, v));
  });
}

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Both icons use the same point count so the paths morph cleanly.
const ICON = {
  play: ["M8 5 L13.5 8.5 L13.5 15.5 L8 19 Z", "M13.5 8.5 L19 12 L19 12 L13.5 15.5 Z"],
  pause: ["M6.5 5 L10 5 L10 19 L6.5 19 Z", "M14 5 L17.5 5 L17.5 19 L14 19 Z"],
};

function PlayPauseIcon({ playing, reduce }: { playing: boolean; reduce: boolean | null }) {
  const paths = playing ? ICON.pause : ICON.play;
  const transition = reduce ? { duration: 0 } : { duration: 0.18, ease: [0.23, 1, 0.32, 1] as const };
  return (
    <svg aria-hidden className="size-4" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth={1.5} viewBox="0 0 24 24">
      <motion.path animate={{ d: paths[0] }} initial={false} transition={transition} />
      <motion.path animate={{ d: paths[1] }} initial={false} transition={transition} />
    </svg>
  );
}

export function VoiceNote({
  sender = {
    name: "Noor Haddad",
    initials: "NH",
    avatarClassName: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  },
  sentAt = "9:41",
  duration: durationProp,
  src,
  peaks: peaksProp,
  transcript = defaultTranscript,
  speeds = [1, 1.5, 2],
  defaultTranscriptOpen = true,
  unplayed = true,
  className,
}: VoiceNoteProps) {
  const reduce = useSafeReducedMotion();
  const transcriptId = useId();
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);

  const fallbackDuration = useMemo(() => {
    const last = transcript[transcript.length - 1];
    return last ? Math.ceil(last.start + 1.2) : 20;
  }, [transcript]);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const duration = mediaDuration ?? durationProp ?? fallbackDuration;
  const peaks = useMemo(() => peaksProp ?? seededPeaks(44), [peaksProp]);

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [played, setPlayed] = useState(!unplayed);
  const [open, setOpen] = useState(defaultTranscriptOpen);
  const speed = speeds[speedIndex] ?? 1;

  const timeRef = useRef(0);
  timeRef.current = time;

  useEffect(() => {
    if (!playing || scrubbing) return;
    const audio = audioRef.current;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = audio && src ? audio.currentTime : timeRef.current + dt * speed;
      if (next >= duration) {
        setTime(0);
        setPlaying(false);
        if (audio && src) {
          audio.pause();
          audio.currentTime = 0;
        }
        return;
      }
      setTime(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, scrubbing, speed, duration, src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    audio.playbackRate = speed;
  }, [speed, src]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    setPlayed(true);
    setPlaying((p) => {
      if (audio && src) {
        if (p) audio.pause();
        else void audio.play().catch(() => setPlaying(false));
      }
      return !p;
    });
  }, [src]);

  const seek = useCallback(
    (to: number) => {
      const t = Math.min(duration - 0.05, Math.max(0, to));
      setTime(t);
      setPlayed(true);
      const audio = audioRef.current;
      if (audio && src) audio.currentTime = t;
    },
    [duration, src],
  );

  const timeFromPointer = (clientX: number) => {
    const rect = waveRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return ((clientX - rect.left) / rect.width) * duration;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrubbing(true);
    seek(timeFromPointer(e.clientX));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (scrubbing) seek(timeFromPointer(e.clientX));
  };
  const endScrub = () => setScrubbing(false);

  const onSliderKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 5 : 1;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") seek(time + step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") seek(time - step);
    else if (e.key === "Home") seek(0);
    else if (e.key === "End") seek(duration);
    else if (e.key === " " || e.key === "Enter") toggle();
    else return;
    e.preventDefault();
  };

  const progress = Math.min(1, time / duration);
  const showHead = scrubbing || time > 0;

  let activeWord = -1;
  if (time > 0 || playing) {
    for (let i = 0; i < transcript.length; i++) {
      if (transcript[i].start <= time) activeWord = i;
      else break;
    }
  }

  return (
    <article
      aria-label={`Voice message from ${sender.name}, ${formatTime(duration)}`}
      className={cn("flex w-full max-w-[380px] items-end gap-2.5", className)}
    >
      <span
        aria-hidden
        className={cn(
          "mb-0.5 flex size-8 shrink-0 select-none items-center justify-center rounded-full font-medium text-xs",
          sender.avatarClassName ?? "bg-muted text-foreground",
        )}
      >
        {sender.initials}
      </span>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline gap-2 ps-1">
          <span className="truncate font-medium text-xs">{sender.name}</span>
          <span className="text-muted-foreground text-xs tabular-nums">{sentAt}</span>
        </div>

        <div className="overflow-hidden rounded-2xl rounded-bl-md border bg-card text-card-foreground shadow-xs/5">
          {src && (
            <audio
              onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setMediaDuration(e.currentTarget.duration)}
              preload="metadata"
              ref={audioRef}
              src={src}
            />
          )}

          <div className="flex items-center gap-3 p-3 pe-2.5">
            <button
              aria-label={playing ? "Pause" : "Play voice message"}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-[0.97]"
              onClick={toggle}
              type="button"
            >
              <PlayPauseIcon playing={playing} reduce={reduce} />
            </button>

            <div className="min-w-0 flex-1">
              <div
                aria-label="Seek"
                aria-valuemax={Math.round(duration)}
                aria-valuemin={0}
                aria-valuenow={Math.round(time)}
                aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
                className="group/wave relative h-8 cursor-pointer touch-none rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                onKeyDown={onSliderKey}
                onLostPointerCapture={endScrub}
                onPointerCancel={endScrub}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endScrub}
                ref={waveRef}
                role="slider"
                tabIndex={0}
              >
                <Bars className="text-muted-foreground/35" peaks={peaks} />
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{ clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }}
                >
                  <Bars className="text-foreground" peaks={peaks} />
                </div>
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_0_2px_var(--color-card)] transition-[opacity,scale] duration-150 ease-out",
                    showHead ? "opacity-100" : "scale-75 opacity-0 group-hover/wave:scale-100 group-hover/wave:opacity-100",
                    scrubbing && "scale-125",
                  )}
                  style={{ left: `${progress * 100}%` }}
                />
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
                <span>{formatTime(time > 0 || playing ? time : duration)}</span>
                <AnimatePresence initial={false}>
                  {!played && (
                    <motion.span
                      aria-label="Not played yet"
                      className="size-1.5 rounded-full bg-info"
                      exit={{ opacity: 0, scale: 0.6 }}
                      role="img"
                      transition={{ duration: 0.15 }}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>

            <button
              aria-label={`Playback speed ${speed}×, change`}
              className="relative mt-1 flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center self-start rounded-full bg-muted font-medium text-xs tabular-nums outline-none transition-[background-color,scale] duration-150 ease-out before:absolute before:-inset-x-1 before:-inset-y-2 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
              onClick={() => setSpeedIndex((i) => (i + 1) % speeds.length)}
              type="button"
            >
              <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  animate={{ y: 0, opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { y: -10, opacity: 0 }}
                  initial={reduce ? { opacity: 0 } : { y: 10, opacity: 0 }}
                  key={speed}
                  transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                >
                  {speed}×
                </motion.span>
              </AnimatePresence>
              </span>
            </button>
          </div>

          {transcript.length > 0 && (
            <div className="border-t">
              <button
                aria-controls={transcriptId}
                aria-expanded={open}
                className="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2 text-left text-muted-foreground text-xs outline-none transition-colors focus-visible:bg-accent [@media(hover:hover)]:hover:text-foreground"
                onClick={() => setOpen((o) => !o)}
                type="button"
              >
                <span className="font-medium text-foreground">Transcript</span>
                <span>· auto-generated</span>
                <motion.span
                  animate={{ rotate: open ? 180 : 0 }}
                  className="ms-auto flex"
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 36 }}
                >
                  <ChevronDownIcon className="size-3.5" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    id={transcriptId}
                    initial={{ height: 0, opacity: 0 }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 38, opacity: { duration: 0.15 } }
                    }
                  >
                    <Transcript activeWord={activeWord} instant={scrubbing} onSeek={seek} reduce={reduce} words={transcript} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function Bars({ peaks, className }: { peaks: number[]; className?: string }) {
  return (
    <div aria-hidden className={cn("absolute inset-0 flex items-center justify-between", className)}>
      {peaks.map((p, i) => (
        <span
          className="w-[3px] shrink-0 rounded-full bg-current"
          key={i}
          style={{ height: `${Math.round(p * 100)}%`, minHeight: 3 }}
        />
      ))}
    </div>
  );
}

function Transcript({
  words,
  activeWord,
  onSeek,
  reduce,
  instant,
}: {
  words: VoiceNoteWord[];
  activeWord: number;
  instant?: boolean;
  onSeek: (t: number) => void;
  reduce: boolean | null;
}) {
  const wrapRef = useRef<HTMLParagraphElement>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const lastY = useRef<number | null>(null);
  const [jump, setJump] = useState(false);

  useLayoutEffect(() => {
    const el = wrapRef.current?.querySelector<HTMLElement>(`[data-word="${activeWord}"]`);
    if (!el) {
      setBox(null);
      lastY.current = null;
      return;
    }
    const next = { x: el.offsetLeft - 3, y: el.offsetTop, w: el.offsetWidth + 6, h: el.offsetHeight };
    setJump(lastY.current === null || lastY.current !== next.y);
    lastY.current = next.y;
    setBox(next);
  }, [activeWord]);

  return (
    <p className="relative px-3 pb-3 text-pretty text-sm leading-relaxed" ref={wrapRef}>
      <AnimatePresence>
        {box && (
          <motion.span
            animate={{ x: box.x, y: box.y, width: box.w, height: box.h, opacity: 1 }}
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 rounded-md bg-info/14"
            exit={{ opacity: 0 }}
            initial={{ x: box.x, y: box.y, width: box.w, height: box.h, opacity: 0 }}
            transition={
              reduce || jump || instant
                ? { duration: 0, opacity: { duration: 0.12 } }
                : { type: "spring", stiffness: 700, damping: 48, opacity: { duration: 0.12 } }
            }
          />
        )}
      </AnimatePresence>
      {words.map((w, i) => (
        <span key={`${i}-${w.text}`}>
          <span
            className={cn(
              "relative cursor-pointer rounded-sm transition-colors duration-150",
              i <= activeWord ? "text-foreground" : "text-muted-foreground",
              i === activeWord && "text-info-foreground",
            )}
            data-word={i}
            onClick={() => onSeek(w.start + 0.01)}
          >
            {w.text}
          </span>{" "}
        </span>
      ))}
    </p>
  );
}
