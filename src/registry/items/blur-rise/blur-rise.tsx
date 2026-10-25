"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { type ElementType, Fragment, useRef } from "react";
import { cn } from "@/lib/utils";

export interface BlurRiseProps {
  text: string;
  by?: "word" | "letter";
  as?: ElementType;
  stagger?: number;
  maxSpread?: number;
  delay?: number;
  once?: boolean;
  className?: string;
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export function BlurRise({
  text,
  by = "word",
  as: Tag = "p",
  stagger,
  maxSpread = 0.6,
  delay = 0,
  once = true,
  className,
}: BlurRiseProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once, amount: 0.4 });
  const reduce = useReducedMotion();
  const words = text.split(/\s+/).filter(Boolean);
  const count = by === "letter" ? words.reduce((n, w) => n + [...w].length, 0) : words.length;
  const wanted = stagger ?? (by === "letter" ? 0.022 : 0.035);
  const step = count > 1 ? Math.min(wanted, maxSpread / (count - 1)) : 0;

  let index = 0;
  const piece = (content: string, key: string) => {
    const at = delay + index++ * step;
    return (
      <motion.span
        animate={inView ? "shown" : "hidden"}
        className="inline-block"
        initial="hidden"
        key={key}
        transition={
          reduce
            ? { duration: 0, opacity: { duration: 0.3, ease: "easeOut", delay: delay + (at - delay) / 2 } }
            : {
                delay: at,
                type: "spring",
                stiffness: 170,
                damping: 22,
                mass: 0.7,
                filter: { duration: 0.45, ease: EASE_OUT, delay: at },
                opacity: { duration: 0.3, ease: "easeOut", delay: at },
              }
        }
        variants={{
          hidden: { opacity: 0, y: "0.4em", scale: 0.96, filter: "blur(8px)" },
          shown: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } },
        }}
      >
        {content}
      </motion.span>
    );
  };

  return (
    <Tag className={cn("text-balance", className)} ref={ref}>
      <span className="sr-only">{text}</span>
      {words.map((word, w) => (
        <Fragment key={`${word}-${w}`}>
          <span aria-hidden className="inline-block whitespace-nowrap">
            {by === "letter" ? [...word].map((ch, c) => piece(ch, `${w}-${c}`)) : piece(word, `${w}`)}
          </span>
          {w < words.length - 1 && " "}
        </Fragment>
      ))}
    </Tag>
  );
}
