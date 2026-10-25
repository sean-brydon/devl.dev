"use client";

import { ArrowRightIcon, CheckIcon, GlobeIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { AnimatePresence, motion, MotionConfig, useInView, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export interface FooterLink {
  label: string;
  href: string;
  badge?: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export type FooterTheme = "system" | "light" | "dark";
export type FooterStatus = "operational" | "degraded" | "outage";

export interface MegaFooterProps {
  brand: { name: string; mark?: ReactNode; tagline?: string; href?: string };
  columns: FooterColumn[];
  socials?: { label: string; href: string; icon: ReactNode }[];
  status?: { state: FooterStatus; label?: string; href: string };
  locales?: { value: string; label: string }[];
  defaultLocale?: string;
  onLocaleChange?: (value: string) => void;
  theme?: FooterTheme;
  onThemeChange?: (theme: FooterTheme) => void;
  legal?: FooterLink[];
  copyright?: string;
  newsletter?: { title: string; placeholder?: string; onSubscribe?: (email: string) => void };
  className?: string;
}

const statusStyle: Record<FooterStatus, { dot: string; ring: string; label: string }> = {
  operational: { dot: "bg-emerald-500", ring: "bg-emerald-500/40", label: "All systems normal" },
  degraded: { dot: "bg-amber-500", ring: "bg-amber-500/40", label: "Some systems degraded" },
  outage: { dot: "bg-red-500", ring: "bg-red-500/40", label: "Ongoing incident" },
};

const themes: { value: FooterTheme; label: string; icon: typeof SunIcon }[] = [
  { value: "system", label: "System", icon: MonitorIcon },
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
];

const linkClass =
  "relative rounded-sm text-muted-foreground after:absolute after:-inset-x-1 after:-inset-y-1.5 after:content-['']  text-sm outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

function ThemeSwitch({ value, onChange }: { value: FooterTheme; onChange: (t: FooterTheme) => void }) {
  const reduce = useReducedMotionSafe();
  const id = useId();
  return (
    <div aria-label="Theme" className="flex rounded-full border bg-muted p-0.5" role="radiogroup">
      {themes.map((t) => {
        const on = value === t.value;
        return (
          <button
            aria-checked={on}
            aria-label={t.label}
            className={cn(
              "relative flex size-6.5 cursor-pointer items-center justify-center rounded-full outline-none after:absolute after:-inset-[3px] after:content-[''] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
              on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            key={t.value}
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const i = themes.findIndex((x) => x.value === value);
              const next = themes[(i + (e.key === "ArrowRight" ? 1 : themes.length - 1)) % themes.length];
              onChange(next.value);
              (e.currentTarget.parentElement?.children[themes.indexOf(next)] as HTMLElement | undefined)?.focus();
            }}
            role="radio"
            tabIndex={on ? 0 : -1}
            title={t.label}
            type="button"
          >
            {on && (
              <motion.span
                className="absolute inset-0 rounded-full bg-background shadow-xs/5 dark:bg-input"
                layoutId={id}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <t.icon className="relative size-3.5" />
          </button>
        );
      })}
    </div>
  );
}

function FooterNewsletter({ title, placeholder, onSubscribe }: NonNullable<MegaFooterProps["newsletter"]>) {
  const fieldId = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setState("error");
    onSubscribe?.(email.trim());
    setState("done");
  };
  return (
    <form className="mt-8 max-w-xs" noValidate onSubmit={submit}>
      <label className="font-medium text-sm" htmlFor={fieldId}>
        {title}
      </label>
      <div
        className={cn(
          "mt-2.5 flex h-10 items-center rounded-lg border bg-background p-1 shadow-xs/5 transition-[border-color,box-shadow] duration-150 has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/24 sm:h-9 dark:bg-input/32",
          state === "error" && "border-destructive/40",
        )}
      >
        <input
          aria-describedby={`${fieldId}-msg`}
          aria-invalid={state === "error"}
          autoComplete="email"
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-base outline-none placeholder:text-muted-foreground/70 sm:text-sm"
          disabled={state === "done"}
          id={fieldId}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          placeholder={placeholder ?? "you@company.com"}
          type="email"
          value={email}
        />
        <button
          aria-label="Subscribe"
          className={cn(
            "flex aspect-square h-full shrink-0 cursor-pointer items-center justify-center rounded-sm outline-none transition-[background-color,translate,scale,rotate] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.94]",
            state === "done" ? "bg-success text-white" : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
          disabled={state === "done"}
          type="submit"
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              initial={{ opacity: 0, scale: 0.6 }}
              key={state === "done" ? "done" : "go"}
              transition={{ duration: 0.18 }}
            >
              {state === "done" ? <CheckIcon className="size-3.5" strokeWidth={3} /> : <ArrowRightIcon className="size-3.5" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
      <p
        className={cn("mt-1.5 min-h-4 text-xs", state === "error" ? "text-destructive-foreground" : "text-muted-foreground")}
        id={`${fieldId}-msg`}
        role={state === "error" ? "alert" : undefined}
      >
        {state === "error"
          ? "Check the address and try again."
          : state === "done"
            ? "Thanks. The next digest lands on the 1st."
            : "One email a month. No tracking pixels."}
      </p>
    </form>
  );
}

export function MegaFooter({
  brand,
  columns,
  socials = [],
  status,
  locales = [],
  defaultLocale,
  onLocaleChange,
  theme: themeProp,
  onThemeChange,
  legal = [],
  copyright,
  newsletter,
  className,
}: MegaFooterProps) {
  const reduce = useReducedMotionSafe();
  const statusRef = useRef<HTMLAnchorElement>(null);
  const statusVisible = useInView(statusRef);
  const [themeState, setThemeState] = useState<FooterTheme>(themeProp ?? "system");
  const theme = themeProp ?? themeState;
  const [locale, setLocale] = useState(defaultLocale ?? locales[0]?.value);
  const s = status ? statusStyle[status.state] : null;

  return (
    <MotionConfig reducedMotion="user">
      <footer className={cn("relative mx-auto w-full max-w-[1100px] overflow-hidden", className)}>
        <div className="grid gap-12 border-t pt-12 sm:pt-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)] lg:gap-16">
          <div>
            <a className="inline-flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring" href={brand.href ?? "#"}>
              {brand.mark}
              <span className="font-heading font-semibold text-base tracking-tight">{brand.name}</span>
            </a>
            {brand.tagline && (
              <p className="mt-3 max-w-xs text-pretty text-muted-foreground text-sm leading-relaxed">{brand.tagline}</p>
            )}
            {newsletter && <FooterNewsletter {...newsletter} />}
            {socials.length > 0 && (
              <ul className="mt-6 flex gap-1">
                {socials.map((social) => (
                  <li key={social.label}>
                    <a
                      aria-label={social.label}
                      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-[background-color,color,translate,scale,rotate] duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.94] [&_svg]:size-4"
                      href={social.href}
                    >
                      {social.icon}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="font-medium text-sm">{column.title}</h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li className="flex items-center gap-2" key={link.label}>
                      <a className={linkClass} href={link.href}>
                        {link.label}
                      </a>
                      {link.badge && (
                        <span className="rounded-full bg-success/10 px-1.5 py-px font-medium text-[0.625rem] text-success-foreground tabular-nums">
                          {link.badge}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div aria-hidden className="pointer-events-none mt-10 select-none overflow-hidden sm:mt-14">
          <motion.p
            className="bg-linear-to-b from-foreground/14 via-foreground/6 to-foreground/0 bg-clip-text text-center font-heading font-semibold text-[clamp(4rem,19vw,13.5rem)] text-transparent leading-[0.8] tracking-[-0.06em]"
            initial={{ opacity: 0, y: "16%" }}
            transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
            viewport={{ once: true, amount: 0.4 }}
            whileInView={{ opacity: 1, y: "0%" }}
          >
            {brand.name.toLowerCase()}
          </motion.p>
        </div>

        <div className="relative flex flex-col gap-5 border-t py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
            {status && s && (
              <a
                className="inline-flex w-fit items-center gap-2 rounded-full border bg-background py-1 ps-2.5 pe-3 text-xs outline-none transition-colors duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                href={status.href}
                ref={statusRef}
              >
                <span className="relative flex size-2">
                  {!reduce && statusVisible && <span className={cn("absolute inset-0 animate-ping rounded-full [animation-duration:2.4s]", s.ring)} />}
                  <span className={cn("relative size-2 rounded-full", s.dot)} />
                </span>
                {status.label ?? s.label}
              </a>
            )}
            <p className="text-muted-foreground text-xs">{copyright ?? `© ${new Date().getFullYear()} ${brand.name}`}</p>
            {legal.length > 0 && (
              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {legal.map((link) => (
                  <li key={link.label}>
                    <a className={cn(linkClass, "text-xs")} href={link.href}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-2">
            {locales.length > 0 && (
              <Select
                items={locales}
                onValueChange={(v) => {
                  if (!v) return;
                  setLocale(v as string);
                  onLocaleChange?.(v as string);
                }}
                value={locale}
              >
                <SelectTrigger aria-label="Language" className="h-8 w-auto min-w-0 gap-1.5 rounded-full ps-2.5 text-xs sm:min-h-8 sm:text-xs" size="sm">
                  <GlobeIcon className="size-3.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup align="end">
                  {locales.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            )}
            <ThemeSwitch
              onChange={(t) => {
                setThemeState(t);
                onThemeChange?.(t);
              }}
              value={theme}
            />
          </div>
        </div>
      </footer>
    </MotionConfig>
  );
}
