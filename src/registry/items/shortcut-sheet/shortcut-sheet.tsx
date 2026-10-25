"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export interface Shortcut {
  label: string;
  keys: string[][];
  keywords?: string[];
}

export interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

export type Platform = "mac" | "windows";

export interface ShortcutSheetProps {
  groups: ShortcutGroup[];
  children: ReactNode;
  defaultPlatform?: Platform;
  title?: string;
  className?: string;
}

const MAC: Record<string, string> = { mod: "⌘", shift: "⇧", alt: "⌥", ctrl: "⌃", enter: "↵", esc: "esc", backspace: "⌫", up: "↑", down: "↓", left: "←", right: "→" };
const WIN: Record<string, string> = { mod: "Ctrl", shift: "Shift", alt: "Alt", ctrl: "Ctrl", enter: "Enter", esc: "Esc", backspace: "Backspace", up: "↑", down: "↓", left: "←", right: "→" };
const SPOKEN: Record<string, string> = { mod: "Command", shift: "Shift", alt: "Option", ctrl: "Control", enter: "Return", esc: "Escape", backspace: "Delete", up: "Up", down: "Down", left: "Left", right: "Right" };

const keyLabel = (token: string, platform: Platform) => (platform === "mac" ? MAC : WIN)[token.toLowerCase()] ?? token.toUpperCase();

