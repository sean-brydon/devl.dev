"use client";

import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, RotateCcwIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface StepFlowData {
  name: string;
  email: string;
  workspace: string;
  slug: string;
  teamSize: string;
  goals: string[];
}

export interface StepFlowProps {
  takenSlugs?: string[];
  teamSizes?: string[];
  goals?: string[];
  onComplete?: (data: StepFlowData) => void | Promise<void>;
  className?: string;
}

const STEPS = ["Profile", "Workspace", "Goals"] as const;
const EMPTY: StepFlowData = { name: "", email: "", workspace: "", slug: "", teamSize: "", goals: [] };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

type Errors = Partial<Record<keyof StepFlowData, string>>;

function validate(step: number, data: StepFlowData, taken: string[]): Errors {
  const errors: Errors = {};
  if (step === 0) {
    if (data.name.trim().length < 2) errors.name = "Tell us what to call you.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errors.email = "That email doesn’t look right.";
  }
  if (step === 1) {
    if (data.workspace.trim().length < 2) errors.workspace = "Give your workspace a name.";
    if (!/^[a-z0-9][a-z0-9-]{1,31}$/.test(data.slug)) errors.slug = "Use 2–32 lowercase letters, numbers or dashes.";
    else if (taken.includes(data.slug)) errors.slug = `${data.slug}.devl.app is taken. Try another.`;
    if (!data.teamSize) errors.teamSize = "Pick a team size.";
  }
  if (step === 2 && data.goals.length === 0) errors.goals = "Choose at least one.";
  return errors;
}

