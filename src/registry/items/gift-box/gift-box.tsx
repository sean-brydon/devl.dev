"use client";

import { CheckIcon, CopyIcon, GiftIcon } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GiftBoxHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";

const hues: Record<GiftBoxHue, string> = {
  sky: "[--hue-hi:var(--color-sky-300)] [--hue:var(--color-sky-500)] [--hue-deep:var(--color-sky-700)]",
  emerald: "[--hue-hi:var(--color-emerald-300)] [--hue:var(--color-emerald-500)] [--hue-deep:var(--color-emerald-700)]",
  amber: "[--hue-hi:var(--color-amber-300)] [--hue:var(--color-amber-500)] [--hue-deep:var(--color-amber-700)]",
  violet: "[--hue-hi:var(--color-violet-300)] [--hue:var(--color-violet-500)] [--hue-deep:var(--color-violet-700)]",
  rose: "[--hue-hi:var(--color-rose-300)] [--hue:var(--color-rose-500)] [--hue-deep:var(--color-rose-700)]",
  orange: "[--hue-hi:var(--color-orange-300)] [--hue:var(--color-orange-500)] [--hue-deep:var(--color-orange-700)]",
  indigo: "[--hue-hi:var(--color-indigo-300)] [--hue:var(--color-indigo-500)] [--hue-deep:var(--color-indigo-700)]",
  teal: "[--hue-hi:var(--color-teal-300)] [--hue:var(--color-teal-500)] [--hue-deep:var(--color-teal-700)]",
};

export interface GiftBoxProps {
  amount?: string;
  code?: string;
  label?: string;
  title?: string;
  description?: string;
  openTitle?: string;
  openDescription?: string;
  hue?: GiftBoxHue;
  autoPlay?: boolean;
  className?: string;
}

const W = 400;
const VY = 34;
const H = 192;
const CX = 200;
const BODY = { x: 144, y: 132, w: 112, h: 82 };
const LID = { x: 136, y: 112, w: 128, h: 24 };
const COUPON = { w: 152, h: 84, rest: 136, up: 44, tucked: 0.68 };

const sparkles = [
  { x: 108, y: 66, s: 1, d: 0 },
  { x: 296, y: 58, s: 0.8, d: 0.12 },
  { x: 94, y: 128, s: 0.65, d: 0.24 },
  { x: 312, y: 120, s: 0.9, d: 0.06 },
  { x: 150, y: 44, s: 0.55, d: 0.3 },
  { x: 258, y: 40, s: 0.6, d: 0.18 },
];

