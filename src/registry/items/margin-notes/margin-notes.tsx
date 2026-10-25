"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export type MarkType = "circle" | "underline" | "double" | "box" | "strike";
export type MarkTone = "red" | "blue" | "amber" | "green" | "ink";

const tones: Record<MarkTone, string> = {
  red: "text-rose-500 dark:text-rose-400",
  blue: "text-sky-600 dark:text-sky-400",
  amber: "text-amber-500 dark:text-amber-400",
  green: "text-emerald-600 dark:text-emerald-400",
  ink: "text-foreground",
};

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };
type MarkEntry = { el: HTMLElement; type: MarkType; tone: MarkTone; note?: string };
type Stroke = { key: string; d: string; delay: number; duration: number; tone: MarkTone };
type Drawing = { strokes: Stroke[]; notes: Record<string, number> };

interface MarginNotesContext {
  prefix: string;
  tone: MarkTone;
  active: boolean;
  reduce: boolean;
  run: number;
  notes: Record<string, number>;
  addMark: (id: string, entry: MarkEntry) => () => void;
  addNote: (id: string, el: HTMLElement) => () => void;
}

const Context = createContext<MarginNotesContext | null>(null);

function useMarginNotes() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("Mark and MarginNote must be used inside MarginNotes");
  return ctx;
}

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function seeded(text: string) {
  let a = 2166136261;
  for (const c of text) a = Math.imul(a ^ c.charCodeAt(0), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

function spline(points: Pt[]) {
  let d = `M${round(points[0][0])} ${round(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${round(c1[0])} ${round(c1[1])} ${round(c2[0])} ${round(c2[1])} ${round(p2[0])} ${round(p2[1])}`;
  }
  return d;
}

function lengthOf(points: Pt[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return total;
}

function union(boxes: Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.w));
  const bottom = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: right - x, h: bottom - y };
}

function circle(b: Box, rand: () => number): Pt[] {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const rx = b.w / 2 + 5 + rand() * 2;
  const ry = b.h / 2 + 3 + rand() * 2;
  const tilt = (rand() - 0.5) * 0.14;
  const start = -Math.PI * (0.6 + rand() * 0.12);
  const sweep = Math.PI * 2 * (1.1 + rand() * 0.06);
  const phase = rand() * Math.PI * 2;
  const points: Pt[] = [];
  for (let k = 0; k <= 28; k++) {
    const t = k / 28;
    const a = start - sweep * t;
    const grow = 0.97 + t * 0.07 + Math.sin(a * 2 + phase) * 0.025;
    const x = Math.cos(a) * rx * grow;
    const y = Math.sin(a) * ry * grow;
    points.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
  }
  return points;
}

function line(b: Box, rand: () => number, at: number, flick: boolean): Pt[] {
  const x0 = b.x - 1 - rand() * 1.5;
  const x1 = b.x + b.w + 1 + rand() * 2;
  const y = b.y + b.h * at;
  const rise = (rand() - 0.5) * 2.4;
  const sag = (rand() - 0.3) * 1.6;
  const steps = Math.max(3, Math.round(b.w / 26));
  const points: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push([x0 + (x1 - x0) * t, y + rise * t + Math.sin(t * Math.PI) * sag + (rand() - 0.5) * 0.6]);
  }
  if (flick) points.push([x1 + 3, y + rise - 2.5]);
  return points;
}

function double(b: Box, rand: () => number): Pt[] {
  const out = line(b, rand, 1, false);
  const back = line({ ...b, x: b.x + b.w * 0.06, w: b.w * 0.9 }, rand, 1, false)
    .reverse()
    .map(([x, y]): Pt => [x, y + 4]);
  return [...out, ...back];
}

function box(b: Box, rand: () => number): Pt[] {
  const j = () => (rand() - 0.5) * 3;
  const tl: Pt = [b.x - 4 + j(), b.y - 2 + j()];
  const tr: Pt = [b.x + b.w + 4 + j(), b.y - 3 + j()];
  const br: Pt = [b.x + b.w + 3 + j(), b.y + b.h + 2 + j()];
  const bl: Pt = [b.x - 3 + j(), b.y + b.h + 3 + j()];
  const mid = (p: Pt, q: Pt): Pt => [(p[0] + q[0]) / 2 + j() * 0.6, (p[1] + q[1]) / 2 + j() * 0.6];
  return [tl, mid(tl, tr), tr, tr, mid(tr, br), br, br, mid(br, bl), bl, bl, mid(bl, tl), [tl[0] + 1, tl[1] - 1], [tl[0] + 9, tl[1] - 3]];
}