export function StepFlow({
  takenSlugs = ["acme", "studio", "team"],
  teamSizes = ["Just me", "2–10", "11–50", "51+"],
  goals: goalOptions = ["Ship faster", "Plan sprints", "Track bugs", "Write docs", "Run standups", "Share roadmaps"],
  onComplete,
  className,
}: StepFlowProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<StepFlowData>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof StepFlowData, boolean>>>({});
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const reduce = useReducedMotion();
  const id = useId();

  const errors = validate(step, data, takenSlugs);
  const shown = (key: keyof StepFlowData) => (touched[key] ? errors[key] : undefined);

  const set = <K extends keyof StepFlowData>(key: K, value: StepFlowData[K]) =>
    setData((d) => {
      const next = { ...d, [key]: value };
      if (key === "workspace" && !slugEdited) next.slug = slugify(value as string);
      return next;
    });

  const go = (to: number) => {
    setDirection(to > step ? 1 : -1);
    setStep(to);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (Object.keys(errors).length) {
      setTouched((t) => ({ ...t, ...Object.fromEntries(Object.keys(errors).map((k) => [k, true])) }));
      return;
    }
    if (step < STEPS.length - 1) return go(step + 1);
    setSubmitting(true);
    await onComplete?.(data);
    setSubmitting(false);
    setDirection(1);
    setDone(true);
  };

  const reset = () => {
    setData(EMPTY);
    setTouched({});
    setSlugEdited(false);
    setDone(false);
    setDirection(-1);
    setStep(0);
  };

  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stepKey = done ? "done" : `step-${step}`;
  const shownKey = useRef(stepKey);
  useEffect(() => {
    if (shownKey.current === stepKey) return;
    const t = window.setTimeout(() => {
      shownKey.current = stepKey;
      const target = contentRef.current
        ?.querySelector(`[data-step="${stepKey}"]`)
        ?.querySelector<HTMLElement>("input, [role=radio], [aria-pressed], button");
      target?.focus({ preventScroll: true });
    }, 60);
    return () => clearTimeout(t);
  }, [stepKey]);

  const field = (key: keyof StepFlowData) => ({
    id: `${id}-${key}`,
    "aria-invalid": shown(key) ? true : undefined,
    "aria-describedby": shown(key) ? `${id}-${key}-error` : undefined,
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
  });

  const slide = {
    enter: (d: number) => ({ x: reduce ? 0 : d * 48, opacity: 0, filter: reduce ? "none" : "blur(4px)" }),
    center: { x: 0, opacity: 1, filter: "blur(0px)" },
    exit: (d: number) => ({ x: reduce ? 0 : d * -48, opacity: 0, filter: reduce ? "none" : "blur(4px)" }),
  };

  return (
    <div className={cn("w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-xs/5", className)}>
      <div className="border-b px-6 pt-5 pb-4">
        <StepIndicator current={done ? STEPS.length : step} steps={[...STEPS]} />
      </div>
      <motion.div
        animate={{ height }}
        className="relative overflow-hidden"
        initial={false}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 32 }}
      >
        <div ref={contentRef}>
          <AnimatePresence custom={direction} initial={false} mode="popLayout">
            <motion.div
              animate="center"
              custom={direction}
              data-step={stepKey}
              exit="exit"
              initial="enter"
              key={stepKey}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              variants={slide}
            >
              {done ? (
                <Success data={data} onReset={reset} />
              ) : (
                <form className="grid gap-5 p-6" noValidate onSubmit={submit}>
                  {step === 0 && (
                    <>
                      <Heading sub="This is how teammates will see you.">Nice to meet you</Heading>
                      <Row error={shown("name")} id={`${id}-name`} label="Full name">
                        <Input
                          {...field("name")}
                          autoComplete="name"
                          onChange={(e) => set("name", e.target.value)}
                          placeholder="Mara Okafor"
                          value={data.name}
                        />
                      </Row>
                      <Row error={shown("email")} id={`${id}-email`} label="Work email">
                        <Input
                          {...field("email")}
                          autoComplete="email"
                          onChange={(e) => set("email", e.target.value)}
                          placeholder="mara@northwind.dev"
                          type="email"
                          value={data.email}
                        />
                      </Row>
                    </>
                  )}
                  {step === 1 && (
                    <>
                      <Heading sub="You can invite people once it’s set up.">Create your workspace</Heading>
                      <Row error={shown("workspace")} id={`${id}-workspace`} label="Workspace name">
                        <Input
                          {...field("workspace")}
                          onChange={(e) => set("workspace", e.target.value)}
                          placeholder="Northwind Labs"
                          value={data.workspace}
                        />
                      </Row>
                      <Row error={shown("slug")} id={`${id}-slug`} label="URL">
                        <div className="flex w-full items-center gap-2">
                          <Input
                            {...field("slug")}
                            className="font-mono"
                            onChange={(e) => {
                              setSlugEdited(true);
                              set("slug", e.target.value.toLowerCase());
                            }}
                            placeholder="northwind"
                            value={data.slug}
                          />
                          <span className="shrink-0 font-mono text-muted-foreground text-xs">.devl.app</span>
                        </div>
                      </Row>
                      <ChoiceRow
                        error={shown("teamSize")}
                        label="Team size"
                        onToggle={(v) => {
                          set("teamSize", v);
                          setTouched((t) => ({ ...t, teamSize: true }));
                        }}
                        options={teamSizes}
                        selected={[data.teamSize]}
                        single
                      />
                    </>
                  )}
                  {step === 2 && (
                    <>
                      <Heading sub="We’ll tailor templates to what you pick.">What brings you here?</Heading>
                      <ChoiceRow
                        error={shown("goals")}
                        label="Goals"
                        onToggle={(v) => {
                          set("goals", data.goals.includes(v) ? data.goals.filter((g) => g !== v) : [...data.goals, v]);
                          setTouched((t) => ({ ...t, goals: true }));
                        }}
                        options={goalOptions}
                        selected={data.goals}
                      />
                    </>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    {step > 0 ? (
                      <Button onClick={() => go(step - 1)} type="button" variant="ghost">
                        <ArrowLeftIcon />
                        Back
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs tabular-nums">
                        Step {step + 1} of {STEPS.length}
                      </span>
                    )}
                    <Button loading={submitting} type="submit">
                      {step === STEPS.length - 1 ? "Create workspace" : "Continue"}
                      {step < STEPS.length - 1 && <ArrowRightIcon />}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function Heading({ children, sub }: { children: ReactNode; sub: string }) {
  return (
    <div className="grid gap-1">
      <h3 className="font-heading font-semibold text-base">{children}</h3>
      <p className="text-muted-foreground text-sm">{sub}</p>
    </div>
  );
}

function ErrorText({ id, error }: { id?: string; error?: string }) {
  return (
    <AnimatePresence initial={false}>
      {error && (
        <motion.p
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden text-destructive-foreground text-xs"
          exit={{ height: 0, opacity: 0 }}
          id={id}
          initial={{ height: 0, opacity: 0 }}
          role="alert"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        >
          <span className="block pt-1.5">{error}</span>
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function Row({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <label className="font-medium text-sm" htmlFor={id}>
        {label}
      </label>
      <div>
        {children}
        <ErrorText error={error} id={`${id}-error`} />
      </div>
    </div>
  );
}

function ChoiceRow({
  label,
  options,
  selected,
  onToggle,
  single,
  error,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  single?: boolean;
  error?: string;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 font-medium text-sm">{label}</legend>
      <div className="flex flex-wrap gap-1.5" role={single ? "radiogroup" : "group"}>
        {options.map((option) => {
          const on = selected.includes(option);
          return (
            <button
              aria-checked={single ? on : undefined}
              aria-pressed={single ? undefined : on}
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 font-medium text-sm outline-none transition-[background-color,border-color,color] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent dark:bg-input/32",
              )}
              key={option}
              onClick={() => onToggle(option)}
              role={single ? "radio" : undefined}
              type="button"
            >
              <AnimatePresence initial={false}>
                {on && !single && (
                  <motion.span
                    animate={{ width: 14, opacity: 1 }}
                    className="flex overflow-hidden"
                    exit={{ width: 0, opacity: 0 }}
                    initial={{ width: 0, opacity: 0 }}
                  >
                    <CheckIcon className="size-3.5 shrink-0" strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>
              {option}
            </button>
          );
        })}
      </div>
      <ErrorText error={error} />
    </fieldset>
  );
}

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  const reduce = useReducedMotion();
  const filterId = `goo-steps-${useId().replace(/:/g, "")}`;
  const last = steps.length - 1;
  const fill = Math.min(current, last) / last;
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 120, damping: 20 };
  const at = (i: number) => `calc(14px + (100% - 28px) * ${i / last})`;

  return (
    <div>
      <div className="relative h-7">
        <div className="absolute inset-x-3.5 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
        {steps.map((s, i) => (
          <span
            className="absolute top-0 size-7 -translate-x-1/2 rounded-full border-2 border-border bg-card"
            key={s}
            style={{ left: at(i) }}
          />
        ))}
        <svg aria-hidden className="absolute size-0">
          <filter colorInterpolationFilters="sRGB" height="300%" id={filterId} width="120%" x="-10%" y="-100%">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="3" />
            <feColorMatrix in="blur" result="goo" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </svg>
        <div aria-hidden className="absolute inset-0" style={{ filter: `url(#${filterId})` }}>
          <div className="absolute inset-x-3.5 top-1/2 h-1.5 -translate-y-1/2">
            <motion.div animate={{ width: `${fill * 100}%` }} className="h-full rounded-full bg-primary" initial={false} transition={spring} />
          </div>
          {steps.map((s, i) => (
            <motion.span
              animate={{ scale: i <= current ? 1 : 0.2, opacity: i <= current ? 1 : 0 }}
              className="absolute top-0 size-7 rounded-full bg-primary"
              initial={false}
              key={s}
              style={{ left: at(i), x: "-50%" }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 380, damping: 18, delay: i <= current && i > 0 ? 0.28 : 0 }
              }
            />
          ))}
        </div>
        {steps.map((s, i) => (
          <span
            className={cn(
              "absolute top-0 flex size-7 -translate-x-1/2 items-center justify-center font-medium text-xs tabular-nums transition-colors duration-300",
              i <= current ? "text-primary-foreground" : "text-muted-foreground",
            )}
            key={s}
            style={{ left: at(i) }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {i < current ? (
                <motion.span
                  animate={{ scale: 1, opacity: 1 }}
                  initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
                  key="check"
                  transition={{ type: "spring", stiffness: 500, damping: 28, delay: 0.1 }}
                >
                  <CheckIcon className="size-3.5" strokeWidth={3} />
                </motion.span>
              ) : (
                <motion.span animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.1 } }} initial={false} key="n">
                  {i + 1}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        ))}
      </div>
      <ol className="mt-2 grid text-xs" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => (
          <li
            aria-current={i === current ? "step" : undefined}
            className={cn(
              "transition-colors duration-300",
              i === 0 ? "text-start" : i === last ? "text-end" : "text-center",
              i <= current ? "font-medium text-foreground" : "text-muted-foreground",
            )}
            key={s}
          >
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Success({ data, onReset }: { data: StepFlowData; onReset: () => void }) {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="grid justify-items-center gap-4 p-6 text-center">
      <motion.span
        animate={ready ? { scale: 1, opacity: 1 } : undefined}
        className="flex size-14 items-center justify-center rounded-full bg-success text-white"
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 24 }}
      >
        <CheckIcon className="size-7" strokeWidth={3} />
      </motion.span>
      <div className="grid gap-1">
        <h3 className="font-heading font-semibold text-base">You’re in, {data.name.split(" ")[0]}</h3>
        <p className="text-muted-foreground text-sm">
          <span className="font-mono text-foreground">{data.slug}.devl.app</span> is ready for {data.teamSize === "Just me" ? "you" : `your team of ${data.teamSize}`}.
        </p>
      </div>
      <ul className="flex flex-wrap justify-center gap-1.5">
        {data.goals.map((g, i) => (
          <motion.li
            animate={{ opacity: 1, y: 0 }}
            className="rounded-full bg-muted px-2.5 py-1 text-xs"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            key={g}
            transition={{ delay: 0.25 + i * 0.05 }}
          >
            {g}
          </motion.li>
        ))}
      </ul>
      <Button onClick={onReset} size="sm" variant="ghost">
        <RotateCcwIcon />
        Start over
      </Button>
    </div>
  );
}
