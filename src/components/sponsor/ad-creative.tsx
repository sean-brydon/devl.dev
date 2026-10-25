"use client";

import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { accentOf, monogramOf } from "@/lib/sponsors";
import { withUtm } from "@/lib/utm";
import { cn } from "@/lib/utils";

export interface AdCreative {
  name: string;
  title?: string;
  pitch: string;
  url: string;
  accent: string;
  monogram?: string | null;
  image?: string | null;
  href?: string;
  utm?: { campaign: string; content?: string };
  cta?: string;
  label: "Sponsored" | "Built with" | "Featured" | "Preview";
  rel: "sponsored noopener" | "noopener";
  secondary?: { label: string; url: string };
}

export function Monogram({ creative, className }: { creative: Pick<AdCreative, "name" | "accent" | "monogram">; className?: string }) {
  const accent = accentOf(creative.accent);
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-[28%] font-heading font-semibold tracking-tight shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_1px_2px_rgb(0_0_0/0.08)] ring-1 ring-foreground/10 ring-inset",
        className,
      )}
      style={{ backgroundColor: accent.bg, color: accent.fg }}
    >
      {monogramOf(creative.name, creative.monogram)}
    </span>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** House ads tag their links client-side so utm_content can be the page the ad was seen on. */
function useOutbound(creative: AdCreative) {
  const pathname = usePathname();
  const tag = (url: string) =>
    creative.utm
      ? (withUtm(url, {
          medium: creative.label === "Sponsored" ? "sponsored" : "referral",
          campaign: creative.utm.campaign,
          content: creative.utm.content ?? pathname,
        }) ?? url)
      : url;
  return { href: creative.href ?? tag(creative.url), secondary: creative.secondary ? tag(creative.secondary.url) : undefined };
}

function Label({ children, onImage = false }: { children: ReactNode; onImage?: boolean }) {
  return (
    <span className={cn("font-mono text-[10px] uppercase tracking-widest", onImage ? "text-white/90" : "text-muted-foreground")}>
      {children}
    </span>
  );
}

/** Falls back to the monogram design when the image is missing, broken, or failed before hydration. */
function useImage(src: string | null | undefined) {
  const ref = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">(src ? "loading" : "error");
  useEffect(() => {
    setState(src ? "loading" : "error");
    const img = ref.current;
    if (img?.complete) setState(img.naturalWidth > 0 ? "ready" : "error");
  }, [src]);
  return {
    ref,
    state,
    show: Boolean(src) && state !== "error",
    props: { onLoad: () => setState("ready"), onError: () => setState("error") },
  };
}

function AdPicture({ src, image, fill = false, className }: { src: string; image: ReturnType<typeof useImage>; fill?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden",
        fill ? "absolute inset-0" : "relative bg-muted",
        fill && image.state !== "ready" && "pointer-events-none opacity-0",
        className,
      )}
    >
      {fill && (
        <img
          alt=""
          aria-hidden
          className={cn(
            "absolute inset-0 size-full scale-110 object-cover blur-2xl transition-opacity duration-500 ease-out",
            image.state === "ready" ? "opacity-70" : "opacity-0",
          )}
          decoding="async"
          loading="lazy"
          src={src}
        />
      )}
      <img
        alt=""
        className={cn(
          "absolute inset-0 size-full transition-[opacity,scale] duration-500 ease-out [@media(hover:hover)]:group-hover:scale-[1.015]",
          fill ? "object-contain" : "object-cover",
          image.state === "ready" ? "opacity-100" : "opacity-0",
        )}
        decoding="async"
        loading="lazy"
        ref={image.ref}
        src={src}
        {...image.props}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-black/8 ring-inset dark:ring-white/10" />
    </div>
  );
}