const couponPath = (w: number, h: number, notch: number) =>
  `M9 0 H${notch - 5} A5 5 0 0 0 ${notch + 5} 0 H${w - 9} Q${w} 0 ${w} 9 V${h - 9} Q${w} ${h} ${w - 9} ${h} H${notch + 5} A5 5 0 0 0 ${notch - 5} ${h} H9 Q0 ${h} 0 ${h - 9} V9 Q0 0 9 0 Z`;

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export function GiftBox({
  amount = "$20",
  code = "MIRA-20",
  label = "Referral credit",
  title = "You've got a reward",
  description = "Mira joined with your invite link. Open it up to see what you earned.",
  openTitle = "$20 credit unlocked",
  openDescription = "It comes off your next invoice. Share the code to give a friend the same.",
  hue = "rose",
  autoPlay = true,
  className,
}: GiftBoxProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!autoPlay || touched || !inView || reduce) return;
    const t = setTimeout(() => setOpen((o) => !o), open ? 4200 : 2600);
    return () => clearTimeout(t);
  }, [autoPlay, touched, inView, open, reduce]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const toggle = () => {
    setTouched(true);
    setOpen((o) => !o);
  };

  const action = async () => {
    setTouched(true);
    if (!open) {
      setOpen(true);
      return;
    }
    try {
      await navigator.clipboard?.writeText(code);
    } catch {}
    setCopied(true);
  };

  const wobbling = !open && inView && !reduce;
  const instant = { duration: reduce ? 0 : 0.2 };
  const notch = 108;

  return (
    <div
      ref={root}
      className={cn("relative w-full max-w-[440px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6", hues[hue], className)}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />

      <button
        aria-label={open ? `Close the gift. ${amount} ${label}, code ${code}` : `Open your gift: ${title}`}
        className="group/gift relative mx-auto block aspect-[400/192] w-full max-w-[400px] cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={toggle}
        type="button"
      >
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`0 ${VY} ${W} ${H}`}>
          <defs>
            <linearGradient id={`${uid}-box`} x1="0" x2="1" y1="0" y2="0.4">
              <stop offset="0" stopColor="var(--hue-hi)" />
              <stop offset="0.4" stopColor="var(--hue)" />
              <stop offset="1" stopColor="var(--hue-deep)" />
            </linearGradient>
            <radialGradient id={`${uid}-glow`}>
              <stop className="[stop-color:var(--color-amber-300)]" offset="0" stopOpacity={0.6} />
              <stop className="[stop-color:var(--color-amber-300)]" offset="1" stopOpacity={0} />
            </radialGradient>
            <clipPath id={`${uid}-inside`}>
              <rect height={BODY.y - VY + 40} width={W} x={0} y={VY - 40} />
              <rect height={BODY.h} width={BODY.w} x={BODY.x} y={BODY.y} />
            </clipPath>
          </defs>

          <g className="dark:opacity-55">
            <motion.circle
              animate={{ opacity: open ? 1 : 0, scale: open || reduce ? 1 : 0.8 }}
              cx={CX}
              cy={COUPON.up + COUPON.h / 2}
              fill={`url(#${uid}-glow)`}
              initial={false}
              r={110}
              style={{ originX: "50%", originY: "50%" }}
              transition={reduce ? instant : { duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: open ? 0.75 : 0 }}
            />
          </g>

          <ellipse className="fill-foreground/8" cx={CX} cy={BODY.y + BODY.h + 3} rx={70} ry={5} />

          <motion.g
            animate={wobbling ? { rotate: [0, -4, 4, -3, 2, 0], y: [0, -5, 0, -2, 0, 0] } : { rotate: 0, y: 0 }}
            style={{ originX: `${CX}px`, originY: `${BODY.y + BODY.h}px`, transformBox: "view-box" }}
            transition={
              wobbling
                ? { duration: 0.7, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY, repeatDelay: 2.1, delay: 0.8 }
                : { duration: 0.2 }
            }
          >
            <rect className="fill-(--hue-deep)" height={16} rx={3} width={BODY.w - 4} x={BODY.x + 2} y={BODY.y - 8} />
            <rect className="fill-black/25" height={16} rx={3} width={BODY.w - 4} x={BODY.x + 2} y={BODY.y - 8} />

            <g clipPath={`url(#${uid}-inside)`}>
              <motion.g
                animate={{ scale: open ? 1 : COUPON.tucked, y: open ? COUPON.up - COUPON.rest : 0 }}
                initial={false}
                style={{ originX: `${CX}px`, originY: `${COUPON.rest + COUPON.h}px`, transformBox: "view-box" }}
                transition={
                  reduce
                    ? instant
                    : open
                      ? { type: "spring", stiffness: 170, damping: 17, delay: 0.72 }
                      : { duration: 0.3, ease: [0.65, 0, 0.35, 1] }
                }
              >
                <g transform={`translate(${CX - COUPON.w / 2} ${COUPON.rest})`}>
                  <path className="fill-black/6" d={couponPath(COUPON.w, COUPON.h, notch)} transform="translate(0 5)" />
                  <path className="fill-black/8" d={couponPath(COUPON.w, COUPON.h, notch)} transform="translate(0 1.5)" />
                  <path className="fill-card stroke-foreground/12" d={couponPath(COUPON.w, COUPON.h, notch)} strokeWidth={1} />
                  <path className="stroke-foreground/15" d={`M${notch} 8 V${COUPON.h - 8}`} strokeDasharray="3 3" strokeWidth={1.2} />
                  <text className="fill-foreground font-semibold tabular-nums" fontSize={26} x={14} y={36}>
                    {amount}
                  </text>
                  <text className="fill-muted-foreground font-medium" fontSize={9.5} x={14} y={52}>
                    {label}
                  </text>
                  <rect className="fill-(--hue)/15" height={15} rx={4} width={Math.max(52, code.length * 6 + 12)} x={14} y={60} />
                  <text className="fill-(--hue-deep) font-medium font-mono dark:fill-(--hue-hi)" dominantBaseline="central" fontSize={8.5} x={20} y={67.8}>
                    {code}
                  </text>
                  <GiftIcon className="text-(--hue)" height={18} width={18} x={notch + (COUPON.w - notch) / 2 - 9} y={COUPON.h / 2 - 9} />
                </g>
              </motion.g>
            </g>

            <rect fill={`url(#${uid}-box)`} height={BODY.h} rx={8} width={BODY.w} x={BODY.x} y={BODY.y} />
            <rect className="fill-black/10" height={6} width={BODY.w} x={BODY.x} y={BODY.y} />
            <rect className="fill-amber-300" height={BODY.h} width={18} x={CX - 9} y={BODY.y} />
            <rect className="fill-amber-500/40" height={BODY.h} width={4} x={CX + 5} y={BODY.y} />

            <motion.g
              animate={
                open
                  ? { x: [0, 26, 122, 122], y: [0, -66, 86, 81], rotate: [0, 14, 9, 8] }
                  : { x: 0, y: 0, rotate: 0 }
              }
              initial={false}
              style={{ originX: `${CX}px`, originY: `${LID.y + LID.h / 2}px`, transformBox: "view-box" }}
              transition={
                reduce
                  ? instant
                  : open
                    ? { duration: 0.9, times: [0, 0.32, 0.8, 1], ease: ["easeOut", "easeIn", "easeOut"], delay: 0.28 }
                    : { type: "spring", stiffness: 200, damping: 24 }
              }
            >
              <rect fill={`url(#${uid}-box)`} height={LID.h} rx={7} width={LID.w} x={LID.x} y={LID.y} />
              <rect className="fill-white/20" height={4} rx={2} width={LID.w - 28} x={LID.x + 10} y={LID.y + 4} />
              <rect className="fill-amber-300" height={LID.h} width={18} x={CX - 9} y={LID.y} />
              <rect className="fill-amber-500/40" height={LID.h} width={4} x={CX + 5} y={LID.y} />
            </motion.g>

            <motion.g
              animate={open ? { opacity: 0, y: reduce ? 0 : 12 } : { opacity: 1, y: 0 }}
              className="fill-amber-300"
              initial={false}
              transition={reduce ? instant : { duration: 0.24, ease: open ? "easeIn" : "easeOut", delay: open ? 0.08 : 0.5 }}
            >
              <path d={`M${CX - 4} ${LID.y + 2} L${CX - 16} ${LID.y + 24} L${CX - 10} ${LID.y + 22} L${CX - 7} ${LID.y + 27} L${CX + 3} ${LID.y + 4} Z`} />
              <path d={`M${CX + 4} ${LID.y + 2} L${CX + 16} ${LID.y + 24} L${CX + 10} ${LID.y + 22} L${CX + 7} ${LID.y + 27} L${CX - 3} ${LID.y + 4} Z`} />
            </motion.g>

            {[-1, 1].map((side) => (
              <motion.g
                animate={
                  open
                    ? { opacity: 0, rotate: reduce ? 0 : side * 50, scale: reduce ? 1 : 0.9, x: reduce ? 0 : side * 14, y: reduce ? 0 : -6 }
                    : { opacity: 1, rotate: 0, scale: 1, x: 0, y: 0 }
                }
                initial={false}
                key={side}
                style={{ originX: `${CX}px`, originY: `${LID.y - 1}px`, transformBox: "view-box" }}
                transition={reduce ? instant : open ? { duration: 0.32, ease: [0.23, 1, 0.32, 1] } : { type: "spring", stiffness: 380, damping: 22, delay: 0.5 }}
              >
                <path
                  className="fill-amber-300"
                  d={`M${CX} ${LID.y - 1} C${CX + side * 12} ${LID.y - 20} ${CX + side * 38} ${LID.y - 18} ${CX + side * 32} ${LID.y - 5} C${CX + side * 28} ${LID.y + 4} ${CX + side * 10} ${LID.y + 2} ${CX} ${LID.y - 1} Z`}
                />
                <path
                  className="fill-amber-500/45"
                  d={`M${CX + side * 6} ${LID.y - 3} C${CX + side * 14} ${LID.y - 13} ${CX + side * 28} ${LID.y - 12} ${CX + side * 26} ${LID.y - 6} C${CX + side * 22} ${LID.y - 2} ${CX + side * 12} ${LID.y - 2} ${CX + side * 6} ${LID.y - 3} Z`}
                />
              </motion.g>
            ))}
            <motion.rect
              animate={{ opacity: open ? 0 : 1, scale: open && !reduce ? 0.8 : 1 }}
              className="fill-amber-400"
              height={12}
              initial={false}
              rx={4.5}
              style={{ originX: "50%", originY: "50%" }}
              transition={reduce ? instant : { duration: 0.2, delay: open ? 0.1 : 0.55 }}
              width={14}
              x={CX - 7}
              y={LID.y - 7}
            />
          </motion.g>

          {sparkles.map((sp) => (
            <g key={`${sp.x}-${sp.y}`} transform={`translate(${sp.x} ${sp.y}) scale(${sp.s})`}>
              <motion.path
                animate={
                  open && !reduce
                    ? { opacity: [0, 1, 0.35, 1, 0], scale: [0.4, 1, 0.7, 0.9, 0.4] }
                    : { opacity: open ? 1 : 0, scale: open ? 0.8 : 0.4 }
                }
                className="fill-amber-400"
                d="M0 -8 C0.8 -2 2 -0.8 8 0 C2 0.8 0.8 2 0 8 C-0.8 2 -2 0.8 -8 0 C-2 -0.8 -0.8 -2 0 -8 Z"
                initial={false}
                style={{ originX: "0px", originY: "0px" }}
                transition={
                  open && !reduce
                    ? { duration: 1.6, delay: 1 + sp.d, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY, repeatDelay: 0.8 + sp.d * 4 }
                    : { duration: 0.2 }
                }
              />
            </g>
          ))}
        </svg>
      </button>

      <div className="relative mt-3 grid text-center [&>*]:col-start-1 [&>*]:row-start-1">
        {[
          { key: "closed", show: !open, t: title, d: description },
          { key: "open", show: open, t: openTitle, d: openDescription },
        ].map((copy) => (
          <motion.div
            animate={{ opacity: copy.show ? 1 : 0, y: copy.show || reduce ? 0 : copy.key === "open" ? 4 : -4 }}
            aria-hidden={!copy.show}
            initial={false}
            key={copy.key}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1], delay: open && !reduce ? 0.6 : 0 }}
          >
            <p aria-live={copy.key === "open" ? "polite" : undefined} className="text-balance font-medium text-foreground text-sm">
              {copy.t}
            </p>
            <p className="mx-auto mt-1 max-w-[36ch] text-pretty text-muted-foreground text-xs">{copy.d}</p>
          </motion.div>
        ))}
      </div>

      <div className="relative mt-4 flex justify-center">
        <Button
          className="min-w-32 transition-[box-shadow,transform] duration-150 ease-out active:scale-[0.97]"
          onClick={action}
          size="sm"
          variant={open ? "outline" : "default"}
        >
          {!open ? <GiftIcon aria-hidden /> : copied ? <CheckIcon aria-hidden className="text-success-foreground" /> : <CopyIcon aria-hidden />}
          {!open ? "Open gift" : copied ? "Copied" : `Copy ${code}`}
        </Button>
      </div>
    </div>
  );
}
