export type Density = "compact" | "default" | "comfy";
export type FontId = "inter" | "geist" | "dm-sans" | "space-grotesk" | "system";

export interface CustomTheme {
  color: string;
  hue: number;
  radius: number;
  density: Density;
  font: FontId;
}

interface Swatch {
  primary: string;
  foreground: string;
  ink: string;
}

export interface ThemeColor {
  id: string;
  name: string;
  light: Swatch;
  dark: Swatch;
}

function luminance(l: number, c: number, h: number) {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const lms = [l + 0.3963377774 * a + 0.2158037573 * b, l - 0.1055613458 * a - 0.0638541728 * b, l - 0.0894841775 * a - 1.291485548 * b].map(
    (v) => v ** 3,
  );
  const rgb = [
    4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2],
    -1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2],
    -0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2],
  ].map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

const whiteLuminance = luminance(0.985, 0, 0);
const round = (n: number) => Math.round(n * 1000) / 1000;
const oklch = (l: number, c: number, h: number) => `oklch(${round(l)} ${round(c)} ${round(h)})`;

function darkestFor(target: number, c: number, h: number) {
  let l = 0.8;
  while (l > 0.3 && (whiteLuminance + 0.05) / (luminance(l, c, h) + 0.05) < target) l -= 0.005;
  return l;
}

function solid(h: number, c: number): Pick<ThemeColor, "light" | "dark"> {
  const white = "oklch(0.985 0 0)";
  return {
    light: { primary: oklch(darkestFor(5.4, c, h), c, h), foreground: white, ink: oklch(darkestFor(5.6, c, h), c, h) },
    dark: { primary: oklch(darkestFor(4.8, c, h), c, h), foreground: white, ink: oklch(0.8, c * 0.65, h) },
  };
}

function pale(h: number, c: number, l = 0.84): Pick<ThemeColor, "light" | "dark"> {
  const foreground = oklch(0.27, 0.06, h);
  return {
    light: { primary: oklch(l, c, h), foreground, ink: oklch(darkestFor(4.8, c * 0.75, h), c * 0.75, h) },
    dark: { primary: oklch(l + 0.02, c, h), foreground, ink: oklch(l + 0.02, c, h) },
  };
}

export const colors: ThemeColor[] = [
  {
    id: "lime",
    name: "Lime",
    light: { primary: "oklch(0.9 0.19 124)", foreground: "oklch(0.27 0.06 130)", ink: "oklch(0.52 0.15 135)" },
    dark: { primary: "oklch(0.9 0.19 124)", foreground: "oklch(0.27 0.06 130)", ink: "oklch(0.9 0.19 124)" },
  },
  { id: "blue", name: "Blue", ...solid(263, 0.21) },
  { id: "violet", name: "Violet", ...solid(293, 0.23) },
  { id: "rose", name: "Rose", ...solid(14, 0.21) },
  { id: "orange", name: "Orange", ...pale(52, 0.18, 0.74) },
  { id: "amber", name: "Amber", ...pale(80, 0.16, 0.82) },
  { id: "emerald", name: "Emerald", ...solid(162, 0.14) },
];

function customColor(hue: number): ThemeColor {
  const h = Math.round(((hue % 360) + 360) % 360);
  return { id: "custom", name: "Custom", ...(h >= 55 && h <= 135 ? pale(h, 0.17) : solid(h, 0.19)) };
}

export function colorOf(theme: CustomTheme): ThemeColor | null {
  if (theme.color === "custom") return customColor(theme.hue);
  return colors.find((c) => c.id === theme.color) ?? null;
}

export const densities: { id: Density; name: string; spacing: number }[] = [
  { id: "compact", name: "Compact", spacing: 0.225 },
  { id: "default", name: "Default", spacing: 0.25 },
  { id: "comfy", name: "Comfy", spacing: 0.275 },
];