/** Same footprint and caption rhythm as ItemCard, so an ad sits in the grid without shouting. */
export function AdTile({ creative, aspect = false, className }: { creative: AdCreative; aspect?: boolean; className?: string }) {
  const accent = accentOf(creative.accent);
  const external = creative.url.startsWith("http");
  const outbound = useOutbound(creative);
  const image = useImage(creative.image);
  const ready = image.show && image.state === "ready";
  return (
    <article className={cn("group relative flex min-w-0 flex-col gap-2", className)}>
      <div
        className={cn(
          "relative isolate flex min-h-0 flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 p-6 text-center transition-[border-color,box-shadow,scale] duration-200 ease-out group-active:scale-[0.99] dark:border-border dark:bg-card",
          "[@media(hover:hover)]:group-hover:border-neutral-300 [@media(hover:hover)]:group-hover:shadow-md/5 dark:[@media(hover:hover)]:group-hover:border-foreground/15",
          aspect ? "aspect-[16/10]" : "flex-1",
        )}
      >
        {image.show && creative.image && <AdPicture className="z-10 rounded-[inherit]" fill image={image} src={creative.image} />}
        {ready ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 left-0 z-10 h-14 w-44 bg-[radial-gradient(ellipse_at_top_left,rgb(0_0_0/0.55),transparent_70%)]"
            />
            <span className="absolute top-3 left-3.5 z-10">
              <Label onImage>{creative.label}</Label>
            </span>
          </>
        ) : (
          <>
            <div
              aria-hidden
              className="-z-10 absolute inset-x-0 top-0 h-2/3 opacity-25 blur-3xl transition-opacity duration-300 dark:opacity-15 [@media(hover:hover)]:group-hover:opacity-40 dark:[@media(hover:hover)]:group-hover:opacity-25"
              style={{ background: `radial-gradient(50% 60% at 50% 30%, ${accent.bg}, transparent)` }}
            />
            <span className="absolute top-3 left-3.5">
              <Label>{creative.label}</Label>
            </span>
            <Monogram
              className="size-14 text-xl transition-transform duration-300 ease-[cubic-bezier(.2,.9,.3,1.3)] [@media(hover:hover)]:group-hover:-rotate-3 [@media(hover:hover)]:group-hover:scale-105"
              creative={creative}
            />
            <div className="flex max-w-[18rem] flex-col gap-1.5">
              <p className="text-balance font-heading font-semibold text-lg leading-tight tracking-tight">{creative.title ?? creative.name}</p>
              <p className="text-pretty text-muted-foreground text-sm leading-snug">{creative.pitch}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border bg-background/70 px-2.5 py-1 font-medium text-xs backdrop-blur transition-[background-color,translate] duration-200 [@media(hover:hover)]:group-hover:-translate-y-0.5">
              {creative.cta ?? `Visit ${hostOf(creative.url)}`}
              <ArrowUpRightIcon className="size-3 transition-transform duration-200 [@media(hover:hover)]:group-hover:translate-x-px [@media(hover:hover)]:group-hover:-translate-y-px" />
            </span>
            {creative.secondary && (
              <a
                className="relative z-10 font-mono text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                href={outbound.secondary}
                rel="noopener"
                target="_blank"
              >
                {creative.secondary.label}
              </a>
            )}
          </>
        )}
      </div>
      <div className="flex items-baseline gap-2 px-0.5">
        <span className="font-mono text-[11px] text-muted-foreground/60">{creative.label === "Sponsored" ? "Ad" : "—"}</span>
        <h3 className="min-w-0 flex-1 truncate font-medium text-sm">
          <a
            className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
            href={outbound.href}
            rel={external ? creative.rel : undefined}
            target={external ? "_blank" : undefined}
          >
            {creative.name}
          </a>
        </h3>
        <span className="hidden truncate text-muted-foreground text-xs sm:block sm:max-w-[55%]">
          {ready ? creative.pitch : hostOf(creative.url)}
        </span>
      </div>
    </article>
  );
}

/** The quiet "this could be you" tile: dashed outline, no fill, one line of copy. */
export function PlaceholderTile({ priceLabel, aspect = false, className }: { priceLabel?: string; aspect?: boolean; className?: string }) {
  return (
    <article className={cn("group relative flex min-w-0 flex-col gap-2", className)}>
      <div
        className={cn(
          "flex min-h-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-neutral-300 p-6 text-center transition-colors duration-200 dark:border-border [@media(hover:hover)]:group-hover:border-neutral-400 dark:[@media(hover:hover)]:group-hover:border-foreground/20",
          aspect ? "aspect-[16/10]" : "flex-1",
        )}
      >
        <p className="text-muted-foreground text-sm">Your product here</p>
        {priceLabel && <p className="font-mono text-[11px] text-muted-foreground/60">{priceLabel}</p>}
      </div>
      <div className="flex items-baseline gap-2 px-0.5">
        <span className="font-mono text-[11px] text-muted-foreground/60">Ad</span>
        <h3 className="min-w-0 flex-1 truncate text-muted-foreground text-sm">
          <Link
            className="outline-none transition-colors after:absolute after:inset-0 after:rounded-2xl hover:text-foreground focus-visible:after:ring-2 focus-visible:after:ring-ring"
            href="/advertise"
          >
            Advertise on devl
          </Link>
        </h3>
      </div>
    </article>
  );
}

