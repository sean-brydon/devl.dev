"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { CheckIcon, CopyIcon, RotateCcwIcon, SparklesIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export type Density = "compact" | "cozy" | "roomy";

export interface ThemeValue {
  hue: number;
  radius: number;
  density: Density;
}

export interface ThemePreset {
  name: string;
  hue: number;
}

export interface ThemeStudioProps {
  defaultValue?: Partial<ThemeValue>;
  presets?: ThemePreset[];
  onChange?: (value: ThemeValue) => void;
  preview?: ReactNode;
  className?: string;
}

const DENSITY: Record<Density, number> = { compact: 0.8, cozy: 1, roomy: 1.25 };

const DEFAULT_PRESETS: ThemePreset[] = [
  { name: "Indigo", hue: 268 },
  { name: "Violet", hue: 300 },
  { name: "Rose", hue: 12 },
  { name: "Amber", hue: 62 },
  { name: "Emerald", hue: 158 },
  { name: "Sky", hue: 230 },
];

// One chroma/lightness pair per theme keeps every hue legible against white text and dark surfaces.
const accent = (hue: number, dark = false) => `oklch(${dark ? 0.7 : 0.56} ${dark ? 0.15 : 0.18} ${Math.round(hue)})`;

export function toCss({ hue, radius, density }: ThemeValue) {
  return `:root {
  --primary: ${accent(hue)};
  --primary-foreground: oklch(0.99 0 0);
  --radius: ${(radius / 16).toFixed(3).replace(/\.?0+$/, "")}rem;
  --spacing: ${(0.25 * DENSITY[density]).toFixed(4).replace(/\.?0+$/, "")}rem;
}

.dark {
  --primary: ${accent(hue, true)};
  --primary-foreground: oklch(0.18 0 0);
}`;
}

