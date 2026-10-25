"use client";

import { ArrowRightIcon, CheckIcon, ImageIcon, ImageOffIcon, ShieldCheckIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { AdStrip, AdTile } from "@/components/sponsor/ad-creative";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  type AccentId,
  accents,
  formatPrice,
  formatPeriod,
  monogramOf,
  PITCH_MAX,
  type PlacementId,
  placements,
  PERIODS_AHEAD,
  PRICE_UNIT,
} from "@/lib/sponsors";
import { cn } from "@/lib/utils";

interface PlacementInventory {
  placement: PlacementId;
  priceCents: number;
  periods: { periodStart: string; free: boolean }[];
}

interface Copy {
  productName: string;
  pitch: string;
  url: string;
  email: string;
  accent: AccentId;
  monogram: string;
}

function issuesOf(copy: Copy) {
  const issues: Partial<Record<keyof Copy, string>> = {};
  const name = copy.productName.trim();
  if (name.length < 2 || name.length > 32) issues.productName = "2–32 characters";
  const pitch = copy.pitch.trim();
  if (pitch.length < 8) issues.pitch = "Say a little more — at least 8 characters";
  if (pitch.length > PITCH_MAX) issues.pitch = `Keep it to ${PITCH_MAX} characters`;
  try {
    const url = new URL(copy.url.trim());
    if (url.protocol !== "https:" || !url.hostname.includes(".")) issues.url = "Use a full https:// link";
  } catch {
    issues.url = "Use a full https:// link";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(copy.email.trim())) issues.email = "Enter a valid email";
  if (!/^[\p{L}\p{N}]{0,2}$/u.test(copy.monogram.trim())) issues.monogram = "Up to 2 letters";
  return issues;
}

