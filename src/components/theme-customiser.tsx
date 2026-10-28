"use client";

import { CheckIcon, CopyIcon, PaletteIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useCustomTheme } from "@/components/custom-theme";
import { GooGroup } from "@/components/goo-group";
import { Button } from "@/components/ui/button";
import { SliderPrimitive } from "@/components/ui/slider";
import {
  type CustomTheme,
  colorOf,
  colors,
  type Density,
  densities,
  defaultTheme,
  encodeTheme,
  type FontId,
  fonts,
  isDefault,
  presets,
  radii,
  sameTheme,
  themeCssExport,
  themeRegistryItem,
} from "@/lib/custom-theme";
import { cn } from "@/lib/utils";

const hueStops = Array.from({ length: 13 }, (_, i) => `oklch(0.68 0.19 ${i * 30})`).join(", ");

function swatchStyle(theme: CustomTheme): CSSProperties {
  const color = colorOf(theme);
  return {
    "--sw-l": color?.light.primary ?? "var(--color-neutral-800)",
    "--sw-d": color?.dark.primary ?? "var(--color-neutral-100)",
  } as CSSProperties;
}

/** The trigger in the site header: a palette button that shows the current preview colour once it is customised. */
export function ThemeCustomiserButton({ className }: { className?: string }) {
  const { theme, open, setOpen } = useCustomTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const custom = mounted && !isDefault(theme);

  return (
    <Button
      aria-expanded={open}
      aria-label="Customise the preview theme"
      className={cn("relative shrink-0 rounded-full text-muted-foreground aria-expanded:bg-accent aria-expanded:text-foreground", className)}
      onClick={() => setOpen(!open)}
      size="icon-sm"
      variant="ghost"
    >
      <PaletteIcon />
      {custom && (
        <span
          aria-hidden
          className="absolute top-1 right-1 size-2 rounded-full bg-(--sw-l) ring-2 ring-background dark:bg-(--sw-d)"
          style={swatchStyle(theme)}
        />
      )}
    </Button>
  );
}

function Section({ title, value, children }: { title: string; value?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">{title}</h3>
        {value && <span className="font-mono text-[11px] text-foreground/80 tabular-nums">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function PresetChip({ name, theme, active, onPick }: { name: string; theme: CustomTheme; active: boolean; onPick: () => void }) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border px-2 py-2 text-left text-xs outline-none transition-[border-color,background-color] focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-foreground/25 bg-accent" : "hover:bg-accent/60",
      )}
      onClick={onPick}
      type="button"
    >
      <span
        aria-hidden
        className="size-4 shrink-0 border-2 border-(--sw-l) bg-(--sw-l)/25 dark:border-(--sw-d) dark:bg-(--sw-d)/25"
        style={{ ...swatchStyle(theme), borderRadius: `${Math.min(theme.radius * 0.9, 0.5)}rem` }}
      />
      <span className="truncate font-medium">{name}</span>
    </button>
  );
}

function CopyOut({ theme }: { theme: CustomTheme }) {
  const [format, setFormat] = useState("css");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("https://devl.dev");
  useEffect(() => setOrigin(location.origin), []);
  const command = `npx shadcn@latest add ${origin}/api/theme/${encodeTheme(theme)}.json`;
  const text = format === "css" ? themeCssExport(theme) : command;
  const preview = format === "css" ? text : `${command}\n\n${JSON.stringify(themeRegistryItem(theme), null, 2)}\n`;

  return (
    <Section title="Use it">
      <div className="flex items-center justify-between gap-2">
        <GooGroup
          items={[
            { value: "css", label: "CSS variables" },
            { value: "shadcn", label: "shadcn CLI" },
          ]}
          label="Export format"
          onValueChange={setFormat}
          size="sm"
          value={format}
        />
        <Button
          className="rounded-full"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          size="sm"
          variant="outline"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-40 overflow-auto rounded-xl border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
        <code>{preview}</code>
      </pre>
      <p className="text-pretty text-muted-foreground text-xs">
        {format === "css"
          ? "Paste over the matching variables in your globals.css. Every devl piece reads these tokens."
          : "Run it in a shadcn project: it writes this theme into your CSS variables."}
      </p>
    </Section>
  );
}

