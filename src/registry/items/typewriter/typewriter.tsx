"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function useReduce() {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!reduce;
}

type Phase = "typing" | "reading" | "selecting" | "deleting" | "resting";

export interface TypewriterOptions {
  typeSpeed?: number;
  deleteSpeed?: number;
  wpm?: number;
  erase?: "backspace" | "select";
  loop?: boolean;
  paused?: boolean;
}

function readingTime(phrase: string, wpm: number) {
  const words = phrase.trim().split(/\s+/).length;
  return Math.max(1400, (words / wpm) * 60_000 + 700);
}

function keystroke(next: string | undefined, base: number) {
  const jitter = base * (0.55 + Math.random() * 0.9);
  if (next === "," || next === ";") return jitter + 160;
  if (next === "." || next === "?" || next === "!") return jitter + 260;
  if (next === " ") return jitter * 0.7;
  return jitter;
}

export function useTypewriter(
  phrases: string[],
  { typeSpeed = 58, deleteSpeed = 26, wpm = 200, erase = "backspace", loop = true, paused = false }: TypewriterOptions = {},
) {
  const reduce = useReduce();
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLElement>(null);
  const phrase = phrases[index % phrases.length] ?? "";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (paused || !visible) return;
    const last = !loop && index === phrases.length - 1;
    let ms = 0;
    let step = () => {};

    if (reduce) {
      if (count !== phrase.length) {
        setCount(phrase.length);
        setPhase("reading");
        return;
      }
      if (last) return;
      ms = readingTime(phrase, wpm);
      step = () => {
        setIndex((i) => i + 1);
        setCount(0);
      };
    } else if (phase === "typing") {
      if (count >= phrase.length) {
        setPhase("reading");
        return;
      }
      ms = count === 0 ? 120 : keystroke(phrase[count], typeSpeed);
      step = () => setCount((c) => c + 1);
    } else if (phase === "reading") {
      if (last) return;
      ms = readingTime(phrase, wpm);
      step = () => setPhase(erase === "select" ? "selecting" : "deleting");
    } else if (phase === "selecting") {
      ms = 420;
      step = () => {
        setCount(0);
        setPhase("resting");
      };
    } else if (phase === "deleting") {
      if (count <= 0) {
        setPhase("resting");
        return;
      }
      ms = count === phrase.length ? 180 : deleteSpeed;
      step = () => setCount((c) => c - 1);
    } else {
      ms = 360;
      step = () => {
        setIndex((i) => i + 1);
        setPhase("typing");
      };
    }

    const id = setTimeout(step, ms);
    return () => clearTimeout(id);
  }, [phase, count, index, phrase, paused, visible, reduce, loop, phrases.length, typeSpeed, deleteSpeed, wpm, erase]);

  return { ref, text: phrase.slice(0, count), phrase, index, phase, reduce, visible };
}

export interface TypewriterProps extends Omit<ComponentProps<"span">, "children">, TypewriterOptions {
  phrases: string[];
  caretClassName?: string;
}

export function Typewriter({ phrases, caretClassName, className, ...props }: TypewriterProps) {
  const { typeSpeed, deleteSpeed, wpm, erase, loop, paused, ...rest } = props;
  const { ref, text, phrase, index, phase, reduce, visible } = useTypewriter(phrases, {
    typeSpeed,
    deleteSpeed,
    wpm,
    erase,
    loop,
    paused,
  });
  const idle = visible && (phase === "reading" || phase === "resting" || paused);

  return (
    <span className={cn("relative", className)} ref={ref} {...rest}>
      <span className="sr-only">{phrases.join(", ")}</span>
      <span aria-hidden>
        {reduce ? (
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key={index}
              transition={{ duration: 0.25 }}
            >
              {phrase}
            </motion.span>
          </AnimatePresence>
        ) : (
          <>
            <span
              className={cn(
                "rounded-[0.15em] transition-colors duration-150 [box-decoration-break:clone]",
                phase === "selecting" && "bg-info/25",
              )}
            >
              {text}
            </span>
            <motion.span
              animate={idle ? { opacity: [1, 1, 0, 0, 1] } : { opacity: 1 }}
              className={cn(
                "ml-[0.06em] inline-block h-[1.1em] w-[0.08em] min-w-0.5 translate-y-[0.18em] rounded-full bg-current align-baseline",
                caretClassName,
              )}
              key={idle ? "blink" : "solid"}
              transition={idle ? { duration: 1.1, times: [0, 0.5, 0.58, 0.92, 1], repeat: Number.POSITIVE_INFINITY } : { duration: 0 }}
            />
          </>
        )}
      </span>
    </span>
  );
}