function distance(a: Box, b: Box) {
  return Math.hypot(a.x + a.w / 2 - (b.x + b.w / 2), a.y + a.h / 2 - (b.y + b.h / 2));
}

function edge(b: Box, toward: Pt, pad: number): Pt {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = toward[0] - cx;
  const dy = toward[1] - cy;
  const t = Math.min((b.w / 2 + pad) / Math.abs(dx || 1e-6), (b.h / 2 + pad) / Math.abs(dy || 1e-6));
  return [cx + dx * t, cy + dy * t];
}

function arrow(from: Box, to: Box, rand: () => number) {
  const toCenter: Pt = [to.x + to.w / 2, to.y + to.h / 2];
  const fromCenter: Pt = [from.x + from.w / 2, from.y + from.h / 2];
  const a = edge(from, toCenter, 6);
  const b = edge(to, fromCenter, 10);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const side = b[0] >= a[0] ? -1 : 1;
  const nx = -(b[1] - a[1]) / len;
  const ny = (b[0] - a[0]) / len;
  const bend = len * (0.2 + rand() * 0.08) * side;
  const control: Pt = [(a[0] + b[0]) / 2 + nx * bend, (a[1] + b[1]) / 2 + ny * bend];
  const shaft: Pt[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const u = 1 - t;
    shaft.push([u * u * a[0] + 2 * u * t * control[0] + t * t * b[0], u * u * a[1] + 2 * u * t * control[1] + t * t * b[1]]);
  }
  const tail = shaft[shaft.length - 2];
  const angle = Math.atan2(b[1] - tail[1], b[0] - tail[0]);
  const size = 8;
  const wing = (offset: number): Pt => [b[0] - Math.cos(angle + offset) * size, b[1] - Math.sin(angle + offset) * size];
  const head = `M${round(wing(0.5)[0])} ${round(wing(0.5)[1])} L${round(b[0])} ${round(b[1])} L${round(wing(-0.45)[0])} ${round(wing(-0.45)[1])}`;
  return { shaft: spline(shaft), length: lengthOf(shaft), head };
}

const pace = (length: number, min: number, max: number) => Math.min(max, Math.max(min, length / 560));

export interface MarginNotesProps extends ComponentProps<"div"> {
  tone?: MarkTone;
  once?: boolean;
  strokeWidth?: number;
}

