"use client";

import { ArrowRightIcon, CheckIcon, CopyIcon, LinkIcon, PartyPopperIcon, PlusIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface WaitlistReferral {
  id: string;
  name: string;
  tone?: string;
}

export interface WaitlistTicket {
  position: number;
  total: number;
  link: string;
}

export interface WaitlistWave {
  label: string;
  upTo: number;
}

export interface WaitlistProps {
  product?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  waiting?: number;
  spotsPerReferral?: number;
  goal?: number;
  waves?: WaitlistWave[];
  referrals?: WaitlistReferral[];
  defaultEmail?: string;
  onJoin?: (email: string) => Promise<WaitlistTicket>;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;
const press = "transition-[box-shadow,scale,background-color] duration-150 active:scale-[0.97]";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FALLBACK_TONES = [
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function useMeasuredHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, height] as const;
}

function Digit({ value }: { value: number }) {
  const reduce = useReducedMotion();
  return (
    <span aria-hidden className="relative inline-block h-[1.1em] w-[0.62em] overflow-hidden">
      <motion.span
        animate={{ y: `${-value * 1.1}em` }}
        className="absolute inset-x-0 top-0 flex flex-col items-center"
        initial={false}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span className="block h-[1.1em] leading-[1.1em]" key={n}>
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function Rolling({ value, className }: { value: number; className?: string }) {
  const text = value.toLocaleString("en-US");
  const chars = text.split("");
  return (
    <span className={cn("inline-flex tabular-nums leading-[1.1em]", className)}>
      <span className="sr-only">{text}</span>
      {chars.map((ch, i) => {
        const key = chars.length - i;
        return /\d/.test(ch) ? (
          <Digit key={`d${key}`} value={Number(ch)} />
        ) : (
          <span aria-hidden className="w-[0.3em] text-center" key={`s${key}`}>
            {ch}
          </span>
        );
      })}
    </span>
  );
}

export function Waitlist({
  product = "Parcel",
  eyebrow = "Early access",
  title = "Notes that file themselves.",
  subtitle = "Parcel reads what you write and sorts it into the right project, so your inbox of ideas stays at zero.",
  waiting = 6212,
  spotsPerReferral = 250,
  goal = 3,
  waves = [
    { label: "Wave 1", upTo: 500 },
    { label: "Wave 2", upTo: 2000 },
    { label: "Wave 3", upTo: Number.POSITIVE_INFINITY },
  ],
  referrals = [],
  defaultEmail = "",
  onJoin = async () => ({ position: waiting + 1, total: waiting + 1, link: "parcel.so/r/you" }),
  className,
}: WaitlistProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState<WaitlistTicket | null>(null);
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState<number | null>(null);
  const [cardRef, cardHeight] = useMeasuredHeight<HTMLDivElement>();

  const target = ticket ? Math.max(1, ticket.position - referrals.length * spotsPerReferral) : 0;
  const waveIndex = waves.findIndex((w) => target <= w.upTo);
  const wave = waves[waveIndex];
  const nextWave = waveIndex > 0 ? waves[waveIndex - 1] : undefined;

  useEffect(() => {
    if (!ticket) return;
    if (shown === null) {
      setShown(ticket.total);
      const t = setTimeout(() => setShown(target), reduce ? 0 : 120);
      return () => clearTimeout(t);
    }
    setShown(target);
  }, [ticket, target]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setError("Enter an email address so we can save your spot.");
      return;
    }
    setError(undefined);
    setBusy(true);
    const t = await onJoin(email.trim());
    setBusy(false);
    setTicket(t);
  };

  const copyLink = async () => {
    if (!ticket) return;
    try {
      await navigator.clipboard.writeText(`https://${ticket.link}`);
    } catch {
      // Blocked clipboard (e.g. sandboxed iframe): the link is still selectable in the field.
    }
    setCopied(true);
  };

  const latest = referrals[referrals.length - 1];
  const prevWave = waves.findIndex((w) => target + spotsPerReferral <= w.upTo);
  const promoted = latest && prevWave !== waveIndex;
  const progressTo = ticket && nextWave ? Math.min(1, Math.max(0.03, (ticket.total - target) / Math.max(1, ticket.total - nextWave.upTo))) : 1;

  return (
    <section className={cn("mx-auto grid w-full max-w-[1000px] items-center gap-8 md:grid-cols-[1fr_440px] md:gap-12", className)}>
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 font-medium text-xs shadow-xs/5">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-success/60 motion-reduce:hidden" />
            <span className="relative size-1.5 rounded-full bg-success" />
          </span>
          {eyebrow}
        </span>
        <h2 className="mt-4 text-balance font-semibold text-3xl tracking-tight sm:text-4xl">{title}</h2>
        <p className="mt-3 max-w-[44ch] text-pretty text-muted-foreground">{subtitle}</p>
        <div className="mt-6 flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {["Ines Vale", "Kofi Mensah", "Lena Park", "Ravi Shah"].map((n, i) => (
              <span className="rounded-full bg-background ring-2 ring-background" key={n}>
                <span className={cn("flex size-7 items-center justify-center rounded-full font-medium text-[0.625rem]", FALLBACK_TONES[i])}>
                  {initials(n)}
                </span>
              </span>
            ))}
          </div>
          <p className="text-muted-foreground text-sm">
            <span className="font-medium text-foreground tabular-nums">{(ticket?.total ?? waiting).toLocaleString("en-US")}</span> people waiting
          </p>
        </div>
      </div>

      <motion.div
        animate={{ height: cardHeight }}
        className="box-content overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5"
        initial={false}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 38 }}
      >
        <div ref={cardRef}>
        <AnimatePresence initial={false} mode="wait">
          {!ticket ? (
            <motion.form
              animate={{ opacity: 1 }}
              className="p-5 sm:p-6"
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              initial={false}
              key="join"
              noValidate
              onSubmit={submit}
            >
              <p className="font-medium text-sm">Save your spot in line</p>
              <p className="mt-1 text-muted-foreground text-sm">One email when it’s your turn. Nothing else.</p>
              <label className="sr-only" htmlFor={`${uid}-email`}>
                Email
              </label>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input
                  aria-describedby={error ? `${uid}-err` : undefined}
                  aria-invalid={error ? true : undefined}
                  autoComplete="email"
                  className="flex-1"
                  id={`${uid}-email`}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(undefined);
                  }}
                  placeholder="you@studio.com"
                  type="email"
                  value={email}
                />
                <Button className={press} loading={busy} type="submit">
                  Join waitlist
                  <ArrowRightIcon />
                </Button>
              </div>
              <AnimatePresence initial={false}>
                {error && (
                  <motion.p
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden text-destructive-foreground text-xs"
                    exit={{ height: 0, opacity: 0 }}
                    id={`${uid}-err`}
                    initial={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease }}
                  >
                    <span className="block pt-2">{error}</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.form>
          ) : (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              key="ticket"
              transition={{ duration: 0.26, ease }}
            >
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 font-medium text-sm">
                      <CheckIcon className="size-4 text-success-foreground" strokeWidth={2.5} />
                      You’re on the list
                    </p>
                    <p className="mt-0.5 text-muted-foreground text-xs">{email.trim()}</p>
                  </div>
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 font-medium text-xs",
                        waveIndex === 0
                          ? "bg-success/12 text-success-foreground"
                          : waveIndex === 1
                            ? "bg-info/12 text-info-foreground"
                            : "bg-muted text-muted-foreground",
                      )}
                      exit={{ opacity: 0, scale: 0.9 }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      key={wave?.label}
                      transition={{ duration: 0.2, ease }}
                    >
                      {wave?.label}
                    </motion.span>
                  </AnimatePresence>
                </div>

                <div className="relative mt-5 flex items-end gap-2">
                  <span className="flex font-semibold text-5xl leading-[1.1em] tracking-tight">
                    <span aria-hidden className="me-0.5 text-muted-foreground/60">#</span>
                    <Rolling value={shown ?? ticket.total} />
                  </span>
                  <span className="mb-1.5 text-muted-foreground text-sm tabular-nums">of {ticket.total.toLocaleString("en-US")}</span>
                  <AnimatePresence>
                    {latest && (
                      <motion.span
                        animate={{ opacity: [0, 1, 1, 0], y: [6, 0, -4, -10] }}
                        className="pointer-events-none absolute top-0 right-0 rounded-full bg-success/12 px-2 py-0.5 font-medium text-success-foreground text-xs tabular-nums"
                        initial={{ opacity: 0 }}
                        key={latest.id}
                        transition={{ duration: reduce ? 0.01 : 2.2, times: [0, 0.12, 0.8, 1], ease: "easeOut" }}
                      >
                        ↑ {spotsPerReferral} spots
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {nextWave ? (
                  <div className="mt-4">
                    <div className="flex justify-between text-muted-foreground text-xs">
                      <span>
                        <span className="text-foreground tabular-nums">{Math.max(0, target - nextWave.upTo).toLocaleString("en-US")}</span> spots
                        to {nextWave.label}
                      </span>
                      <span className="tabular-nums">#{nextWave.upTo.toLocaleString("en-US")}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        animate={{ scaleX: progressTo }}
                        className="h-full origin-left rounded-full bg-foreground"
                        initial={{ scaleX: 0 }}
                        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 24 }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm text-success-foreground">
                    <PartyPopperIcon className="size-4" />
                    You’re in the first wave. Watch your inbox.
                  </p>
                )}
              </div>

              <div className="border-t bg-muted/40 p-5 sm:p-6">
                <p className="font-medium text-sm">Skip ahead</p>
                <p className="mt-0.5 text-pretty text-muted-foreground text-sm">
                  Every friend who joins with your link moves you up {spotsPerReferral} spots.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-background px-3 text-sm sm:h-8 dark:bg-input/32">
                    <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate font-mono text-[0.8125rem]">{ticket.link}</span>
                  </div>
                  <Button className={cn("w-[88px]", press)} onClick={copyLink} variant="outline">
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1.5"
                        exit={{ opacity: 0, y: -6 }}
                        initial={{ opacity: 0, y: 6 }}
                        key={copied ? "y" : "n"}
                        transition={{ duration: 0.15, ease }}
                      >
                        {copied ? <CheckIcon className="text-success-foreground" /> : <CopyIcon />}
                        {copied ? "Copied" : "Copy"}
                      </motion.span>
                    </AnimatePresence>
                  </Button>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <ul aria-label="Friends who joined" className="flex gap-2">
                    {Array.from({ length: goal }, (_, i) => {
                      const r = referrals[i];
                      return (
                        <li className="relative size-9" key={i}>
                          <span className="absolute inset-0 flex items-center justify-center rounded-full border border-dashed border-foreground/20 text-muted-foreground/60">
                            <PlusIcon className="size-3.5" />
                          </span>
                          <AnimatePresence>
                            {r && (
                              <motion.span
                                animate={{ scale: 1, opacity: 1 }}
                                className={cn(
                                  "absolute inset-0 flex items-center justify-center rounded-full bg-card font-medium text-xs ring-2 ring-card",
                                )}
                                initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 26 }}
                              >
                                <span
                                  className={cn(
                                    "flex size-full items-center justify-center rounded-full",
                                    r.tone ?? FALLBACK_TONES[i % FALLBACK_TONES.length],
                                  )}
                                  title={r.name}
                                >
                                  {initials(r.name)}
                                </span>
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </li>
                      );
                    })}
                  </ul>
                  <div aria-live="polite" className="min-w-0 text-xs">
                    <p className="font-medium tabular-nums">
                      {Math.min(referrals.length, goal)} of {goal} friends joined
                    </p>
                    <div className="relative h-4 overflow-hidden">
                      <AnimatePresence initial={false} mode="popLayout">
                        <motion.p
                          animate={{ opacity: 1, y: 0 }}
                          className="truncate text-muted-foreground"
                          exit={{ opacity: 0, y: -10 }}
                          initial={{ opacity: 0, y: 10 }}
                          key={latest?.id ?? "none"}
                          transition={{ duration: 0.22, ease }}
                        >
                          {latest
                            ? promoted
                              ? `${latest.name.split(" ")[0]} joined, and you moved up to ${wave?.label}`
                              : `${latest.name.split(" ")[0]} just joined with your link`
                            : "Share your link to fill these in"}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
}
