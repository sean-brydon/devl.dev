"use client";

import { BrainIcon, CheckIcon, ChevronDownIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface SwitcherModel {
  id: string;
  name: string;
  tagline: string;
  speed: number;
  quality: number;
  cost: number;
  latency: number;
  price: number;
  thinking?: boolean;
  badge?: string;
}

export interface ModelSwitcherValue {
  model: string;
  thinking: boolean;
  effort: number;
}

export interface ModelSwitcherPanelProps {
  models?: SwitcherModel[];
  value?: ModelSwitcherValue;
  defaultValue?: Partial<ModelSwitcherValue>;
  onValueChange?: (value: ModelSwitcherValue) => void;
  className?: string;
}

const defaultModels: SwitcherModel[] = [
  {
    id: "quill-4",
    name: "Quill 4",
    tagline: "Everyday writing and code",
    speed: 0.72,
    quality: 0.78,
    cost: 0.45,
    latency: 380,
    price: 3,
    thinking: true,
    badge: "Default",
  },
  {
    id: "quill-4-lite",
    name: "Quill 4 Lite",
    tagline: "Snappy answers, tiny bills",
    speed: 0.95,
    quality: 0.55,
    cost: 0.12,
    latency: 160,
    price: 0.4,
  },
  {
    id: "meridian-ultra",
    name: "Meridian Ultra",
    tagline: "Hard problems, long context",
    speed: 0.38,
    quality: 0.97,
    cost: 0.9,
    latency: 820,
    price: 15,
    thinking: true,
  },
];

const efforts = ["Low", "Medium", "High", "Max"];
const spring = { type: "spring", stiffness: 420, damping: 36 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;

const resolve = (models: SwitcherModel[], v?: Partial<ModelSwitcherValue>): ModelSwitcherValue => ({
  model: v?.model ?? models[0]?.id ?? "",
  thinking: v?.thinking ?? false,
  effort: v?.effort ?? 1,
});

export function ModelSwitcherPanel({
  models = defaultModels,
  value: valueProp,
  defaultValue,
  onValueChange,
  className,
}: ModelSwitcherPanelProps) {
  const reduce = useReducedMotion();
  const groupId = useId();
  const [inner, setInner] = useState(() => resolve(models, defaultValue));
  const value = valueProp ?? inner;
  const [hovered, setHovered] = useState<string | null>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selected = models.find((m) => m.id === value.model) ?? models[0];
  const shown = models.find((m) => m.id === hovered) ?? selected;
  const canThink = Boolean(selected?.thinking);
  const thinking = canThink && value.thinking;

  const update = (patch: Partial<ModelSwitcherValue>) => {
    const next = { ...value, ...patch };
    if (!valueProp) setInner(next);
    onValueChange?.(next);
  };

  const latency = (selected?.latency ?? 0) * (thinking ? 1.6 + value.effort * 0.9 : 1);
  const price = selected?.price ?? 0;

  const onKey = (e: KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + models.length) % models.length;
    const m = models[next];
    if (m) update({ model: m.id });
    rowRefs.current[next]?.focus();
  };

  return (
    <div className={cn("w-80 text-sm", className)}>
      <div
        aria-label="Model"
        className="flex flex-col gap-0.5 p-1.5"
        id={groupId}
        onPointerLeave={() => setHovered(null)}
        role="radiogroup"
      >
        {models.map((m, i) => {
          const on = m.id === value.model;
          return (
            <button
              aria-checked={on}
              className="relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
              key={m.id}
              onClick={() => update({ model: m.id })}
              onFocus={() => setHovered(m.id)}
              onKeyDown={(e) => onKey(e, i)}
              onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(m.id)}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              role="radio"
              tabIndex={on ? 0 : -1}
              type="button"
            >
              {(hovered ?? value.model) === m.id && (
                <motion.span
                  className="absolute inset-0 -z-0 rounded-lg bg-accent"
                  layoutId={`${groupId}-hl`}
                  transition={reduce ? { duration: 0 } : spring}
                />
              )}
              <span className="relative min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-medium">
                  {m.name}
                  {m.badge && (
                    <span className="rounded-full bg-muted px-1.5 py-px font-normal text-[10px] text-muted-foreground">
                      {m.badge}
                    </span>
                  )}
                  {m.thinking && <BrainIcon aria-label="Supports extended thinking" className="size-3 text-muted-foreground" />}
                </span>
                <span className="block truncate text-muted-foreground text-xs">{m.tagline}</span>
              </span>
              <span className="relative grid size-5 place-items-center">
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.span
                      animate={{ scale: 1, opacity: 1 }}
                      className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"
                      exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.12 } }}
                      initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
                      transition={{ duration: 0.2, ease: easeOut }}
                    >
                      <CheckIcon className="size-3" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mx-1.5 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-lg bg-muted/50 px-2.5 py-2.5 text-xs">
        <Bar label="Speed" tone="bg-sky-500" value={shown?.speed ?? 0} />
        <Bar label="Quality" tone="bg-violet-500" value={shown?.quality ?? 0} />
        <Bar label="Cost" tone="bg-amber-500" value={shown?.cost ?? 0} />
      </div>

      <div className="mx-4 mt-2 border-t pt-2">
        <label className={cn("flex items-center gap-2.5 py-1.5", !canThink && "opacity-60")}>
          <BrainIcon className="size-4 text-muted-foreground" />
          <span className="flex-1">
            <span className="block font-medium">Extended thinking</span>
            <span className="block text-muted-foreground text-xs">
              {canThink ? "Reasons it through before answering" : `Not available on ${selected?.name}`}
            </span>
          </span>
          <Switch checked={thinking} disabled={!canThink} onCheckedChange={(c) => update({ thinking: c })} />
        </label>
        <AnimatePresence initial={false}>
          {thinking && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={reduce ? { duration: 0 } : spring}
            >
              <div className="pt-1 pb-2 ps-6.5 pe-0.5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Effort</span>
                  <span className="relative inline-flex h-4 min-w-14 justify-end overflow-hidden font-medium">
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        animate={{ y: 0, opacity: 1 }}
                        exit={reduce ? { opacity: 0 } : { y: -10, opacity: 0 }}
                        initial={reduce ? { opacity: 0 } : { y: 10, opacity: 0 }}
                        key={value.effort}
                        transition={{ duration: 0.2, ease: easeOut }}
                      >
                        {efforts[value.effort]}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </div>
                <Slider
                  getAriaLabel={() => "Thinking effort"}
                  max={efforts.length - 1}
                  min={0}
                  onValueChange={(v) => update({ effort: Array.isArray(v) ? (v[0] ?? 0) : v })}
                  step={1}
                  value={value.effort}
                />
                <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                  {efforts.map((e) => (
                    <span key={e}>{e}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-1 flex items-center justify-between gap-3 border-t px-4 py-2.5 text-muted-foreground text-xs">
        <span>
          First token{" "}
          <span className="font-medium font-mono text-foreground tabular-nums">
            ~<Rolling format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`)} value={latency} />
          </span>
        </span>
        <span>
          <span className="font-medium font-mono text-foreground tabular-nums">
            <Rolling format={(v) => `$${v.toFixed(2)}`} value={price} />
          </span>{" "}
          / 1M tokens
        </span>
      </div>
    </div>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span
        aria-label={`${label} ${Math.round(value * 5)} of 5`}
        className="relative grid h-1.5 grid-cols-5 gap-0.5"
        role="img"
      >
        {Array.from({ length: 5 }, (_, i) => {
          const fill = Math.max(0, Math.min(1, value * 5 - i));
          return (
            <span className="relative overflow-hidden rounded-full bg-muted-foreground/15" key={i}>
              <motion.span
                animate={{ scaleX: fill }}
                className={cn("absolute inset-0 origin-left rounded-full", tone)}
                initial={false}
                transition={{ type: "spring", stiffness: 380, damping: 36, delay: i * 0.025 }}
              />
            </span>
          );
        })}
      </span>
    </>
  );
}

function Rolling({ value, format }: { value: number; format: (v: number) => string }) {
  const reduce = useReducedMotion();
  const mv = useSpring(value, { stiffness: 200, damping: 30 });
  const text = useTransform(mv, format);
  useEffect(() => {
    if (reduce) mv.jump(value);
    else mv.set(value);
  }, [value, reduce, mv]);
  return <motion.span>{text}</motion.span>;
}

export interface ModelSwitcherProps extends ModelSwitcherPanelProps {
  defaultOpen?: boolean;
}

export function ModelSwitcher({ models = defaultModels, defaultOpen, value, defaultValue, onValueChange, className }: ModelSwitcherProps) {
  const [inner, setInner] = useState(() => resolve(models, defaultValue));
  const current = value ?? inner;
  const model = models.find((m) => m.id === current.model);
  return (
    <Popover defaultOpen={defaultOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full border bg-card px-3 font-medium text-sm outline-none transition-[background-color,scale] duration-150 ease-out hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] data-popup-open:bg-accent",
          className,
        )}
      >
        {model?.name}
        {current.thinking && model?.thinking && <BrainIcon className="size-3.5 text-muted-foreground" />}
        <ChevronDownIcon className="size-3.5 text-muted-foreground transition-transform duration-200 ease-out in-data-popup-open:rotate-180" />
      </PopoverTrigger>
      <PopoverPopup
        align="start"
        className="rounded-2xl before:rounded-[calc(var(--radius-2xl)-1px)] [&_[data-slot=popover-viewport]]:p-0"
      >
        <ModelSwitcherPanel
          models={models}
          onValueChange={(v) => {
            if (!value) setInner(v);
            onValueChange?.(v);
          }}
          value={current}
        />
      </PopoverPopup>
    </Popover>
  );
}