export function MarginNotes({ tone = "red", once = true, strokeWidth = 1.8, className, children, ...props }: MarginNotesProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefix = useId();
  const reduce = useCalmMotion();
  const inView = useInView(ref, { once, amount: 0.4 });
  const marks = useRef(new Map<string, MarkEntry>());
  const noteEls = useRef(new Map<string, HTMLElement>());
  const [version, setVersion] = useState(0);
  const [drawing, setDrawing] = useState<Drawing>({ strokes: [], notes: {} });
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (inView) setRun((r) => r + 1);
  }, [inView]);

  const addMark = useCallback((id: string, entry: MarkEntry) => {
    marks.current.set(id, entry);
    setVersion((v) => v + 1);
    return () => {
      marks.current.delete(id);
      setVersion((v) => v + 1);
    };
  }, []);

  const addNote = useCallback((id: string, el: HTMLElement) => {
    noteEls.current.set(id, el);
    setVersion((v) => v + 1);
    return () => {
      noteEls.current.delete(id);
      setVersion((v) => v + 1);
    };
  }, []);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || version < 0) return;
    let frame = 0;
    const measure = () => {
      const frameBox = root.getBoundingClientRect();
      const scale = frameBox.width / (root.offsetWidth || 1) || 1;
      const local = (r: DOMRect): Box => ({
        x: (r.left - frameBox.left) / scale,
        y: (r.top - frameBox.top) / scale,
        w: r.width / scale,
        h: r.height / scale,
      });
      const ordered = [...marks.current.entries()].sort(([, a], [, b]) =>
        a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      );
      const strokes: Stroke[] = [];
      const notes: Record<string, number> = {};
      let clock = 0.1;
      ordered.forEach(([, mark], index) => {
        const boxes = [...mark.el.getClientRects()].filter((r) => r.width > 0).map(local);
        if (!boxes.length) return;
        const rand = seeded(`${index}-${mark.type}-${mark.el.textContent ?? ""}`);
        const whole = union(boxes);
        const paths: Pt[][] =
          mark.type === "circle"
            ? [circle(whole, rand)]
            : mark.type === "box"
              ? [box(whole, rand)]
              : mark.type === "double"
                ? boxes.map((b) => double(b, rand))
                : mark.type === "strike"
                  ? boxes.map((b) => line(b, rand, 0.56, false))
                  : boxes.map((b, i) => line(b, rand, 1, i === boxes.length - 1));
        let t = clock;
        paths.forEach((points, i) => {
          const duration = pace(lengthOf(points), 0.2, 0.6);
          strokes.push({ key: `${index}-${i}`, d: spline(points), delay: t, duration, tone: mark.tone });
          t += duration * 0.92;
        });
        const noteEl = mark.note ? noteEls.current.get(mark.note) : undefined;
        if (mark.note && noteEl) {
          notes[mark.note] = t - 0.05;
          const from = local(noteEl.getBoundingClientRect());
          const target =
            mark.type === "circle" || mark.type === "box"
              ? whole
              : boxes.reduce((best, b) => (distance(from, b) < distance(from, best) ? b : best));
          const path = arrow(from, target, rand);
          const shaftAt = t + 0.25;
          const shaftFor = pace(path.length, 0.25, 0.5);
          strokes.push({ key: `${index}-shaft`, d: path.shaft, delay: shaftAt, duration: shaftFor, tone: mark.tone });
          strokes.push({ key: `${index}-head`, d: path.head, delay: shaftAt + shaftFor, duration: 0.14, tone: mark.tone });
        }
        clock = Math.max(clock + 0.2, t - 0.08);
      });
      setDrawing({ strokes, notes });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    document.fonts?.ready.then(schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [version]);

  const active = inView && run > 0;
  const value = useMemo(
    () => ({ prefix, tone, active, reduce, run, notes: drawing.notes, addMark, addNote }),
    [prefix, tone, active, reduce, run, drawing.notes, addMark, addNote],
  );

  return (
    <Context.Provider value={value}>
      <div className={cn("relative", className)} ref={ref} {...props}>
        {children}
        <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible" fill="none">
          {drawing.strokes.map((stroke) => (
            <motion.path
              animate={active ? { pathLength: 1, opacity: 1 } : { pathLength: reduce ? 1 : 0, opacity: 0 }}
              className={tones[stroke.tone]}
              d={stroke.d}
              initial={{ pathLength: reduce ? 1 : 0, opacity: 0 }}
              key={`${run}-${stroke.key}`}
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={strokeWidth}
              transition={
                reduce
                  ? { duration: 0.3, delay: active ? stroke.delay * 0.25 : 0 }
                  : {
                      pathLength: { delay: stroke.delay, duration: stroke.duration, ease: [0.45, 0.05, 0.25, 1] },
                      opacity: { delay: active ? stroke.delay : 0, duration: 0.01 },
                    }
              }
            />
          ))}
        </svg>
      </div>
    </Context.Provider>
  );
}

export interface MarkProps extends ComponentProps<"span"> {
  type?: MarkType;
  tone?: MarkTone;
  note?: string;
}

export function Mark({ type = "underline", tone, note, className, children, ...props }: MarkProps) {
  const ctx = useMarginNotes();
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const resolved = tone ?? ctx.tone;
  const { addMark } = ctx;

  useLayoutEffect(() => {
    if (!ref.current) return;
    return addMark(id, { el: ref.current, type, tone: resolved, note });
  }, [addMark, id, type, resolved, note]);

  return (
    <span
      aria-describedby={note ? `${ctx.prefix}-${note}` : undefined}
      className={cn((type === "circle" || type === "box") && "mx-1.5 whitespace-nowrap", className)}
      ref={ref}
      {...props}
    >
      {children}
    </span>
  );
}

export interface MarginNoteProps extends Omit<ComponentProps<"span">, "id"> {
  id: string;
  tone?: MarkTone;
}

export function MarginNote({ id, tone, className, children, style, ...props }: MarginNoteProps) {
  const ctx = useMarginNotes();
  const ref = useRef<HTMLSpanElement>(null);
  const { addNote } = ctx;
  const delay = ctx.notes[id];
  const shown = ctx.active && delay !== undefined;
  const hidden = { opacity: 0, y: ctx.reduce ? 0 : 3, filter: ctx.reduce ? "blur(0px)" : "blur(3px)" };

  useLayoutEffect(() => {
    if (!ref.current) return;
    return addNote(id, ref.current);
  }, [addNote, id]);

  return (
    <span className={cn("inline-block", tones[tone ?? ctx.tone], className)} id={`${ctx.prefix}-${id}`} ref={ref} style={style} {...props}>
      <motion.span
        animate={shown ? { opacity: 1, y: 0, filter: "blur(0px)" } : hidden}
        className="block"
        initial={hidden}
        key={ctx.run}
        transition={{ duration: 0.3, delay: shown ? (ctx.reduce ? delay * 0.25 : delay) : 0, ease: [0.23, 1, 0.32, 1] }}
      >
        {children}
      </motion.span>
    </span>
  );
}
