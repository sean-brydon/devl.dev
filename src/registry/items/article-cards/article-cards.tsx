"use client";

import { ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ArticleCover = "rings" | "dots" | "waves" | "pages" | "orbit" | "glyph";
export type ArticleTone = "violet" | "sky" | "emerald" | "amber" | "rose" | "indigo";

export interface Article {
  title: string;
  excerpt?: string;
  href: string;
  tags: string[];
  minutes: number;
  date: string;
  author: { name: string };
  cover?: ArticleCover;
  tone?: ArticleTone;
}

export interface ArticleCardsProps {
  eyebrow?: string;
  title?: ReactNode;
  articles: Article[];
  allHref?: string;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;

const tones: Record<ArticleTone, { bg: string; ink: string; chip: string; avatar: string }> = {
  violet: {
    bg: "from-violet-100 to-violet-50/40 dark:from-violet-500/20 dark:to-violet-500/5",
    ink: "text-violet-500/45 dark:text-violet-300/30",
    chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    avatar: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  },
  sky: {
    bg: "from-sky-100 to-sky-50/40 dark:from-sky-500/20 dark:to-sky-500/5",
    ink: "text-sky-500/45 dark:text-sky-300/30",
    chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    avatar: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
  emerald: {
    bg: "from-emerald-100 to-emerald-50/40 dark:from-emerald-500/20 dark:to-emerald-500/5",
    ink: "text-emerald-500/45 dark:text-emerald-300/30",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    avatar: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  amber: {
    bg: "from-amber-100 to-amber-50/40 dark:from-amber-500/20 dark:to-amber-500/5",
    ink: "text-amber-500/55 dark:text-amber-300/30",
    chip: "bg-amber-500/12 text-amber-800 dark:text-amber-300",
    avatar: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  rose: {
    bg: "from-rose-100 to-rose-50/40 dark:from-rose-500/20 dark:to-rose-500/5",
    ink: "text-rose-500/45 dark:text-rose-300/30",
    chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    avatar: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
  indigo: {
    bg: "from-indigo-100 to-indigo-50/40 dark:from-indigo-500/20 dark:to-indigo-500/5",
    ink: "text-indigo-500/45 dark:text-indigo-300/30",
    chip: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    avatar: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  },
};
const toneOrder = Object.keys(tones) as ArticleTone[];
const coverOrder: ArticleCover[] = ["rings", "pages", "waves", "dots", "orbit", "glyph"];

function CoverArt({ cover, title }: { cover: ArticleCover; title: string }) {
  const stroke = { stroke: "currentColor", strokeWidth: 1.5, fill: "none", vectorEffect: "non-scaling-stroke" } as const;
  switch (cover) {
    case "rings":
      return (
        <svg className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 225">
          {[20, 45, 70, 95, 120, 145].map((r) => (
            <circle cx="290" cy="150" key={r} r={r} {...stroke} />
          ))}
          <circle cx="290" cy="150" fill="currentColor" r="8" />
        </svg>
      );
    case "pages":
      return (
        <svg className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 225">
          {[0, 1, 2].map((i) => (
            <rect height="150" key={i} rx="10" {...stroke} fill="var(--color-card)" width="110" x={135 + i * 22} y={58 - i * 14} />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <line key={i} {...stroke} x1="198" x2={268 - i * 10} y1={72 + i * 14} y2={72 + i * 14} />
          ))}
        </svg>
      );
    case "waves":
      return (
        <svg className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 225">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path d={`M-10 ${70 + i * 18} C 80 ${30 + i * 18}, 140 ${120 + i * 18}, 220 ${80 + i * 18} S 360 ${40 + i * 18}, 420 ${90 + i * 18}`} key={i} {...stroke} />
          ))}
        </svg>
      );
    case "dots":
      return (
        <svg className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 225">
          {Array.from({ length: 9 }, (_, r) =>
            Array.from({ length: 16 }, (_, c) => (
              <circle cx={20 + c * 24} cy={16 + r * 24} fill="currentColor" key={`${r}-${c}`} r={r === 4 && c >= 6 && c <= 10 ? 5 : 1.6} />
            )),
          )}
        </svg>
      );
    case "orbit":
      return (
        <svg className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 225">
          <ellipse cx="200" cy="112" rx="150" ry="52" {...stroke} transform="rotate(-12 200 112)" />
          <ellipse cx="200" cy="112" rx="96" ry="34" {...stroke} transform="rotate(-12 200 112)" />
          <circle cx="200" cy="112" fill="currentColor" r="16" />
          <circle cx="338" cy="84" fill="currentColor" r="6" />
        </svg>
      );
    default:
      return (
        <span
          aria-hidden
          className="absolute right-3 -bottom-7 select-none font-heading font-semibold text-[7.5rem] leading-none tracking-tighter"
        >
          {title.trim()[0]?.toUpperCase()}
          {title.trim()[0]?.toLowerCase()}
        </span>
      );
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Card({ article, index, size }: { article: Article; index: number; size: "feature" | "side" | "grid" }) {
  const tone = tones[article.tone ?? toneOrder[index % toneOrder.length]];
  const cover = article.cover ?? coverOrder[index % coverOrder.length];
  const feature = size === "feature";

  return (
    <motion.a
      className={cn(
        "group/card relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-xs/5 outline-none",
        "transition-[translate,scale,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-foreground/12 hover:shadow-lg/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 active:scale-[0.98] motion-reduce:hover:translate-y-0",
      )}
      href={article.href}
      initial={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.5, ease, delay: Math.min(index, 5) * 0.05 }}
      viewport={{ once: true, amount: 0.25 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div
        className={cn(
          "relative m-1.5 mb-0 overflow-hidden rounded-[calc(1rem-6px)] bg-linear-to-br",
          tone.bg,
          feature ? "aspect-[16/9] lg:aspect-auto lg:min-h-0 lg:flex-1" : size === "side" ? "aspect-[2/1]" : "aspect-[16/9]",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/card:scale-[1.04] motion-reduce:transition-none",
            tone.ink,
          )}
        >
          <CoverArt cover={cover} title={article.title} />
        </div>
        <span className="absolute top-3 right-3 flex size-8 translate-y-1 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-xs/5 backdrop-blur-sm transition-[opacity,translate] duration-200 ease-out group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-visible/card:translate-y-0 group-focus-visible/card:opacity-100">
          <ArrowUpRightIcon className="size-4" />
        </span>
      </div>

      <div className={cn("flex flex-col", feature ? "p-5 sm:p-6" : "p-4 sm:p-5")}>
        <div className="flex flex-wrap items-center gap-1.5">
          {article.tags.slice(0, 2).map((tag, i) => (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-medium text-[0.6875rem]",
                i === 0 ? tone.chip : "bg-muted text-muted-foreground",
              )}
              key={tag}
            >
              {tag}
            </span>
          ))}
          <span className="ms-auto text-muted-foreground text-xs tabular-nums">{article.minutes} min read</span>
        </div>
        <h3
          className={cn(
            "mt-3 text-balance font-heading font-semibold tracking-tight",
            feature ? "text-xl leading-snug sm:text-2xl" : "text-base leading-snug",
          )}
        >
          {article.title}
        </h3>
        {article.excerpt && size !== "side" && (
          <p
            className={cn(
              "mt-2 text-pretty text-muted-foreground leading-relaxed",
              feature ? "text-sm sm:text-[0.9375rem]" : "line-clamp-2 text-sm",
            )}
          >
            {article.excerpt}
          </p>
        )}
        <div className={cn("flex items-center gap-2 text-muted-foreground text-xs", size === "side" ? "mt-3" : "mt-4")}>
          <span className={cn("flex size-6 items-center justify-center rounded-full font-semibold text-[0.5625rem]", tone.avatar)}>
            {initials(article.author.name)}
          </span>
          <span className="truncate text-foreground/80">{article.author.name}</span>
          <span aria-hidden className="size-0.5 shrink-0 rounded-full bg-foreground/30" />
          <time className="shrink-0 tabular-nums">{article.date}</time>
        </div>
      </div>
    </motion.a>
  );
}

export function ArticleCards({ eyebrow = "Journal", title = "Latest writing", articles, allHref, className }: ArticleCardsProps) {
  const [featured, ...rest] = articles;
  const side = rest.slice(0, 2);
  const grid = rest.slice(2);

  return (
    <MotionConfig reducedMotion="user">
      <section className={cn("mx-auto w-full max-w-[1100px]", className)}>
        <header className="flex items-end justify-between gap-6">
          <div className="max-w-xl">
            {eyebrow && <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">{eyebrow}</p>}
            <h2 className="mt-2 text-balance font-heading font-semibold text-3xl tracking-tight sm:text-4xl">{title}</h2>
          </div>
          {allHref && (
            <a
              className="group/all hidden shrink-0 items-center gap-1 rounded-md font-medium text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex"
              href={allHref}
            >
              All posts
              <ArrowRightIcon className="size-4 transition-transform duration-200 ease-out group-hover/all:translate-x-0.5" />
            </a>
          )}
        </header>

        <div className="mt-10 grid gap-4 lg:grid-cols-3 lg:gap-5">
          {featured && (
            <div className="lg:col-span-2 lg:row-span-2">
              <Card article={featured} index={0} size="feature" />
            </div>
          )}
          {side.map((article, i) => (
            <Card article={article} index={i + 1} key={article.href} size="side" />
          ))}
        </div>
        {grid.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:mt-5 lg:grid-cols-3 lg:gap-5">
            {grid.map((article, i) => (
              <Card article={article} index={i + 3} key={article.href} size="grid" />
            ))}
          </div>
        )}
        {allHref && (
          <a className="mt-8 flex items-center justify-center gap-1 font-medium text-sm sm:hidden" href={allHref}>
            All posts <ArrowRightIcon className="size-4" />
          </a>
        )}
      </section>
    </MotionConfig>
  );
}
