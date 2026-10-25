"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface SplitAction {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  done?: string;
}

export interface SplitButtonProps {
  actions: SplitAction[];
  defaultActionId?: string;
  onAction?: (action: SplitAction) => void | Promise<unknown>;
  remember?: boolean;
  menuLabel?: string;
  variant?: "default" | "outline";
  disabled?: boolean;
  className?: string;
}

type Phase = "idle" | "running" | "done";

export function SplitButton({
  actions,
  defaultActionId,
  onAction,
  remember = true,
  menuLabel = "Choose an action",
  variant = "default",
  disabled,
  className,
}: SplitButtonProps) {
  const reduce = useReducedMotion();
  const [primaryId, setPrimaryId] = useState(defaultActionId ?? actions[0]?.id);
  const [phase, setPhase] = useState<Phase>("idle");
  const [width, setWidth] = useState<number | "auto">("auto");
  const measureRef = useRef<HTMLSpanElement>(null);
  const doneTimer = useRef<number>(undefined);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(doneTimer.current);
    };
  }, []);

  const primary = actions.find((a) => a.id === primaryId) ?? actions[0];
  const label = phase === "done" ? (primary.done ?? primary.label) : primary.label;

  useLayoutEffect(() => {
    if (measureRef.current) setWidth(measureRef.current.offsetWidth);
  }, [label]);

  const run = async (action: SplitAction) => {
    if (phase === "running") return;
    if (remember) setPrimaryId(action.id);
    clearTimeout(doneTimer.current);
    setPhase("running");
    try {
      await onAction?.(action);
      if (!mounted.current) return;
      setPhase("done");
      doneTimer.current = window.setTimeout(() => setPhase("idle"), 1600);
    } catch {
      if (mounted.current) setPhase("idle");
    }
  };

  const ease = [0.23, 1, 0.32, 1] as const;
  const swap = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(2px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(2px)" },
    transition: { duration: 0.18, ease },
  };
  const icon = phase === "running" ? <Spinner className="size-4" key="spin" /> : phase === "done" ? <CheckIcon key="done" /> : primary.icon;

  return (
    <div className={cn("inline-flex rounded-lg", className)} role="group">
      <Button
        aria-busy={phase === "running" || undefined}
        className="rounded-e-none before:rounded-e-none"
        disabled={disabled}
        onClick={() => run(primary)}
        variant={variant}
      >
        <span className="relative flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span className="flex" key={phase === "idle" ? primary.id : phase} {...swap}>
              {icon}
            </motion.span>
          </AnimatePresence>
        </span>
        <motion.span
          animate={{ width }}
          className="relative flex h-5 items-center overflow-hidden"
          initial={false}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42 }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span className="whitespace-nowrap" key={label} {...swap}>
              {label}
            </motion.span>
          </AnimatePresence>
          <span aria-hidden className="pointer-events-none invisible absolute whitespace-nowrap" ref={measureRef}>
            {label}
          </span>
        </motion.span>
        <span aria-live="polite" className="sr-only">
          {phase === "running" ? `${primary.label}…` : phase === "done" ? (primary.done ?? `${primary.label} finished`) : ""}
        </span>
      </Button>
      <Menu>
        <MenuTrigger
          disabled={disabled}
          render={
            <Button
              aria-label="More actions"
              className={cn(
                "group/chev rounded-s-none px-2 before:rounded-s-none",
                variant === "default"
                  ? "border-s-primary-foreground/16 dark:border-s-primary-foreground/24"
                  : "-ms-px",
              )}
              variant={variant}
            />
          }
        >
          <ChevronDownIcon className="transition-transform duration-200 ease-out group-data-popup-open/chev:rotate-180" />
        </MenuTrigger>
        <MenuPopup
          align="end"
          className="w-72 transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-[0.98] data-starting-style:scale-[0.96] data-ending-style:opacity-0 data-starting-style:opacity-0"
          sideOffset={6}
        >
          <MenuGroup>
            <MenuGroupLabel>{menuLabel}</MenuGroupLabel>
            {actions.map((a) => (
              <MenuItem className="items-start gap-2.5 py-2" key={a.id} onClick={() => run(a)}>
                {a.icon && (
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs/5 [&_svg]:size-3.5">
                    {a.icon}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-sm">{a.label}</span>
                  {a.description && <span className="block text-pretty text-muted-foreground text-xs leading-snug">{a.description}</span>}
                </span>
                <CheckIcon className={cn("mt-1 size-4 shrink-0 transition-opacity", a.id === primary.id ? "opacity-100" : "opacity-0")} />
              </MenuItem>
            ))}
          </MenuGroup>
          {remember && (
            <>
              <MenuSeparator />
              <p className="px-2 py-1.5 text-muted-foreground text-xs">The one you pick becomes the default.</p>
            </>
          )}
        </MenuPopup>
      </Menu>
    </div>
  );
}
