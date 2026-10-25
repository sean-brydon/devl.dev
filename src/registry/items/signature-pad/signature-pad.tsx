"use client";

import { BadgeCheckIcon, EraserIcon, PenLineIcon, Undo2Icon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number; w: number };
type Stroke = Point[];

const MIN_W = 1.1;
const MAX_W = 3.4;

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, from = 0) {
  if (stroke.length === 1) {
    const p = stroke[0];
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.w / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  for (let i = Math.max(1, from); i < stroke.length; i++) {
    const a = stroke[i - 1];
    const b = stroke[i];
    const before = stroke[i - 2] ?? a;
    const start = { x: (before.x + a.x) / 2, y: (before.y + a.y) / 2 };
    const end = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(i === 1 ? a.x : start.x, i === 1 ? a.y : start.y);
    ctx.quadraticCurveTo(a.x, a.y, end.x, end.y);
    ctx.lineWidth = (a.w + b.w) / 2;
    ctx.stroke();
  }
}

export interface SignaturePadProps {
  signer: string;
  label?: string;
  onSign?: (png: string, signedAt: Date) => void;
  onClear?: () => void;
  className?: string;
}

export function SignaturePad({ signer, label = "Signature", onSign, onClear, className }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const typedInk = useRef<{ text: string; font: string; x: number; y: number } | null>(null);
  const typedRef = useRef<HTMLInputElement>(null);
  const live = useRef<{ stroke: Stroke; t: number; id: number } | null>(null);
  const [count, setCount] = useState(0);
  const [signedAt, setSignedAt] = useState<Date | null>(null);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState(signer);
  const reduce = useReducedMotion();
  const id = useId();

  const ctx = useCallback(() => {
    const canvas = canvasRef.current;
    const c = canvas?.getContext("2d");
    if (!canvas || !c) return null;
    const color = getComputedStyle(canvas).color;
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineCap = "round";
    c.lineJoin = "round";
    return c;
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const c = ctx();
    if (!canvas || !c) return;
    c.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of strokes.current) drawStroke(c, s);
    if (typedInk.current) {
      c.font = typedInk.current.font;
      c.textBaseline = "middle";
      c.fillText(typedInk.current.text, typedInk.current.x, typedInk.current.y);
    }
  }, [ctx]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(box.clientWidth * dpr);
      canvas.height = Math.round(box.clientHeight * dpr);
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    };
    resize();
    const sizes = new ResizeObserver(resize);
    sizes.observe(box);
    const theme = new MutationObserver(redraw);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    return () => {
      sizes.disconnect();
      theme.disconnect();
    };
  }, [redraw]);

  const onSignRef = useRef(onSign);
  onSignRef.current = onSign;
  useEffect(() => {
    redraw();
    if (!signedAt) return;
    const png = canvasRef.current?.toDataURL("image/png");
    if (png) onSignRef.current?.(png, signedAt);
  }, [signedAt, redraw]);

  const point = (
    canvas: HTMLCanvasElement,
    e: { clientX: number; clientY: number; pointerType: string; pressure: number },
    prev?: Point,
    dt = 16,
  ): Point => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let target: number;
    if (e.pointerType === "pen" && e.pressure > 0) {
      target = MIN_W + (MAX_W - MIN_W) * Math.min(e.pressure * 1.4, 1);
    } else {
      const speed = prev ? Math.hypot(x - prev.x, y - prev.y) / Math.max(dt, 1) : 0;
      target = Math.max(MIN_W, MAX_W - speed * 1.5);
    }
    return { x, y, w: prev ? prev.w * 0.65 + target * 0.35 : target * 0.8 };
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (signedAt || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const stroke: Stroke = [point(event.currentTarget, event)];
    live.current = { stroke, t: performance.now(), id: event.pointerId };
    strokes.current.push(stroke);
    const c = ctx();
    if (c) drawStroke(c, stroke);
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const l = live.current;
    if (!l || l.id !== event.pointerId) return;
    const events = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
    const c = ctx();
    for (const e of events) {
      const now = performance.now();
      const prev = l.stroke[l.stroke.length - 1];
      const p = point(event.currentTarget, e, prev, now - l.t);
      if (Math.hypot(p.x - prev.x, p.y - prev.y) < 1.2) continue;
      l.t = now;
      l.stroke.push(p);
      if (c) drawStroke(c, l.stroke, l.stroke.length - 1);
    }
  };

  const onPointerUp = () => {
    if (!live.current) return;
    live.current = null;
    setCount(strokes.current.length);
  };

  const undo = () => {
    strokes.current.pop();
    setCount(strokes.current.length);
    redraw();
  };

  const clear = () => {
    strokes.current = [];
    typedInk.current = null;
    setMode("draw");
    setCount(0);
    setSignedAt(null);
    redraw();
    onClear?.();
  };

  const sign = () => {
    if (mode === "type") {
      strokes.current = [];
      const input = typedRef.current;
      const box = boxRef.current?.getBoundingClientRect();
      if (input && box) {
        const style = getComputedStyle(input);
        const r = input.getBoundingClientRect();
        typedInk.current = {
          text: typed.trim(),
          font: `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
          x: r.left - box.left + Number.parseFloat(style.paddingLeft) - 1,
          y: r.top - box.top + r.height / 2 + 2,
        };
      }
    }
    setSignedAt(new Date());
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && count && !signedAt) {
      event.preventDefault();
      undo();
    }
  };

  const empty = mode === "draw" ? count === 0 : !typed.trim();
  const when = signedAt
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(signedAt)
    : "";

  return (
    <div className={cn("grid w-full gap-2", className)} onKeyDown={onKeyDown}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-sm" id={`${id}-label`}>
          {label}
        </span>
        {!signedAt && (
          <button
            className="cursor-pointer rounded-sm text-muted-foreground text-xs underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              setMode((m) => (m === "draw" ? "type" : "draw"));
            }}
            type="button"
          >
            {mode === "draw" ? "Type it instead" : "Draw it instead"}
          </button>
        )}
      </div>
      <div
        className={cn(
          "relative h-40 overflow-hidden rounded-xl border bg-background not-dark:bg-clip-padding shadow-xs/5 ring-ring/24 transition-[border-color,box-shadow] duration-300 has-focus-visible:border-ring has-focus-visible:ring-[3px] dark:bg-input/32",
          signedAt ? "border-info/40" : "border-input",
        )}
        ref={boxRef}
      >
        <div aria-hidden className="pointer-events-none absolute inset-x-5 bottom-9 flex items-end gap-2 text-muted-foreground/60">
          <span className="-mb-1 text-base leading-none">×</span>
          <span className="h-px flex-1 bg-[repeating-linear-gradient(to_right,currentColor_0_6px,transparent_6px_10px)]" />
        </div>
        <AnimatePresence>
          {empty && mode === "draw" && (
            <motion.span
              animate={{ opacity: 1 }}
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-12 flex items-center justify-center gap-1.5 text-muted-foreground text-sm"
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              initial={{ opacity: 0 }}
            >
              <PenLineIcon className="size-4" />
              Sign with a finger, mouse or pen
            </motion.span>
          )}
        </AnimatePresence>
        <canvas
          aria-label={signedAt ? `Signature by ${signer}, signed ${when}` : `Signature pad for ${signer}${empty ? ", empty" : ""}`}
          className={cn(
            "absolute inset-0 size-full touch-none",
            signedAt ? "cursor-default text-info-foreground" : "cursor-crosshair text-foreground",
            mode === "type" && !signedAt && "pointer-events-none opacity-0",
          )}
          onPointerCancel={onPointerUp}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          ref={canvasRef}
          role="img"
        />
        {mode === "type" && !signedAt && (
          <input
            aria-label="Type your full name"
            autoFocus
            className="absolute inset-x-5 bottom-10 h-10 pl-5 bg-transparent font-serif text-3xl text-foreground italic outline-none placeholder:text-muted-foreground/40"
            onChange={(event) => setTyped(event.target.value)}
            placeholder="Your full name"
            ref={typedRef}
            value={typed}
          />
        )}
        <AnimatePresence>
          {signedAt && (
            <motion.div
              animate={{ opacity: 1, scale: 1, rotate: -4 }}
              className="pointer-events-none absolute top-3 right-3 flex items-center gap-1 rounded-md border border-info/30 bg-info/8 px-2 py-1 font-medium text-[11px] text-info-foreground uppercase tracking-wide"
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
              initial={reduce ? { opacity: 0, rotate: -4 } : { opacity: 0, scale: 1.25, rotate: -4 }}
              transition={{ type: "spring", stiffness: 520, damping: 26 }}
            >
              <BadgeCheckIcon className="size-3.5" />
              Signed
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex min-h-8 items-center justify-between gap-2">
        {signedAt ? (
          <p className="truncate text-muted-foreground text-xs tabular-nums">
            Signed by <span className="text-foreground">{signer}</span> · {when}
          </p>
        ) : (
          <div className="flex items-center gap-1">
            <Button aria-label="Undo last stroke" disabled={count === 0 || mode === "type"} onClick={undo} size="icon-sm" variant="ghost">
              <Undo2Icon />
            </Button>
            <Button aria-label="Clear signature" disabled={count === 0 || mode === "type"} onClick={clear} size="icon-sm" variant="ghost">
              <EraserIcon />
            </Button>
          </div>
        )}
        {signedAt ? (
          <Button onClick={clear} size="sm" variant="ghost">
            Sign again
          </Button>
        ) : (
          <Button disabled={empty} onClick={sign} size="sm">
            Adopt and sign
          </Button>
        )}
      </div>
    </div>
  );
}
