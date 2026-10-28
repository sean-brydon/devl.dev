"use client";

import { CheckIcon, HeartIcon, MinusIcon, PlusIcon, StarIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type CSSProperties, type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface Swatch {
  id: string;
  name: string;
  color: string;
  accent?: string;
  soldOut?: string[];
}

export interface SizeOption {
  id: string;
  label: string;
  price: number;
  scale?: number;
}

export interface SwatchCardProps {
  name: string;
  tagline?: string;
  rating?: number;
  reviews?: number;
  swatches: Swatch[];
  sizes: SizeOption[];
  defaultSwatch?: string;
  defaultSize?: string;
  currency?: string;
  locale?: string;
  renderProduct?: (swatch: Swatch, size: SizeOption) => ReactNode;
  onAdd?: (selection: { swatch: Swatch; size: SizeOption; qty: number }) => void | Promise<unknown>;
  className?: string;
}

type BagState = { phase: "idle" } | { phase: "adding" } | { phase: "in"; qty: number };

export function SwatchCard({
  name,
  tagline,
  rating,
  reviews,
  swatches,
  sizes,
  defaultSwatch,
  defaultSize,
  currency = "USD",
  locale = "en-US",
  renderProduct,
  onAdd,
  className,
}: SwatchCardProps) {
  const reduce = useReducedMotion();
  const [swatchId, setSwatchId] = useState(defaultSwatch ?? swatches[0].id);
  const [preview, setPreview] = useState<string | null>(null);
  const [sizeId, setSizeId] = useState(defaultSize ?? sizes[0].id);
  const [bag, setBag] = useState<BagState>({ phase: "idle" });
  const [liked, setLiked] = useState(false);
  const ringId = useId();
  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const shownSwatch = swatches.find((s) => s.id === (preview ?? swatchId)) ?? swatches[0];
  const swatch = swatches.find((s) => s.id === swatchId) ?? swatches[0];
  const size = sizes.find((s) => s.id === sizeId) ?? sizes[0];
  const soldOut = (sz: SizeOption, sw = swatch) => sw.soldOut?.includes(sz.id) ?? false;
  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);

  const choose = (id: string) => {
    setSwatchId(id);
    const next = swatches.find((s) => s.id === id);
    if (next?.soldOut?.includes(sizeId)) {
      const fallback = sizes.find((sz) => !next.soldOut?.includes(sz.id));
      if (fallback) setSizeId(fallback.id);
    }
    setBag({ phase: "idle" });
  };

  const onSwatchKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const i = swatches.findIndex((s) => s.id === swatchId);
    let j = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") j = (i + 1) % swatches.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") j = (i - 1 + swatches.length) % swatches.length;
    if (j < 0) return;
    event.preventDefault();
    choose(swatches[j].id);
    swatchRefs.current[j]?.focus();
  };

  const add = async () => {
    if (bag.phase !== "idle" || soldOut(size)) return;
    setBag({ phase: "adding" });
    await onAdd?.({ swatch, size, qty: 1 });
    if (mounted.current) setBag({ phase: "in", qty: 1 });
  };
  const changeQty = (delta: number) => {
    if (bag.phase !== "in") return;
    const qty = bag.qty + delta;
    setBag(qty <= 0 ? { phase: "idle" } : { phase: "in", qty: Math.min(qty, 9) });
  };

  const ease = [0.23, 1, 0.32, 1] as const;
  const stageColor = { "--c": shownSwatch.color } as CSSProperties;

  return (
    <div className={cn("w-full max-w-[320px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}>
      <div
        className="relative h-52 overflow-hidden bg-[color-mix(in_oklch,var(--c)_16%,var(--color-card))] transition-[background-color] duration-300 ease-out"
        style={stageColor}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_65%_at_50%_45%,--theme(--color-white/45%),transparent)] dark:bg-[radial-gradient(55%_65%_at_50%_45%,--theme(--color-white/9%),transparent)]"
        />
        <button
          aria-label={liked ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={liked}
          className="absolute top-3 right-3 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full bg-background/80 text-foreground shadow-xs/5 outline-none backdrop-blur transition-[scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          onClick={() => setLiked((v) => !v)}
          type="button"
        >
          <motion.span animate={liked && !reduce ? { scale: [1, 1.25, 1] } : { scale: 1 }} className="flex" transition={{ duration: 0.3, ease: "easeOut" }}>
            <HeartIcon className={cn("size-4 transition-colors duration-150", liked ? "fill-rose-500 text-rose-500" : "text-foreground")} />
          </motion.span>
        </button>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            className="absolute inset-0 flex items-end justify-center pb-5"
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -14, filter: "blur(3px)", transition: { duration: 0.16, ease: "easeIn" } }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 14, filter: "blur(3px)" }}
            key={shownSwatch.id}
            transition={{ duration: 0.26, ease }}
          >
            {renderProduct ? renderProduct(shownSwatch, size) : <Bottle scale={size.scale ?? 1} swatch={shownSwatch} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-base leading-tight">{name}</h3>
            {tagline && <p className="mt-0.5 text-muted-foreground text-xs">{tagline}</p>}
          </div>
          <RollingNumber className="font-semibold text-base" text={fmt(size.price)} />
        </div>
        {rating !== undefined && (
          <p className="mt-1.5 flex items-center gap-1 text-muted-foreground text-xs">
            <StarIcon className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium text-foreground tabular-nums">{rating.toFixed(1)}</span>
            {reviews !== undefined && <span className="tabular-nums">({reviews} reviews)</span>}
          </p>
        )}

        <div className="mt-4">
          <p className="mb-2 text-xs">
            <span className="text-muted-foreground">Colour</span> <span className="font-medium">{shownSwatch.name}</span>
          </p>
          <div aria-label="Colour" className="flex gap-1" onKeyDown={onSwatchKey} onPointerLeave={() => setPreview(null)} role="radiogroup">
            {swatches.map((s, i) => {
              const on = s.id === swatchId;
              return (
                <button
                  aria-checked={on}
                  aria-label={s.name}
                  className="relative flex size-8 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  key={s.id}
                  onBlur={() => setPreview(null)}
                  onClick={() => choose(s.id)}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setPreview(s.id)}
                  ref={(el) => {
                    swatchRefs.current[i] = el;
                  }}
                  role="radio"
                  tabIndex={on ? 0 : -1}
                  type="button"
                >
                  {on && (
                    <motion.span
                      className="absolute inset-0 rounded-full ring-[1.5px] ring-foreground"
                      layoutId={`${ringId}-ring`}
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }}
                    />
                  )}
                  <span
                    className="size-6 rounded-full shadow-[inset_0_0_0_1px_--theme(--color-black/12%),inset_0_-3px_4px_--theme(--color-black/14%)] dark:shadow-[inset_0_0_0_1px_--theme(--color-white/28%),inset_0_-3px_4px_--theme(--color-black/20%)]"
                    style={{ background: s.color }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Size</span>
            {sizes.some((sz) => soldOut(sz)) && (
              <span className="truncate text-muted-foreground">
                {sizes
                  .filter((sz) => soldOut(sz))
                  .map((sz) => sz.label)
                  .join(", ")}{" "}
                sold out in {swatch.name}
              </span>
            )}
          </div>
          <div aria-label="Size" className="grid grid-cols-3 gap-1.5" role="radiogroup">
            {sizes.map((sz) => {
              const on = sz.id === sizeId;
              const out = soldOut(sz);
              return (
                <button
                  aria-checked={on}
                  aria-disabled={out || undefined}
                  aria-label={out ? `${sz.label}, sold out in ${swatch.name}` : sz.label}
                  className={cn(
                    "relative h-8 cursor-pointer overflow-hidden rounded-lg border font-medium text-xs outline-none transition-[background-color,border-color,color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                    on ? "border-primary bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-accent dark:bg-input/32",
                    out && "cursor-not-allowed text-muted-foreground line-through decoration-muted-foreground/60 hover:bg-background active:scale-100",
                  )}
                  key={sz.id}
                  onClick={() => {
                    if (out) return;
                    setSizeId(sz.id);
                    setBag({ phase: "idle" });
                  }}
                  role="radio"
                  type="button"
                >
                  {sz.label}
                </button>
              );
            })}
          </div>
        </div>

        <BagButton
          bag={bag}
          label={`Add to bag · ${fmt(size.price)}`}
          onAdd={add}
          onQty={changeQty}
          reduce={!!reduce}
        />
      </div>
    </div>
  );
}

function BagButton({
  bag,
  label,
  onAdd,
  onQty,
  reduce,
}: {
  bag: BagState;
  label: string;
  onAdd: () => void;
  onQty: (delta: number) => void;
  reduce: boolean;
}) {
  const ease = [0.23, 1, 0.32, 1] as const;
  const swap = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(2px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(2px)" },
    transition: { duration: 0.2, ease },
  };
  const inBag = bag.phase === "in";
  return (
    <div
      className={cn(
        "relative mt-3 h-10 overflow-hidden rounded-xl transition-[background-color,box-shadow] duration-300 ease-out",
        inBag ? "bg-muted shadow-[inset_0_0_0_1px_var(--color-border)]" : "bg-primary text-primary-foreground shadow-xs",
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {inBag ? (
          <motion.div className="absolute inset-0 flex items-center justify-between px-1" key="stepper" {...swap}>
            <button
              aria-label={bag.qty === 1 ? "Remove from bag" : "One less"}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-foreground outline-none transition-[background-color,scale] hover:bg-background focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
              onClick={() => onQty(-1)}
              type="button"
            >
              <MinusIcon className="size-4" />
            </button>
            <span aria-live="polite" className="flex items-center gap-1.5 font-medium text-sm">
              <CheckIcon className="size-4 text-success" />
              <RollingNumber text={String(bag.qty)} /> in your bag
            </span>
            <button
              aria-label="One more"
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-foreground outline-none transition-[background-color,scale] hover:bg-background focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
              onClick={() => onQty(1)}
              type="button"
            >
              <PlusIcon className="size-4" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            className="absolute inset-0 flex cursor-pointer items-center justify-center gap-2 font-medium text-sm outline-none transition-[scale] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:scale-[0.98]"
            disabled={bag.phase === "adding"}
            key="add"
            onClick={onAdd}
            type="button"
            {...swap}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {bag.phase === "adding" ? (
                <motion.span className="flex items-center gap-2" key="adding" {...swap}>
                  <Spinner className="size-4" />
                  Adding…
                </motion.span>
              ) : (
                <motion.span key="label" {...swap}>
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function Bottle({ swatch, scale }: { swatch: Swatch; scale: number }) {
  const reduce = useReducedMotion();
  const vars = {
    "--c": swatch.color,
    "--cap": swatch.accent ?? `color-mix(in oklch, ${swatch.color} 62%, black)`,
  } as CSSProperties;
  return (
    <div className="relative flex flex-col items-center" style={vars}>
      <div className="h-4 w-6 rounded-t-full border-[4px] border-(--cap) border-b-0" />
      <div className="h-8 w-[54px] rounded-t-[10px] rounded-b-[5px] bg-[repeating-linear-gradient(90deg,var(--cap)_0_5px,color-mix(in_oklch,var(--cap)_82%,black)_5px_6px)] shadow-[inset_0_-3px_0_--theme(--color-black/18%)]" />
      <div className="h-2 w-[46px] bg-[linear-gradient(90deg,var(--color-neutral-400),var(--color-neutral-100)_45%,var(--color-neutral-300)_70%,var(--color-neutral-400))]" />
      <motion.div
        animate={{ height: 128 * scale }}
        className="relative w-[72px] overflow-hidden rounded-t-[18px] rounded-b-[22px] bg-[linear-gradient(90deg,color-mix(in_oklch,var(--c)_72%,black)_0%,var(--c)_26%,color-mix(in_oklch,var(--c)_78%,white)_46%,var(--c)_68%,color-mix(in_oklch,var(--c)_70%,black)_100%)]"
        initial={false}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
      >
        <span className="absolute top-[38%] left-1/2 -translate-x-1/2 font-semibold text-[7px] text-white/75 uppercase tracking-[0.3em] mix-blend-luminosity">
          Fieldwell
        </span>
        <span className="absolute inset-x-0 bottom-3 h-px bg-black/10" />
      </motion.div>
      <div className="absolute -bottom-2 h-3 w-24 rounded-[50%] bg-black/20 blur-[6px] dark:bg-black/50" />
    </div>
  );
}

function RollingNumber({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  const chars = text.split("");
  return (
    <span aria-label={text} className={cn("inline-flex tabular-nums leading-6", className)} role="img">
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
          <span aria-hidden className="relative inline-block h-6 overflow-hidden [mask-image:linear-gradient(transparent,black_15%,black_85%,transparent)]" key={`d${key}`}>
            <motion.span
              animate={{ y: `${-Number(c) * 10}%` }}
              className="flex flex-col"
              initial={false}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 30 }}
            >
              {Array.from({ length: 10 }, (_, d) => (
                <span className="h-6" key={d}>
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
