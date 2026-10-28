"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { XIcon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface LiftToOpenItem {
  id: string;
  title: string;
  meta?: string;
  cover: string;
  art?: ReactNode;
  details: ReactNode;
}

export interface LiftToOpenProps {
  items: LiftToOpenItem[];
  className?: string;
  label?: string;
}

const frameSpring = { type: "spring", duration: 0.46, bounce: 0.12 } as const;
const resting = "0 1px 2px rgb(0 0 0 / 0.05)";
const hover = "0 8px 20px -8px rgb(0 0 0 / 0.18), 0 1px 2px rgb(0 0 0 / 0.05)";
const raised = "0 24px 48px -16px rgb(0 0 0 / 0.28), 0 2px 6px rgb(0 0 0 / 0.06)";

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function useThemeRadius(scale: number) {
  const probe = useRef<HTMLSpanElement>(null);
  const [radius, setRadius] = useState(scale * 10);
  useLayoutEffect(() => {
    const el = probe.current;
    if (!el) return;
    const read = () => setRadius(el.offsetWidth);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const marker = (
    <span
      aria-hidden
      className="pointer-events-none invisible absolute h-0"
      ref={probe}
      style={{ width: `calc(var(--radius) * ${scale})` }}
    />
  );
  return [radius, marker] as const;
}

function Cover({
  item,
  scope,
  shared,
  radius,
  className,
}: {
  item: LiftToOpenItem;
  scope: string;
  shared: boolean;
  radius: number;
  className?: string;
}) {
  return (
    <motion.div
      className={cn("relative grid place-items-center overflow-hidden bg-linear-to-br text-white", item.cover, className)}
      layoutId={shared ? `${scope}-cover-${item.id}` : undefined}
      style={{ borderRadius: radius }}
      transition={frameSpring}
    >
      {item.art && (
        <motion.div className="grid place-items-center" layout={shared} transition={frameSpring}>
          {item.art}
        </motion.div>
      )}
    </motion.div>
  );
}

function Heading({ item, scope, shared, size }: { item: LiftToOpenItem; scope: string; shared: boolean; size: "sm" | "lg" }) {
  return (
    <motion.div
      className="flex w-fit max-w-full origin-top-left flex-col"
      layoutId={shared ? `${scope}-heading-${item.id}` : undefined}
      transition={frameSpring}
    >
      <span className={cn("truncate font-medium", size === "lg" ? "text-base" : "text-sm")}>{item.title}</span>
      {item.meta && <span className="truncate text-muted-foreground text-xs">{item.meta}</span>}
    </motion.div>
  );
}

export function LiftToOpen({ items, className, label = "Gallery" }: LiftToOpenProps) {
  const scope = useId();
  const reduce = useCalmMotion();
  const [radius, radiusProbe] = useThemeRadius(1);
  const shared = !reduce;
  const [openId, setOpenId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [lifted, setLifted] = useState<string | null>(null);
  const thumbs = useRef(new Map<string, HTMLButtonElement>());
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = items.find((item) => item.id === openId) ?? null;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (open) closeButton.current?.focus({ preventScroll: true });
    else if (returnTo.current) {
      thumbs.current.get(returnTo.current)?.focus({ preventScroll: true });
      returnTo.current = null;
    }
  }, [open]);

  const show = (id: string) => {
    if (timer.current) clearTimeout(timer.current);
    setClosing(false);
    setLifted(id);
    setOpenId(id);
  };

  const close = () => {
    if (!openId || closing) return;
    returnTo.current = openId;
    setClosing(true);
    timer.current = setTimeout(() => {
      setOpenId(null);
      setClosing(false);
    }, 90);
  };
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    if (!openId) return;
    const outside = (event: PointerEvent) => {
      if (dialog.current && !dialog.current.contains(event.target as Node)) closeRef.current();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [openId]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "Tab" || !dialog.current) return;
    const focusable = [...dialog.current.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])")];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <LayoutGroup id={scope}>
      <div className={cn("relative", className)}>
        {radiusProbe}
        <ul aria-label={label} className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <li className="relative" key={item.id} style={{ zIndex: lifted === item.id ? 30 : undefined }}>
              {openId === item.id ? (
                <div aria-hidden className="invisible flex flex-col gap-2.5 rounded-2xl border p-1.5">
                  <div className="aspect-[4/3]" />
                  <div className="px-1.5 pb-1.5 text-sm">
                    <div>{item.title}</div>
                    <div className="text-xs">{item.meta}</div>
                  </div>
                </div>
              ) : (
                <motion.button
                  aria-haspopup="dialog"
                  className="flex w-full cursor-pointer flex-col gap-2.5 border bg-card p-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  animate={{ opacity: 1, boxShadow: resting }}
                  initial={reduce ? { opacity: 0 } : lifted === item.id ? { boxShadow: raised } : false}
                  layoutId={shared ? `${scope}-frame-${item.id}` : undefined}
                  onClick={() => show(item.id)}
                  onLayoutAnimationComplete={() => setLifted((id) => (id === item.id ? null : id))}
                  ref={(el) => {
                    if (el) thumbs.current.set(item.id, el);
                    else thumbs.current.delete(item.id);
                  }}
                  style={{ borderRadius: radius * 1.6 }}
                  transition={{ ...frameSpring, boxShadow: { duration: 0.3, ease: "easeOut" } }}
                  type="button"
                  whileHover={reduce ? undefined : { y: -2, boxShadow: hover }}
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                >
                  <Cover className="aspect-[4/3] w-full" item={item} radius={radius} scope={scope} shared={shared} />
                  <div className="px-1.5 pb-1.5">
                    <Heading item={item} scope={scope} shared={shared} size="sm" />
                  </div>
                </motion.button>
              )}
            </li>
          ))}
        </ul>
        <AnimatePresence>
          {open && (
            <motion.div
              animate={{ opacity: closing ? 0 : 1 }}
              aria-hidden
              className="absolute -inset-2 z-20 rounded-3xl bg-background/70"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="backdrop"
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>
        {open && (
          <motion.div
            animate={{ opacity: 1, boxShadow: raised }}
            aria-labelledby={`${scope}-title`}
            aria-modal="true"
            className="absolute inset-0 z-40 flex flex-col overflow-hidden border bg-card p-1.5"
            initial={reduce ? { opacity: 0, boxShadow: raised } : { opacity: 1, boxShadow: resting }}
            key={open.id}
            layoutId={shared ? `${scope}-frame-${open.id}` : undefined}
            onKeyDown={onKeyDown}
            ref={dialog}
            role="dialog"
            style={{ borderRadius: radius * 1.6 }}
            transition={{ ...frameSpring, opacity: { duration: 0.15 }, boxShadow: { duration: 0.3, ease: "easeOut" } }}
          >
            <Cover className="h-20 w-full shrink-0 sm:h-36" item={open} radius={radius} scope={scope} shared={shared} />
            <motion.button
              animate={{ opacity: closing ? 0 : 1, scale: closing ? 0.9 : 1 }}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 grid size-8 cursor-pointer place-items-center rounded-full bg-black/25 text-white outline-none backdrop-blur-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white [@media(hover:hover)]:hover:bg-black/40"
              initial={{ opacity: 0, scale: 0.9 }}
              onClick={close}
              ref={closeButton}
              transition={{ duration: closing ? 0.09 : 0.2, delay: closing ? 0 : 0.2, ease: "easeOut" }}
              type="button"
            >
              <XIcon className="size-4" />
            </motion.button>
            <div className="flex min-h-0 flex-1 flex-col gap-3 px-2.5 pt-3 pb-2.5">
              <div id={`${scope}-title`}>
                <Heading item={open} scope={scope} shared={shared} size="lg" />
              </div>
              <motion.div
                animate={closing ? { opacity: 0, y: reduce ? 0 : 4 } : { opacity: 1, y: 0 }}
                className="flex min-h-0 flex-1 flex-col overflow-y-auto"
                initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                transition={closing ? { duration: 0.09, ease: "easeOut" } : { duration: 0.24, delay: reduce ? 0.05 : 0.22, ease: [0.23, 1, 0.32, 1] }}
              >
                {open.details}
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </LayoutGroup>
  );
}
