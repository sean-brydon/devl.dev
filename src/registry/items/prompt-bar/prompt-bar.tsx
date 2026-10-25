"use client";

import {
  ArrowUpIcon,
  CalendarIcon,
  ChevronDownIcon,
  FileTextIcon,
  FolderIcon,
  ImageIcon,
  LinkIcon,
  type LucideIcon,
  MailIcon,
  MicIcon,
  PlusIcon,
  ShieldCheckIcon,
  ShieldIcon,
  SquareKanbanIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@/components/ui/menu";
import { cn } from "@/lib/utils";

export interface PromptBarModel {
  id: string;
  name: string;
  hint?: string;
}

export interface PromptBarApp {
  id: string;
  name: string;
  icon: LucideIcon;
  tint?: string;
}

export interface PromptBarAttachment {
  id: string;
  name: string;
  kind: "file" | "image" | "link";
}

export interface PromptBarSendPayload {
  text: string;
  model: string;
  approval: boolean;
  apps: string[];
  attachments: PromptBarAttachment[];
}

export interface PromptBarProps {
  placeholder?: string;
  models?: PromptBarModel[];
  defaultModel?: string;
  apps?: PromptBarApp[];
  defaultApps?: string[];
  defaultApproval?: boolean;
  transcript?: string;
  onSend?: (payload: PromptBarSendPayload) => void;
  className?: string;
}

const defaultModels: PromptBarModel[] = [
  { id: "lumen-3", name: "Lumen 3", hint: "Balanced" },
  { id: "lumen-3-swift", name: "Lumen 3 Swift", hint: "Fastest" },
  { id: "atlas-pro", name: "Atlas Pro", hint: "Deep reasoning" },
];

const defaultApps: PromptBarApp[] = [
  { id: "calendar", name: "Calendar", icon: CalendarIcon, tint: "text-sky-600 dark:text-sky-400" },
  { id: "mail", name: "Mail", icon: MailIcon, tint: "text-rose-600 dark:text-rose-400" },
  { id: "files", name: "Files", icon: FolderIcon, tint: "text-amber-600 dark:text-amber-400" },
  { id: "tracker", name: "Tracker", icon: SquareKanbanIcon, tint: "text-violet-600 dark:text-violet-400" },
];

const fakeFiles: Record<PromptBarAttachment["kind"], string[]> = {
  file: ["q3-brief.pdf", "offsite-notes.md", "budget-v2.xlsx"],
  image: ["moodboard.png", "whiteboard.jpg"],
  link: ["pinecrest.io/pricing", "docs.halyard.dev"],
};

const kindIcon = { file: FileTextIcon, image: ImageIcon, link: LinkIcon } as const;
const spring = { type: "spring", stiffness: 480, damping: 36 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;
const press = "transition-[color,background-color,border-color,scale] duration-150 ease-out active:scale-[0.97]";
const menuMotion =
  "transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0";

export function PromptBar({
  placeholder = "Ask anything or attach a file…",
  models = defaultModels,
  defaultModel,
  apps = defaultApps,
  defaultApps: initialApps = ["calendar", "mail"],
  defaultApproval = true,
  transcript = "Find a 30 minute slot with Priya next week and draft the invite.",
  onSend,
  className,
}: PromptBarProps) {
  const reduce = useReducedMotion();
  const inputId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [model, setModel] = useState(defaultModel ?? models[0]?.id ?? "");
  const [approval, setApproval] = useState(defaultApproval);
  const [active, setActive] = useState<string[]>(initialApps);
  const [attachments, setAttachments] = useState<PromptBarAttachment[]>([]);
  const [recording, setRecording] = useState(false);
  const [sent, setSent] = useState(0);
  const counter = useRef(0);

  const canSend = text.trim().length > 0 && !recording;
  const current = models.find((m) => m.id === model);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [text]);

  const attach = (kind: PromptBarAttachment["kind"]) => {
    const pool = fakeFiles[kind];
    const name = pool[counter.current % pool.length] ?? kind;
    counter.current += 1;
    setAttachments((a) => [...a, { id: `${kind}-${counter.current}`, name, kind }]);
  };

  const send = () => {
    if (!canSend) return;
    onSend?.({ text: text.trim(), model, approval, apps: active, attachments });
    setText("");
    setAttachments([]);
    setSent((s) => s + 1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const stopRecording = (keep: boolean) => {
    setRecording(false);
    if (keep) {
      setText((t) => (t ? `${t.trimEnd()} ${transcript}` : transcript));
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const toolBtn = cn(
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-muted-foreground text-xs outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent data-popup-open:text-foreground",
    press,
  );

  return (
    <div className={cn("w-full max-w-xl", className)}>
      <div className="@container rounded-2xl border bg-card p-2 shadow-xs/5 transition-[box-shadow,border-color] duration-150 has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-[3px] has-[textarea:focus-visible]:ring-ring/20">
        <AnimatePresence initial={false}>
          {attachments.length > 0 && (
            <motion.ul
              animate={{ height: "auto", opacity: 1 }}
              className="flex flex-wrap gap-1.5 overflow-hidden px-1"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={spring}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {attachments.map((a) => {
                  const Icon = kindIcon[a.kind];
                  return (
                    <motion.li
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-1 mb-1.5 flex items-center gap-1.5 rounded-lg border bg-background py-1 ps-2 pe-1 text-xs"
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
                      initial={reduce ? false : { opacity: 0, scale: 0.95 }}
                      key={a.id}
                      layout
                      transition={spring}
                    >
                      <Icon className="size-3.5 text-muted-foreground" />
                      <span className="max-w-36 truncate">{a.name}</span>
                      <button
                        aria-label={`Remove ${a.name}`}
                        className={cn(
                          "relative grid size-5 place-items-center rounded-md text-muted-foreground outline-none after:absolute after:-inset-1.5 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                          press,
                        )}
                        onClick={() => setAttachments((list) => list.filter((x) => x.id !== a.id))}
                        type="button"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ul>
          )}
        </AnimatePresence>

        <label className="sr-only" htmlFor={inputId}>
          Message
        </label>
        <textarea
          className="block max-h-42 min-h-11 w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-6 outline-none placeholder:text-muted-foreground/70"
          id={inputId}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={recording ? "Listening…" : placeholder}
          ref={textareaRef}
          rows={1}
          value={text}
        />

        <div className="mt-1 flex items-center gap-1">
          <Menu>
            <MenuTrigger
              aria-label="Attach"
              className={cn(
                "group/plus grid size-8 shrink-0 place-items-center rounded-full border text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent data-popup-open:text-foreground",
                press,
              )}
            >
              <PlusIcon className="size-4 transition-[rotate] duration-200 ease-out group-data-popup-open/plus:rotate-45" />
            </MenuTrigger>
            <MenuPopup align="start" className={cn("min-w-44", menuMotion)} side="top" sideOffset={8}>
              <MenuItem onClick={() => attach("file")}>
                <FileTextIcon />
                Upload a file
              </MenuItem>
              <MenuItem onClick={() => attach("image")}>
                <ImageIcon />
                Add an image
              </MenuItem>
              <MenuItem onClick={() => attach("link")}>
                <LinkIcon />
                Paste a link
              </MenuItem>
            </MenuPopup>
          </Menu>

          <Menu>
            <MenuTrigger className={toolBtn}>
              <span className="font-medium">{current?.name ?? "Model"}</span>
              <ChevronDownIcon className="size-3.5 transition-[rotate] duration-200 ease-out in-data-popup-open:rotate-180" />
            </MenuTrigger>
            <MenuPopup align="start" className={cn("min-w-52", menuMotion)} side="top" sideOffset={8}>
              <MenuGroup>
                <MenuGroupLabel>Model</MenuGroupLabel>
                <MenuRadioGroup onValueChange={(v) => setModel(String(v))} value={model}>
                  {models.map((m) => (
                    <MenuRadioItem key={m.id} value={m.id}>
                      <span className="flex w-full items-center justify-between gap-4">
                        {m.name}
                        {m.hint && <span className="text-muted-foreground text-xs">{m.hint}</span>}
                      </span>
                    </MenuRadioItem>
                  ))}
                </MenuRadioGroup>
              </MenuGroup>
            </MenuPopup>
          </Menu>

          <motion.button
            aria-pressed={approval}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 overflow-hidden rounded-full border px-2.5 text-xs outline-none transition-[color,background-color,border-color] duration-150 focus-visible:ring-2 focus-visible:ring-ring",
              approval
                ? "border-warning/40 bg-warning/12 text-warning-foreground"
                : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            layout
            onClick={() => setApproval((a) => !a)}
            title="Ask before the assistant takes actions in connected apps"
            transition={spring}
            type="button"
            whileTap={{ scale: 0.97 }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                className="grid"
                exit={{ scale: 0.6, opacity: 0, filter: "blur(2px)" }}
                initial={{ scale: 0.6, opacity: 0, filter: "blur(2px)" }}
                key={approval ? "on" : "off"}
                transition={{ duration: 0.18, ease: easeOut }}
              >
                {approval ? <ShieldCheckIcon className="size-3.5" /> : <ShieldIcon className="size-3.5" />}
              </motion.span>
            </AnimatePresence>
            <motion.span className="sr-only whitespace-nowrap @[25rem]:not-sr-only" layout="position">
              {approval ? "Approval required" : "Auto-run"}
            </motion.span>
          </motion.button>

          <div className="ms-auto flex items-center gap-1.5">
            <VoiceButton onStop={stopRecording} recording={recording} setRecording={setRecording} />
            <motion.button
              animate={{ scale: canSend || reduce ? 1 : 0.9 }}
              aria-label="Send message"
              className={cn(
                "relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full outline-none transition-[color,background-color] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                canSend ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground/60",
              )}
              disabled={!canSend}
              onClick={send}
              transition={{ duration: 0.2, ease: easeOut }}
              type="button"
              whileTap={canSend ? { scale: 0.94, transition: { duration: 0.1 } } : undefined}
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  animate={{ y: 0, opacity: 1 }}
                  className="grid"
                  exit={reduce ? { opacity: 0 } : { y: -22, opacity: 0 }}
                  initial={reduce ? { opacity: 0 } : { y: 22, opacity: 0 }}
                  key={sent}
                  transition={{ duration: 0.25, ease: easeOut }}
                >
                  <ArrowUpIcon className="size-4" />
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>

      {apps.length > 0 && (
        <div className="-mx-1 mt-2 flex items-center gap-1 overflow-x-auto px-2 py-0.5 [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] [scrollbar-width:none]">
          <span className="me-1 shrink-0 text-muted-foreground text-xs">Connected</span>
          {apps.map((app) => {
            const on = active.includes(app.id);
            const Icon = app.icon;
            return (
              <button
                aria-pressed={on}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  press,
                  on
                    ? "bg-card text-foreground"
                    : "border-dashed border-border text-muted-foreground hover:border-solid hover:text-foreground",
                )}
                key={app.id}
                onClick={() => setActive((list) => (on ? list.filter((x) => x !== app.id) : [...list, app.id]))}
                type="button"
              >
                <Icon className={cn("size-3.5 transition-colors duration-150", on && app.tint)} />
                {app.name}
                <motion.span
                  animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.5, width: on ? 6 : 0, marginInlineStart: on ? 0 : -6 }}
                  className="h-1.5 shrink-0 rounded-full bg-success"
                  initial={false}
                  transition={{ duration: reduce ? 0 : 0.2, ease: easeOut }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VoiceButton({
  recording,
  setRecording,
  onStop,
}: {
  recording: boolean;
  setRecording: (v: boolean) => void;
  onStop: (keep: boolean) => void;
}) {
  const reduce = useReducedMotion();
  const [levels, setLevels] = useState([0.3, 0.5, 0.8, 0.5, 0.3]);
  const [seconds, setSeconds] = useState(0);
  const stopRef = useRef(onStop);
  stopRef.current = onStop;

  useEffect(() => {
    if (!recording) return;
    setSeconds(0);
    const start = Date.now();
    const level = setInterval(() => {
      if (!reduce) {
        const t = Date.now() / 160;
        setLevels((prev) =>
          prev.map((_, i) => {
            const shape = 1 - Math.abs(i - 2) * 0.22;
            const wave = 0.45 + 0.35 * Math.sin(t + i * 0.9) * Math.sin(t / 3.1);
            return Math.max(0.3, Math.min(1, (wave + Math.random() * 0.35) * shape));
          }),
        );
      }
      setSeconds(Math.floor((Date.now() - start) / 1000));
    }, 110);
    const auto = setTimeout(() => stopRef.current(true), 4200);
    return () => {
      clearInterval(level);
      clearTimeout(auto);
    };
  }, [recording, reduce]);

  return (
    <motion.button
      animate={{ width: recording ? "auto" : 32 }}
      aria-label={recording ? "Stop recording" : "Dictate"}
      aria-pressed={recording}
      className={cn(
        "inline-flex h-8 shrink-0 items-center overflow-hidden rounded-full outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
        recording
          ? "bg-destructive/10 text-destructive-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
      initial={false}
      onClick={() => (recording ? onStop(true) : setRecording(true))}
      transition={{ duration: reduce ? 0 : 0.25, ease: easeOut }}
      type="button"
      whileTap={{ scale: 0.97 }}
    >
      {recording ? (
        <span className="flex items-center gap-2 px-2.5">
          <motion.span
            animate={{ opacity: [1, 0.45, 1] }}
            className="size-2 shrink-0 rounded-full bg-destructive"
            transition={{ duration: 1.1, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
          />
          <span aria-hidden className="flex h-4 items-center gap-[3px]">
            {levels.map((l, i) => (
              <motion.span
                animate={{ scaleY: l }}
                className="h-4 w-[3px] origin-center rounded-full bg-current"
                key={i}
                transition={{ type: "spring", stiffness: 700, damping: 30 }}
              />
            ))}
          </span>
          <span className="font-mono text-xs tabular-nums">0:{String(seconds).padStart(2, "0")}</span>
        </span>
      ) : (
        <span className="grid size-8 shrink-0 place-items-center">
          <MicIcon className="size-4" />
        </span>
      )}
    </motion.button>
  );
}
