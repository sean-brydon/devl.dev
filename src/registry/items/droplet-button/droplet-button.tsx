"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

const dropletButtonVariants = cva(
  "group/droplet relative isolate inline-flex [--droplet-shadow:color-mix(in_srgb,var(--goo)_28%,transparent)] dark:[--droplet-shadow:color-mix(in_srgb,var(--color-black)_48%,transparent)] shrink-0 cursor-pointer touch-manipulation select-none items-center justify-center whitespace-nowrap rounded-full font-medium outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:not-data-loading:opacity-64 data-loading:pointer-events-none pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:top-1/2 pointer-coarse:after:min-h-11 pointer-coarse:after:-translate-y-1/2 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        primary:
          "text-primary-foreground [--goo:var(--color-primary)] hover:[--goo:color-mix(in_srgb,var(--color-primary)_90%,var(--color-background))] data-pressed:[--goo:color-mix(in_srgb,var(--color-primary)_84%,var(--color-background))]",
        neutral:
          "text-foreground [--goo:color-mix(in_srgb,var(--color-foreground)_7%,var(--color-background))] hover:[--goo:color-mix(in_srgb,var(--color-foreground)_10%,var(--color-background))] data-pressed:[--goo:color-mix(in_srgb,var(--color-foreground)_13%,var(--color-background))]",
        info: "text-white [--goo:var(--color-info)] hover:[--goo:color-mix(in_srgb,var(--color-info)_90%,var(--color-background))] data-pressed:[--goo:color-mix(in_srgb,var(--color-info)_84%,var(--color-background))]",
        success:
          "text-white [--goo:var(--color-success)] hover:[--goo:color-mix(in_srgb,var(--color-success)_90%,var(--color-background))] data-pressed:[--goo:color-mix(in_srgb,var(--color-success)_84%,var(--color-background))]",
        destructive:
          "text-white [--goo:var(--color-destructive)] hover:[--goo:color-mix(in_srgb,var(--color-destructive)_90%,var(--color-background))] data-pressed:[--goo:color-mix(in_srgb,var(--color-destructive)_84%,var(--color-background))]",
      },
      size: {
        sm: "h-8 gap-1.5 px-3.5 text-sm sm:text-xs [&_svg:not([class*='size-'])]:size-3.5",
        default: "h-10 gap-2 px-5 text-base sm:text-sm",
        lg: "h-12 gap-2 px-6 text-base [&_svg:not([class*='size-'])]:size-4.5",
      },
    },
    defaultVariants: { tone: "primary", size: "default" },
  },
);

const SIZES = {
  sm: { drop: 4.5, satellite: 3, rise: 13, blur: 3, dot: 5 },
  default: { drop: 5.5, satellite: 3.75, rise: 17, blur: 3.5, dot: 6 },
  lg: { drop: 6.5, satellite: 4.5, rise: 20, blur: 4, dot: 7 },
} as const;

type Size = keyof typeof SIZES;

const squash = { stiffness: 700, damping: 20, mass: 1 };
const rise = [0.2, 0.75, 0.4, 1] as const;
const fall = [0.6, 0, 0.85, 0.35] as const;

function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

interface Splash {
  id: number;
  x: number;
  width: number;
}

function Drop({
  from,
  to,
  height,
  radius,
  duration,
  delay = 0,
  onLand,
}: {
  from: number;
  to: number;
  height: number;
  radius: number;
  duration: number;
  delay?: number;
  onLand?: () => void;
}) {
  const sunk = radius + 2;
  return (
    <motion.span
      animate={{ x: [from, (from + to) / 2, to], y: [sunk, -height, sunk], scaleY: [1.25, 1, 1.2] }}
      className="absolute top-0 left-0 rounded-full bg-(--goo) transition-colors duration-150"
      initial={{ x: from, y: sunk, scaleY: 1.25 }}
      onAnimationComplete={onLand}
      style={{ width: radius * 2, height: radius * 2, marginLeft: -radius, marginTop: -radius }}
      transition={{
        duration,
        delay,
        times: [0, 0.46, 1],
        ease: "easeInOut",
        x: { duration, delay, ease: "linear" },
        y: { duration, delay, times: [0, 0.46, 1], ease: [rise, fall] },
      }}
    />
  );
}