function Panel() {
  const { theme, setTheme, setOpen } = useCustomTheme();
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const update = (patch: Partial<CustomTheme>) => setTheme({ ...theme, ...patch });
  const radiusIndex = Math.max(0, radii.indexOf(theme.radius));

  useEffect(() => {
    panel.current?.focus();
  }, []);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0, scale: 1 }}
      aria-label="Theme customiser"
      className="fixed inset-x-2 bottom-2 z-50 flex max-h-[min(44rem,calc(100svh-5rem))] flex-col overflow-hidden rounded-3xl border bg-background/95 shadow-2xl/15 outline-none backdrop-blur-xl sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[24rem]"
      exit={{ opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.97 }}
      initial={{ opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.97 }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
      ref={panel}
      role="dialog"
      style={{ transformOrigin: "bottom right" }}
      tabIndex={-1}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
    >
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-brand text-brand-foreground">
          <PaletteIcon className="size-3.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="font-medium text-sm leading-tight">Theme the previews</h2>
          <p className="truncate text-muted-foreground text-xs">Every piece re-themes live. Saved in this browser.</p>
        </div>
        <Button
          aria-label="Reset to the devl theme"
          className="rounded-full text-muted-foreground"
          disabled={isDefault(theme)}
          onClick={() => setTheme(defaultTheme)}
          size="icon-sm"
          variant="ghost"
        >
          <RotateCcwIcon />
        </Button>
        <Button aria-label="Close" className="rounded-full text-muted-foreground" onClick={() => setOpen(false)} size="icon-sm" variant="ghost">
          <XIcon />
        </Button>
      </div>

      <div className="flex flex-col gap-6 overflow-y-auto p-4">
        <Section title="Presets">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {presets.map((preset) => (
              <PresetChip
                active={sameTheme(theme, preset.theme)}
                key={preset.id}
                name={preset.name}
                onPick={() => setTheme(preset.theme)}
                theme={preset.theme}
              />
            ))}
          </div>
        </Section>

        <Section title="Colour" value={theme.color === "custom" ? `hue ${Math.round(theme.hue)}°` : (colorOf(theme)?.name ?? "devl")}>
          <div aria-label="Primary colour" className="grid grid-cols-9 gap-1.5" role="radiogroup">
            {[{ id: "devl", name: "devl neutral" }, ...colors, { id: "custom", name: "Custom hue" }].map((color) => {
              const active = theme.color === color.id;
              const sample = { ...theme, color: color.id };
              return (
                <button
                  aria-checked={active}
                  aria-label={color.name}
                  className={cn(
                    "relative aspect-square cursor-pointer rounded-full outline-none ring-offset-2 ring-offset-background transition-[box-shadow,scale] focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                    active && "ring-2 ring-foreground/70",
                  )}
                  key={color.id}
                  onClick={() => update({ color: color.id })}
                  role="radio"
                  type="button"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-(--sw-l) dark:bg-(--sw-d)"
                    style={color.id === "custom" ? { background: `conic-gradient(${hueStops})` } : swatchStyle(sample)}
                  />
                  {color.id === "devl" && <span aria-hidden className="absolute inset-[30%] rounded-full bg-brand" />}
                </button>
              );
            })}
          </div>
          {theme.color === "custom" && (
            <SliderPrimitive.Root
              aria-label="Hue"
              className="pt-1"
              max={359}
              min={0}
              onValueChange={(value) => update({ hue: Array.isArray(value) ? value[0] : value })}
              thumbAlignment="edge"
              value={theme.hue}
            >
              <SliderPrimitive.Control className="flex h-5 w-full touch-none items-center">
                <SliderPrimitive.Track className="relative h-3 w-full rounded-full" style={{ background: `linear-gradient(90deg, ${hueStops})` }}>
                  <SliderPrimitive.Thumb
                    aria-label="Hue"
                    className="block size-5 rounded-full border-2 border-white bg-(--sw-l) shadow-md/20 outline-none has-focus-visible:ring-[3px] has-focus-visible:ring-ring/40 dark:bg-(--sw-d)"
                    style={swatchStyle(theme)}
                  />
                </SliderPrimitive.Track>
              </SliderPrimitive.Control>
            </SliderPrimitive.Root>
          )}
        </Section>

        <Section title="Radius" value={`${theme.radius}rem`}>
          <div className="flex items-center gap-3">
            <SliderPrimitive.Root
              aria-label="Corner radius"
              className="flex-1"
              max={radii.length - 1}
              min={0}
              onValueChange={(value) => update({ radius: radii[Array.isArray(value) ? value[0] : value] ?? defaultTheme.radius })}
              thumbAlignment="edge"
              value={radiusIndex}
            >
              <SliderPrimitive.Control className="flex h-5 w-full touch-none items-center">
                <SliderPrimitive.Track className="relative h-1 w-full rounded-full bg-input">
                  <SliderPrimitive.Indicator className="rounded-full bg-foreground" />
                  <SliderPrimitive.Thumb
                    aria-label="Corner radius"
                    className="block size-4 rounded-full border border-input bg-white shadow-xs/10 outline-none has-focus-visible:ring-[3px] has-focus-visible:ring-ring/40"
                    getAriaValueText={() => `${theme.radius} rem`}
                  />
                </SliderPrimitive.Track>
              </SliderPrimitive.Control>
            </SliderPrimitive.Root>
            <span
              aria-hidden
              className="size-8 shrink-0 border-2 border-foreground/70 border-r-0 border-b-0 transition-[border-radius] duration-200"
              style={{ borderTopLeftRadius: `${theme.radius * 1.8}rem` }}
            />
          </div>
        </Section>

        <Section title="Density">
          <GooGroup
            className="self-start"
            items={densities.map((d) => ({ value: d.id, label: d.name }))}
            label="Density"
            onValueChange={(value) => update({ density: value as Density })}
            size="sm"
            value={theme.density}
          />
        </Section>

        <Section title="Font" value={fonts.find((f) => f.id === theme.font)?.name}>
          <div aria-label="Font" className="grid grid-cols-5 gap-1.5" role="radiogroup">
            {fonts.map((font) => (
              <button
                aria-checked={theme.font === font.id}
                aria-label={font.name}
                className={cn(
                  "flex h-10 cursor-pointer items-center justify-center rounded-xl border text-base outline-none transition-[border-color,background-color] focus-visible:ring-2 focus-visible:ring-ring",
                  theme.font === font.id ? "border-foreground/25 bg-accent" : "hover:bg-accent/60",
                )}
                key={font.id}
                onClick={() => update({ font: font.id as FontId })}
                role="radio"
                style={{ fontFamily: font.variable ? `var(${font.variable}), ${font.family}` : font.id === "inter" ? undefined : font.family }}
                title={font.name}
                type="button"
              >
                Aa
              </button>
            ))}
          </div>
        </Section>

        <CopyOut theme={theme} />
      </div>
    </motion.div>
  );
}

export function ThemeCustomiser() {
  const { open } = useCustomTheme();
  return <AnimatePresence>{open && <Panel />}</AnimatePresence>;
}
