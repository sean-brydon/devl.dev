"use client";

import {
  CheckIcon,
  LayoutGridIcon,
  type LucideIcon,
  SearchIcon,
  ShieldCheckIcon,
  StarIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type AppTone = "blue" | "green" | "amber" | "red" | "neutral";

export interface MarketplaceCategory {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface MarketplaceApp {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: LucideIcon;
  tone: AppTone;
  rating: number;
  installs: string;
  pricing: "free" | "paid";
  isNew?: boolean;
  connected?: boolean;
  permissions?: string[];
}

export interface ConnectorMarketplaceProps {
  apps: MarketplaceApp[];
  categories: MarketplaceCategory[];
  workspace?: { name: string; initial?: string };
  onConnectionChange?: (appId: string, connected: boolean) => void;
  className?: string;
}

type Status = "idle" | "connecting" | "connected";
type Phase = "review" | "authorizing" | "syncing" | "done";

const toneClass: Record<AppTone, string> = {
  blue: "bg-blue-500 text-white",
  green: "bg-emerald-500 text-white",
  amber: "bg-amber-500 text-white",
  red: "bg-rose-500 text-white",
  neutral: "bg-foreground text-background",
};
const press = "transition-[box-shadow,background-color,transform] duration-150 ease-out active:scale-[0.97]";

function AppTile({ app, size = "md" }: { app: MarketplaceApp; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden shadow-xs/5 before:absolute before:inset-0 before:bg-linear-to-b before:from-white/20 before:to-transparent [&_svg]:relative",
        toneClass[app.tone],
        size === "lg" ? "size-14 rounded-2xl [&_svg]:size-7" : "size-10 rounded-xl [&_svg]:size-5",
      )}
    >
      <app.icon />
    </span>
  );
}