function SplashCrown({ splash, size, onLand }: { splash: Splash; size: Size; onLand: () => void }) {
  const { drop, satellite, rise: height } = SIZES[size];
  const flat = Math.min(splash.width / 2, 24);
  const clamp = (x: number) => Math.min(Math.max(x, flat), splash.width - flat);
  const x = clamp(splash.x);
  const lean = (splash.width / 2 - x) * 0.06;
  const spread = height * 1.3;
  return (
    <>
      <Drop delay={0.03} duration={0.28} from={x - drop * 1.1} height={height * 0.42} radius={satellite} to={clamp(x - spread)} />
      <Drop delay={0.03} duration={0.28} from={x + drop * 1.1} height={height * 0.42} radius={satellite} to={clamp(x + spread)} />
      <Drop duration={0.38} from={x} height={height} onLand={onLand} radius={drop} to={x + lean} />
    </>
  );
}

function LiquidDots({ size, reduce }: { size: Size; reduce: boolean }) {
  const filterId = `droplet-dots-${useId().replace(/:/g, "")}`;
  const { dot } = SIZES[size];
  const travel = dot * 1.5;
  const swing = { duration: 0.62, repeat: Number.POSITIVE_INFINITY, repeatType: "mirror", ease: "easeInOut" } as const;
  return (
    <motion.span
      animate={{ opacity: 1, scale: 1 }}
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.16, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
    >
      <svg className="absolute size-0">
        <filter colorInterpolationFilters="sRGB" height="100%" id={filterId} width="100%" x="0" y="0">
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation={dot * 0.5} />
          <feColorMatrix in="blur" result="goo" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
          <feMerge>
            <feMergeNode in="goo" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>
      <span
        className="relative flex items-center justify-center"
        style={{ width: travel * 2 + dot * 4, height: dot * 4, filter: reduce ? undefined : `url(#${filterId})` }}
      >
        {[-1, 1].map((side) => (
          <motion.span
            animate={reduce ? { opacity: [1, 0.4] } : { scale: [side < 0 ? 1.2 : 0.8, side < 0 ? 0.8 : 1.2] }}
            className="absolute rounded-full bg-current"
            key={side}
            style={{ width: dot, height: dot, x: side * travel }}
            transition={swing}
          />
        ))}
        <motion.span
          animate={reduce ? { opacity: [0.4, 1] } : { x: [-travel, travel] }}
          className="absolute rounded-full bg-current"
          style={{ width: dot * 0.9, height: dot * 0.9, x: reduce ? 0 : -travel }}
          transition={swing}
        />
      </span>
    </motion.span>
  );
}

export interface DropletButtonProps
  extends useRender.ComponentProps<"button">,
    VariantProps<typeof dropletButtonVariants> {
  loading?: boolean;
  splash?: boolean;
}

