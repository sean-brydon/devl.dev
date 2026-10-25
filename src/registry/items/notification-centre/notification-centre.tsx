"use client";

import { Popover } from "@base-ui/react/popover";
import {
  ArchiveIcon,
  AtSignIcon,
  BellIcon,
  BellOffIcon,
  CheckCheckIcon,
  CheckIcon,
  CircleIcon,
  KeyRoundIcon,
  MessageSquareIcon,
  RocketIcon,
  SettingsIcon,
  UserRoundPlusIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type NotificationKind = "mention" | "comment" | "assign" | "access" | "deploy";
export type NotificationTone = "violet" | "sky" | "emerald" | "amber" | "rose" | "teal";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  actor: { name: string; tone?: NotificationTone };
  action: string;
  target?: string;
  snippet?: string;
  time: string;
  place?: string;
  group: string;
  read?: boolean;
  request?: boolean;
}

export interface NotificationCentreProps {
  notifications: NotificationItem[];
  defaultOpen?: boolean;
  onRequest?: (item: NotificationItem, approved: boolean) => void;
  onSettings?: () => void;
  className?: string;
}

const TONES: Record<NotificationTone, string> = {
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  sky: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  rose: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  teal: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
};

const KIND_ICON: Record<NotificationKind, ReactNode> = {
  mention: <AtSignIcon />,
  comment: <MessageSquareIcon />,
  assign: <UserRoundPlusIcon />,
  access: <KeyRoundIcon />,
  deploy: <RocketIcon />,
};

