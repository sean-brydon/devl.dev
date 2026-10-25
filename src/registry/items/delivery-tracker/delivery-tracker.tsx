"use client";

import {
  BikeIcon,
  CheckIcon,
  ChevronLeftIcon,
  CircleHelpIcon,
  HouseIcon,
  MessageCircleIcon,
  MinusIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  RotateCcwIcon,
  SendIcon,
  StarIcon,
  StoreIcon,
  XCircleIcon,
} from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { type FormEvent, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem, MenuLinkItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Textarea } from "@/components/ui/textarea";

export interface DeliveryItem {
  id: string;
  name: string;
  detail: string;
  price: number;
  qty: number;
  art: "bread" | "milk" | "fruit" | "flowers";
}

export interface DeliveryCourier {
  name: string;
  rating: number;
  trips: number;
  vehicle: string;
  phone: string;
}

export interface DeliveryTrackerProps {
  className?: string;
  storeName?: string;
  orderId?: string;
  address?: string;
  courier?: DeliveryCourier;
  items?: DeliveryItem[];
  routeMinutes?: number;
  startAt?: number;
  simulateSeconds?: number;
  now?: string;
  onBack?: () => void;
}

const spring = { type: "spring", stiffness: 520, damping: 44, mass: 1 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;
const press = "transition-[color,background-color,box-shadow,scale,opacity] duration-150 ease-out active:scale-[0.97]";
const card = "rounded-2xl border bg-card shadow-xs/5";

const defaultCourier: DeliveryCourier = {
  name: "Tomás Reyes",
  rating: 4.9,
  trips: 1284,
  vehicle: "Green e-bike",
  phone: "+15555550142",
};

const defaultItems: DeliveryItem[] = [
  { id: "d1", name: "Country sourdough", detail: "800 g, sliced", price: 7.5, qty: 1, art: "bread" },
  { id: "d2", name: "Barista oat milk", detail: "1 L", price: 3.2, qty: 2, art: "milk" },
  { id: "d3", name: "Clementines", detail: "1 kg net", price: 4.8, qty: 1, art: "fruit" },
  { id: "d4", name: "Seasonal stems", detail: "Small bunch", price: 12, qty: 1, art: "flowers" },
];

const W = 800;
const H = 600;
const ROUTE = "M180 500 H384 Q400 500 400 484 V376 Q400 360 416 360 H544 Q560 360 560 344 V236 Q560 220 576 220 H624 Q640 220 640 204 V150";
const START = { x: 180, y: 500 };
const END = { x: 640, y: 150 };
const xs = [0, 100, 240, 400, 560, 720, 800];
const ys = [0, 90, 220, 360, 500, 600];

const stages = ["Confirmed", "Packed", "On the way", "Delivered"] as const;

function phaseText(p: number, first: string) {
  if (p >= 1) return `${first} is at your door`;
  if (p > 0.93) return `${first} is pulling up outside`;
  if (p > 0.8) return `${first} is turning onto Alder Row`;
  if (p > 0.62) return `${first} is crossing Calder Bridge`;
  if (p > 0.45) return `${first} is riding along Quay Road`;
  if (p > 0.27) return `${first} is heading up Linden Avenue`;
  return `${first} is leaving Harbor Street`;
}

function addMinutes(hhmm: string, mins: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + Math.round(mins);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  const suffix = hh >= 12 ? "pm" : "am";
  return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ItemArt({ art }: { art: DeliveryItem["art"] }) {
  const tile = {
    bread: "bg-amber-500/14 dark:bg-amber-400/12",
    milk: "bg-sky-500/12 dark:bg-sky-400/12",
    fruit: "bg-orange-500/14 dark:bg-orange-400/12",
    flowers: "bg-rose-500/12 dark:bg-rose-400/12",
  }[art];
  return (
    <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tile)}>
      <svg className="size-7" viewBox="0 0 32 32">
        {art === "bread" && (
          <>
            <path className="fill-amber-600 dark:fill-amber-500" d="M5 18c0-6 5-10 11-10s11 4 11 10v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
            <path className="fill-none stroke-amber-200/80" d="M11 13l2 3M16 12l1 3.5M21 13l-1 3" strokeLinecap="round" strokeWidth="1.5" />
          </>
        )}
        {art === "milk" && (
          <>
            <path className="fill-white dark:fill-sky-100" d="M11 9h10v4l2 3v11a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V16l2-3z" />
            <rect className="fill-sky-500 dark:fill-sky-400" height="5" rx="1" width="14" x="9" y="18" />
            <rect className="fill-sky-700/70 dark:fill-sky-600" height="3" rx="0.5" width="10" x="11" y="5" />
          </>
        )}
        {art === "fruit" && (
          <>
            <circle className="fill-orange-500 dark:fill-orange-400" cx="12" cy="19" r="6.5" />
            <circle className="fill-orange-400 dark:fill-orange-300" cx="20.5" cy="17" r="6" />
            <path className="fill-emerald-600 dark:fill-emerald-500" d="M20 11c1-3 4-4 6-3-1 2-3 3.5-6 3z" />
          </>
        )}
        {art === "flowers" && (
          <>
            <path className="fill-none stroke-emerald-600 dark:stroke-emerald-500" d="M16 28V15M16 22l-5-6M16 20l5-5" strokeLinecap="round" strokeWidth="1.6" />
            <circle className="fill-rose-500 dark:fill-rose-400" cx="16" cy="10" r="4" />
            <circle className="fill-rose-400 dark:fill-rose-300" cx="10" cy="14" r="3" />
            <circle className="fill-amber-400 dark:fill-amber-300" cx="22" cy="13" r="3" />
          </>
        )}
      </svg>
    </span>
  );
}