export function DropletButton({
  className,
  tone,
  size,
  render,
  children,
  loading = false,
  splash: splashEnabled = true,
  disabled,
  ...props
}: DropletButtonProps): ReactElement {
  const key = size ?? "default";
  const { rise: height, drop, blur } = SIZES[key];
  const reduce = useSafeReducedMotion();
  const filterId = `droplet-${useId().replace(/:/g, "")}`;
  const boxRef = useRef<HTMLSpanElement>(null);
  const [pressed, setPressed] = useState(false);
  const [splashes, setSplashes] = useState<Splash[]>([]);
  const holding = useRef(false);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const nextId = useRef(0);
  const origin = useRef(0.5);

  const scaleXTarget = useMotionValue(1);
  const scaleYTarget = useMotionValue(1);
  const scaleX = useSpring(scaleXTarget, squash);
  const springY = useSpring(scaleYTarget, squash);
  const ripple = useMotionValue(1);
  const scaleY = useTransform(() => springY.get() * ripple.get());
  const transformOrigin = useMotionValue("50% 100%");

  useEffect(() => () => clearTimeout(tapTimer.current), []);

  const room = { x: blur * 3 + 10, top: height + drop * 2 + blur * 3 + 4, bottom: blur * 3 + 4 };
  const animated = !reduce && splashEnabled;

  const squeeze = (x?: number) => {
    setPressed(true);
    const width = boxRef.current?.offsetWidth ?? 0;
    origin.current = x === undefined || !width ? 0.5 : Math.min(Math.max(x / width, 0.2), 0.8);
    transformOrigin.set(`${origin.current * 100}% 100%`);
    if (!animated) return;
    scaleXTarget.set(1.035);
    scaleYTarget.set(0.88);
  };

  const letGo = (burst: boolean) => {
    setPressed(false);
    scaleXTarget.set(1);
    scaleYTarget.set(1);
    if (!animated || !burst) return;
    const width = boxRef.current?.offsetWidth ?? 0;
    const id = nextId.current++;
    setSplashes((current) => [...current.slice(-2), { id, x: origin.current * width, width }]);
  };

  const press = (x?: number) => {
    if (holding.current) return;
    holding.current = true;
    squeeze(x);
  };

  const release = (burst: boolean) => {
    if (!holding.current) return;
    holding.current = false;
    letGo(burst);
  };

  // Enter clicks on keydown, often before a keyup can arrive, so it plays the whole press at once.
  const tap = () => {
    clearTimeout(tapTimer.current);
    squeeze();
    tapTimer.current = setTimeout(() => letGo(true), 70);
  };

  const land = (id: number) => {
    setSplashes((current) => current.filter((s) => s.id !== id));
    animate(ripple, [1, 0.965, 1.012, 1], { duration: 0.3, ease: "easeOut" });
  };

  const localX = (event: PointerEvent) => event.clientX - (boxRef.current?.getBoundingClientRect().left ?? 0);

  const isDisabled = Boolean(disabled || loading);

  const defaultProps = {
    className: cn(dropletButtonVariants({ tone, size }), className),
    "aria-busy": loading || undefined,
    "data-loading": loading ? "" : undefined,
    "data-pressed": pressed ? "" : undefined,
    "data-slot": "droplet-button",
    disabled: isDisabled,
    type: render ? undefined : ("button" as const),
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button === 0) press(localX(event));
    },
    onPointerUp: () => release(true),
    onPointerLeave: () => release(false),
    onPointerCancel: () => release(false),
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.repeat) return;
      if (event.key === "Enter") tap();
      if (event.key === " ") press();
    },
    onKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === " ") release(true);
    },
    onBlur: () => release(false),
    children: (
      <>
        <svg aria-hidden className="absolute size-0">
          <filter colorInterpolationFilters="sRGB" height="100%" id={filterId} width="100%" x="0" y="0">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation={blur} />
            <feColorMatrix in="blur" result="goo" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -11" />
            <feMerge>
              <feMergeNode in="goo" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </svg>
        <span
          aria-hidden
          className="pointer-events-none absolute -z-10"
          style={{
            inset: `-${room.top}px -${room.x}px -${room.bottom}px`,
            filter: `${reduce ? "" : `url(#${filterId}) `}drop-shadow(0 1px 1.5px var(--droplet-shadow))`,
          }}
        >
          <span
            className="absolute"
            ref={boxRef}
            style={{ inset: `${room.top}px ${room.x}px ${room.bottom}px` }}
          >
            <motion.span
              className="absolute inset-0 rounded-full bg-(--goo) transition-colors duration-150"
              style={{ scaleX, scaleY, transformOrigin }}
            />
            {splashes.map((s) => (
              <SplashCrown key={s.id} onLand={() => land(s.id)} size={key} splash={s} />
            ))}
          </span>
        </span>
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-full inset-shadow-[0_1px_--theme(--color-white/18%)]"
          style={{ scaleX, scaleY, transformOrigin }}
        />
        <span
          className={cn(
            "relative inline-flex items-center gap-[inherit] transition-[opacity,scale] duration-[80ms] ease-out",
            animated && "group-data-pressed/droplet:scale-[0.97]",
            loading && "opacity-0",
          )}
        >
          {children}
        </span>
        {loading && <LiquidDots reduce={reduce} size={key} />}
      </>
    ),
  };

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(defaultProps, props),
    render,
  });
}

export { dropletButtonVariants };