function isTyping(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLowerCase().indexOf(query) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[3px] bg-amber-400/30 text-foreground">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

export function ShortcutSheet({ groups, children, defaultPlatform, title = "Keyboard shortcuts", className }: ShortcutSheetProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<Platform>(defaultPlatform ?? "mac");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (defaultPlatform) return;
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const name = nav.userAgentData?.platform ?? nav.platform ?? "";
    if (!/mac|iphone|ipad/i.test(name)) setPlatform("windows");
  }, [defaultPlatform]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
    rootRef.current?.focus();
  };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return groups;
    const words = q.split(/[\s+]+/).filter(Boolean);
    return groups
      .map((g) => ({
        ...g,
        shortcuts: g.shortcuts.filter((s) => {
          const keyText = s.keys.flat().flatMap((k) => [k.toLowerCase(), keyLabel(k, "windows").toLowerCase(), SPOKEN[k.toLowerCase()]?.toLowerCase() ?? ""]);
          const hay = [s.label.toLowerCase(), g.title.toLowerCase(), ...(s.keywords ?? []).map((k) => k.toLowerCase())].join(" ");
          return hay.includes(q) || words.every((w) => keyText.includes(w) || hay.includes(w));
        }),
      }))
      .filter((g) => g.shortcuts.length);
  }, [groups, q]);
  const total = filtered.reduce((n, g) => n + g.shortcuts.length, 0);

  const onRootKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (open) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
      return;
    }
    if (event.key === "?" && !event.metaKey && !event.ctrlKey && !isTyping(event.target)) {
      event.preventDefault();
      setOpen(true);
    }
  };

  const ease = [0.23, 1, 0.32, 1] as const;

  return (
    <div
      aria-label="Workspace. Press question mark for keyboard shortcuts."
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      onKeyDown={onRootKey}
      onPointerDown={(event) => {
        if (!isTyping(event.target) && !(event.target as HTMLElement).closest("button,a,[tabindex]:not([data-sheet-root])")) {
          event.preventDefault();
          rootRef.current?.focus();
        }
      }}
      data-sheet-root=""
      ref={rootRef}
      role="region"
      tabIndex={0}
    >
      <div aria-hidden={open || undefined} inert={open || undefined}>
        {children}
        <div className="flex items-center justify-between border-t px-4 py-2 text-muted-foreground text-xs">
          <span>Click anywhere in here, then press</span>
          <button
            className="flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setOpen(true)}
            type="button"
          >
            <Kbd>?</Kbd>
            <span>Shortcuts</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex items-end bg-background/40 p-2 backdrop-blur-[2px]"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            initial={{ opacity: 0 }}
            key="scrim"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) {
                event.preventDefault();
                close();
              }
            }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              aria-labelledby={titleId}
              aria-modal="true"
              className="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg/5"
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15, ease: "easeOut" } }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              onKeyDown={(event) => {
                if (event.key !== "Tab") return;
                const items = [...event.currentTarget.querySelectorAll<HTMLElement>("input,button")];
                const first = items[0];
                const last = items[items.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }}
              role="dialog"
              transition={{ duration: 0.24, ease }}
            >
              <div className="flex items-center gap-2 border-b px-3 py-2.5">
                <h2 className="sr-only" id={titleId}>
                  {title}
                </h2>
                <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
                <input
                  aria-label="Search shortcuts"
                  className="h-7 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search shortcuts…"
                  ref={inputRef}
                  value={query}
                />
                <PlatformSwitch onChange={setPlatform} value={platform} />
                <button
                  aria-label="Close shortcuts"
                  className="-me-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={close}
                  type="button"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-1 pb-4 [mask-image:linear-gradient(to_bottom,black_calc(100%-20px),transparent)]">
                {filtered.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-1 px-6 pb-6 text-center">
                    <p className="font-medium text-sm">No shortcuts for “{query.trim()}”</p>
                    <p className="text-muted-foreground text-xs">Try an action like “archive”, or a key like “shift”.</p>
                  </div>
                ) : (
                  filtered.map((g) => (
                    <section className="mt-2" key={g.title}>
                      <h3 className="px-1 pb-1 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">{g.title}</h3>
                      <ul>
                        {g.shortcuts.map((s) => (
                          <li className="flex min-h-8 items-center justify-between gap-3 rounded-md px-1 py-1 text-sm" key={s.label}>
                            <span className="min-w-0 truncate">
                              <Highlight query={q} text={s.label} />
                            </span>
                            <Keys keys={s.keys} platform={platform} reduce={!!reduce} />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))
                )}
              </div>
              <p aria-live="polite" className="sr-only">
                {q ? `${total} shortcut${total === 1 ? "" : "s"} found` : ""}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Keys({ keys, platform, reduce }: { keys: string[][]; platform: Platform; reduce: boolean }) {
  const spoken = keys.map((combo) => combo.map((k) => SPOKEN[k.toLowerCase()] ?? k).join(" ")).join(", then ");
  return (
    <span aria-label={spoken} className="flex shrink-0 items-center gap-1.5" role="img">
      {keys.map((combo, i) => (
        <span className="flex items-center gap-1.5" key={combo.join("+")}>
          {i > 0 && <span className="text-[11px] text-muted-foreground">then</span>}
          <span className="flex items-center gap-0.5">
            {combo.map((k) => (
              <motion.span
                animate={{ opacity: 1 }}
                className="inline-flex"
                initial={reduce ? false : { opacity: 0.2 }}
                key={`${platform}-${k}`}
                transition={{ duration: 0.18 }}
              >
                <Kbd className="h-5.5 min-w-5.5 border border-border bg-muted/60 px-1.5 font-sans text-[11px] text-foreground/80 shadow-[0_1px_0_var(--color-border)]">
                  {keyLabel(k, platform)}
                </Kbd>
              </motion.span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

function PlatformSwitch({ value, onChange }: { value: Platform; onChange: (p: Platform) => void }) {
  const id = useId();
  return (
    <div aria-label="Show keys for" className="relative flex shrink-0 rounded-md bg-muted p-0.5" role="radiogroup">
      {(["mac", "windows"] as const).map((p) => (
        <button
          aria-checked={value === p}
          className={cn(
            "relative z-0 h-6 cursor-pointer rounded-[calc(var(--radius-md)-2px)] px-2 font-medium text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            value === p ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          key={p}
          onClick={() => onChange(p)}
          role="radio"
          type="button"
        >
          {value === p && (
            <motion.span
              className="absolute inset-0 -z-10 rounded-[calc(var(--radius-md)-2px)] bg-background shadow-sm/5 dark:bg-input"
              layoutId={`${id}-platform`}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            />
          )}
          {p === "mac" ? "Mac" : "Windows"}
        </button>
      ))}
    </div>
  );
}