export function ThemeStudio({ defaultValue, presets = DEFAULT_PRESETS, onChange, preview, className }: ThemeStudioProps) {
  const reduce = useReducedMotion();
  const [initial] = useState<ThemeValue>(() => ({ hue: 268, radius: 10, density: "cozy", ...defaultValue }));
  const [value, setValue] = useState<ThemeValue>(initial);
  const [view, setView] = useState<"preview" | "css">("preview");
  const [copied, setCopied] = useState(false);
  const [live, setLive] = useState(false);
  const copyTimer = useRef<number>(undefined);
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const update = (patch: Partial<ThemeValue>) =>
    setValue((v) => {
      const next = { ...v, ...patch };
      onChange?.(next);
      return next;
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toCss(value));
    } catch {}
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  const vars = {
    "--studio-hue": value.hue,
    "--studio-radius": `${value.radius}px`,
    "--studio-density": DENSITY[value.density],
  } as CSSProperties;

  const activePreset = presets.find((p) => Math.abs(p.hue - value.hue) < 2);

  return (
    <div
      className={cn(
        "grid w-full max-w-[640px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5 sm:grid-cols-[240px_1fr]",
        className,
      )}
    >
      <div className="flex flex-col gap-5 border-b p-4 sm:border-e sm:border-b-0">
        <Field label="Accent" value={activePreset?.name ?? `${Math.round(value.hue)}°`}>
          <div aria-label="Accent presets" className="grid w-fit grid-cols-6 gap-1.5" role="radiogroup">
            {presets.map((p) => {
              const on = activePreset?.name === p.name;
              return (
                <button
                  aria-checked={on}
                  aria-label={p.name}
                  className="relative flex size-7 cursor-pointer items-center justify-center rounded-full outline-none transition-transform duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-[0.95] before:absolute before:-inset-0.5 before:content-['']"
                  key={p.name}
                  onClick={() => update({ hue: p.hue })}
                  role="radio"
                  type="button"
                >
                  <span
                    className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_--theme(--color-black/10%)] [background:var(--swatch)] dark:[background:var(--swatch-dark)]"
                    style={{ "--swatch": accent(p.hue), "--swatch-dark": accent(p.hue, true) } as CSSProperties}
                  />
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.span
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative text-white dark:text-neutral-900"
                        exit={{ opacity: 0, scale: 0.6 }}
                        initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                      >
                        <CheckIcon className="size-3.5" strokeWidth={3} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
          <SliderPrimitive.Root
            className="mt-3 w-full"
            max={360}
            min={0}
            onValueChange={(v) => {
              setLive(true);
              update({ hue: Array.isArray(v) ? v[0] : v });
            }}
            onValueCommitted={() => setLive(false)}
            thumbAlignment="edge"
            value={value.hue}
          >
            <SliderPrimitive.Control className="flex h-5 w-full touch-none select-none items-center">
              <SliderPrimitive.Track
                className="relative h-2.5 w-full rounded-full shadow-[inset_0_0_0_1px_--theme(--color-black/8%)]"
                style={{
                  background: `linear-gradient(to right, ${Array.from({ length: 13 }, (_, i) => accent(i * 30)).join(", ")})`,
                }}
              >
                <SliderPrimitive.Thumb
                  getAriaLabel={() => "Accent hue"}
                  className="block size-4.5 rounded-full border-2 border-white shadow-[0_1px_3px_--theme(--color-black/30%)] outline-none transition-[scale] duration-150 has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-card data-dragging:scale-110"
                  style={{ background: accent(value.hue) }}
                />
              </SliderPrimitive.Track>
            </SliderPrimitive.Control>
          </SliderPrimitive.Root>
        </Field>

        <Field label="Radius" value={`${value.radius}px`}>
          <Slider
            className="py-1.5"
            getAriaLabel={() => "Corner radius"}
            max={20}
            min={0}
            onValueChange={(v) => {
              setLive(true);
              update({ radius: Array.isArray(v) ? v[0] : v });
            }}
            onValueCommitted={() => setLive(false)}
            value={value.radius}
          />
        </Field>

        <Field label="Density">
          <Segmented
            label="Density"
            onChange={(d) => update({ density: d })}
            options={[
              { value: "compact", label: "Compact" },
              { value: "cozy", label: "Cozy" },
              { value: "roomy", label: "Roomy" },
            ]}
            value={value.density}
          />
        </Field>
      </div>

      <div className="flex min-w-0 flex-col bg-muted/40">
        <div className="flex items-center gap-1 px-3 pt-3">
          <Segmented
            label="View"
            onChange={setView}
            options={[
              { value: "preview", label: "Preview" },
              { value: "css", label: "CSS" },
            ]}
            value={view}
          />
          <button
            className="ms-auto flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 font-medium text-muted-foreground text-xs outline-none transition-[color,background-color,opacity,scale] duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-0"
            disabled={value.hue === initial.hue && value.radius === initial.radius && value.density === initial.density}
            onClick={() => update(initial)}
            type="button"
          >
            <RotateCcwIcon className="size-3.5" />
            Reset
          </button>
          <button
            className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 font-medium text-muted-foreground text-xs outline-none transition-[color,background-color,scale] duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
            onClick={copy}
            type="button"
          >
            <span className="relative size-3.5">
              <AnimatePresence initial={false}>
                <motion.span
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  className="absolute inset-0"
                  exit={{ opacity: 0, scale: 0.6, filter: "blur(2px)" }}
                  initial={reduce ? false : { opacity: 0, scale: 0.6, filter: "blur(2px)" }}
                  key={copied ? "done" : "copy"}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  {copied ? <CheckIcon className="size-3.5 text-success" /> : <CopyIcon className="size-3.5" />}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="grid text-start *:col-start-1 *:row-start-1">
              <span className={cn(copied && "invisible")}>Copy CSS</span>
              <span className={cn(!copied && "invisible")}>Copied</span>
            </span>
          </button>
        </div>
        <div className={cn("relative min-h-[324px] flex-1", live && "[&_*]:transition-none!")} style={vars}>
          <AnimatePresence initial={false} mode="popLayout">
            {view === "preview" ? (
              <motion.div
                animate={{ opacity: 1 }}
                className="flex h-full items-center justify-center p-4"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key="preview"
                transition={{ duration: 0.15 }}
              >
                {preview ?? <SamplePreview />}
              </motion.div>
            ) : (
              <motion.pre
                animate={{ opacity: 1 }}
                className="m-3 overflow-x-auto rounded-xl border bg-background p-3 font-mono text-[11.5px] text-muted-foreground leading-relaxed"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key="css"
                transition={{ duration: 0.15 }}
              >
                <CssCode css={toCss(value)} />
              </motion.pre>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function CssCode({ css }: { css: string }) {
  return (
    <code>
      {css.split("\n").map((line, i) => {
        const m = line.match(/^(\s*)(--[\w-]+)(:\s*)(.+)(;)$/);
        return (
          <span className="block" key={i}>
            {m ? (
              <>
                {m[1]}
                <span className="text-sky-700 dark:text-sky-300">{m[2]}</span>
                {m[3]}
                <span className="text-foreground">{m[4]}</span>
                {m[5]}
              </>
            ) : (
              line || " "
            )}
          </span>
        );
      })}
    </code>
  );
}

function Field({ label, value, children }: { label: string; value?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-medium text-xs">{label}</span>
        {value && <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  const id = useId();
  return (
    <div aria-label={label} className="flex w-fit rounded-lg bg-muted p-0.5" role="radiogroup">
      {options.map((o) => (
        <button
          aria-checked={value === o.value}
          className={cn(
            "relative z-0 h-7 cursor-pointer rounded-md px-2.5 font-medium text-xs outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
            value === o.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          key={o.value}
          onClick={() => onChange(o.value)}
          role="radio"
          type="button"
        >
          {value === o.value && (
            <motion.span
              className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm/5 dark:bg-input"
              layoutId={`${id}-seg`}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SamplePreview() {
  const [on, setOn] = useState(true);
  const pad = "calc(var(--studio-density) * 1rem)";
  const gap = "calc(var(--studio-density) * 0.75rem)";
  return (
    <div
      className="w-full max-w-[300px] border bg-card shadow-xs/5 transition-[border-radius,padding] duration-200 ease-out [--studio-accent:oklch(0.56_0.18_var(--studio-hue))] [--studio-on:oklch(0.99_0_0)] dark:[--studio-accent:oklch(0.7_0.15_var(--studio-hue))] dark:[--studio-on:oklch(0.18_0_0)]"
      style={{ borderRadius: "calc(var(--studio-radius) + 6px)", padding: pad }}
    >
      <div className="flex flex-col transition-[gap] duration-200" style={{ gap }}>
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-9 items-center justify-center bg-[color-mix(in_oklch,var(--studio-accent)_16%,transparent)] text-(--studio-accent) transition-[border-radius,color,background-color] duration-200"
            style={{ borderRadius: "var(--studio-radius)" }}
          >
            <SparklesIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm">Brightwater Studio</p>
            <p className="text-muted-foreground text-xs">Team plan · 8 seats</p>
          </div>
          <span
            className="bg-[color-mix(in_oklch,var(--studio-accent)_14%,transparent)] px-2 py-0.5 font-medium text-(--studio-accent) text-[11px] transition-[border-radius,color,background-color] duration-200"
            style={{ borderRadius: "calc(var(--studio-radius) * 0.6)" }}
          >
            Pro
          </span>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="font-medium text-xs">Workspace URL</span>
          <span
            className="flex h-8 items-center border bg-background px-2.5 text-sm ring-(--studio-accent)/30 transition-[border-radius] duration-200 focus-within:border-(--studio-accent) focus-within:ring-3"
            style={{ borderRadius: "var(--studio-radius)" }}
          >
            <span className="text-muted-foreground">halden.app/</span>
            <input aria-label="Workspace URL" className="min-w-0 flex-1 bg-transparent outline-none" defaultValue="brightwater" />
          </span>
        </label>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-xs">Weekly digest</p>
            <p className="text-muted-foreground text-xs">Mondays at 9:00</p>
          </div>
          <button
            aria-checked={on}
            aria-label="Weekly digest"
            className={cn(
              "flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring",
              on ? "bg-(--studio-accent)" : "bg-input",
            )}
            onClick={() => setOn((v) => !v)}
            role="switch"
            type="button"
          >
            <span className={cn("size-4 rounded-full bg-white shadow-xs transition-transform duration-200 ease-out", on && "translate-x-4")} />
          </button>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted-foreground">Storage</span>
            <span className="text-muted-foreground tabular-nums">68%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[68%] rounded-full bg-(--studio-accent) transition-colors duration-200" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="h-8 cursor-pointer border bg-background px-3 font-medium text-sm outline-none transition-[border-radius,scale] duration-200 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
            style={{ borderRadius: "var(--studio-radius)" }}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-8 cursor-pointer bg-(--studio-accent) px-3 font-medium text-(--studio-on) text-sm shadow-xs outline-none transition-[border-radius,background-color,scale] duration-200 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97]"
            style={{ borderRadius: "var(--studio-radius)" }}
            type="button"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
