"use client";

import { QuoteIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Fragment, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface FootnotedSentence {
  text: string;
  cites?: number[];
  breakAfter?: boolean;
}

export interface FootnoteSource {
  title: string;
  domain: string;
  passage: string;
}

export interface FootnotedAnswerProps {
  sentences?: FootnotedSentence[];
  sources?: FootnoteSource[];
  className?: string;
}

const defaultSources: FootnoteSource[] = [
  {
    title: "Field notes on urban beekeeping",
    domain: "hivecraft.org",
    passage:
      "Rooftop colonies in dense cities often forage across three kilometres or more, and the variety of street trees and balcony plants gives urban honey a surprisingly complex flavour.",
  },
  {
    title: "Pollinator decline in managed landscapes",
    domain: "meadowlab.edu",
    passage:
      "Adding managed hives can increase competition with wild bees for limited flowers, especially where green space is scarce and native pollinators are already under pressure.",
  },
  {
    title: "Planting for pollinators: a city guide",
    domain: "greenblock.city",
    passage:
      "Councils seeing the strongest results pair new hives with native flowers along verges and parks, so that forage grows faster than the number of colonies.",
  },
];

const defaultSentences: FootnotedSentence[] = [
  { text: "City bees tend to do well: rooftop colonies forage over kilometres and urban honey has a complex flavour.", cites: [1] },
  {
    text: "The catch is competition, since extra hives can crowd out wild bees where flowers are scarce.",
    cites: [2],
    breakAfter: true,
  },
  { text: "The best programs plant native flowers first and add colonies slowly.", cites: [3, 2] },
];

const spring = { type: "spring", stiffness: 420, damping: 34 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;

const tone = [
  { dot: "bg-orange-500", hl: "from-orange-500/20 to-orange-500/20", ring: "ring-orange-500/60", mark: "from-orange-500/25 to-orange-500/25" },
  { dot: "bg-sky-500", hl: "from-sky-500/20 to-sky-500/20", ring: "ring-sky-500/60", mark: "from-sky-500/25 to-sky-500/25" },
  { dot: "bg-emerald-500", hl: "from-emerald-500/20 to-emerald-500/20", ring: "ring-emerald-500/60", mark: "from-emerald-500/25 to-emerald-500/25" },
  { dot: "bg-violet-500", hl: "from-violet-500/20 to-violet-500/20", ring: "ring-violet-500/60", mark: "from-violet-500/25 to-violet-500/25" },
  { dot: "bg-rose-500", hl: "from-rose-500/20 to-rose-500/20", ring: "ring-rose-500/60", mark: "from-rose-500/25 to-rose-500/25" },
] as const;

const toneOf = (n: number) => tone[(n - 1) % tone.length] ?? tone[0];

const stop = new Set(
  "that this with from have they their there where which while about into over than then them these those when what will would could should been being also very just more most some such only other many much each your ours".split(
    " ",
  ),
);

function stem(word: string) {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(ing|ed|es|s)$/, "");
}

function keywords(texts: string[]) {
  const set = new Set<string>();
  for (const t of texts)
    for (const w of t.split(/\s+/)) {
      const clean = w.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (clean.length >= 4 && !stop.has(clean)) set.add(stem(clean));
    }
  return set;
}

type Focus = { source: number; sentence?: number } | null;

export function FootnotedAnswer({ sentences = defaultSentences, sources = defaultSources, className }: FootnotedAnswerProps) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<Focus>(null);
  const [open, setOpen] = useState<Focus>(null);
  const focus = hover ?? open;
  const lastSource = useRef(1);
  if (focus) lastSource.current = focus.source;

  const lit = (i: number) => {
    if (!focus) return false;
    const s = sentences[i];
    if (focus.sentence !== undefined) return focus.sentence === i;
    return Boolean(s?.cites?.includes(focus.source));
  };

  const toggle = (next: { source: number; sentence?: number }) =>
    setOpen((cur) => (cur && cur.source === next.source && cur.sentence === next.sentence ? null : next));

  const paragraphs = useMemo(() => {
    const out: number[][] = [[]];
    sentences.forEach((s, i) => {
      out[out.length - 1]?.push(i);
      if (s.breakAfter && i < sentences.length - 1) out.push([]);
    });
    return out;
  }, [sentences]);

  const openSource = open ? sources[open.source - 1] : undefined;
  const markWords = useMemo(() => {
    if (!open) return new Set<string>();
    const texts =
      open.sentence !== undefined
        ? [sentences[open.sentence]?.text ?? ""]
        : sentences.filter((s) => s.cites?.includes(open.source)).map((s) => s.text);
    return keywords(texts);
  }, [open, sentences]);

  return (
    <article
      className={cn("w-full max-w-lg rounded-2xl border bg-card p-4 text-sm shadow-xs/5", className)}
      onPointerLeave={() => setHover(null)}
    >
      <div className="leading-7">
        {paragraphs.map((ids) => (
          <p className="mb-3 text-foreground/90 last:mb-0" key={ids.join("-")}>
            {ids.map((i) => {
              const s = sentences[i];
              if (!s) return null;
              const on = lit(i);
              const t = toneOf(lastSource.current);
              const hl = cn(
                "rounded-sm bg-linear-to-r bg-no-repeat transition-[background-size,color] duration-300 ease-out motion-reduce:transition-none",
                t.hl,
                on ? "bg-size-[100%_100%] text-foreground" : "bg-size-[0%_100%]",
              );
              const cut = s.text.lastIndexOf(" ");
              const head = cut > 0 ? s.text.slice(0, cut + 1) : "";
              const tail = cut > 0 ? s.text.slice(cut + 1) : s.text;
              return (
                <Fragment key={s.text}>
                  {head && <span className={cn(hl, "rounded-e-none")}>{head}</span>}
                  <span className="whitespace-nowrap">
                    <span className={cn(hl, head && "rounded-s-none")}>{tail}</span>
                  {s.cites?.map((n) => {
                    const active = focus?.source === n && (focus.sentence === undefined || focus.sentence === i);
                    const pressed = open?.source === n && open.sentence === i;
                    return (
                      <button
                        key={n}
                        aria-expanded={pressed}
                        aria-label={`Show source ${n}: ${sources[n - 1]?.title ?? ""}`}
                        className={cn(
                          "relative ms-1 inline-flex h-4 min-w-4 -translate-y-px cursor-pointer items-center justify-center rounded-full px-1 align-middle font-medium font-mono text-[10px] tabular-nums outline-none transition-[background-color,color,scale] duration-150 ease-out after:absolute after:-inset-x-1.5 after:-inset-y-2 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.94]",
                          active ? cn(toneOf(n).dot, "text-white") : "bg-muted text-muted-foreground",
                        )}
                        onBlur={() => setHover(null)}
                        onClick={() => toggle({ source: n, sentence: i })}
                        onFocus={() => setHover({ source: n, sentence: i })}
                        onPointerEnter={(e) => e.pointerType === "mouse" && setHover({ source: n, sentence: i })}
                        onPointerLeave={() => setHover(null)}
                        type="button"
                      >
                        {n}
                      </button>
                    );
                  })}
                  </span>{" "}
                </Fragment>
              );
            })}
          </p>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {open && openSource && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : spring}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.blockquote
                animate={{ opacity: 1, y: 0 }}
                className="relative mt-3 rounded-xl bg-muted/60 p-3 ps-5"
                exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
                key={`${open.source}-${open.sentence ?? "all"}`}
                transition={{ duration: 0.22, ease: easeOut }}
              >
                <span aria-hidden className={cn("absolute inset-y-3 start-2 w-0.5 rounded-full", toneOf(open.source).dot)} />
                <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground text-xs">
                  <QuoteIcon className="size-3" />
                  <span className="truncate">{openSource.domain}</span>
                  <button
                    aria-label="Close passage"
                    className="relative ms-auto grid size-5 place-items-center rounded-md outline-none transition-[background-color,color,scale] duration-150 ease-out after:absolute after:-inset-1.5 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.94]"
                    onClick={() => setOpen(null)}
                    type="button"
                  >
                    <XIcon className="size-3" />
                  </button>
                </div>
                <p className="text-foreground/80 text-xs leading-5">
                  <Passage mark={toneOf(open.source).mark} text={openSource.passage} words={markWords} />
                </p>
              </motion.blockquote>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 grid grid-cols-1 gap-2 border-t pt-3 sm:grid-cols-3">
        {sources.map((src, idx) => {
          const n = idx + 1;
          const active = focus?.source === n;
          return (
            <motion.button
              animate={{ y: active && !reduce ? -2 : 0 }}
              aria-pressed={open?.source === n && open.sentence === undefined}
              className={cn(
                "flex min-w-0 cursor-pointer flex-col gap-1 rounded-xl border bg-background p-2.5 text-start outline-none ring-0 transition-[box-shadow,background-color,scale] duration-150 ease-out hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
                active && cn("ring-2", toneOf(n).ring),
              )}
              key={src.domain}
              onBlur={() => setHover(null)}
              onClick={() => toggle({ source: n })}
              onFocus={() => setHover({ source: n })}
              onPointerEnter={(e) => e.pointerType === "mouse" && setHover({ source: n })}
              onPointerLeave={() => setHover(null)}
              transition={spring}
              type="button"
            >
              <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <span className={cn("size-2 shrink-0 rounded-full", toneOf(n).dot)} />
                <span className="truncate">{src.domain}</span>
                <span className="ms-auto font-mono tabular-nums">{n}</span>
              </span>
              <span className="line-clamp-2 text-foreground text-xs leading-4">{src.title}</span>
            </motion.button>
          );
        })}
      </div>
    </article>
  );
}

function Passage({ text, words, mark }: { text: string; words: Set<string>; mark: string }) {
  const reduce = useReducedMotion();
  let hit = 0;
  return (
    <>
      {text.split(/(\s+)/).map((part, i) => {
        if (/^\s+$/.test(part) || !words.has(stem(part))) return <Fragment key={`${i}-${part}`}>{part}</Fragment>;
        const delay = 0.1 + Math.min(hit++, 6) * 0.04;
        const [, word = part, trail = ""] = /^(.*?)([.,;:!?]*)$/.exec(part) ?? [];
        return (
          <Fragment key={`${i}-${part}`}>
          <motion.mark
            animate={{ backgroundSize: "100% 100%" }}
            className={cn("rounded-sm bg-transparent bg-linear-to-r bg-no-repeat px-0.5 text-foreground", mark)}
            initial={reduce ? false : { backgroundSize: "0% 100%" }}
            transition={{ duration: 0.3, delay, ease: "easeOut" }}
          >
            {word}
          </motion.mark>
          {trail}
          </Fragment>
        );
      })}
    </>
  );
}