function Step({ n, title, hint, children }: { n: string; title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="flex items-baseline gap-2.5 font-mono text-xs uppercase tracking-widest">
          <span className="text-muted-foreground/60 tabular-nums">{n}</span>
          <span className="text-foreground">{title}</span>
        </h3>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function TextField({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label className="font-medium text-sm" htmlFor={id}>
          {label}
        </label>
        {hint}
      </div>
      {children}
      <p
        className={cn("min-h-4 text-xs transition-opacity", error ? "text-destructive-foreground opacity-100" : "opacity-0")}
        id={`${id}-error`}
      >
        {error ?? " "}
      </p>
    </div>
  );
}

type OgPreview =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; src: string; source: string }
  | { state: "error"; message: string };

function useOgPreview(url: string | null) {
  const [og, setOg] = useState<OgPreview>({ state: "idle" });
  useEffect(() => {
    if (!url) return setOg({ state: "idle" });
    const controller = new AbortController();
    let objectUrl: string | null = null;
    const timer = setTimeout(async () => {
      setOg({ state: "loading" });
      try {
        const res = await fetch(`/api/sponsors/og-preview?url=${encodeURIComponent(url)}`, { signal: controller.signal });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { message?: string } | null;
          return setOg({ state: "error", message: data?.message ?? "Couldn't read that page" });
        }
        objectUrl = URL.createObjectURL(await res.blob());
        setOg({ state: "ready", src: objectUrl, source: res.headers.get("x-og-source") ?? url });
      } catch {
        if (!controller.signal.aborted) setOg({ state: "error", message: "Couldn't reach that page" });
      }
    }, 700);
    return () => {
      clearTimeout(timer);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);
  return og;
}

function OgNote({ og, useImage, onUseImageChange }: { og: OgPreview; useImage: boolean; onUseImageChange: (value: boolean) => void }) {
  if (og.state === "idle") {
    return <p className="text-muted-foreground text-xs">Add your link and we'll pull your site's og:image into the ad.</p>;
  }
  if (og.state === "loading") {
    return (
      <p className="flex items-center gap-2 text-muted-foreground text-xs">
        <Spinner className="size-3.5" /> Looking for your og:image…
      </p>
    );
  }
  if (og.state === "error") {
    return (
      <p className="flex gap-2 text-muted-foreground text-xs leading-relaxed">
        <ImageOffIcon className="mt-px size-3.5 shrink-0" />
        <span>
          {og.message}. Your ad will use the monogram and accent instead.
        </span>
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-dashed p-3">
      <p className="flex gap-2 text-xs leading-relaxed">
        <ImageIcon className="mt-px size-3.5 shrink-0 text-brand-ink" />
        <span>
          Pulled from your site's og:image — make sure it looks good.{" "}
          <span className="break-all text-muted-foreground">{new URL(og.source).hostname}</span>
        </span>
      </p>
      <label className="flex cursor-pointer items-center justify-between gap-3 text-xs">
        <span>Don't use an image</span>
        <Switch checked={!useImage} onCheckedChange={(checked) => onUseImageChange(!checked)} />
      </label>
    </div>
  );
}

export function AdvertiseBooking({ visiblePlacements }: { visiblePlacements: PlacementId[] }) {
  const reduce = useReducedMotion();
  const [inventory, setInventory] = useState<PlacementInventory[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [placement, setPlacement] = useState<PlacementId>(visiblePlacements[0]);
  const [period, setPeriod] = useState<string | null>(null);
  const [copy, setCopy] = useState<Copy>({ productName: "", pitch: "", url: "", email: "", accent: "violet", monogram: "" });
  const [touched, setTouched] = useState<Partial<Record<keyof Copy, boolean>>>({});
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/sponsors/inventory", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { placements: PlacementInventory[] };
      setInventory(data.placements);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const periods = useMemo(() => {
    const fromServer = inventory?.find((p) => p.placement === placement)?.periods;
    return fromServer ?? Array.from({ length: PERIODS_AHEAD }, (_, i) => ({ periodStart: `pending-${i}`, free: false }));
  }, [inventory, placement]);

  useEffect(() => {
    if (period && !periods.some((w) => w.periodStart === period && w.free)) setPeriod(null);
  }, [period, periods]);

  const issues = issuesOf(copy);
  const show = (key: keyof Copy) => (attempted || touched[key] ? issues[key] : undefined);
  const set = <K extends keyof Copy>(key: K, value: Copy[K]) => setCopy((c) => ({ ...c, [key]: value }));
  const blur = (key: keyof Copy) => () => setTouched((t) => ({ ...t, [key]: true }));
  const price = placements[placement].priceCents;
  const format = placements[placement].format;
  const wideTile = placement === "grid:block" || placement === "grid:screen";
  const ready = Boolean(period) && Object.keys(issues).length === 0;
  const og = useOgPreview(issues.url ? null : copy.url.trim());
  const [useImage, setUseImage] = useState(true);

  const preview = {
    name: copy.productName.trim() || "Your product",
    pitch: copy.pitch.trim() || "A crisp one-liner about what you make and who it's for.",
    url: copy.url.trim() || "https://your-product.com",
    accent: copy.accent,
    monogram: copy.monogram.trim() || null,
    image: useImage && og.state === "ready" ? og.src : null,
    label: "Sponsored" as const,
    rel: "sponsored noopener" as const,
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setAttempted(true);
    setError(null);
    if (!period) return setError("Pick a fortnight first.");
    if (Object.keys(issues).length > 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/sponsors/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placement,
          periodStart: period,
          productName: copy.productName,
          pitch: copy.pitch,
          url: copy.url,
          email: copy.email,
          accent: copy.accent,
          monogram: copy.monogram || undefined,
          useImage,
        }),
      });
      const data = (await res.json()) as { url?: string; message?: string; error?: string };
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      if (data.error === "PeriodUnavailable") {
        setPeriod(null);
        load();
      }
      setError(data.message ?? "Couldn't start checkout. Try again.");
    } catch {
      setError("Network hiccup. Try again.");
    }
    setSubmitting(false);
  }

  const freeCount = (id: PlacementId) => inventory?.find((p) => p.placement === id)?.periods.filter((w) => w.free).length;

  return (
    <form className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_24rem]" noValidate onSubmit={submit}>
      <div className="flex min-w-0 flex-col gap-12">
        <Step hint="One slot per placement per fortnight" n="01" title="Placement">
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Placement">
            {visiblePlacements.map((id) => {
              const p = placements[id];
              const active = id === placement;
              const free = freeCount(id);
              return (
                <button
                  aria-checked={active}
                  className={cn(
                    "group relative flex flex-col gap-1 rounded-xl border p-3 text-left outline-none transition-[border-color,background-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]",
                    active ? "border-foreground/80 bg-card" : "hover:border-foreground/20",
                  )}
                  key={id}
                  onClick={() => setPlacement(id)}
                  role="radio"
                  type="button"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-sm">{p.label}</span>
                    <span className="font-mono text-xs tabular-nums">
                      {formatPrice(p.priceCents)}
                      <span className="text-muted-foreground">{PRICE_UNIT}</span>
                    </span>
                  </span>
                  <span className="text-muted-foreground text-xs">{p.where}</span>
                  <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums">
                    {free === undefined ? " " : `${free} of ${periods.length} fortnights open`}
                  </span>
                </button>
              );
            })}
          </div>
        </Step>

        <Step
          hint={loadError ? <button className="underline" onClick={load} type="button">Couldn't load availability — retry</button> : "Two weeks each, Monday to Sunday UTC, up to 12 weeks ahead"}
          n="02"
          title="Fortnight"
        >
          <div aria-label="Fortnight" className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup">
            {periods.map(({ periodStart, free }) => {
              const active = periodStart === period;
              const pending = inventory === null;
              return (
                <button
                  aria-checked={active}
                  className={cn(
                    "relative isolate flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left outline-none transition-[border-color,color,scale,opacity] duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                    free && !pending && "hover:border-foreground/25 active:scale-[0.98]",
                    !free && !pending && "cursor-not-allowed border-dashed opacity-60",
                    pending && "animate-pulse",
                    active && "border-transparent text-background",
                  )}
                  disabled={!free || pending}
                  key={periodStart}
                  onClick={() => setPeriod(periodStart)}
                  role="radio"
                  type="button"
                >
                  {active && (
                    <motion.span
                      className="-z-10 absolute inset-0 rounded-[11px] bg-foreground"
                      layoutId="period-pill"
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }}
                    />
                  )}
                  <span className="font-medium text-sm tabular-nums">{pending ? "\u00a0" : formatPeriod(periodStart)}</span>
                  <span className={cn("font-mono text-[11px] tabular-nums", active ? "text-background/70" : "text-muted-foreground")}>
                    {pending ? "\u00a0" : free ? `${formatPrice(price)} · open` : "Taken"}
                  </span>
                </button>
              );
            })}
          </div>
        </Step>

        <Step hint="Shown exactly as you type it, after review" n="03" title="Your ad">
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            <TextField error={show("productName")} id="productName" label="Product name">
              <Input
                aria-describedby="productName-error"
                aria-invalid={Boolean(show("productName"))}
                autoComplete="organization"
                id="productName"
                maxLength={32}
                onBlur={blur("productName")}
                onChange={(e) => set("productName", e.target.value)}
                placeholder="Acme"
                value={copy.productName}
              />
            </TextField>
            <TextField error={show("url")} id="url" label="Link">
              <Input
                aria-describedby="url-error"
                aria-invalid={Boolean(show("url"))}
                id="url"
                inputMode="url"
                onBlur={() => {
                  const value = copy.url.trim();
                  if (value && !/^[a-z]+:\/\//i.test(value)) set("url", `https://${value}`);
                  blur("url")();
                }}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://acme.dev"
                type="url"
                value={copy.url}
              />
            </TextField>
            <div className="sm:col-span-2">
              <TextField
                error={show("pitch")}
                hint={
                  <span
                    className={cn(
                      "font-mono text-[11px] tabular-nums transition-colors",
                      copy.pitch.trim().length > PITCH_MAX ? "text-destructive-foreground" : "text-muted-foreground",
                    )}
                  >
                    {copy.pitch.trim().length}/{PITCH_MAX}
                  </span>
                }
                id="pitch"
                label="One-line pitch"
              >
                <Input
                  aria-describedby="pitch-error"
                  aria-invalid={Boolean(show("pitch"))}
                  id="pitch"
                  maxLength={PITCH_MAX + 20}
                  onBlur={blur("pitch")}
                  onChange={(e) => set("pitch", e.target.value)}
                  placeholder="Deploy previews for every pull request, in seconds."
                  value={copy.pitch}
                />
              </TextField>
            </div>
            <TextField error={show("email")} hint={<span className="text-muted-foreground text-xs">Never shown</span>} id="email" label="Contact email">
              <Input
                aria-describedby="email-error"
                aria-invalid={Boolean(show("email"))}
                autoComplete="email"
                id="email"
                inputMode="email"
                onBlur={blur("email")}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@acme.dev"
                type="email"
                value={copy.email}
              />
            </TextField>
            <TextField error={show("monogram")} hint={<span className="text-muted-foreground text-xs">Optional</span>} id="monogram" label="Monogram">
              <Input
                aria-describedby="monogram-error"
                aria-invalid={Boolean(show("monogram"))}
                className="font-mono uppercase"
                id="monogram"
                maxLength={2}
                onBlur={blur("monogram")}
                onChange={(e) => set("monogram", e.target.value.toUpperCase())}
                placeholder={monogramOf(copy.productName || "Acme")}
                value={copy.monogram}
              />
            </TextField>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <span className="font-medium text-sm" id="accent-label">
                Accent
              </span>
              <div aria-labelledby="accent-label" className="flex flex-wrap gap-2" role="radiogroup">
                {accents.map((accent) => {
                  const active = accent.id === copy.accent;
                  return (
                    <button
                      aria-checked={active}
                      aria-label={accent.label}
                      className={cn(
                        "relative flex size-9 items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-background transition-[box-shadow,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-90",
                        active ? "ring-2 ring-foreground" : "shadow-[inset_0_0_0_1px] shadow-foreground/15 hover:scale-105",
                      )}
                      key={accent.id}
                      onClick={() => set("accent", accent.id)}
                      role="radio"
                      style={{ backgroundColor: accent.bg, color: accent.fg }}
                      title={accent.label}
                      type="button"
                    >
                      {active && (
                        <motion.span animate={{ scale: 1, opacity: 1 }} initial={reduce ? false : { scale: 0.4, opacity: 0 }}>
                          <CheckIcon className="size-4" />
                        </motion.span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Step>
      </div>

      <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
        <h3 className="flex items-baseline justify-between font-mono text-xs uppercase tracking-widest">
          <span className="text-foreground">Live preview</span>
          <span className="text-muted-foreground">{placements[placement].label}</span>
        </h3>
        <div className={cn("flex flex-col", format === "tile" && !wideTile && "h-[20rem]")}>
          {format === "tile" ? (
            <AdTile aspect={wideTile} className="flex-1" creative={preview} />
          ) : (
            <AdStrip creative={preview} />
          )}
        </div>
        <OgNote og={og} onUseImageChange={setUseImage} useImage={useImage} />

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t pt-5 text-sm">
          <dt className="text-muted-foreground">Placement</dt>
          <dd className="text-right">{placements[placement].label}</dd>
          <dt className="text-muted-foreground">Dates</dt>
          <dd className="text-right tabular-nums">{period ? `${formatPeriod(period)} (UTC)` : <span className="text-muted-foreground">Pick a fortnight</span>}</dd>
          <dt className="text-muted-foreground">Total</dt>
          <dd className="text-right font-semibold tabular-nums">{formatPrice(price)}</dd>
        </dl>

        <div className="flex flex-col gap-3">
          <Button className="w-full" disabled={!ready && attempted} loading={submitting} size="lg" type="submit">
            Continue to payment
            <ArrowRightIcon />
          </Button>
          {error && (
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-destructive/8 px-3 py-2 text-destructive-foreground text-sm"
              initial={reduce ? false : { opacity: 0, y: -4 }}
              role="alert"
            >
              {error}
            </motion.p>
          )}
          <p className="flex gap-2 text-muted-foreground text-xs leading-relaxed">
            <ShieldCheckIcon className="mt-px size-3.5 shrink-0 text-brand-ink" />
            <span>
              Every booking is reviewed within 48 hours. If we decline it, you're refunded in full, automatically. Your fortnight is held for 30
              minutes while you pay. Every click is UTM-tagged, and you get a private stats link with impressions and clicks.
            </span>
          </p>
        </div>
      </aside>
    </form>
  );
}