type Tab = "all" | "mentions" | "unread";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function NotificationCentre({ notifications, defaultOpen = false, onRequest, onSettings, className }: NotificationCentreProps) {
  const reduce = useReducedMotion();
  const [items, setItems] = useState(notifications);
  const [tab, setTab] = useState<Tab>("all");
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [archived, setArchived] = useState<{ item: NotificationItem; index: number } | null>(null);
  const undoTimer = useRef<number>(undefined);
  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const unread = items.filter((n) => !n.read).length;
  const counts = {
    all: items.length,
    mentions: items.filter((n) => n.kind === "mention").length,
    unread,
  };

  const visible = useMemo(() => {
    const list = items.filter((n) => (tab === "mentions" ? n.kind === "mention" : tab === "unread" ? !n.read : true));
    const groups: { title: string; items: NotificationItem[] }[] = [];
    for (const n of list) {
      const g = groups.find((x) => x.title === n.group);
      if (g) g.items.push(n);
      else groups.push({ title: n.group, items: [n] });
    }
    return groups;
  }, [items, tab]);

  const setRead = (id: string, read: boolean) => setItems((list) => list.map((n) => (n.id === id ? { ...n, read } : n)));
  const markAll = () => setItems((list) => list.map((n) => ({ ...n, read: true })));
  const archive = (id: string) => {
    const index = items.findIndex((n) => n.id === id);
    if (index < 0) return;
    setArchived({ item: items[index], index });
    setItems((list) => list.filter((n) => n.id !== id));
    clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setArchived(null), 5000);
  };
  const undo = () => {
    if (!archived) return;
    setItems((list) => {
      const next = [...list];
      next.splice(Math.min(archived.index, next.length), 0, archived.item);
      return next;
    });
    setArchived(null);
    clearTimeout(undoTimer.current);
  };
  const answer = (item: NotificationItem, approved: boolean) => {
    setAnswered((a) => ({ ...a, [item.id]: approved }));
    setRead(item.id, true);
    onRequest?.(item, approved);
  };

  const ease = [0.23, 1, 0.32, 1] as const;

  return (
    <Popover.Root defaultOpen={defaultOpen}>
      <Popover.Trigger
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className={cn(
          "relative inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border bg-popover text-foreground shadow-xs/5 outline-none transition-[background-color,scale] duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[0.97] data-popup-open:bg-accent sm:size-8 dark:bg-input/32",
          className,
        )}
      >
        <BellIcon className="size-4" />
        <AnimatePresence initial={false}>
          {unread > 0 && (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center overflow-hidden rounded-full bg-destructive px-1 font-semibold text-[10px] text-white tabular-nums shadow-xs ring-2 ring-background"
              exit={{ opacity: 0, scale: 0.6 }}
              initial={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18, ease }}
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  initial={reduce ? false : { y: 8, opacity: 0 }}
                  key={unread}
                  transition={{ duration: 0.18, ease }}
                >
                  {unread > 9 ? "9+" : unread}
                </motion.span>
              </AnimatePresence>
            </motion.span>
          )}
        </AnimatePresence>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="end" className="z-50" collisionPadding={16} sideOffset={8}>
          <Popover.Popup
            className="flex w-[min(380px,calc(100vw-2rem))] origin-(--transform-origin) flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-lg/5 outline-none transition-[scale,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-ending-style:scale-[0.97] data-starting-style:scale-[0.96] data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:duration-150 motion-reduce:data-starting-style:scale-100"
            initialFocus={(type) => (type === "keyboard" ? true : type === "" ? false : popupRef.current)}
            ref={popupRef}
          >
            <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
              <Popover.Title className="font-semibold text-sm">Notifications</Popover.Title>
              <div className="flex items-center gap-0.5">
                <Button className="text-muted-foreground" disabled={!unread} onClick={markAll} size="xs" variant="ghost">
                  <CheckCheckIcon />
                  Mark all read
                </Button>
                <Button aria-label="Notification settings" className="text-muted-foreground" onClick={onSettings} size="icon-xs" variant="ghost">
                  <SettingsIcon />
                </Button>
              </div>
            </div>
            <Tabs onValueChange={(v) => setTab(v as Tab)} value={tab}>
              <TabsList className="w-full justify-start gap-1 border-b px-2.5 py-0! *:data-[slot=tabs-tab]:grow-0" variant="underline">
                {(["all", "mentions", "unread"] as const).map((t) => (
                  <TabsTab className="h-9 gap-1.5 px-2 text-[13px] capitalize sm:h-9 sm:text-[13px]" key={t} value={t}>
                    {t}
                    <span className="rounded-full bg-muted px-1.5 py-px font-medium text-[10px] text-muted-foreground tabular-nums">{counts[t]}</span>
                  </TabsTab>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative h-[316px] overflow-y-auto overscroll-contain" role="tabpanel">
              {visible.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-1 px-8 text-center">
                  <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <BellOffIcon className="size-4.5" />
                  </span>
                  <p className="font-medium text-sm">You’re all caught up</p>
                  <p className="text-pretty text-muted-foreground text-xs">
                    {tab === "mentions" ? "When someone @mentions you, it lands here." : "New replies, requests and deploys will show up here."}
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {visible.map((group) => (
                    <motion.section
                      exit={{ opacity: 0 }}
                      key={group.title}
                      layout={reduce ? false : "position"}
                      transition={{ duration: 0.2, ease }}
                    >
                      <h3 className="sticky top-0 z-20 bg-popover/95 px-4 pt-2.5 pb-1 font-medium text-[11px] text-muted-foreground uppercase tracking-wide backdrop-blur-sm">
                        {group.title}
                      </h3>
                      <AnimatePresence initial={false}>
                        {group.items.map((n) => (
                          <Row
                            answered={answered[n.id]}
                            item={n}
                            key={n.id}
                            onAnswer={(approved) => answer(n, approved)}
                            onArchive={() => archive(n.id)}
                            onOpen={() => setRead(n.id, true)}
                            onToggleRead={() => setRead(n.id, !n.read)}
                            reduce={!!reduce}
                          />
                        ))}
                      </AnimatePresence>
                    </motion.section>
                  ))}
                </AnimatePresence>
              )}
            </div>
            <div className="relative flex h-10 items-center border-t px-4 text-xs">
              <AnimatePresence initial={false} mode="popLayout">
                {archived ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="flex w-full items-center justify-between gap-2"
                    exit={{ opacity: 0, y: -6 }}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    key="undo"
                    transition={{ duration: 0.18, ease }}
                  >
                    <span className="truncate text-muted-foreground">
                      Archived <span className="text-foreground">{archived.item.actor.name}</span>’s notification
                    </span>
                    <Button className="-me-2" onClick={undo} size="xs" variant="ghost">
                      Undo
                    </Button>
                  </motion.div>
                ) : (
                  <motion.p
                    animate={{ opacity: 1, y: 0 }}
                    className="text-muted-foreground"
                    exit={{ opacity: 0, y: -6 }}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    key="hint"
                    transition={{ duration: 0.18, ease }}
                  >
                    {unread ? `${unread} unread` : "Nothing unread"}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface RowProps {
  item: NotificationItem;
  answered?: boolean;
  reduce: boolean;
  onOpen: () => void;
  onToggleRead: () => void;
  onArchive: () => void;
  onAnswer: (approved: boolean) => void;
}

function Row({ item, answered, reduce, onOpen, onToggleRead, onArchive, onAnswer }: RowProps) {
  const ease = [0.23, 1, 0.32, 1] as const;
  const tone = TONES[item.actor.tone ?? "sky"];
  return (
    <motion.div
      className="overflow-hidden"
      exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
      layout={reduce ? false : "position"}
      transition={{ duration: 0.2, ease }}
    >
      <div className="group/row relative flex gap-3 px-4 py-2.5 transition-colors duration-150 has-[[data-open]:focus-visible]:bg-accent [@media(hover:hover)]:hover:bg-accent/60">
        <button
          aria-label={`${item.actor.name} ${item.action} ${item.target ?? ""}`.trim()}
          className="absolute inset-0 z-0 cursor-pointer outline-none"
          data-open=""
          onClick={onOpen}
          type="button"
        />
        <span className="pointer-events-none relative mt-0.5 size-8 shrink-0">
          <span className={cn("flex size-8 items-center justify-center rounded-full font-semibold text-[11px]", tone)}>{initials(item.actor.name)}</span>
          <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-popover text-muted-foreground ring-2 ring-popover [&_svg]:size-2.5">
            {KIND_ICON[item.kind]}
          </span>
        </span>
        <div className="pointer-events-none relative min-w-0 flex-1 pe-4">
          <p className={cn("text-pretty text-[13px] leading-snug transition-colors duration-200", item.read ? "text-muted-foreground" : "text-foreground")}>
            <span className="font-medium text-foreground">{item.actor.name}</span> {item.action}
            {item.target && (
              <>
                {" "}
                <span className="font-medium text-foreground">{item.target}</span>
              </>
            )}
          </p>
          {item.snippet && (
            <p className="mt-1 line-clamp-2 border-s-2 ps-2 text-muted-foreground text-xs leading-relaxed">{item.snippet}</p>
          )}
          {item.request && (
            <div className="pointer-events-auto relative z-10 mt-2 flex h-7 items-center gap-1.5 sm:h-6">
              <AnimatePresence initial={false} mode="popLayout">
                {answered === undefined ? (
                  <motion.div className="flex gap-1.5" exit={{ opacity: 0, scale: 0.96 }} key="ask" transition={{ duration: 0.15 }}>
                    <Button onClick={() => onAnswer(true)} size="xs">
                      Approve
                    </Button>
                    <Button onClick={() => onAnswer(false)} size="xs" variant="outline">
                      Decline
                    </Button>
                  </motion.div>
                ) : (
                  <motion.span
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1 font-medium text-muted-foreground text-xs"
                    initial={reduce ? false : { opacity: 0, x: -4 }}
                    key="done"
                    transition={{ duration: 0.2, ease }}
                  >
                    {answered ? <CheckIcon className="size-3.5 text-success" /> : <XIcon className="size-3.5" />}
                    {answered ? "Access granted" : "Request declined"}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          )}
          <p className="mt-1 text-muted-foreground text-xs tabular-nums">
            {item.time}
            {item.place && <> · {item.place}</>}
          </p>
        </div>
        <motion.span
          animate={{ opacity: item.read ? 0 : 1, scale: item.read ? 0.4 : 1 }}
          aria-hidden
          className="pointer-events-none absolute top-4 right-4 size-2 rounded-full bg-info"
          initial={false}
          transition={{ duration: 0.18, ease }}
        />
        <div className="absolute top-1.5 right-2 z-10 flex items-center gap-0.5 rounded-lg border bg-popover p-0.5 opacity-100 shadow-xs/5 transition-opacity duration-150 group-focus-within/row:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100">
          <Button aria-label={item.read ? "Mark as unread" : "Mark as read"} onClick={onToggleRead} size="icon-xs" title={item.read ? "Mark as unread" : "Mark as read"} variant="ghost">
            {item.read ? <CircleIcon /> : <CheckIcon />}
          </Button>
          <Button aria-label="Archive" onClick={onArchive} size="icon-xs" title="Archive" variant="ghost">
            <ArchiveIcon />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
