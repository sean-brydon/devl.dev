"use client";

import {
  CheckIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface ConnectionCardValues {
  enabled: boolean;
  apiKey: string;
  siteUrl: string;
  timeZone: string;
}

export interface ConnectionCardService {
  name: string;
  description: string;
  icon: LucideIcon;
  iconClassName?: string;
}

export interface ConnectionCardProps {
  service: ConnectionCardService;
  defaultValues: ConnectionCardValues;
  timeZones?: { value: string; label: string }[];
  lastSaved?: { by: string; at: string };
  onSave?: (values: ConnectionCardValues) => Promise<void> | void;
  className?: string;
}

const defaultZones = [
  { value: "America/Los_Angeles", label: "Pacific Time — Los Angeles" },
  { value: "America/New_York", label: "Eastern Time — New York" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Berlin", label: "Central Europe — Berlin" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Australia/Sydney", label: "Sydney" },
];

const iconHit = "after:absolute after:-inset-1 transition-[scale,background-color] duration-150 ease-out active:scale-[0.94]";
const press = "transition-[scale,box-shadow,background-color] duration-150 ease-out active:scale-[0.97]";

const domain = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}(:\d{2,5})?(\/[^\s]*)?$/i;

function validateUrl(raw: string): string | null {
  const v = raw.trim().replace(/^https?:\/\//i, "");
  if (!v) return "Add the site this service sends from.";
  if (/\s/.test(v)) return "Remove the spaces.";
  if (!v.includes(".")) return "Use a full domain, like shop.example.com.";
  if (!domain.test(v)) return "That doesn't look like a valid domain.";
  return null;
}

function useClock(timeZone: string) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);
  if (!now) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(now);
  } catch {
    return null;
  }
}

function Changed({ on }: { on: boolean }) {
  return (
    <AnimatePresence>
      {on && (
        <motion.span
          animate={{ scale: 1, opacity: 1 }}
          aria-label="Changed"
          className="inline-block size-1.5 rounded-full bg-warning align-middle"
          exit={{ scale: 0.5, opacity: 0 }}
          initial={{ scale: 0.5, opacity: 0 }}
          role="img"
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
        />
      )}
    </AnimatePresence>
  );
}

function same(a: ConnectionCardValues, b: ConnectionCardValues) {
  return a.enabled === b.enabled && a.apiKey === b.apiKey && a.siteUrl === b.siteUrl && a.timeZone === b.timeZone;
}