export function TileSkeleton({ aspect = false }: { aspect?: boolean }) {
  return (
    <div aria-hidden className="flex min-w-0 flex-col gap-2">
      <div className={cn("rounded-2xl border border-dashed border-neutral-200 dark:border-border/60", aspect ? "aspect-[16/10]" : "flex-1")} />
      <div className="h-5" />
    </div>
  );
}

export function AdCard({ creative, footer }: { creative: AdCreative; footer?: ReactNode }) {
  const external = creative.url.startsWith("http");
  const outbound = useOutbound(creative);
  const image = useImage(creative.image);
  return (
    <div className="flex flex-col gap-2">
      <div className="group relative flex flex-col rounded-2xl border bg-card p-1.5 transition-[border-color,box-shadow,scale] duration-200 ease-out active:scale-[0.99] [@media(hover:hover)]:hover:border-foreground/15 [@media(hover:hover)]:hover:shadow-md/5">
        {image.show && creative.image && (
          <AdPicture className="aspect-video rounded-[calc(var(--radius-2xl)-0.375rem)]" image={image} src={creative.image} />
        )}
        <div className="flex flex-col gap-3 p-2.5">
          <div className="flex items-start gap-3">
            {!image.show && (
              <Monogram
                className="size-10 text-sm transition-transform duration-300 ease-[cubic-bezier(.2,.9,.3,1.3)] [@media(hover:hover)]:group-hover:-rotate-3"
                creative={creative}
              />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <a
                  className="truncate font-medium text-sm outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
                  href={outbound.href}
                  rel={external ? creative.rel : undefined}
                  target={external ? "_blank" : undefined}
                >
                  {creative.title ?? creative.name}
                </a>
                <Label>{creative.label}</Label>
              </div>
              <p className="text-pretty text-muted-foreground text-sm leading-snug">{creative.pitch}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <span className="inline-flex items-center gap-1 font-medium text-xs">
              {creative.cta ?? `Visit ${hostOf(creative.url)}`}
              <ArrowUpRightIcon className="size-3 transition-transform duration-200 [@media(hover:hover)]:group-hover:translate-x-px [@media(hover:hover)]:group-hover:-translate-y-px" />
            </span>
            {creative.secondary && (
              <a
                className="relative z-10 font-mono text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                href={outbound.secondary}
                rel="noopener"
                target="_blank"
              >
                {creative.secondary.label}
              </a>
            )}
          </div>
        </div>
      </div>
      {footer}
    </div>
  );
}

export function AdStrip({ creative, aside }: { creative: AdCreative; aside?: ReactNode }) {
  const external = creative.url.startsWith("http");
  const outbound = useOutbound(creative);
  const image = useImage(creative.image);
  return (
    <div className="group relative flex items-center gap-4 rounded-2xl border bg-card p-2 pe-4 transition-[border-color,box-shadow,scale] duration-200 ease-out active:scale-[0.995] [@media(hover:hover)]:hover:border-foreground/15 [@media(hover:hover)]:hover:shadow-md/5">
      {image.show && creative.image ? (
        <div className="relative aspect-[1.91/1] w-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-32">
          <img
            alt=""
            className={cn("absolute inset-0 size-full object-cover transition-opacity duration-300", image.state === "ready" ? "opacity-100" : "opacity-0")}
            decoding="async"
            loading="lazy"
            ref={image.ref}
            src={creative.image}
            {...image.props}
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-black/8 ring-inset dark:ring-white/10" />
        </div>
      ) : (
        <Monogram className="ms-1 size-11 shrink-0 text-sm" creative={creative} />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <a
            className="truncate font-medium text-sm outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
            href={outbound.href}
            rel={external ? creative.rel : undefined}
            target={external ? "_blank" : undefined}
          >
            {creative.title ?? creative.name}
          </a>
          <Label>{creative.label}</Label>
        </div>
        <p className="line-clamp-2 text-pretty text-muted-foreground text-sm leading-snug sm:line-clamp-1">{creative.pitch}</p>
      </div>
      <span className="hidden shrink-0 items-center gap-1 font-medium text-xs sm:inline-flex">
        {creative.cta ?? `Visit ${hostOf(creative.url)}`}
        <ArrowUpRightIcon className="size-3 transition-transform duration-200 [@media(hover:hover)]:group-hover:translate-x-px [@media(hover:hover)]:group-hover:-translate-y-px" />
      </span>
      {aside && <div className="relative z-10 hidden shrink-0 border-s ps-4 md:block">{aside}</div>}
    </div>
  );
}

export function AdvertiseHereLink() {
  return (
    <Link className="self-end px-1 font-mono text-[11px] text-muted-foreground/70 transition-colors hover:text-foreground" href="/advertise">
      Advertise here →
    </Link>
  );
}