function ConnectBridge({ phase, app, workspace }: { phase: Phase; app: MarketplaceApp; workspace: string }) {
  const reduce = useReducedMotion();
  const flowing = phase === "authorizing" || phase === "syncing";
  const done = phase === "done";
  return (
    <div className="flex items-center gap-3">
      <AppTile app={app} size="lg" />
      <div aria-hidden className="relative h-14 flex-1">
        <span
          className={cn(
            "absolute top-1/2 left-0 size-2 -translate-y-1/2 rounded-full transition-colors duration-300",
            done ? "bg-success" : "bg-border",
          )}
        />
        <span
          className={cn(
            "absolute top-1/2 right-0 size-2 -translate-y-1/2 rounded-full transition-colors duration-300",
            done ? "bg-success" : "bg-border",
          )}
        />
        <span className="absolute inset-x-3 top-1/2 -translate-y-1/2 border-t-2 border-dashed" />
        <motion.span
          animate={{ scaleX: done ? 1 : 0 }}
          className="absolute inset-x-1 top-1/2 h-0.5 origin-left -translate-y-1/2 rounded-full bg-success"
          initial={false}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 180, damping: 26 }}
        />
        <div className="absolute inset-x-3 top-1/2 -translate-y-1/2">
          {flowing &&
            !reduce &&
            [0, 1, 2].map((i) => (
              <motion.span
                animate={{ x: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
                className="absolute inset-x-0 top-1/2"
                initial={{ x: "0%", opacity: 0 }}
                key={i}
                transition={{
                  duration: 1.2,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.4,
                  ease: "easeInOut",
                  opacity: { duration: 1.2, times: [0, 0.15, 0.85, 1], repeat: Number.POSITIVE_INFINITY, delay: i * 0.4 },
                }}
              >
                <span className="absolute top-0 left-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />
              </motion.span>
            ))}
        </div>
        <AnimatePresence>
          {done && (
            <motion.span
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-1/2 left-1/2 -mt-3.5 -ml-3.5 flex size-7 items-center justify-center rounded-full bg-success text-white ring-4 ring-popover"
              initial={{ scale: 0.5, opacity: 0 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 30, delay: 0.12 }}
            >
              <CheckIcon className="size-4" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary font-semibold text-lg text-primary-foreground shadow-xs/5">
        {workspace.slice(0, 1)}
      </span>
    </div>
  );
}

function ConnectDialog({
  app,
  workspace,
  onClose,
  onConnected,
}: {
  app: MarketplaceApp;
  workspace: string;
  onClose: () => void;
  onConnected: () => void;
}) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("review");
  const primaryRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const permissions = app.permissions ?? ["Read workspace members", "Create and update records", "Send notifications"];

  useEffect(() => {
    primaryRef.current?.focus();
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const authorize = () => {
    const pace = reduce ? 0.3 : 1;
    setPhase("authorizing");
    timers.current.push(setTimeout(() => setPhase("syncing"), 1100 * pace));
    timers.current.push(
      setTimeout(() => {
        setPhase("done");
        onConnected();
      }, 2300 * pace),
    );
    timers.current.push(setTimeout(onClose, 3500 * pace));
  };

  const steps: { key: Phase; label: string }[] = [
    { key: "authorizing", label: "Authorizing access" },
    { key: "syncing", label: "Syncing your data" },
    { key: "done", label: "Connected" },
  ];
  const order: Phase[] = ["review", "authorizing", "syncing", "done"];
  const at = order.indexOf(phase);

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      aria-label={`Connect ${app.name}`}
      aria-modal="true"
      className="relative z-10 w-full max-w-sm rounded-2xl border bg-popover p-5 text-popover-foreground shadow-xs/5"
      exit={{ opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.15, ease: "easeOut" } }}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && phase === "review") onClose();
      }}
      role="dialog"
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 40 }}
    >
      {phase === "review" && (
        <button
          aria-label="Close"
          className="absolute top-3 right-3 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-[color,background-color,transform] duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
          onClick={onClose}
          type="button"
        >
          <XIcon className="size-4" />
        </button>
      )}
      <div className="pt-6">
        <ConnectBridge app={app} phase={phase} workspace={workspace} />
      </div>
      <h3 className="mt-5 font-semibold text-base">
        {phase === "done" ? `${app.name} is connected` : `Connect ${app.name} to ${workspace}`}
      </h3>
      <AnimatePresence initial={false} mode="wait">
        {phase === "review" ? (
          <motion.div animate={{ opacity: 1 }} exit={{ opacity: 0 }} initial={{ opacity: 0 }} key="review">
            <p className="mt-1 text-muted-foreground text-sm">{app.name} will be able to:</p>
            <ul className="mt-3 space-y-2 text-sm">
              {permissions.map((p) => (
                <li className="flex items-center gap-2" key={p}>
                  <ShieldCheckIcon className="size-4 shrink-0 text-success-foreground" />
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex gap-2">
              <Button className={cn("flex-1", press)} onClick={onClose} variant="outline">
                Cancel
              </Button>
              <Button className={cn("flex-1", press)} onClick={authorize} ref={primaryRef}>
                Authorize
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.ol
            animate={{ opacity: 1 }}
            aria-live="polite"
            className="mt-3 space-y-2.5 text-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="steps"
          >
            {steps.map((s, i) => {
              const state = at > i + 1 || phase === "done" ? "done" : at === i + 1 ? "active" : "todo";
              return (
                <li className="flex items-center gap-2.5" key={s.key}>
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full transition-colors duration-300",
                      state === "done" ? "bg-success text-white" : state === "active" ? "bg-accent" : "bg-muted",
                    )}
                  >
                    {state === "done" ? (
                      <CheckIcon className="size-3" strokeWidth={3} />
                    ) : state === "active" ? (
                      <Spinner className="size-3" />
                    ) : null}
                  </span>
                  <span className={cn(state === "todo" && "text-muted-foreground")}>{s.label}</span>
                </li>
              );
            })}
          </motion.ol>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ConnectButton({ status, onConnect, onDisconnect }: { status: Status; onConnect: () => void; onDisconnect: () => void }) {
  if (status === "connecting") {
    return (
      <Button disabled size="sm" variant="outline">
        <Spinner className="size-3.5" />
        Connecting
      </Button>
    );
  }
  if (status === "connected") {
    return (
      <button
        aria-label="Connected. Click to disconnect"
        className="group/conn relative inline-flex h-8 cursor-pointer items-center gap-1.5 overflow-hidden rounded-lg bg-success/10 px-2.5 font-medium text-sm text-success-foreground outline-none transition-[color,background-color,transform] duration-150 ease-out hover:bg-destructive/10 hover:text-destructive-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] sm:h-7 sm:text-xs"
        onClick={onDisconnect}
        type="button"
      >
        <span className="size-1.5 rounded-full bg-success transition-colors duration-150 group-hover/conn:bg-destructive" />
        <span className="grid">
          <span className="[grid-area:1/1] group-hover/conn:invisible">Connected</span>
          <span className="invisible [grid-area:1/1] group-hover/conn:visible">Disconnect</span>
        </span>
      </button>
    );
  }
  return (
    <Button className={press} onClick={onConnect} size="sm" variant="outline">
      Connect
    </Button>
  );
}

export function ConnectorMarketplace({
  apps,
  categories,
  workspace = { name: "Acme Labs" },
  onConnectionChange,
  className,
}: ConnectorMarketplaceProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ connected: false, free: false, isNew: false });
  const [sort, setSort] = useState<"popular" | "az">("popular");
  const [status, setStatus] = useState<Record<string, Status>>(() =>
    Object.fromEntries(apps.map((a) => [a.id, a.connected ? "connected" : "idle"])),
  );
  const [dialogApp, setDialogApp] = useState<MarketplaceApp | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const setAppStatus = (id: string, s: Status) => {
    setStatus((prev) => ({ ...prev, [id]: s }));
    if (s !== "connecting") onConnectionChange?.(id, s === "connected");
  };

  const q = query.trim().toLowerCase();
  const visible = apps
    .filter((a) => category === "all" || a.category === category)
    .filter((a) => !q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
    .filter((a) => !filters.connected || status[a.id] === "connected")
    .filter((a) => !filters.free || a.pricing === "free")
    .filter((a) => !filters.isNew || a.isNew)
    .sort((a, b) => (sort === "az" ? a.name.localeCompare(b.name) : b.rating - a.rating));

  const connectedCount = Object.values(status).filter((s) => s === "connected").length;
  const allCategories: MarketplaceCategory[] = [{ id: "all", label: "All apps", icon: LayoutGridIcon }, ...categories];
  const countFor = (id: string) => (id === "all" ? apps.length : apps.filter((a) => a.category === id).length);
  const spring = reduce ? { duration: 0 } : ({ type: "spring", stiffness: 480, damping: 42 } as const);

  const closeDialog = () => {
    if (dialogApp) {
      const id = dialogApp.id;
      setStatus((prev) => (prev[id] === "connecting" ? { ...prev, [id]: "idle" } : prev));
    }
    setDialogApp(null);
    requestAnimationFrame(() => returnFocus.current?.focus());
  };

  return (
    <LayoutGroup id={uid}>
      <div
        className={cn(
          "relative isolate mx-auto flex h-[720px] w-full max-w-[1100px] overflow-hidden rounded-2xl border bg-card",
          className,
        )}
      >
        <nav aria-label="Categories" className="hidden w-56 shrink-0 flex-col border-e bg-muted/40 p-3 md:flex">
          <p className="px-2 pt-1 pb-3 font-semibold text-sm">Integrations</p>
          <ul className="space-y-0.5">
            {allCategories.map((c) => {
              const active = category === c.id;
              return (
                <li key={c.id}>
                  <button
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setCategory(c.id)}
                    type="button"
                  >
                    {active && (
                      <motion.span
                        className="absolute inset-0 rounded-lg bg-background shadow-xs/5 dark:bg-accent"
                        layoutId="category-pill"
                        transition={spring}
                      />
                    )}
                    <c.icon className="relative size-4" />
                    <span className="relative flex-1 text-start">{c.label}</span>
                    <span className="relative text-muted-foreground text-xs tabular-nums">{countFor(c.id)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-auto rounded-xl border bg-card p-3">
            <p className="text-muted-foreground text-xs">Connected to {workspace.name}</p>
            <p className="mt-1 font-semibold text-2xl tabular-nums">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  animate={{ y: 0, opacity: 1 }}
                  className="inline-block"
                  exit={{ y: -12, opacity: 0 }}
                  initial={{ y: 12, opacity: 0 }}
                  key={connectedCount}
                  transition={spring}
                >
                  {connectedCount}
                </motion.span>
              </AnimatePresence>
              <span className="font-normal text-muted-foreground text-sm"> / {apps.length} apps</span>
            </p>
          </div>
        </nav>

        <div className="@container flex min-w-0 flex-1 flex-col">
          <div className="space-y-3 border-b p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <InputGroup className="min-w-0 flex-1 sm:max-w-xs">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  aria-label="Search apps"
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search apps"
                  type="search"
                  value={query}
                />
              </InputGroup>
              <div aria-label="Sort" className="ms-auto inline-flex rounded-lg border bg-muted p-0.5" role="radiogroup">
                {(
                  [
                    { value: "popular", label: "Top rated" },
                    { value: "az", label: "A–Z" },
                  ] as const
                ).map((o) => (
                  <button
                    aria-checked={sort === o.value}
                    className={cn(
                      "relative h-7 cursor-pointer rounded-md px-2.5 font-medium text-xs outline-none transition-colors duration-150 after:absolute after:-inset-y-0.5 after:inset-x-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring",
                      sort === o.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    key={o.value}
                    onClick={() => setSort(o.value)}
                    role="radio"
                    type="button"
                  >
                    {sort === o.value && (
                      <motion.span
                        className="absolute inset-0 rounded-md bg-background shadow-xs/5 dark:bg-accent"
                        layoutId="sort-pill"
                        transition={spring}
                      />
                    )}
                    <span className="relative">{o.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
              <div className="flex gap-1.5 md:hidden">
                {allCategories.map((c) => (
                  <button
                    aria-pressed={category === c.id}
                    className={cn(
                      "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                      category === c.id ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    type="button"
                  >
                    <c.icon className="size-3.5" />
                    {c.label}
                  </button>
                ))}
                <span className="mx-1 w-px shrink-0 bg-border" />
              </div>
              {(
                [
                  { key: "connected", label: "Connected" },
                  { key: "free", label: "Free" },
                  { key: "isNew", label: "New" },
                ] as const
              ).map((f) => (
                <button
                  aria-pressed={filters[f.key]}
                  className={cn(
                    "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full border px-3 text-xs outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring md:h-7 md:px-2.5",
                    filters[f.key] ? "border-foreground/24 bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60",
                  )}
                  key={f.key}
                  onClick={() => setFilters((prev) => ({ ...prev, [f.key]: !prev[f.key] }))}
                  type="button"
                >
                  <AnimatePresence initial={false}>
                    {filters[f.key] && (
                      <motion.span
                        animate={{ width: "auto", opacity: 1 }}
                        className="overflow-hidden"
                        exit={{ width: 0, opacity: 0 }}
                        initial={{ width: 0, opacity: 0 }}
                        transition={reduce ? { duration: 0 } : { duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                      >
                        <CheckIcon className="size-3" strokeWidth={3} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
            <motion.ul className="grid gap-3 @xl:grid-cols-2 @3xl:grid-cols-3" layout={!reduce}>
              <AnimatePresence initial={false} mode="popLayout">
                {visible.map((app) => (
                  <motion.li
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col rounded-2xl border bg-card p-4 shadow-xs/5"
                    exit={{ opacity: 0, scale: 0.96 }}
                    initial={{ opacity: 0, scale: 0.96 }}
                    key={app.id}
                    layout={!reduce}
                    transition={spring}
                  >
                    <div className="flex items-start gap-3">
                      <AppTile app={app} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate font-medium text-sm">{app.name}</h3>
                          {app.isNew && (
                            <span className="rounded-full bg-info/10 px-1.5 py-px font-medium text-[0.625rem] text-info-foreground">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {categories.find((c) => c.id === app.category)?.label ?? app.category}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-px font-medium text-xs",
                          app.pricing === "free" ? "bg-success/10 text-success-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {app.pricing === "free" ? "Free" : "Paid"}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-pretty text-muted-foreground text-sm">{app.description}</p>
                    <div className="mt-auto flex items-center gap-3 pt-3 text-muted-foreground text-xs">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <StarIcon className="size-3.5 text-warning" fill="currentColor" strokeWidth={0} />
                        {app.rating.toFixed(1)}
                      </span>
                      <span className="tabular-nums">{app.installs} installs</span>
                      <span className="ms-auto">
                        <ConnectButton
                          onConnect={() => {
                            returnFocus.current = document.activeElement as HTMLElement | null;
                            setAppStatus(app.id, "connecting");
                            setDialogApp(app);
                          }}
                          onDisconnect={() => setAppStatus(app.id, "idle")}
                          status={status[app.id] ?? "idle"}
                        />
                      </span>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
            {visible.length === 0 && (
              <div className="flex h-60 flex-col items-center justify-center gap-2 text-center">
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
                  <SearchIcon className="size-5 text-muted-foreground" />
                </span>
                <p className="font-medium text-sm">No apps match</p>
                <p className="text-muted-foreground text-xs">Try another category or clear the filters.</p>
                <Button
                  className="mt-1"
                  onClick={() => {
                    setQuery("");
                    setFilters({ connected: false, free: false, isNew: false });
                    setCategory("all");
                  }}
                  size="sm"
                  variant="outline"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {dialogApp && (
            <motion.div
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 flex items-start justify-center p-4 pt-24 sm:pt-32"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="dialog"
            >
              <div aria-hidden className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" onClick={closeDialog} />
              <ConnectDialog
                app={dialogApp}
                onClose={closeDialog}
                onConnected={() => setAppStatus(dialogApp.id, "connected")}
                workspace={workspace.name}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}
