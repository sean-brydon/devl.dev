"use client";

import { CheckIcon, CopyIcon, TriangleAlertIcon } from "lucide-react";
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

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

const MAX_C = 0.37;

function oklchToLinear({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const lc = l + 0.3963377774 * a + 0.2158037573 * b;
  const mc = l - 0.1055613458 * a - 0.0638541728 * b;
  const sc = l - 0.0894841775 * a - 1.291485548 * b;
  // NaN, not a clamp: the matrix would fold negative cone responses into a fake in-gamut patch near black.
  if (lc < 0 || mc < 0 || sc < 0) return [Number.NaN, Number.NaN, Number.NaN];
  const l_ = lc ** 3;
  const m_ = mc ** 3;
  const s_ = sc ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const encode = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const decode = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const inGamut = (rgb: number[]) => rgb.every((v) => v >= -0.00002 && v <= 1.00002);

function toGamut(colour: Oklch): Oklch {
  if (inGamut(oklchToLinear(colour))) return colour;
  let lo = 0;
  let hi = colour.c;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToLinear({ ...colour, c: mid }))) lo = mid;
    else hi = mid;
  }
  return { ...colour, c: lo };
}

function toHex(colour: Oklch) {
  const rgb = oklchToLinear(toGamut(colour)).map((v) => Math.round(Math.min(Math.max(encode(v), 0), 1) * 255));
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function fromHex(hex: string): Oklch | null {
  const m = hex.trim().replace(/^#/, "");
  const full = m.length === 3 ? [...m].map((ch) => ch + ch).join("") : m;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => decode(Number.parseInt(full.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s;
  const c = Math.sqrt(A * A + B * B);
  const h = c < 0.0001 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

function parse(text: string): Oklch | null {
  const m = text.trim().match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*[\d.%]+\s*)?\)$/i);
  if (m) {
    const l = Number(m[1]) / (m[2] ? 100 : 1);
    return { l: clamp(l, 0, 1), c: clamp(Number(m[3]), 0, MAX_C), h: Number(m[4]) % 360 };
  }
  return fromHex(text);
}

function luminance(colour: Oklch) {
  const [r, g, b] = oklchToLinear(toGamut(colour)).map((v) => clamp(v, 0, 1));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const css = ({ l, c, h }: Oklch) => `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
const grade = (ratio: number) => (ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA Large" : "Fail");

export interface ColourFieldProps {
  value?: Oklch;
  defaultValue?: Oklch;
  onValueChange?: (colour: Oklch) => void;
  label?: string;
  className?: string;
}

export function ColourField({
  value: valueProp,
  defaultValue = { l: 0.62, c: 0.19, h: 259 },
  onValueChange,
  label = "Colour",
  className,
}: ColourFieldProps) {
  const [inner, setInner] = useState(defaultValue);
  const colour = valueProp ?? inner;
  const [draft, setDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState<"oklch" | "hex" | null>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const reduce = useReducedMotion();
  const id = useId();

  const set = useCallback(
    (next: Oklch) => {
      if (valueProp === undefined) setInner(next);
      onValueChange?.(next);
    },
    [valueProp, onValueChange],
  );

  useLayoutEffect(() => {
    const el = planeRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.w) return;
    const frame = requestAnimationFrame(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(size.w * dpr);
      const h = Math.round(size.h * dpr);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const image = ctx.createImageData(w, h);
      const data = image.data;
      for (let y = 0; y < h; y++) {
        const l = 1 - y / (h - 1);
        for (let x = 0; x < w; x++) {
          const rgb = oklchToLinear({ l, c: (x / (w - 1)) * MAX_C, h: colour.h });
          if (!inGamut(rgb)) continue;
          const i = (y * w + x) * 4;
          data[i] = encode(clamp(rgb[0], 0, 1)) * 255;
          data[i + 1] = encode(clamp(rgb[1], 0, 1)) * 255;
          data[i + 2] = encode(clamp(rgb[2], 0, 1)) * 255;
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [colour.h, size.w, size.h]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 1400);
    return () => window.clearTimeout(t);
  }, [copied]);

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    set({ ...colour, l: 1 - y, c: x * MAX_C });
  };

  const onPlaneKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const big = event.shiftKey ? 5 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-0.005, 0],
      ArrowRight: [0.005, 0],
      ArrowUp: [0, 0.01],
      ArrowDown: [0, -0.01],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    set({ ...colour, c: clamp(colour.c + move[0] * big, 0, MAX_C), l: clamp(colour.l + move[1] * big, 0, 1) });
  };

  const copy = async (kind: "oklch" | "hex") => {
    try {
      await navigator.clipboard.writeText(kind === "hex" ? toHex(colour) : css(colour));
    } catch {
    }
    setCopied(kind);
  };

  const shown = toGamut(colour);
  const invalid = draft !== null && draft.trim() !== "" && !parse(draft);
  const outside = shown.c < colour.c - 0.0005;
  const lum = luminance(colour);
  const onWhite = 1.05 / (lum + 0.05);
  const onBlack = (lum + 0.05) / 0.05;
  const hueStops = Array.from({ length: 13 }, (_, i) => `oklch(0.72 0.14 ${i * 30})`).join(", ");

  return (
    <div className={cn("grid w-full gap-3", className)}>
      <div className="flex items-baseline justify-between">
        <span className="font-medium text-sm" id={`${id}-label`}>
          {label}
        </span>
        <span className="font-mono text-muted-foreground text-xs tabular-nums">{toHex(colour)}</span>
      </div>

      <div
        aria-label="Lightness and chroma"
        aria-valuetext={`Lightness ${Math.round(colour.l * 100)}%, chroma ${colour.c.toFixed(3)}`}
        className="relative h-44 cursor-crosshair touch-none select-none rounded-xl bg-[repeating-linear-gradient(135deg,var(--color-muted)_0_6px,transparent_6px_12px)] outline-none ring-1 ring-border ring-inset focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={onPlaneKey}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pick(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event);
        }}
        ref={planeRef}
        role="slider"
        tabIndex={0}
      >
        <canvas aria-hidden className="absolute inset-0 size-full rounded-xl" ref={canvasRef} />
        <span className="pointer-events-none absolute top-2 right-2.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
          Outside sRGB
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_white,0_0_0_3px_rgb(0_0_0/0.2),0_2px_6px_rgb(0_0_0/0.25)]"
          style={{ left: `${(colour.c / MAX_C) * 100}%`, top: `${(1 - colour.l) * 100}%`, background: css(shown) }}
        />
      </div>

      <div className="relative -my-2 h-8">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full ring-1 ring-border ring-inset" style={{ background: `linear-gradient(to right, ${hueStops})` }} />
        <input
          aria-label="Hue"
          aria-valuetext={`${Math.round(colour.h)} degrees`}
          className="peer absolute inset-0 z-10 w-full cursor-pointer appearance-none opacity-0 [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:w-4 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none"
          max={360}
          min={0}
          onChange={(event) => set({ ...colour, h: Number(event.target.value) })}
          step={1}
          type="range"
          value={Math.round(colour.h)}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_white,0_0_0_3px_rgb(0_0_0/0.2),0_2px_6px_rgb(0_0_0/0.25)] peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-4 peer-focus-visible:ring-offset-background"
          style={{ left: `calc(8px + ${colour.h / 360} * (100% - 16px))`, background: `oklch(0.72 0.14 ${colour.h})` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="size-9 shrink-0 rounded-lg ring-1 ring-border ring-inset" style={{ background: css(shown) }} />
        <label className="sr-only" htmlFor={`${id}-text`}>
          Colour value
        </label>
        <input
          aria-describedby={`${id}-hint`}
          aria-invalid={invalid || undefined}
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 font-mono text-xs tabular-nums shadow-xs/5 outline-none ring-ring/24 transition-shadow focus-visible:border-ring focus-visible:ring-[3px] aria-invalid:border-destructive/40 dark:bg-input/32"
          id={`${id}-text`}
          onBlur={() => {
            const parsed = draft !== null ? parse(draft) : null;
            if (parsed) set(parsed);
            setDraft(null);
          }}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraft(null);
              event.currentTarget.blur();
            }
          }}
          spellCheck={false}
          value={draft ?? css(colour)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Contrast background="white" colour={css(shown)} ratio={onWhite} />
        <Contrast background="black" colour={css(shown)} ratio={onBlack} />
      </div>

      <div aria-live="polite" className="flex h-4 min-w-0 items-center gap-1.5 text-muted-foreground text-xs" id={`${id}-hint`}>
        {invalid ? (
          <span className="truncate text-destructive-foreground">Try a hex like #3B82F6 or oklch(62% 0.19 259).</span>
        ) : outside ? (
          <>
            <TriangleAlertIcon className="size-3.5 shrink-0 text-warning-foreground" />
            <span className="truncate">Outside sRGB, so hex uses the nearest match.</span>
          </>
        ) : (
          <span className="truncate">Arrow keys nudge it. Paste a hex to start from one.</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["oklch", "hex"] as const).map((kind) => (
          <Button key={kind} onClick={() => copy(kind)} size="sm" variant="outline">
            <span className="relative size-4">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  className="absolute inset-0 flex items-center justify-center"
                  exit={{ opacity: 0, scale: 0.6, filter: "blur(2px)" }}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(2px)" }}
                  key={copied === kind ? "done" : "copy"}
                  transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                >
                  {copied === kind ? <CheckIcon className="text-success-foreground" /> : <CopyIcon />}
                </motion.span>
              </AnimatePresence>
            </span>
            {copied === kind ? "Copied" : `Copy ${kind === "hex" ? "hex" : "OKLCH"}`}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Contrast({ background, colour, ratio }: { background: "white" | "black"; colour: string; ratio: number }) {
  const g = grade(ratio);
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 ring-1 ring-inset",
        background === "white" ? "bg-white ring-black/10" : "bg-black ring-white/10",
      )}
    >
      <span className="font-semibold text-lg leading-none" style={{ color: colour }}>
        Aa
        <span className="sr-only"> on {background}</span>
      </span>
      <span className="grid justify-items-end gap-0.5">
        <span className={cn("font-mono text-xs tabular-nums", background === "white" ? "text-neutral-900" : "text-neutral-100")}>
          {ratio.toFixed(2)}:1
        </span>
        <span
          className={cn(
            "font-medium text-[10px] uppercase tracking-wide",
            g === "Fail" ? "text-red-500" : background === "white" ? "text-neutral-500" : "text-neutral-400",
          )}
        >
          {g === "Fail" ? "Fails" : g}
        </span>
      </span>
    </div>
  );
}