export function ConnectionCard({
  service,
  defaultValues,
  timeZones = defaultZones,
  lastSaved,
  onSave,
  className,
}: ConnectionCardProps) {
  const reduce = useReducedMotion();
  const id = useId();
  const [saved, setSaved] = useState(defaultValues);
  const [values, setValues] = useState(defaultValues);
  const [footer, setFooter] = useState(lastSaved);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [urlTouched, setUrlTouched] = useState(false);
  const [phase, setPhase] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const checkTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      clearTimeout(copyTimer.current);
      clearTimeout(checkTimer.current);
      clearTimeout(savedTimer.current);
    },
    [],
  );

  const dirty = !same(values, saved);
  const urlError = validateUrl(values.siteUrl);
  const showUrlError = urlTouched && !checking && urlError;
  const clock = useClock(values.timeZone);
  const Icon = service.icon;
  const showBar = dirty || phase !== "idle";

  const set = <K extends keyof ConnectionCardValues>(key: K, v: ConnectionCardValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setPhase((p) => (p === "failed" ? "idle" : p));
  };

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(values.apiKey);
    } catch {}
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1600);
  };

  const onUrl = (v: string) => {
    set("siteUrl", v);
    setUrlTouched(true);
    setChecking(true);
    clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(() => setChecking(false), 450);
  };

  const save = async () => {
    if (!dirty || urlError || phase === "saving") return;
    setPhase("saving");
    try {
      await (onSave?.(values) ?? new Promise((r) => setTimeout(r, 900)));
      setSaved(values);
      setFooter({ by: "you", at: "just now" });
      setPhase("saved");
      savedTimer.current = setTimeout(() => setPhase("idle"), 1100);
    } catch {
      setPhase("failed");
    }
  };

  const discard = () => {
    setValues(saved);
    setPhase("idle");
    setUrlTouched(false);
    setChecking(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      save();
    }
  };

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 34 };
  const swap = {
    initial: reduce ? false : { opacity: 0, scale: 0.8, filter: "blur(2px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, filter: "blur(2px)" },
    transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] },
  } as const;

  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        "relative w-full max-w-[440px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5",
        className,
      )}
      onKeyDown={onKeyDown}
    >
      <header className="flex items-center gap-3 p-4">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl shadow-xs/5 transition-[filter,opacity] duration-300",
            service.iconClassName ?? "bg-info text-white",
            !values.enabled && "opacity-70 grayscale",
          )}
        >
          <Icon className="size-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-sm" id={`${id}-title`}>
            {service.name}
          </h3>
          <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full transition-colors",
                values.enabled ? "bg-success" : "bg-muted-foreground/40",
              )}
            />
            <span className="truncate">{values.enabled ? service.description : "Paused — nothing is sent"}</span>
          </p>
        </div>
        <Switch
          aria-label={`Enable ${service.name}`}
          checked={values.enabled}
          onCheckedChange={(v) => set("enabled", v)}
        />
      </header>

      <motion.div
        animate={{ opacity: values.enabled ? 1 : 0.5 }}
        className="flex flex-col gap-5 border-t p-4"
        inert={!values.enabled}
        transition={{ duration: 0.2 }}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <label className="flex items-center gap-1.5 font-medium text-sm" htmlFor={`${id}-key`}>
              API key
              <Changed on={values.apiKey !== saved.apiKey} />
            </label>
            <span className="text-muted-foreground text-xs">Server-side only</span>
          </div>
          <InputGroup>
            <InputGroupAddon>
              <KeyRoundIcon />
            </InputGroupAddon>
            <InputGroupInput
              autoComplete="off"
              className="font-mono text-[13px]"
              id={`${id}-key`}
              onChange={(e) => set("apiKey", e.target.value)}
              spellCheck={false}
              type={revealed ? "text" : "password"}
              value={values.apiKey}
            />
            <InputGroupAddon align="inline-end" className="gap-0.5">
              <Button
                aria-label={revealed ? "Hide API key" : "Show API key"} className={iconHit}
                aria-pressed={revealed}
                onClick={() => setRevealed((r) => !r)}
                size="icon-xs"
                variant="ghost"
              >
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span key={revealed ? "hide" : "show"} {...swap}>
                    {revealed ? <EyeOffIcon /> : <EyeIcon />}
                  </motion.span>
                </AnimatePresence>
              </Button>
              <Button aria-label="Copy API key" className={iconHit} onClick={copy} size="icon-xs" variant="ghost">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span key={copied ? "ok" : "copy"} {...swap}>
                    {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
                  </motion.span>
                </AnimatePresence>
              </Button>
            </InputGroupAddon>
          </InputGroup>
          <span aria-live="polite" className="sr-only">
            {copied ? "API key copied" : ""}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-1.5 font-medium text-sm" htmlFor={`${id}-url`}>
            Site URL
            <Changed on={values.siteUrl !== saved.siteUrl} />
          </label>
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText className="font-mono text-[13px]">https://</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              aria-describedby={`${id}-url-msg`}
              aria-invalid={showUrlError ? true : undefined}
              autoComplete="off"
              className="ps-0! font-mono text-[13px]"
              id={`${id}-url`}
              inputMode="url"
              onBlur={() => setUrlTouched(true)}
              onChange={(e) => onUrl(e.target.value)}
              placeholder="shop.example.com"
              spellCheck={false}
              value={values.siteUrl}
            />
            <InputGroupAddon align="inline-end">
              <AnimatePresence initial={false} mode="popLayout">
                {checking ? (
                  <motion.span key="checking" {...swap}>
                    <Spinner className="size-4 text-muted-foreground" />
                  </motion.span>
                ) : urlError ? (
                  urlTouched && (
                    <motion.span key="bad" {...swap}>
                      <CircleAlertIcon className="size-4 text-destructive-foreground opacity-100!" />
                    </motion.span>
                  )
                ) : (
                  <motion.span key="ok" {...swap}>
                    <CircleCheckIcon className="size-4 text-success opacity-100!" />
                  </motion.span>
                )}
              </AnimatePresence>
            </InputGroupAddon>
          </InputGroup>
          <AnimatePresence initial={false} mode="wait">
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className={cn("text-xs", showUrlError ? "text-destructive-foreground" : "text-muted-foreground")}
              exit={{ opacity: 0, y: reduce ? 0 : -2 }}
              id={`${id}-url-msg`}
              initial={reduce ? false : { opacity: 0, y: -2 }}
              key={showUrlError ? `e-${urlError}` : "hint"}
              transition={{ duration: 0.14 }}
            >
              {showUrlError ? urlError : "Links in every email point here."}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-1.5 font-medium text-sm" id={`${id}-tz`}>
              Time zone
              <Changed on={values.timeZone !== saved.timeZone} />
            </span>
            {clock && (
              <span className="text-muted-foreground text-xs tabular-nums">
                It's <span className="font-medium text-foreground">{clock}</span> there
              </span>
            )}
          </div>
          <Select items={timeZones} onValueChange={(v) => v && set("timeZone", String(v))} value={values.timeZone}>
            <SelectTrigger aria-labelledby={`${id}-tz`}>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {timeZones.map((z) => (
                <SelectItem key={z.value} value={z.value}>
                  {z.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <p className="text-muted-foreground text-xs">Digests go out at 9:00 in this time zone.</p>
        </div>
      </motion.div>

      <footer className="relative flex h-14 items-center border-t bg-muted/40 px-4">
        <p className="truncate text-muted-foreground text-xs">
          {footer ? (
            <>
              Last saved by <span className="font-medium text-foreground">{footer.by}</span> · {footer.at}
            </>
          ) : (
            "No changes yet"
          )}
        </p>
        <AnimatePresence>
          {showBar && (
            <motion.div
              animate={{ y: 0, opacity: 1 }}
              className="absolute inset-x-1.5 bottom-1.5 flex h-11 items-center gap-2 rounded-lg border bg-popover ps-3 pe-1.5 shadow-lg/5"
              exit={{ y: reduce ? 0 : 56, opacity: reduce ? 0 : 1 }}
              initial={{ y: reduce ? 0 : 56, opacity: reduce ? 0 : 1 }}
              role="status"
              transition={spring}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {phase === "saved" ? (
                  <motion.span
                    animate={{ opacity: 1, y: 0 }}
                    className="flex min-w-0 flex-1 items-center gap-2 font-medium text-sm"
                    initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                    key="saved"
                    transition={spring}
                  >
                    <span className="flex size-4.5 items-center justify-center rounded-full bg-success text-white">
                      <CheckIcon className="size-3" strokeWidth={3} />
                    </span>
                    Saved
                  </motion.span>
                ) : (
                  <motion.span
                    animate={{ opacity: 1, y: 0 }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-sm"
                    exit={{ opacity: 0, y: reduce ? 0 : -8 }}
                    key="dirty"
                    transition={spring}
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        phase === "failed" ? "bg-destructive" : "bg-warning",
                      )}
                    />
                    <span className="truncate">
                      {urlError
                        ? "Fix the URL to save"
                        : phase === "failed"
                          ? "Couldn’t save. Try again."
                          : "Unsaved changes"}
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
              {phase !== "saved" && (
                <>
                  <Button className={press} disabled={phase === "saving"} onClick={discard} size="sm" variant="ghost">
                    Discard
                  </Button>
                  <Button className={press} disabled={!!urlError} loading={phase === "saving"} onClick={save} size="sm">
                    Save
                    <Kbd className="-me-1 hidden bg-primary-foreground/16 text-primary-foreground/80 sm:inline-flex">
                      ⌘S
                    </Kbd>
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </section>
  );
}
