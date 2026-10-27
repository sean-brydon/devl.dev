"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

const blob = { type: "spring", stiffness: 420, damping: 24, mass: 0.8 } as const;

/** The copy button is a lime drop: on copy a droplet runs out ahead and the drop stretches after it into a pill. */
export function InstallCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const reduce = useReducedMotion();
  const filterId = `copy-goo-${useId().replace(/:/g, "")}`;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      className="group flex w-full max-w-full items-center gap-3 rounded-full border bg-card py-2 ps-4 pe-2 text-left font-mono text-xs outline-none transition-colors hover:border-brand-ink/40 focus-visible:ring-2 focus-visible:ring-ring"
      onClick={async () => {
        await navigator.clipboard.writeText(command);
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1600);
      }}
      type="button"
    >
      <span className="text-brand-ink">$</span>
      <span className="min-w-0 flex-1 truncate">{command}</span>
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-end transition-transform group-active:scale-90">
        <svg aria-hidden className="absolute size-0">
          <filter colorInterpolationFilters="sRGB" id={filterId}>
            <feGaussianBlur stdDeviation="2.6" />
            <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
          </filter>
        </svg>
        <span aria-hidden className="pointer-events-none absolute inset-y-[-6px] right-[-6px] left-[-90px]" style={reduce ? undefined : { filter: `url(#${filterId})` }}>
          <motion.span
            animate={{ width: copied && !reduce ? 82 : 28 }}
            className="absolute top-1.5 right-1.5 h-7 rounded-full bg-brand"
            initial={false}
            transition={blob}
          />
          {!reduce && (
            <motion.span
              animate={copied ? { x: [-4, -66, -58], scale: [0.5, 0.9, 0.7] } : { x: -4, scale: 0.4 }}
              className="absolute top-[13px] right-3 size-4 rounded-full bg-brand"
              initial={false}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
        </span>
        <span className="relative z-10 flex h-7 items-center justify-end gap-1 pe-[7px] text-brand-foreground">
          <AnimatePresence initial={false} mode="popLayout">
            {copied ? (
              <motion.span
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1 whitespace-nowrap font-sans font-semibold text-[11px]"
                exit={{ opacity: 0, x: 4 }}
                initial={{ opacity: 0, x: reduce ? 0 : 8 }}
                key="copied"
                transition={{ duration: 0.2, delay: reduce ? 0 : 0.08 }}
              >
                {!reduce && "Copied"}
                <CheckIcon className="size-3.5" />
              </motion.span>
            ) : (
              <motion.span animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} initial={{ opacity: 0, scale: 0.6 }} key="copy">
                <CopyIcon className="size-3.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </span>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : "Copy install command"}
      </span>
    </button>
  );
}