function ItemArtStore() {
  return (
    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
      <StoreIcon className="size-4" />
    </span>
  );
}

function Tween({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, (n) => String(Math.round(n)));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.4, ease: easeOut });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

const ZOOMS = [1, 1.5, 2.2];

export function DeliveryTracker({
  className,
  storeName = "Larder & Co.",
  orderId = "LC-20931",
  address = "Flat 3, 18 Alder Row",
  courier = defaultCourier,
  items = defaultItems,
  routeMinutes = 18,
  startAt = 0.3,
  simulateSeconds = 40,
  now = "19:24",
  onBack,
}: DeliveryTrackerProps) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const first = courier.name.split(" ")[0];
  const progress = useMotionValue(startAt);
  const zoomMv = useMotionValue(1);
  const [zoomIdx, setZoomIdx] = useState(0);
  const [minutes, setMinutes] = useState(Math.ceil(routeMinutes * (1 - startAt)));
  const [phase, setPhase] = useState(() => phaseText(startAt, first));
  const [status, setStatus] = useState<"moving" | "delivered">("moving");
  const [run, setRun] = useState(0);
  const [chat, setChat] = useState(false);
  const [rating, setRating] = useState(0);
  const [tip, setTip] = useState<number | null>(null);
  const [note, setNote] = useState("Leave with the concierge if I’m not in.");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);
  const routeRef = useRef<SVGPathElement>(null);
  const cameraRef = useRef<SVGGElement>(null);
  const courierRef = useRef<SVGGElement>(null);
  const pinsRef = useRef<(SVGGElement | null)[]>([]);
  const chatBtnRef = useRef<HTMLButtonElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const renderScale = useRef(1);
  const measured = useRef(false);
  const arrival = addMinutes(now, routeMinutes * (1 - startAt));

  const draw = useCallback(() => {
    const path = routeRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    const pt = path.getPointAtLength(len * Math.min(Math.max(progress.get(), 0), 1));
    const z = zoomMv.get();
    const m = (1.1 / (z * renderScale.current)).toFixed(4);
    let tx = W / 2 - pt.x * z;
    let ty = H / 2 - pt.y * z;
    tx = Math.min(0, Math.max(W - W * z, tx));
    ty = Math.min(0, Math.max(H - H * z, ty));
    cameraRef.current?.setAttribute("transform", `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${z.toFixed(4)})`);
    courierRef.current?.setAttribute("transform", `translate(${pt.x.toFixed(2)} ${pt.y.toFixed(2)}) scale(${m})`);
    const pins = [START, END];
    pinsRef.current.forEach((g, i) => {
      g?.setAttribute("transform", `translate(${pins[i].x} ${pins[i].y}) scale(${m})`);
    });
  }, [progress, zoomMv]);

  useMotionValueEvent(progress, "change", (p) => {
    draw();
    setMinutes(Math.max(1, Math.ceil(routeMinutes * (1 - p))));
    setPhase(phaseText(p, first));
  });
  useMotionValueEvent(zoomMv, "change", draw);

  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      renderScale.current = Math.max(width / W, height / H) || 1;
      if (!measured.current) {
        measured.current = true;
        if (renderScale.current < 0.75) {
          zoomMv.set(ZOOMS[1]);
          setZoomIdx(1);
        }
      }
      draw();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [draw, zoomMv]);

  useEffect(() => {
    progress.set(startAt);
    setStatus("moving");
    setRating(0);
    setTip(null);
    draw();
    const controls = animate(progress, 1, {
      duration: simulateSeconds,
      ease: "linear",
      onComplete: () => setStatus("delivered"),
    });
    return () => controls.stop();
  }, [run, progress, startAt, simulateSeconds, draw]);

  useEffect(() => {
    const controls = animate(zoomMv, ZOOMS[zoomIdx], reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 34 });
    return () => controls.stop();
  }, [zoomIdx, zoomMv, reduce]);

  const delivered = status === "delivered";
  const stage = delivered ? 3 : 2;
  const itemsTotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const fee = 2.99;

  return (
    <div
      className={cn(
        "@container relative isolate flex h-[760px] w-full flex-col overflow-hidden bg-background text-foreground text-sm",
        className,
      )}
    >
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b px-3 @3xl:px-5">
        {onBack ? (
          <Button aria-label="Back to orders" className={press} onClick={onBack} size="icon-sm" variant="ghost">
            <ChevronLeftIcon />
          </Button>
        ) : (
          <ItemArtStore />
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">Order from {storeName}</span>
          <span className="font-mono text-muted-foreground text-xs">#{orderId}</span>
        </div>
        <Menu>
          <MenuTrigger
            render={<Button aria-label="Help with this order" className={cn("ms-auto", press)} size="sm" variant="ghost" />}
          >
            <CircleHelpIcon /> <span className="hidden @md:inline">Help</span>
          </MenuTrigger>
          <MenuPopup align="end" className="w-60">
            {delivered ? (
              <MenuItem onClick={() => setRun((r) => r + 1)}>
                <RotateCcwIcon /> Watch the delivery again
              </MenuItem>
            ) : (
              <>
                <MenuItem onClick={() => setChat(true)}>
                  <MessageCircleIcon /> Message {first}
                </MenuItem>
                <MenuLinkItem href={`tel:${courier.phone}`}>
                  <PhoneIcon /> Call {first}
                </MenuLinkItem>
                <MenuItem
                  onClick={() => {
                    setDraft(note);
                    setEditing(true);
                  }}
                >
                  <PencilIcon /> Change drop-off note
                </MenuItem>
              </>
            )}
            <MenuSeparator />
            <MenuItem disabled>
              <XCircleIcon /> Cancel order
              <span className="ms-auto text-muted-foreground text-xs">{delivered ? "Delivered" : "On its way"}</span>
            </MenuItem>
          </MenuPopup>
        </Menu>
      </header>

      <div className="flex min-h-0 flex-1 flex-col @3xl:flex-row">
        <div className="relative h-[280px] shrink-0 overflow-hidden bg-muted @3xl:h-auto @3xl:min-w-0 @3xl:flex-1">
          <svg
            aria-label={`Map: ${phase}`}
            className="absolute inset-0 size-full"
            preserveAspectRatio="xMidYMid slice"
            ref={svgRef}
            role="img"
            viewBox={`0 0 ${W} ${H}`}
          >
            <g ref={cameraRef}>
              <rect className="fill-muted" height={H} width={W} />
              {xs.slice(0, -1).flatMap((x0, i) =>
                ys.slice(0, -1).map((y0, j) => {
                  const x1 = xs[i + 1];
                  const y1 = ys[j + 1];
                  const park = i === 2 && j === 1;
                  return (
                    <rect
                      className={park ? "fill-emerald-500/18 dark:fill-emerald-400/10" : "fill-foreground/[0.035]"}
                      height={y1 - y0 - 26}
                      key={`${x0}-${y0}`}
                      rx={park ? 18 : 8}
                      width={x1 - x0 - 26}
                      x={x0 + 13}
                      y={y0 + 13}
                    />
                  );
                }),
              )}
              {[
                [118, 108, 50, 38],
                [178, 108, 44, 60],
                [418, 108, 60, 44],
                [490, 108, 52, 30],
                [578, 238, 40, 40],
                [658, 238, 46, 30],
                [118, 378, 56, 46],
                [258, 378, 70, 36],
                [418, 378, 40, 50],
                [470, 378, 72, 30],
                [578, 378, 60, 44],
                [258, 518, 60, 40],
                [578, 518, 56, 44],
                [418, 518, 44, 50],
                [738, 108, 46, 70],
              ].map(([x, y, w, h]) => (
                <rect className="fill-foreground/[0.04]" height={h} key={`${x}-${y}`} rx={4} width={w} x={x} y={y} />
              ))}
              {[
                [282, 130],
                [310, 150],
                [350, 128],
                [336, 182],
                [270, 180],
                [372, 168],
              ].map(([x, y]) => (
                <circle className="fill-emerald-500/30 dark:fill-emerald-400/20" cx={x} cy={y} key={`${x}-${y}`} r={9} />
              ))}
              <path
                className="fill-none stroke-sky-400/35 dark:stroke-sky-400/18"
                d="M-20 310 C 120 270, 220 330, 360 296 S 600 262, 820 300"
                strokeLinecap="round"
                strokeWidth={34}
              />
              <g className="fill-none stroke-background" strokeLinecap="round">
                {xs.slice(1, -1).map((x) => (
                  <line key={`v${x}`} strokeWidth={x === 400 || x === 560 ? 20 : 13} x1={x} x2={x} y1={-10} y2={H + 10} />
                ))}
                {ys.slice(1, -1).map((y) => (
                  <line key={`h${y}`} strokeWidth={y === 500 || y === 360 || y === 220 ? 20 : 13} x1={-10} x2={W + 10} y1={y} y2={y} />
                ))}
                <line strokeWidth={11} x1={640} x2={640} y1={220} y2={128} />
              </g>
              <g className="fill-muted-foreground font-medium" fontSize={11} letterSpacing={0.4}>
                <text x={18} y={492}>
                  HARBOR ST
                </text>
                <text transform="translate(392 590) rotate(-90)">LINDEN AVE</text>
                <text x={436} y={212}>
                  ALDER ROW
                </text>
                <text x={420} y={352}>
                  QUAY RD
                </text>
                <text className="fill-emerald-700/70 dark:fill-emerald-300/60" fontSize={10} x={262} y={208}>
                  FERNWOOD PARK
                </text>
                <text className="fill-sky-700/60 italic dark:fill-sky-300/50" fontSize={11} x={60} y={296}>
                  Calder River
                </text>
              </g>
              <path className="fill-none stroke-background" d={ROUTE} strokeLinecap="round" strokeLinejoin="round" strokeWidth={13} />
              <path
                className="fill-none stroke-info"
                d={ROUTE}
                ref={routeRef}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={6}
              />
              <motion.path
                className="fill-none stroke-muted-foreground"
                d={ROUTE}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={6}
                style={{ pathLength: progress }}
              />
              <g
                ref={(el) => {
                  pinsRef.current[0] = el;
                }}
                transform={`translate(${START.x} ${START.y})`}
              >
                <circle className="fill-card stroke-border" r={15} strokeWidth={1.5} />
                <StoreIcon className="text-foreground" height={14} width={14} x={-7} y={-7} />
              </g>
              <g
                ref={(el) => {
                  pinsRef.current[1] = el;
                }}
                transform={`translate(${END.x} ${END.y})`}
              >
                {!delivered && (
                  <motion.circle
                    animate={{ scale: [1, 2], opacity: [0.35, 0] }}
                    className="fill-foreground motion-reduce:hidden"
                    r={16}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
                  />
                )}
                <circle className="fill-foreground stroke-background" r={16} strokeWidth={3} />
                <HouseIcon className="text-background" height={15} width={15} x={-7.5} y={-7.5} />
              </g>
              <g ref={courierRef}>
                <circle className="fill-info/20" r={24} />
                <circle className="fill-info stroke-background" r={16} strokeWidth={3} />
                <BikeIcon className="text-white" height={16} width={16} x={-8} y={-8} />
              </g>
            </g>
          </svg>

          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <span className="flex h-7 items-center gap-2 rounded-full border bg-popover/90 px-2.5 text-xs shadow-xs/5 backdrop-blur-sm">
              <span className="relative flex size-2">
                {!delivered && (
                  <span className="absolute inset-0 animate-ping motion-reduce:hidden rounded-full bg-success opacity-60 [animation-duration:1.6s]" />
                )}
                <span className={cn("relative size-2 rounded-full", delivered ? "bg-muted-foreground" : "bg-success")} />
              </span>
              {delivered ? "Delivered" : "Live"}
            </span>
          </div>
          <div className="absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-xl border bg-popover shadow-xs/5">
            <button
              aria-label="Zoom in on courier"
              className="flex size-9 cursor-pointer items-center justify-center text-foreground outline-none transition-colors hover:bg-accent focus-visible:bg-accent disabled:cursor-default disabled:opacity-40"
              disabled={zoomIdx === ZOOMS.length - 1}
              onClick={() => setZoomIdx((z) => Math.min(ZOOMS.length - 1, z + 1))}
              type="button"
            >
              <PlusIcon className="size-4" />
            </button>
            <span className="h-px bg-border" />
            <button
              aria-label="Zoom out"
              className="flex size-9 cursor-pointer items-center justify-center text-foreground outline-none transition-colors hover:bg-accent focus-visible:bg-accent disabled:cursor-default disabled:opacity-40"
              disabled={zoomIdx === 0}
              onClick={() => setZoomIdx((z) => Math.max(0, z - 1))}
              type="button"
            >
              <MinusIcon className="size-4" />
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto border-t @3xl:w-[380px] @3xl:flex-none @3xl:border-t-0 @3xl:border-l">
          <div className="flex flex-col gap-4 p-4 @3xl:p-5">
            <section aria-live="polite" className="flex flex-col gap-3">
              <AnimatePresence initial={false} mode="popLayout">
                {delivered ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-1"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    key="done"
                    transition={{ duration: 0.25, ease: easeOut }}
                  >
                    <span className="text-muted-foreground text-xs">Delivered at {arrival}</span>
                    <span className="flex items-center gap-2 font-heading font-semibold text-3xl tracking-tight">
                      Enjoy your order
                      <span className="flex size-6 items-center justify-center rounded-full bg-success text-white">
                        <CheckIcon className="size-4" />
                      </span>
                    </span>
                    <span className="text-muted-foreground">{note ? "Left with the concierge." : "Handed over at the door."}</span>
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-1"
                    exit={{ opacity: 0, y: -6 }}
                    initial={{ opacity: 0 }}
                    key="eta"
                    transition={{ duration: 0.2, ease: easeOut }}
                  >
                    <span className="text-muted-foreground text-xs">Arriving by {arrival}</span>
                    <span className="font-heading font-semibold text-3xl tracking-tight">
                      <Tween value={minutes} /> min
                    </span>
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        className="text-muted-foreground"
                        exit={{ opacity: 0, filter: "blur(2px)" }}
                        initial={{ opacity: 0, filter: "blur(2px)" }}
                        key={phase}
                        transition={{ duration: 0.2 }}
                      >
                        {phase}
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
              <ol aria-label="Order progress" className="grid grid-cols-4 gap-1.5">
                {stages.map((s, i) => (
                  <li className="flex flex-col gap-1.5" key={s}>
                    <span className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                      <motion.span
                        animate={{ scaleX: i < stage ? 1 : i === stage ? (delivered ? 1 : 0.6) : 0 }}
                        className={cn("absolute inset-0 origin-left rounded-full", delivered ? "bg-success" : "bg-info")}
                        initial={false}
                        transition={reduce ? { duration: 0 } : { duration: 0.4, ease: easeOut }}
                      />
                    </span>
                    <span
                      aria-current={i === stage ? "step" : undefined}
                      className={cn("truncate text-xs", i <= stage ? "text-foreground" : "text-muted-foreground")}
                    >
                      {s}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <section aria-label="Your courier" className={cn(card, "flex flex-col gap-3 p-3")}>
              <div className="flex items-center gap-3">
                <Avatar className="[--avatar-size:--spacing(11)]">
                  <AvatarFallback className="bg-gradient-to-br from-teal-400 to-sky-500 font-semibold text-sm text-white">
                    {initials(courier.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium">{courier.name}</span>
                  <span className="flex items-center gap-1 truncate text-muted-foreground text-xs">
                    <StarIcon aria-hidden className="size-3 fill-amber-400 text-amber-400" />
                    <span className="text-foreground tabular-nums">{courier.rating.toFixed(1)}</span>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">{courier.trips.toLocaleString("en-US")}</span> trips
                    <span aria-hidden>·</span>
                    <span className="truncate">{courier.vehicle}</span>
                  </span>
                </div>
              </div>
              <AnimatePresence initial={false} mode="popLayout">
                {delivered ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3 border-t pt-3"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    key="rate"
                    transition={{ duration: 0.25, ease: easeOut, delay: 0.1 }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">How was {first}?</span>
                      <div aria-label="Rate your courier" className="flex" role="radiogroup">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            aria-checked={rating === n}
                            aria-label={`${n} star${n > 1 ? "s" : ""}`}
                            className={cn(
                              "flex size-8 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              press,
                            )}
                            key={n}
                            onClick={() => setRating(n)}
                            role="radio"
                            type="button"
                          >
                            <motion.span
                              animate={{ scale: rating >= n ? 1 : 0.9 }}
                              transition={{ type: "spring", stiffness: 600, damping: 20, delay: rating >= n ? (n - 1) * 0.03 : 0 }}
                            >
                              <StarIcon
                                className={cn(
                                  "size-5 transition-colors duration-150",
                                  rating >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/60",
                                )}
                              />
                            </motion.span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">Add a tip</span>
                      <div className="ms-auto flex gap-1.5">
                        {[2, 3, 5].map((amt) => (
                          <button
                            aria-pressed={tip === amt}
                            className={cn(
                              "h-8 min-w-12 cursor-pointer rounded-full border px-3 font-medium text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              press,
                              tip === amt ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
                            )}
                            key={amt}
                            onClick={() => setTip((t) => (t === amt ? null : amt))}
                            type="button"
                          >
                            ${amt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <AnimatePresence initial={false}>
                      {(rating > 0 || tip) && (
                        <motion.p
                          animate={{ opacity: 1, height: "auto" }}
                          className="overflow-hidden text-success-foreground text-xs"
                          exit={{ opacity: 0, height: 0 }}
                          initial={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: easeOut }}
                        >
                          Thanks. {tip ? `All $${tip} goes to ${first}.` : `${first} will see your rating.`}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-2 gap-2"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key="contact"
                    transition={{ duration: 0.15 }}
                  >
                    <Button className={press} onClick={() => setChat(true)} ref={chatBtnRef} variant="outline">
                      <MessageCircleIcon /> Message
                    </Button>
                    <Button className={press} render={<a href={`tel:${courier.phone}`} />} variant="outline">
                      <PhoneIcon /> Call
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <section aria-labelledby={`${uid}-drop`} className={cn(card, "flex flex-col gap-2 p-3")}>
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <HouseIcon className="size-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-muted-foreground text-xs" id={`${uid}-drop`}>
                    Drop-off
                  </span>
                  <span className="truncate font-medium">{address}</span>
                </div>
                {!editing && !delivered && (
                  <Button
                    aria-label="Edit delivery note"
                    className={press}
                    onClick={() => {
                      setDraft(note);
                      setEditing(true);
                    }}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <PencilIcon />
                  </Button>
                )}
              </div>
              <AnimatePresence initial={false} mode="popLayout">
                {editing ? (
                  <motion.form
                    animate={{ opacity: 1 }}
                    className="flex flex-col gap-2"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key="edit"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditing(false);
                    }}
                    onSubmit={(e: FormEvent) => {
                      e.preventDefault();
                      setNote(draft.trim());
                      setEditing(false);
                    }}
                    transition={{ duration: 0.15 }}
                  >
                    <Textarea
                      aria-label="Note for the courier"
                      autoFocus
                      maxLength={140}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Gate code, where to leave it…"
                      rows={2}
                      value={draft}
                    />
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => setEditing(false)} size="sm" variant="ghost">
                        Cancel
                      </Button>
                      <Button className={press} size="sm" type="submit">
                        Save note
                      </Button>
                    </div>
                  </motion.form>
                ) : (
                  <motion.p
                    animate={{ opacity: 1 }}
                    className={cn("rounded-lg bg-muted/60 px-3 py-2 text-xs", !note && "text-muted-foreground")}
                    initial={{ opacity: 0 }}
                    key="note"
                    transition={{ duration: 0.15 }}
                  >
                    {note || "No note for the courier."}
                  </motion.p>
                )}
              </AnimatePresence>
            </section>

            <section aria-labelledby={`${uid}-items`} className={cn(card, "p-3")}>
              <div className="flex items-baseline justify-between gap-2 px-1">
                <h3 className="font-medium" id={`${uid}-items`}>
                  {items.reduce((s, i) => s + i.qty, 0)} items from {storeName}
                </h3>
              </div>
              <ul className="mt-2 flex flex-col">
                {items.map((i) => (
                  <li className="flex items-center gap-3 px-1 py-1.5" key={i.id}>
                    <ItemArt art={i.art} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{i.name}</span>
                      <span className="truncate text-muted-foreground text-xs">
                        {i.qty > 1 ? `${i.qty} × ` : ""}
                        {i.detail}
                      </span>
                    </div>
                    <span className="tabular-nums">${(i.price * i.qty).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-2 flex flex-col gap-1.5 border-t px-1 pt-3 text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Items</dt>
                  <dd className="tabular-nums">${itemsTotal.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivery</dt>
                  <dd className="tabular-nums">${fee.toFixed(2)}</dd>
                </div>
                <AnimatePresence initial={false}>
                  {tip ? (
                    <motion.div
                      animate={{ opacity: 1, height: "auto" }}
                      className="overflow-hidden"
                      exit={{ opacity: 0, height: 0 }}
                      initial={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: easeOut }}
                    >
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Tip for {first}</dt>
                        <dd className="tabular-nums">${tip.toFixed(2)}</dd>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <div className="flex justify-between font-medium text-sm">
                  <dt>Paid</dt>
                  <dd className="tabular-nums">${(itemsTotal + fee + (tip ?? 0)).toFixed(2)}</dd>
                </div>
              </dl>
            </section>

            {delivered && (
              <Button className={cn("self-center", press)} onClick={() => setRun((r) => r + 1)} size="sm" variant="ghost">
                <RotateCcwIcon /> Watch the delivery again
              </Button>
            )}
          </div>
        </div>
      </div>

      <CourierChat
        courier={courier}
        onClose={() => {
          setChat(false);
          chatBtnRef.current?.focus();
        }}
        open={chat && !delivered}
        storeName={storeName}
      />
    </div>
  );
}

type Msg = { id: number; from: "me" | "them"; text: string; time: string };

function CourierChat({
  open,
  courier,
  storeName,
  onClose,
}: {
  open: boolean;
  courier: DeliveryCourier;
  storeName: string;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const first = courier.name.split(" ")[0];
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 1, from: "them", text: `Hi! Picked up your order from ${storeName} and I’m on my way.`, time: "7:26 pm" },
  ]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(2);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (open) {
      const f = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(f);
    }
  }, [open]);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [msgs, typing, reduce]);

  const reply = (q: string) => {
    const s = q.toLowerCase();
    if (s.includes("door")) return "No problem, I’ll leave it by the door and send a photo.";
    if (s.includes("bell") || s.includes("ring")) return "Will do, I’ll ring when I’m outside.";
    if (s.includes("down") || s.includes("coming")) return "Great, see you downstairs in a few minutes.";
    return "Got it, thanks!";
  };

  const send = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    setMsgs((m) => [...m, { id: nextId.current++, from: "me", text: t, time: "Now" }]);
    setText("");
    timers.current.push(setTimeout(() => setTyping(true), 500));
    timers.current.push(
      setTimeout(() => {
        setTyping(false);
        setMsgs((m) => [...m, { id: nextId.current++, from: "them", text: reply(t), time: "Now" }]);
      }, 1700),
    );
  };

  const quick = ["Leave it at the door", "Please ring the bell", "I’m coming down"];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            animate={{ opacity: 1 }}
            aria-hidden
            className="absolute inset-0 z-40 bg-black/32"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: 0.2, ease: easeOut }}
          />
          <motion.div
            animate={{ y: 0 }}
            aria-label={`Chat with ${first}`}
            aria-modal
            className="absolute inset-x-0 top-16 bottom-0 z-50 flex flex-col rounded-t-2xl border-t bg-popover text-popover-foreground shadow-lg/10 @3xl:top-14 @3xl:left-auto @3xl:w-[380px] @3xl:rounded-none @3xl:border-t-0 @3xl:border-l"
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
            role="dialog"
            transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 440, damping: 42 }}
          >
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Avatar className="[--avatar-size:--spacing(8)]">
                <AvatarFallback className="bg-gradient-to-br from-teal-400 to-sky-500 font-semibold text-white text-xs">
                  {initials(courier.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{first}</span>
                <span className="text-muted-foreground text-xs">Your courier · replies fast</span>
              </div>
              <Button onClick={onClose} size="sm" variant="ghost">
                Done
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-4" ref={listRef}>
              <p className="mb-1 text-center text-muted-foreground text-xs">Messages go through the app. Your number stays private.</p>
              <AnimatePresence initial={false}>
                {msgs.map((m) => (
                  <motion.div
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn("flex max-w-[80%] flex-col gap-0.5", m.from === "me" ? "items-end self-end" : "items-start self-start")}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
                    key={m.id}
                    style={{ transformOrigin: m.from === "me" ? "100% 100%" : "0% 100%" }}
                    transition={spring}
                  >
                    <span
                      className={cn(
                        "rounded-2xl px-3 py-2 text-pretty",
                        m.from === "me" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted",
                      )}
                    >
                      {m.text}
                    </span>
                    <span className="px-1 text-[11px] text-muted-foreground">{m.time}</span>
                  </motion.div>
                ))}
                {typing && (
                  <motion.div
                    animate={{ opacity: 1 }}
                    aria-label={`${first} is typing`}
                    className="flex h-9 w-14 items-center justify-center gap-1 self-start rounded-2xl rounded-bl-md bg-muted"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key="typing"
                    role="status"
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
                        className="size-1.5 rounded-full bg-muted-foreground"
                        key={i}
                        transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, delay: i * 0.15, ease: "linear" }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex flex-col gap-2 border-t p-3">
              <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 [scrollbar-width:none]">
                {quick.map((q) => (
                  <button
                    className={cn(
                      "h-8 shrink-0 cursor-pointer rounded-full border bg-background px-3 text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                      press,
                    )}
                    key={q}
                    onClick={() => send(q)}
                    type="button"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(text);
                }}
              >
                <Input
                  aria-label={`Message ${first}`}
                  className="flex-1"
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Message ${first}`}
                  ref={inputRef}
                  value={text}
                />
                <Button aria-label="Send" className={press} disabled={!text.trim()} size="icon" type="submit">
                  <SendIcon />
                </Button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
