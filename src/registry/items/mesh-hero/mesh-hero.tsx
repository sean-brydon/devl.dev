"use client";

import { ArrowRightIcon } from "lucide-react";
import { type AnimationPlaybackControls, animate, motion, MotionConfig, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export interface MeshHeroLink {
  label: string;
  href: string;
}

export interface MeshHeroProps {
  announcement?: { tag?: string; label: string; href: string };
  title: ReactNode;
  titleQuiet?: ReactNode;
  description?: ReactNode;
  primaryCta?: MeshHeroLink;
  secondaryCta?: MeshHeroLink;
  notes?: string[];
  className?: string;
}

const blobs = [
  {
    className:
      "-top-[30%] -left-[12%] size-[70%] bg-[radial-gradient(closest-side,var(--color-violet-300),transparent_72%)] dark:bg-[radial-gradient(closest-side,var(--color-violet-700),transparent_72%)]",
    x: ["0%", "14%", "-4%"],
    y: ["0%", "10%", "18%"],
    duration: 26,
  },
  {
    className:
      "-top-[20%] -right-[16%] size-[64%] bg-[radial-gradient(closest-side,var(--color-sky-300),transparent_72%)] dark:bg-[radial-gradient(closest-side,var(--color-sky-700),transparent_72%)]",
    x: ["0%", "-16%", "-6%"],
    y: ["0%", "14%", "-4%"],
    duration: 30,
  },
  {
    className:
      "-bottom-[38%] left-[14%] size-[66%] bg-[radial-gradient(closest-side,var(--color-amber-200),transparent_72%)] dark:bg-[radial-gradient(closest-side,var(--color-rose-800),transparent_72%)]",
    x: ["0%", "18%", "6%"],
    y: ["0%", "-12%", "-4%"],
    duration: 34,
  },
  {
    className:
      "-right-[10%] -bottom-[34%] size-[58%] bg-[radial-gradient(closest-side,var(--color-emerald-200),transparent_72%)] dark:bg-[radial-gradient(closest-side,var(--color-teal-800),transparent_72%)]",
    x: ["0%", "-12%", "-20%"],
    y: ["0%", "-16%", "-6%"],
    duration: 28,
  },
];

const grain =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function Mesh() {
  const reduce = useReducedMotionSafe();
  const root = useRef<HTMLDivElement>(null);
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);
  const inView = useInView(root);
  const controls = useRef<AnimationPlaybackControls[]>([]);

  useEffect(() => {
    if (reduce) return;
    const running: AnimationPlaybackControls[] = [];
    blobs.forEach((blob, i) => {
      const el = blobRefs.current[i];
      if (!el) return;
      running.push(
        animate(
          el,
          { x: blob.x, y: blob.y, scale: [1, 1.12, 0.96] },
          { duration: blob.duration, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY, repeatType: "mirror" },
        ),
      );
    });
    controls.current = running;
    return () => {
      for (const c of controls.current) c.stop();
      controls.current = [];
    };
  }, [reduce]);

  useEffect(() => {
    for (const c of controls.current) {
      if (inView) c.play();
      else c.pause();
    }
  }, [inView, reduce]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-background" ref={root}>
      {blobs.map((blob, i) => (
        <div
          className={cn("absolute rounded-full opacity-80 will-change-transform dark:opacity-60", blob.className)}
          key={blob.duration}
          ref={(el) => {
            blobRefs.current[i] = el;
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_48%,var(--color-background)_0%,transparent_100%)] opacity-70" />
      <div
        className="absolute inset-0 opacity-[0.22] mix-blend-overlay dark:opacity-[0.3] dark:mix-blend-soft-light"
        style={{ backgroundImage: grain, backgroundSize: "180px 180px" }}
      />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-background/60 to-transparent" />
    </div>
  );
}

const rise = {
  hidden: { opacity: 0, y: 10, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export function MeshHero({
  announcement,
  title,
  titleQuiet,
  description,
  primaryCta,
  secondaryCta,
  notes = [],
  className,
}: MeshHeroProps) {
  const item = rise;
  const ease = [0.23, 1, 0.32, 1] as const;

  return (
    <MotionConfig reducedMotion="user">
      <section
        className={cn(
          "relative isolate mx-auto w-full max-w-[1100px] overflow-hidden rounded-3xl border bg-background shadow-xs/5",
          className,
        )}
      >
        <Mesh />
        <motion.div
          animate="show"
          className="mx-auto flex max-w-3xl flex-col items-center px-5 pt-16 pb-14 text-center sm:px-8 sm:pt-28 sm:pb-24"
          initial="hidden"
          transition={{ staggerChildren: 0.07, delayChildren: 0.05 }}
        >
          {announcement && (
            <motion.a
              className="group inline-flex h-8 items-center gap-2 rounded-full border bg-background/70 ps-1 pe-3 text-xs shadow-xs/5 outline-none backdrop-blur-md transition-[background-color,translate,scale,rotate] duration-150 ease-out hover:bg-background active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background dark:bg-background/50"
              href={announcement.href}
              transition={{ duration: 0.5, ease }}
              variants={item}
            >
              <span className="rounded-full bg-primary px-2 py-0.5 font-medium text-[0.6875rem] text-primary-foreground">
                {announcement.tag ?? "New"}
              </span>
              <span className="font-medium text-foreground/90">{announcement.label}</span>
              <ArrowRightIcon className="size-3.5 text-muted-foreground transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </motion.a>
          )}

          <motion.h1
            className="mt-6 text-balance font-heading font-semibold text-[2.5rem] leading-[1.05] tracking-[-0.035em] sm:mt-8 sm:text-6xl md:text-7xl"
            transition={{ duration: 0.6, ease }}
            variants={item}
          >
            {title}
            {titleQuiet && (
              <>
                <br className="hidden sm:block" /> <span className="text-muted-foreground">{titleQuiet}</span>
              </>
            )}
          </motion.h1>

          {description && (
            <motion.p
              className="mt-5 max-w-xl text-pretty text-base text-muted-foreground leading-relaxed sm:mt-6 sm:text-lg"
              transition={{ duration: 0.6, ease }}
              variants={item}
            >
              {description}
            </motion.p>
          )}

          {(primaryCta || secondaryCta) && (
            <motion.div
              className="mt-8 flex w-full flex-col gap-2.5 sm:mt-10 sm:w-auto sm:flex-row sm:gap-3"
              transition={{ duration: 0.6, ease }}
              variants={item}
            >
              {primaryCta && (
                <Button
                  className="group transition-[box-shadow,translate,scale,rotate] duration-150 ease-out active:scale-[0.97] sm:px-5"
                  render={<a href={primaryCta.href} />}
                  size="xl"
                >
                  {primaryCta.label}
                  <ArrowRightIcon className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
                </Button>
              )}
              {secondaryCta && (
                <Button
                  className="bg-background/70 backdrop-blur-md transition-[box-shadow,translate,scale,rotate] duration-150 ease-out active:scale-[0.97] sm:px-5 dark:bg-background/40"
                  render={<a href={secondaryCta.href} />}
                  size="xl"
                  variant="outline"
                >
                  {secondaryCta.label}
                </Button>
              )}
            </motion.div>
          )}

          {notes.length > 0 && (
            <motion.ul
              className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-muted-foreground text-xs"
              transition={{ duration: 0.6, ease }}
              variants={item}
            >
              {notes.map((note) => (
                <li className="flex items-center gap-2" key={note}>
                  <span aria-hidden className="size-1 rounded-full bg-foreground/30" />
                  {note}
                </li>
              ))}
            </motion.ul>
          )}
        </motion.div>
      </section>
    </MotionConfig>
  );
}