export const fonts: { id: FontId; name: string; variable: string | null; family: string }[] = [
  { id: "inter", name: "Inter", variable: null, family: '"Inter", ui-sans-serif, system-ui, sans-serif' },
  { id: "geist", name: "Geist", variable: "--font-geist", family: '"Geist", ui-sans-serif, system-ui, sans-serif' },
  { id: "dm-sans", name: "DM Sans", variable: "--font-dm-sans", family: '"DM Sans", ui-sans-serif, system-ui, sans-serif' },
  {
    id: "space-grotesk",
    name: "Space Grotesk",
    variable: "--font-space-grotesk",
    family: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
  },
  { id: "system", name: "System", variable: null, family: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' },
];

export const radii = [0, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];

export const defaultTheme: CustomTheme = { color: "devl", hue: 250, radius: 0.625, density: "default", font: "inter" };

export const presets: { id: string; name: string; theme: CustomTheme }[] = [
  { id: "devl", name: "devl", theme: defaultTheme },
  { id: "lime", name: "Lime goo", theme: { color: "lime", hue: 124, radius: 0.875, density: "default", font: "inter" } },
  { id: "blueprint", name: "Blueprint", theme: { color: "blue", hue: 263, radius: 0, density: "compact", font: "geist" } },
  { id: "marmalade", name: "Marmalade", theme: { color: "orange", hue: 41, radius: 1, density: "comfy", font: "dm-sans" } },
  { id: "grape", name: "Grape soda", theme: { color: "violet", hue: 293, radius: 0.5, density: "default", font: "space-grotesk" } },
  { id: "fern", name: "Fern", theme: { color: "emerald", hue: 160, radius: 0.375, density: "compact", font: "system" } },
];

export function isDefault(theme: CustomTheme) {
  return (
    theme.color === defaultTheme.color &&
    theme.radius === defaultTheme.radius &&
    theme.density === defaultTheme.density &&
    theme.font === defaultTheme.font
  );
}

export function sameTheme(a: CustomTheme, b: CustomTheme) {
  return (
    a.color === b.color &&
    (a.color !== "custom" || a.hue === b.hue) &&
    a.radius === b.radius &&
    a.density === b.density &&
    a.font === b.font
  );
}

function colorVars(swatch: Swatch): Record<string, string> {
  return {
    primary: swatch.primary,
    "primary-foreground": swatch.foreground,
    ring: swatch.primary,
    "sidebar-primary": swatch.primary,
    "sidebar-primary-foreground": swatch.foreground,
    "sidebar-ring": swatch.primary,
    brand: swatch.primary,
    "brand-foreground": swatch.foreground,
    "brand-ink": swatch.ink,
  };
}

export function themeVars(theme: CustomTheme) {
  const color = colorOf(theme);
  const shared: Record<string, string> = {};
  if (theme.radius !== defaultTheme.radius) shared.radius = `${theme.radius}rem`;
  if (theme.density !== defaultTheme.density) {
    shared.spacing = `${densities.find((d) => d.id === theme.density)?.spacing ?? 0.25}rem`;
  }
  const font = fonts.find((f) => f.id === theme.font);
  return {
    shared,
    font: font && theme.font !== defaultTheme.font ? font : null,
    light: color ? colorVars(color.light) : {},
    dark: color ? colorVars(color.dark) : {},
  };
}

const declare = (vars: Record<string, string>) =>
  Object.entries(vars)
    .map(([name, value]) => `--${name}:${value};`)
    .join("");

export const scope = "[data-theme-scope][data-theme-scope]";

export function themeCss(theme: CustomTheme) {
  if (isDefault(theme)) return "";
  const { shared, font, light, dark } = themeVars(theme);
  const family = font ? (font.variable ? `var(${font.variable}),${font.family}` : font.family) : null;
  const fontVars = family ? `--font-sans:${family};--font-heading:${family};font-family:var(--font-sans);` : "";
  const rules = [`${scope}{${declare(shared)}${declare(light)}${fontVars}}`];
  if (Object.keys(dark).length) rules.push(`.dark${scope},.dark ${scope}{${declare(dark)}}`);
  return rules.join("");
}

const block = (selector: string, vars: Record<string, string>) =>
  `${selector} {\n${Object.entries(vars)
    .map(([name, value]) => `  --${name}: ${value};`)
    .join("\n")}\n}`;

export function themeCssExport(theme: CustomTheme) {
  const { shared, font, light, dark } = themeVars(theme);
  const root = { ...shared, ...(font ? { "font-sans": font.family, "font-heading": font.family } : {}), ...light };
  const parts = [];
  if (Object.keys(root).length) parts.push(block(":root", root));
  if (Object.keys(dark).length) parts.push(block(".dark", dark));
  return parts.length ? `${parts.join("\n\n")}\n` : "/* The devl defaults: nothing to override. */\n";
}

export function themeRegistryItem(theme: CustomTheme, name = "devl-theme") {
  const { shared, font, light, dark } = themeVars(theme);
  const { radius, ...rest } = shared;
  const themeVarsOut = { ...rest, ...(font ? { "font-sans": font.family, "font-heading": font.family } : {}) };
  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name,
    type: "registry:theme",
    cssVars: {
      ...(Object.keys(themeVarsOut).length ? { theme: themeVarsOut } : {}),
      light: { ...(radius ? { radius } : {}), ...light },
      dark,
    },
  };
}

export function encodeTheme(theme: CustomTheme) {
  return [theme.color, theme.hue, theme.radius, theme.density, theme.font].join("_");
}

export function decodeTheme(value: string | null | undefined): CustomTheme | null {
  if (!value) return null;
  const [color, hue, radius, density, font] = value.split("_");
  const theme: CustomTheme = {
    color: color === "devl" || color === "custom" || colors.some((c) => c.id === color) ? color : defaultTheme.color,
    hue: Number.isFinite(Number(hue)) ? Number(hue) : defaultTheme.hue,
    radius: Number.isFinite(Number(radius)) ? Math.min(2, Math.max(0, Number(radius))) : defaultTheme.radius,
    density: densities.some((d) => d.id === density) ? (density as Density) : defaultTheme.density,
    font: fonts.some((f) => f.id === font) ? (font as FontId) : defaultTheme.font,
  };
  return theme;
}

export const storageKey = "devl:custom-theme";
export const styleId = "devl-custom-theme";

export const bootScript = `try{var t=localStorage.getItem("${storageKey}:css");if(t){var s=document.createElement("style");s.id="${styleId}";s.textContent=t;document.head.appendChild(s)}}catch(e){}`;

export function writeThemeStyle(css: string) {
  let style = document.getElementById(styleId);
  if (!css) {
    style?.remove();
    return;
  }
  if (!style) {
    style = document.createElement("style");
    style.id = styleId;
    document.head.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
}
