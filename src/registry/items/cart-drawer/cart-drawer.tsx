"use client";

import { MinusIcon, PlusIcon, ShoppingBagIcon, Trash2Icon, TruckIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CartLine {
  id: string;
  name: string;
  variant?: string;
  price: number;
  qty: number;
  art?: ReactNode;
  max?: number;
}

export interface CartDrawerProps {
  items?: CartLine[];
  defaultItems?: CartLine[];
  onItemsChange?: (items: CartLine[]) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  freeShippingAt?: number;
  currency?: string;
  locale?: string;
  onCheckout?: (items: CartLine[], subtotal: number) => void;
  children?: (cartButton: ReactNode) => ReactNode;
  className?: string;
}

export function CartDrawer({
  items: itemsProp,
  defaultItems = [],
  onItemsChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  freeShippingAt,
  currency = "USD",
  locale = "en-US",
  onCheckout,
  children,
  className,
}: CartDrawerProps) {
  const reduce = useReducedMotion();
  const [innerItems, setInnerItems] = useState(defaultItems);
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const items = itemsProp ?? innerItems;
  const open = openProp ?? innerOpen;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const opened = useRef(false);

  const setItems = (next: CartLine[]) => {
    if (itemsProp === undefined) setInnerItems(next);
    onItemsChange?.(next);
  };
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInnerOpen(next);
    onOpenChange?.(next);
    opened.current = next;
    if (!next) requestAnimationFrame(() => triggerRef.current?.focus());
  };
  useEffect(() => {
    if (open && opened.current) panelRef.current?.focus();
  }, [open]);

  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
  const count = items.reduce((n, l) => n + l.qty, 0);
  const subtotal = items.reduce((n, l) => n + l.qty * l.price, 0);
  const remaining = freeShippingAt ? Math.max(0, freeShippingAt - subtotal) : 0;
  const unlocked = !!freeShippingAt && remaining === 0;

  const setQty = (id: string, qty: number) => setItems(qty <= 0 ? items.filter((l) => l.id !== id) : items.map((l) => (l.id === id ? { ...l, qty } : l)));

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
      return;
    }
    const panel = panelRef.current;
    if (event.key !== "Tab" || !open || !panel) return;
    const items = [...panel.querySelectorAll<HTMLElement>("button:not(:disabled)")];
    const first = items[0];
    const last = items[items.length - 1];
    const at = document.activeElement;
    if (event.shiftKey && (at === first || at === panel)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && at === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const ease = [0.32, 0.72, 0, 1] as const;

  const cartButton = (
    <button
      aria-expanded={open}
      aria-label={`Bag, ${count} item${count === 1 ? "" : "s"}`}
      className="relative flex size-9 cursor-pointer items-center justify-center rounded-full text-foreground outline-none transition-[background-color,scale] duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
      onClick={() => setOpen(!open)}
      ref={triggerRef}
      type="button"
    >
      <ShoppingBagIcon className="size-4.5" />
      <AnimatePresence initial={false}>
        {count > 0 && (
          <motion.span
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-semibold text-[10px] text-primary-foreground tabular-nums ring-2 ring-card"
            exit={{ scale: 0.6, opacity: 0 }}
            initial={{ scale: 0.6, opacity: 0 }}
            key="badge"
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );

  return (
    <div className={cn("relative isolate overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)} onKeyDown={onKey}>
      <div aria-hidden={open || undefined} className="h-full" inert={open || undefined}>
        {children?.(cartButton) ?? <div className="flex justify-end p-3">{cartButton}</div>}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-10 bg-black/24 dark:bg-black/48"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="scrim"
              onClick={() => setOpen(false)}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              animate={{ x: 0 }}
              aria-label="Shopping bag"
              aria-modal="true"
              className="absolute inset-y-0 right-0 z-20 flex w-[min(360px,90%)] flex-col border-s bg-popover text-popover-foreground shadow-xl/10 outline-none"
              exit={reduce ? { opacity: 0 } : { x: "100%", transition: { duration: 0.22, ease } }}
              initial={reduce ? { opacity: 0 } : { x: "100%" }}
              key="panel"
              ref={panelRef}
              role="dialog"
              tabIndex={-1}
              transition={{ duration: 0.28, ease }}
            >
              <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
                <h2 className="font-semibold text-base">
                  Your bag <span className="font-normal text-muted-foreground tabular-nums">({count})</span>
                </h2>
                <Button aria-label="Close bag" className="-me-1.5" onClick={() => setOpen(false)} size="icon-sm" variant="ghost">
                  <XIcon />
                </Button>
              </div>

              {freeShippingAt && items.length > 0 && (
                <div className="mx-4 mb-2 rounded-xl bg-muted/70 px-3 py-2.5">
                  <div className="relative h-4 overflow-hidden text-xs">
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.p
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex items-center gap-1.5", unlocked ? "font-medium text-success-foreground" : "text-muted-foreground")}
                        exit={{ opacity: 0, y: -10 }}
                        initial={reduce ? false : { opacity: 0, y: 10 }}
                        key={unlocked ? "free" : "left"}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                      >
                        <TruckIcon className="size-3.5" />
                        {unlocked ? (
                          "Free shipping unlocked"
                        ) : (
                          <span>
                            <span className="font-medium text-foreground tabular-nums">{fmt(remaining)}</span> away from free shipping
                          </span>
                        )}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background dark:bg-input/40">
                    <motion.div
                      animate={{ scaleX: Math.min(1, subtotal / freeShippingAt) }}
                      className={cn("h-full origin-left rounded-full transition-colors duration-300", unlocked ? "bg-success" : "bg-foreground/80")}
                      initial={false}
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 32 }}
                    />
                  </div>
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
                {items.length === 0 ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="flex h-full flex-col items-center justify-center gap-1 pb-8 text-center"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
                  >
                    <span className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                      <ShoppingBagIcon className="size-6" />
                    </span>
                    <p className="font-medium text-sm">Your bag is empty</p>
                    <p className="max-w-52 text-pretty text-muted-foreground text-xs">Things you add show up here, ready when you are.</p>
                    <Button className="mt-4" onClick={() => setOpen(false)} size="sm" variant="outline">
                      Keep shopping
                    </Button>
                  </motion.div>
                ) : (
                  <ul>
                    <AnimatePresence initial={false}>
                      {items.map((line) => (
                        <motion.li
                          animate={{ opacity: 1, height: "auto" }}
                          className="overflow-hidden"
                          exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }}
                          initial={reduce ? false : { opacity: 0, height: 0 }}
                          key={line.id}
                          transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
                        >
                          <div className="flex gap-3 border-b py-3">
                            <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">{line.art}</span>
                            <div className="flex min-w-0 flex-1 flex-col">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-sm">{line.name}</p>
                                  {line.variant && <p className="truncate text-muted-foreground text-xs">{line.variant}</p>}
                                </div>
                                <RollingNumber className="font-medium text-sm" text={fmt(line.qty * line.price)} />
                              </div>
                              <div className="mt-auto flex items-center justify-between pt-2">
                                <Stepper
                                  label={line.name}
                                  max={line.max ?? 9}
                                  onChange={(q) => setQty(line.id, q)}
                                  value={line.qty}
                                />
                                <button
                                  aria-label={`Remove ${line.name}`}
                                  className="relative flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors before:absolute before:-inset-1 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                  onClick={() => setQty(line.id, 0)}
                                  type="button"
                                >
                                  <Trash2Icon className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </div>

              {items.length > 0 && (
                <div className="border-t px-4 pt-3 pb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <RollingNumber className="font-medium" text={fmt(subtotal)} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className={unlocked ? "font-medium text-success-foreground" : "text-muted-foreground"}>{unlocked ? "Free" : "Calculated at checkout"}</span>
                  </div>
                  <Button className="mt-3 w-full" onClick={() => onCheckout?.(items, subtotal)} size="lg">
                    Checkout
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stepper({ value, onChange, max, label }: { value: number; onChange: (v: number) => void; max: number; label: string }) {
  return (
    <div aria-label={`Quantity of ${label}`} className="flex h-7 items-center rounded-full border bg-background shadow-xs/5 dark:bg-input/32" role="group">
      <button
        aria-label={value === 1 ? `Remove ${label}` : `One less ${label}`}
        className="relative flex h-full w-7 cursor-pointer items-center justify-center rounded-s-full before:absolute before:-inset-y-1 before:inset-x-0 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
        onClick={() => onChange(value - 1)}
        type="button"
      >
        <MinusIcon className="size-3" />
      </button>
      <RollingNumber className="w-4 justify-center font-medium text-xs" text={String(value)} />
      <button
        aria-label={`One more ${label}`}
        className="relative flex h-full w-7 cursor-pointer items-center justify-center rounded-e-full before:absolute before:-inset-y-1 before:inset-x-0 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        type="button"
      >
        <PlusIcon className="size-3" />
      </button>
    </div>
  );
}

function RollingNumber({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  const chars = text.split("");
  return (
    <span aria-label={text} className={cn("inline-flex tabular-nums leading-5", className)} role="img">
      {chars.map((c, i) => {
        const key = chars.length - i;
        if (!/\d/.test(c)) {
          return (
            <span aria-hidden key={`s${key}`}>
              {c}
            </span>
          );
        }
        return (
          <span aria-hidden className="relative inline-block h-5 overflow-hidden [mask-image:linear-gradient(transparent,black_15%,black_85%,transparent)]" key={`d${key}`}>
            <motion.span
              animate={{ y: `${-Number(c) * 10}%` }}
              className="flex flex-col"
              initial={false}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 30 }}
            >
              {Array.from({ length: 10 }, (_, d) => (
                <span className="h-5" key={d}>
                  {d}
                </span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}
