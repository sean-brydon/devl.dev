"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  FileCode2Icon,
  FileDiffIcon,
  FilePlus2Icon,
  FolderIcon,
  GitBranchIcon,
  GitPullRequestIcon,
  MessageSquareIcon,
  PanelLeftIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import {
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export type ReviewTone = "blue" | "orange" | "teal" | "violet" | "rose" | "amber" | "emerald" | "sky";

export interface ReviewPerson {
  id: string;
  name: string;
  tone: ReviewTone;
}

export interface DiffFile {
  path: string;
  status: "added" | "modified" | "deleted";
  hunks: { header: string; oldStart: number; newStart: number; lines: string }[];
}

export interface ReviewComment {
  id: string;
  author: string;
  body: string;
  time: string;
}

export interface ReviewThread {
  id: string;
  file: string;
  line: number;
  side: "new" | "old";
  resolved?: boolean;
  comments: ReviewComment[];
}

export interface CodeReviewProps {
  title?: string;
  number?: number;
  author?: string;
  base?: string;
  head?: string;
  me?: string;
  people?: ReviewPerson[];
  files?: DiffFile[];
  threads?: ReviewThread[];
  className?: string;
}

const avatarTone: Record<ReviewTone, string> = {
  blue: "bg-blue-500/14 text-blue-700 dark:text-blue-300",
  orange: "bg-orange-500/14 text-orange-700 dark:text-orange-300",
  teal: "bg-teal-500/16 text-teal-700 dark:text-teal-300",
  violet: "bg-violet-500/16 text-violet-700 dark:text-violet-300",
  rose: "bg-rose-500/14 text-rose-700 dark:text-rose-300",
  amber: "bg-amber-500/18 text-amber-800 dark:text-amber-300",
  emerald: "bg-emerald-500/16 text-emerald-700 dark:text-emerald-300",
  sky: "bg-sky-500/16 text-sky-700 dark:text-sky-300",
};

const ease = [0.23, 1, 0.32, 1] as const;

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function PersonAvatar({ person, size = "size-6" }: { person?: ReviewPerson; size?: string }) {
  if (!person) return null;
  return (
    <Avatar className={size}>
      <AvatarFallback className={cn("font-medium text-[10px]", avatarTone[person.tone])}>{initials(person.name)}</AvatarFallback>
    </Avatar>
  );
}

const defaultPeople: ReviewPerson[] = [
  { id: "maya", name: "Maya Okafor", tone: "teal" },
  { id: "sam", name: "Sam Whitfield", tone: "amber" },
  { id: "leo", name: "Leo Marchetti", tone: "rose" },
  { id: "jonas", name: "Jonas Weber", tone: "blue" },
];

const defaultFiles: DiffFile[] = [
  {
    path: "src/queue/consumer.ts",
    status: "modified",
    hunks: [
      {
        header: "@@ -1,7 +1,8 @@",
        oldStart: 1,
        newStart: 1,
        lines: ` import { Queue, type Message } from "./queue";
 import { deliver } from "../delivery";
-import { backoff } from "./retry";
+import { backoff, MAX_ATTEMPTS } from "./retry";
+import { deadLetter } from "./dead-letter";
 import { metrics } from "../metrics";

 const queue = new Queue("webhooks");`,
      },
      {
        header: "@@ -38,15 +39,31 @@ export async function consume(batchSize = 50)",
        oldStart: 38,
        newStart: 39,
        lines: ` export async function consume(batchSize = 50) {
   const messages = await queue.receive(batchSize);

   for (const message of messages) {
-    try {
-      await deliver(message.body);
-      await queue.ack(message);
-    } catch (error) {
-      await queue.retry(message, backoff(message.attempts));
-    }
+    await handle(message);
   }

   metrics.gauge("webhooks.lag", await queue.lag());
 }
+
+async function handle(message: Message) {
+  try {
+    await deliver(message.body);
+    await queue.ack(message);
+  } catch (error) {
+    if (message.attempts + 1 >= MAX_ATTEMPTS) {
+      // Park it so one bad payload can't hold up the partition.
+      await deadLetter.put(message, error);
+      await queue.ack(message);
+      metrics.increment("webhooks.dead_lettered");
+      return;
+    }
+    await queue.retry(message, backoff(message.attempts));
+  }
+}`,
      },
    ],
  },
  {
    path: "src/queue/dead-letter.ts",
    status: "added",
    hunks: [
      {
        header: "@@ -0,0 +1,35 @@",
        oldStart: 0,
        newStart: 1,
        lines: `+import { db } from "../db";
+import type { Message } from "./queue";
+
+const RETENTION_DAYS = 7;
+
+export interface DeadLetter {
+  id: string;
+  endpointId: string;
+  payload: unknown;
+  error: string;
+  attempts: number;
+  parkedAt: Date;
+}
+
+export const deadLetter = {
+  async put(message: Message, error: unknown) {
+    await db.insert("dead_letters", {
+      id: message.id,
+      endpointId: message.endpointId,
+      payload: message.body,
+      error: String(error),
+      attempts: message.attempts + 1,
+      parkedAt: new Date(),
+    });
+  },
+
+  async replay(id: string) {
+    const row = await db.take<DeadLetter>("dead_letters", id);
+    return row && queue.publish(row.payload, { endpointId: row.endpointId });
+  },
+
+  async sweep() {
+    await db.deleteOlderThan("dead_letters", "parkedAt", RETENTION_DAYS);
+  },
+};`,
      },
    ],
  },
  {
    path: "src/queue/retry.ts",
    status: "modified",
    hunks: [
      {
        header: "@@ -1,11 +1,8 @@",
        oldStart: 1,
        newStart: 1,
        lines: `+export const MAX_ATTEMPTS = 3;
 const BASE_DELAY_MS = 1_000;
-const MAX_DELAY_MS = 60_000;
+const MAX_DELAY_MS = 30_000;

 export function backoff(attempt: number) {
-  const delay = BASE_DELAY_MS * 2 ** attempt;
-  if (delay > MAX_DELAY_MS) {
-    return MAX_DELAY_MS;
-  }
-  return delay;
+  const delay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
+  return delay / 2 + Math.random() * (delay / 2);
 }`,
      },
    ],
  },
  {
    path: "test/consumer.test.ts",
    status: "added",
    hunks: [
      {
        header: "@@ -0,0 +1,26 @@",
        oldStart: 0,
        newStart: 1,
        lines: `+import { describe, expect, it } from "vitest";
+import { consume } from "../src/queue/consumer";
+import { fakeQueue, failingEndpoint } from "./fixtures";
+
+describe("consume", () => {
+  it("parks a message after three failed attempts", async () => {
+    const queue = fakeQueue([{ id: "m1", attempts: 2, body: "{" }]);
+    failingEndpoint("ep_live_42");
+
+    await consume();
+
+    expect(queue.deadLetters).toHaveLength(1);
+    expect(queue.pending).toHaveLength(0);
+  });
+
+  it("keeps delivering after a poison message", async () => {
+    const queue = fakeQueue([
+      { id: "bad", attempts: 2, body: "{" },
+      { id: "ok", attempts: 0, body: "{}" },
+    ]);
+
+    await consume();
+
+    expect(queue.delivered).toContain("ok");
+  });
+});`,
      },
    ],
  },
  {
    path: "docs/webhooks/retries.md",
    status: "modified",
    hunks: [
      {
        header: "@@ -12,9 +12,13 @@ ## Retries",
        oldStart: 12,
        newStart: 12,
        lines: ` ## Retries

-Failed deliveries are retried with exponential backoff for up to 24 hours.
+Failed deliveries are retried up to three times with exponential backoff
+and jitter, capped at 30 seconds between attempts.
+
+After the third failure the event moves to the dead-letter queue, where it
+stays for 7 days. You can replay it from the dashboard at any time.

 ## Ordering

-Events for one endpoint are delivered in order.
+Events for one endpoint are delivered in order, except for events that were
+dead-lettered and replayed later.`,
      },
    ],
  },
];

const defaultThreads: ReviewThread[] = [
  {
    id: "t1",
    file: "src/queue/consumer.ts",
    line: 3,
    side: "new",
    comments: [
      { id: "c1", author: "leo", body: "Should `MAX_ATTEMPTS` come from the endpoint's retry policy? Ops will want to tune it for the noisy integrations.", time: "2h" },
      { id: "c2", author: "sam", body: "Fair. I'd keep the constant as the default and read `endpoint.retryPolicy` in a follow-up, so this one stays small.", time: "1h" },
    ],
  },
  {
    id: "t2",
    file: "src/queue/dead-letter.ts",
    line: 29,
    side: "new",
    comments: [{ id: "c3", author: "leo", body: "`queue` isn't imported in this file, so `replay` will throw the first time someone clicks it.", time: "48m" }],
  },
  {
    id: "t3",
    file: "src/queue/retry.ts",
    line: 3,
    side: "new",
    resolved: true,
    comments: [
      { id: "c4", author: "jonas", body: "30s cap feels low for endpoints that are down for a deploy.", time: "3h" },
      { id: "c5", author: "sam", body: "It only applies to the three attempts now. Anything longer goes to the dead-letter queue.", time: "3h" },
    ],
  },
];

interface Line {
  kind: "ctx" | "add" | "del";
  text: string;
  old?: number;
  new?: number;
}

function parseHunk(h: DiffFile["hunks"][number]): Line[] {
  let o = h.oldStart;
  let n = h.newStart;
  return h.lines.split("\n").map((raw) => {
    const sign = raw[0];
    const text = raw.slice(1);
    if (sign === "+") return { kind: "add", text, new: n++ };
    if (sign === "-") return { kind: "del", text, old: o++ };
    return { kind: "ctx", text, old: o++, new: n++ };
  });
}

type SplitRow = { left?: Line; right?: Line };

function toSplit(lines: Line[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.kind === "ctx") {
      rows.push({ left: l, right: l });
      i++;
      continue;
    }
    const dels: Line[] = [];
    const adds: Line[] = [];
    while (i < lines.length && lines[i].kind === "del") dels.push(lines[i++]);
    while (i < lines.length && lines[i].kind === "add") adds.push(lines[i++]);
    for (let k = 0; k < Math.max(dels.length, adds.length); k++) rows.push({ left: dels[k], right: adds[k] });
  }
  return rows;
}

function pairs(lines: Line[]) {
  const map = new Map<Line, Line>();
  for (const row of toSplit(lines)) {
    if (row.left?.kind === "del" && row.right?.kind === "add") {
      map.set(row.left, row.right);
      map.set(row.right, row.left);
    }
  }
  return map;
}

function changedRange(a: string, b: string) {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let end = 0;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
  return { start, endA: a.length - end, endB: b.length - end };
}

const KEYWORDS =
  /^(import|from|export|const|let|var|return|if|else|await|async|function|type|interface|new|throw|try|catch|for|of|in|true|false|null|undefined)$/;

function highlight(text: string, md: boolean): ReactNode[] {
  if (md) {
    if (text.startsWith("#")) return [<span className="font-semibold text-sky-800 dark:text-sky-300" key="h">{text}</span>];
    return [text];
  }
  const out: ReactNode[] = [];
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d[\d_]*\b)|([A-Za-z_$][\w$]*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: tokenizer loop
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [tok] = m;
    if (m[1]) out.push(<span className="text-muted-foreground italic" key={k++}>{tok}</span>);
    else if (m[2]) out.push(<span className="text-emerald-700 dark:text-emerald-300" key={k++}>{tok}</span>);
    else if (m[3]) out.push(<span className="text-amber-800 dark:text-amber-300" key={k++}>{tok}</span>);
    else if (KEYWORDS.test(tok)) out.push(<span className="text-violet-700 dark:text-violet-300" key={k++}>{tok}</span>);
    else if (/^[A-Z]/.test(tok)) out.push(<span className="text-sky-800 dark:text-sky-300" key={k++}>{tok}</span>);
    else if (text[re.lastIndex] === "(") out.push(<span className="text-blue-700 dark:text-blue-300" key={k++}>{tok}</span>);
    else out.push(tok);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function CodeText({ line, partner, md }: { line: Line; partner?: Line; md: boolean }) {
  if (!partner || line.kind === "ctx") return <>{highlight(line.text, md) as ReactNode}</>;
  const r = line.kind === "del" ? changedRange(line.text, partner.text) : changedRange(partner.text, line.text);
  const end = line.kind === "del" ? r.endA : r.endB;
  if (end <= r.start) return <>{highlight(line.text, md) as ReactNode}</>;
  return (
    <>
      {highlight(line.text.slice(0, r.start), md)}
      <span className={cn("rounded-[calc(var(--radius)*0.3)]", line.kind === "del" ? "bg-destructive/22" : "bg-success/24")}>{highlight(line.text.slice(r.start, end), md)}</span>
      {highlight(line.text.slice(end), md)}
    </>
  );
}

function ThreadView({
  thread,
  people,
  me,
  onReply,
  onResolve,
}: {
  thread: ReviewThread;
  people: ReviewPerson[];
  me: string;
  onReply: (body: string) => void;
  onResolve: (resolved: boolean) => void;
}) {
  const [draft, setDraft] = useState("");
  const [replying, setReplying] = useState(false);
  const person = (id: string) => people.find((p) => p.id === id);
  if (thread.resolved) {
    const last = thread.comments[thread.comments.length - 1];
    return (
      <div className="mx-3 my-2 flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 font-sans text-muted-foreground text-xs">
        <CircleCheckIcon className="size-3.5 text-success" />
        <span className="min-w-0 flex-1 truncate">
          Resolved · <span className="text-foreground">{person(thread.comments[0].author)?.name.split(" ")[0]}</span>: {thread.comments[0].body}
        </span>
        <span className="hidden @lg:inline">{last.time}</span>
        <button className="cursor-pointer rounded font-medium text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onResolve(false)} type="button">
          Reopen
        </button>
      </div>
    );
  }
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mx-3 my-2 max-w-2xl overflow-hidden rounded-xl border bg-card font-sans text-sm shadow-xs/5"
      initial={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease }}
    >
      <ul className="flex flex-col">
        {thread.comments.map((c, i) => {
          const p = person(c.author);
          return (
            <li className={cn("flex gap-2.5 px-3 py-3", i > 0 && "border-t")} key={c.id}>
              <PersonAvatar person={p} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 text-xs">
                  <span className="font-medium text-foreground">{c.author === me ? "You" : p?.name}</span>
                  <span className="text-muted-foreground">{c.time}</span>
                </div>
                <p className="mt-1 text-pretty text-[13px] text-foreground/90 leading-5 [overflow-wrap:anywhere]">
                  {c.body.split(/(`[^`]+`)/g).map((part, j) =>
                    part.startsWith("`") ? (
                      <code className="rounded-[calc(var(--radius)*0.5)] border bg-muted px-1 py-px font-mono text-[12px]" key={j}>
                        {part.slice(1, -1)}
                      </code>
                    ) : (
                      <Fragment key={j}>{part}</Fragment>
                    ),
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t px-2 py-2">
        {replying ? (
          <div className="flex flex-col gap-2">
            <textarea
              aria-label="Reply"
              autoFocus
              className="min-h-16 w-full resize-none rounded-lg border bg-background px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring/60 focus-visible:ring-3 focus-visible:ring-ring/16 dark:bg-input/32"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.trim()) {
                  onReply(draft.trim());
                  setDraft("");
                  setReplying(false);
                }
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setReplying(false);
                }
              }}
              placeholder="Reply…"
              value={draft}
            />
            <div className="flex justify-end gap-1.5">
              <Button onClick={() => setReplying(false)} size="xs" variant="ghost">
                Cancel
              </Button>
              <Button
                disabled={!draft.trim()}
                onClick={() => {
                  onReply(draft.trim());
                  setDraft("");
                  setReplying(false);
                }}
                size="xs"
              >
                Reply
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              className="h-7 flex-1 cursor-text rounded-md border bg-background px-2.5 text-left text-[13px] text-muted-foreground outline-none transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/32"
              onClick={() => setReplying(true)}
              type="button"
            >
              Reply…
            </button>
            <Button onClick={() => onResolve(true)} size="xs" variant="outline">
              <CheckIcon />
              Resolve
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function NewComment({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (body: string) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mx-3 my-2 flex max-w-2xl flex-col gap-2 rounded-xl border bg-card p-2 font-sans shadow-xs/5"
      initial={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease }}
    >
      <textarea
        aria-label="New comment"
        autoFocus
        className="min-h-20 w-full resize-none rounded-lg border bg-background px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring/60 focus-visible:ring-3 focus-visible:ring-ring/16 dark:bg-input/32"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.trim()) onSubmit(draft.trim());
          if (e.key === "Escape") {
            e.stopPropagation();
            onCancel();
          }
        }}
        placeholder="Leave a comment on this line…"
        value={draft}
      />
      <div className="flex items-center justify-end gap-1.5">
        <span className="me-auto ps-1 text-muted-foreground text-xs">
          <Kbd className="h-4 text-[10px]">⌘↵</Kbd> to post
        </span>
        <Button onClick={onCancel} size="xs" variant="ghost">
          Cancel
        </Button>
        <Button disabled={!draft.trim()} onClick={() => onSubmit(draft.trim())} size="xs">
          Comment
        </Button>
      </div>
    </motion.div>
  );
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  file?: DiffFile;
}

function buildTree(files: DiffFile[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", children: [] };
  for (const f of files) {
    const parts = f.path.split("/");
    let node = root;
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join("/");
      let child = node.children.find((c) => c.name === part);
      if (!child) {
        child = { name: part, path, children: [], file: i === parts.length - 1 ? f : undefined };
        node.children.push(child);
      }
      node = child;
    });
  }
  const squash = (n: TreeNode): TreeNode => {
    if (!n.file && n.children.length === 1 && !n.children[0].file) {
      const c = n.children[0];
      return squash({ ...c, name: `${n.name}/${c.name}` });
    }
    return { ...n, children: n.children.map(squash) };
  };
  return root.children.map(squash);
}

const statusIcon = { added: FilePlus2Icon, modified: FileDiffIcon, deleted: FileCode2Icon };

export function CodeReview({
  title = "Park poison messages after three failed attempts",
  number = 482,
  author = "sam",
  base = "main",
  head = "sam/dead-letter-queue",
  me = "maya",
  people = defaultPeople,
  files = defaultFiles,
  threads: initialThreads = defaultThreads,
  className,
}: CodeReviewProps) {
  const [threads, setThreads] = useState(initialThreads);
  const [viewed, setViewed] = useState<Set<string>>(() => new Set(["docs/webhooks/retries.md"]));
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(["docs/webhooks/retries.md"]));
  const [split, setSplit] = useState(true);
  const [narrow, setNarrow] = useState(false);
  const [treeOpen, setTreeOpen] = useState(true);
  const [activeFile, setActiveFile] = useState(files[0]?.path ?? "");
  const [composer, setComposer] = useState<{ file: string; line: number; side: "new" | "old" } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [verdict, setVerdict] = useState<"comment" | "approve" | "changes">("approve");
  const [summary, setSummary] = useState("");
  const [submitted, setSubmitted] = useState<null | "comment" | "approve" | "changes">(null);
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRefs = useRef(new Map<string, HTMLElement>());
  const person = (id: string) => people.find((p) => p.id === id);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let first = true;
    const ro = new ResizeObserver(([e]) => {
      const isNarrow = e.contentRect.width < 900;
      setNarrow(isNarrow);
      if (first && isNarrow) setTreeOpen(false);
      first = false;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const parsed = useMemo(
    () =>
      files.map((f) => {
        const hunks = f.hunks.map((h) => ({ header: h.header, lines: parseHunk(h) }));
        const all = hunks.flatMap((h) => h.lines);
        return {
          file: f,
          hunks,
          adds: all.filter((l) => l.kind === "add").length,
          dels: all.filter((l) => l.kind === "del").length,
          pairs: pairs(all),
        };
      }),
    [files],
  );
  const totals = parsed.reduce((a, p) => ({ adds: a.adds + p.adds, dels: a.dels + p.dels }), { adds: 0, dels: 0 });
  const tree = useMemo(() => buildTree(files), [files]);
  const showSplit = split && !narrow;
  const openThreads = threads.filter((t) => !t.resolved).length;

  const scrollToFile = (path: string) => {
    const el = fileRefs.current.get(path);
    const box = scrollRef.current;
    if (el && box) box.scrollTop = el.offsetTop - 8;
    setActiveFile(path);
    if (narrow) setTreeOpen(false);
  };

  const onScroll = () => {
    const box = scrollRef.current;
    if (!box) return;
    let current = files[0]?.path ?? "";
    for (const f of files) {
      const el = fileRefs.current.get(f.path);
      if (el && el.offsetTop - 24 <= box.scrollTop) current = f.path;
    }
    if (current !== activeFile) setActiveFile(current);
  };

  const toggleViewed = (path: string) => {
    const nowViewed = !viewed.has(path);
    setViewed((v) => {
      const next = new Set(v);
      if (nowViewed) next.add(path);
      else next.delete(path);
      return next;
    });
    setCollapsed((c) => {
      const next = new Set(c);
      if (nowViewed) next.add(path);
      else next.delete(path);
      return next;
    });
  };

  const toggleCollapsed = (path: string) =>
    setCollapsed((c) => {
      const next = new Set(c);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const addComment = (file: string, line: number, side: "new" | "old", body: string) => {
    setThreads((ts) => [...ts, { id: `t${Date.now()}`, file, line, side, comments: [{ id: `c${Date.now()}`, author: me, body, time: "now" }] }]);
    setComposer(null);
  };

  const submitReview = () => {
    setSubmitted(verdict);
    setReviewOpen(false);
    setToast({
      key: Date.now(),
      text: verdict === "approve" ? "Approved. Sam can merge when ready." : verdict === "changes" ? "Changes requested" : "Review submitted",
    });
    setSummary("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (e.key === "Escape") {
      if (reviewOpen) setReviewOpen(false);
      else if (composer) setComposer(null);
      else if (narrow && treeOpen) setTreeOpen(false);
      return;
    }
    if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
    const idx = files.findIndex((f) => f.path === activeFile);
    const k = e.key.toLowerCase();
    if (k === "j" || k === "]") {
      e.preventDefault();
      const next = files[Math.min(files.length - 1, idx + 1)];
      if (next) scrollToFile(next.path);
    } else if (k === "k" || k === "[") {
      e.preventDefault();
      const prev = files[Math.max(0, idx - 1)];
      if (prev) scrollToFile(prev.path);
    } else if (k === "v" && activeFile) {
      e.preventDefault();
      toggleViewed(activeFile);
    } else if (k === "s") {
      setSplit((s) => !s);
    } else if (k === "n") {
      const next = threads.find((th) => !th.resolved && files.findIndex((f) => f.path === th.file) > idx) ?? threads.find((th) => !th.resolved);
      if (next) scrollToFile(next.file);
    } else if (k === "r") {
      e.preventDefault();
      setReviewOpen(true);
    }
  };

  const renderTree = (nodes: TreeNode[], depth = 0): ReactNode =>
    nodes.map((n) => {
      if (n.file) {
        const p = parsed.find((x) => x.file.path === n.path);
        const Icon = statusIcon[n.file.status];
        const count = threads.filter((t) => t.file === n.path && !t.resolved).length;
        const on = activeFile === n.path;
        return (
          <li key={n.path}>
            <button
              aria-current={on ? "true" : undefined}
              className={cn(
                "flex h-7 w-full cursor-pointer items-center gap-2 rounded-md pe-2 text-left text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                on ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
              onClick={() => scrollToFile(n.path)}
              style={{ paddingInlineStart: 8 + depth * 14 }}
              type="button"
            >
              <Icon className={cn("size-3.5 shrink-0", n.file.status === "added" ? "text-success" : "text-warning")} />
              <span className={cn("min-w-0 flex-1 truncate", viewed.has(n.path) && "text-muted-foreground")}>{n.name}</span>
              {count > 0 && (
                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground tabular-nums">
                  <MessageSquareIcon className="size-3" />
                  {count}
                </span>
              )}
              {viewed.has(n.path) ? (
                <CheckIcon aria-label="Viewed" className="size-3.5 text-success" />
              ) : (
                <span className="font-mono text-[10px] tabular-nums">
                  <span className="text-success-foreground">+{p?.adds}</span>
                  {p && p.dels > 0 && <span className="ms-1 text-destructive-foreground">−{p.dels}</span>}
                </span>
              )}
            </button>
          </li>
        );
      }
      return (
        <li key={n.path}>
          <div className="flex h-7 items-center gap-1.5 text-muted-foreground text-xs" style={{ paddingInlineStart: 8 + depth * 14 }}>
            <FolderIcon className="size-3.5" />
            <span className="truncate font-mono">{n.name}</span>
          </div>
          <ul className="flex flex-col gap-0.5">{renderTree(n.children, depth + 1)}</ul>
        </li>
      );
    });

  const lineNo = "w-10 shrink-0 select-none px-1.5 text-right text-muted-foreground tabular-nums";

  const gutterButton = (file: string, line: number, side: "new" | "old") => (
    <button
      aria-label={`Comment on line ${line}`}
      className="group/gutter absolute inset-y-0 left-0 z-10 w-10 cursor-pointer outline-none"
      onClick={() => setComposer({ file, line, side })}
      type="button"
    >
      <span className="absolute top-0.5 left-1 flex size-4 items-center justify-center rounded bg-info text-white opacity-0 transition-[opacity,scale] duration-100 ease-out group-hover/line:opacity-100 group-focus-visible/gutter:opacity-100 group-focus-visible/gutter:ring-2 group-focus-visible/gutter:ring-ring group-active/gutter:scale-90">
        <PlusIcon className="size-3" strokeWidth={3} />
      </span>
    </button>
  );

  const threadsAt = (file: string, line: Line, which: "left" | "right" | "both") => {
    const out: ReviewThread[] = [];
    for (const t of threads) {
      if (t.file !== file) continue;
      if (t.side === "new" && line.new === t.line && which !== "left") out.push(t);
      else if (t.side === "old" && line.old === t.line && line.kind === "del" && which !== "right") out.push(t);
    }
    return out;
  };

  const extras = (file: string, line: Line, which: "left" | "right" | "both", split = false) => {
    const ts = threadsAt(file, line, which);
    const showComposer =
      composer &&
      composer.file === file &&
      ((composer.side === "new" && line.new === composer.line && which !== "left") ||
        (composer.side === "old" && line.old === composer.line && line.kind === "del" && which !== "right"));
    if (!ts.length && !showComposer) return null;
    return (
      <div className={cn("border-y bg-muted/30 py-1", split && "@4xl:grid @4xl:grid-cols-2")}>
        <div className={cn("min-w-0", split && which !== "left" && "@4xl:col-start-2")}>
        {ts.map((t) => (
          <ThreadView
            key={t.id}
            me={me}
            onReply={(body) =>
              setThreads((all) => all.map((x) => (x.id === t.id ? { ...x, comments: [...x.comments, { id: `c${Date.now()}`, author: me, body, time: "now" }] } : x)))
            }
            onResolve={(resolved) => setThreads((all) => all.map((x) => (x.id === t.id ? { ...x, resolved } : x)))}
            people={people}
            thread={t}
          />
        ))}
        {showComposer && composer && (
          <NewComment onCancel={() => setComposer(null)} onSubmit={(body) => addComment(composer.file, composer.line, composer.side, body)} />
        )}
        </div>
      </div>
    );
  };

  const rowTone = (kind?: Line["kind"]) =>
    kind === "add" ? "bg-success/8 dark:bg-success/10" : kind === "del" ? "bg-destructive/8 dark:bg-destructive/10" : "";
  const numTone = (kind?: Line["kind"]) =>
    kind === "add"
      ? "bg-success/14 text-success-foreground/80 shadow-[inset_2px_0_0_var(--color-success)] dark:bg-success/16"
      : kind === "del"
        ? "bg-destructive/14 text-destructive-foreground/80 shadow-[inset_2px_0_0_var(--color-destructive)] dark:bg-destructive/16"
        : "";

  const reviewLabel = submitted === "approve" ? "Approved" : submitted === "changes" ? "Changes requested" : submitted === "comment" ? "Reviewed" : "Review";

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn("@container relative isolate flex h-[760px] w-full flex-col overflow-hidden bg-background text-foreground text-sm outline-none", className)}
        onKeyDown={onKeyDown}
        ref={rootRef}
        tabIndex={-1}
      >
        <header className="shrink-0 border-b px-4 pt-4 pb-3 @3xl:px-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-balance font-heading font-semibold text-lg leading-snug tracking-tight">
                {title} <span className="font-normal text-muted-foreground">#{number}</span>
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-muted-foreground text-xs">
                <Badge className="gap-1" variant="success">
                  <GitPullRequestIcon />
                  Open
                </Badge>
                <span className="flex items-center gap-1.5">
                  <PersonAvatar person={person(author)} size="size-4" />
                  <span className="font-medium text-foreground">{person(author)?.name}</span>
                </span>
                <span className="hidden @lg:inline">wants to merge 4 commits into</span>
                <span className="flex min-w-0 items-center gap-1 font-mono">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-foreground">{base}</span>
                  <span>←</span>
                  <span className="flex min-w-0 items-center gap-1 truncate rounded-md bg-muted px-1.5 py-0.5 text-foreground">
                    <GitBranchIcon className="size-3 shrink-0" />
                    <span className="truncate">{head}</span>
                  </span>
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-1.5 rounded-lg border px-2 py-1 text-xs @2xl:flex">
                <CircleCheckIcon className="size-3.5 text-success" />
                <span className="tabular-nums">12/12 checks</span>
              </div>
              <div className="hidden -space-x-1 @xl:flex">
                {["leo", "jonas"].map((id) => (
                  <span className="rounded-full ring-2 ring-background" key={id} title={person(id)?.name}>
                    <PersonAvatar person={person(id)} />
                  </span>
                ))}
              </div>
              <Button
                className={cn("transition-[box-shadow,scale] duration-150 ease-out active:scale-[0.97]", submitted === "approve" && "bg-success hover:bg-success/90 border-success text-white")}
                onClick={() => setReviewOpen((o) => !o)}
                size="sm"
                variant={submitted === "changes" ? "destructive-outline" : "default"}
              >
                {submitted === "approve" && <CheckIcon />}
                {reviewLabel}
                <ChevronDownIcon className={cn("transition-transform duration-200", reviewOpen && "rotate-180")} />
              </Button>
            </div>
          </div>
        </header>

        <div className="flex h-11 shrink-0 items-center gap-2 border-b px-3 @3xl:px-4">
          <Button aria-label={treeOpen ? "Hide file tree" : "Show file tree"} aria-pressed={treeOpen} onClick={() => setTreeOpen((o) => !o)} size="icon-sm" variant="ghost">
            <PanelLeftIcon />
          </Button>
          <span className="font-medium">Files changed</span>
          <span className="text-muted-foreground text-xs tabular-nums">{files.length}</span>
          <span className="font-mono text-xs tabular-nums">
            <span className="text-success-foreground">+{totals.adds}</span> <span className="text-destructive-foreground">−{totals.dels}</span>
          </span>
          <div className="ms-auto flex items-center gap-3">
            <span className="hidden items-center gap-2 text-muted-foreground text-xs @xl:flex">
              <span className="tabular-nums">
                {viewed.size} of {files.length} viewed
              </span>
              <span className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                <motion.span
                  animate={{ scaleX: viewed.size / files.length }}
                  className="block h-full origin-left rounded-full bg-success"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 34 }}
                />
              </span>
            </span>
            {openThreads > 0 && (
              <span className="hidden items-center gap-1 text-muted-foreground text-xs @md:flex">
                <MessageSquareIcon className="size-3.5" />
                <span className="tabular-nums">{openThreads} open</span>
              </span>
            )}
            {!narrow && (
              <div aria-label="Diff layout" className="flex rounded-lg bg-muted p-0.5" role="group">
                {[
                  { id: true, label: "Split" },
                  { id: false, label: "Unified" },
                ].map((o) => (
                  <button
                    aria-pressed={split === o.id}
                    className={cn(
                      "relative h-6 cursor-pointer rounded-md px-2 font-medium text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      split === o.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    key={o.label}
                    onClick={() => setSplit(o.id)}
                    type="button"
                  >
                    {split === o.id && (
                      <motion.span className="absolute inset-0 rounded-md bg-background shadow-xs/5 dark:bg-accent" layoutId="diff-layout" transition={{ type: "spring", stiffness: 520, damping: 42 }} />
                    )}
                    <span className="relative">{o.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1">
          <AnimatePresence initial={false}>
            {treeOpen && (
              <motion.aside
                animate={narrow ? { x: 0, opacity: 1 } : { width: 256, opacity: 1 }}
                aria-label="Changed files"
                className={cn(
                  "flex shrink-0 flex-col overflow-hidden bg-sidebar",
                  narrow ? "absolute inset-y-0 left-0 z-30 w-[272px] max-w-[85%] border-e shadow-lg/10" : "border-e",
                )}
                exit={narrow ? { x: "-100%", opacity: 1 } : { width: 0, opacity: 0 }}
                initial={narrow ? { x: "-100%", opacity: 1 } : { width: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease }}
              >
                <div className="w-64 min-w-64 flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
                  <ul className="flex flex-col gap-0.5">{renderTree(tree)}</ul>
                </div>
                <div className="flex w-64 flex-col gap-1.5 border-t px-3 py-2.5 text-muted-foreground text-xs">
                  <div className="flex items-center gap-1.5">
                    <Kbd>J</Kbd>
                    <Kbd>K</Kbd> files
                    <Kbd className="ms-2">V</Kbd> viewed
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Kbd>N</Kbd> next thread
                    <Kbd className="ms-2">R</Kbd> review
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {narrow && treeOpen && (
              <motion.div
                animate={{ opacity: 1 }}
                aria-hidden
                className="absolute inset-0 z-20 bg-black/24"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                onClick={() => setTreeOpen(false)}
              />
            )}
          </AnimatePresence>

          <div className="min-w-0 flex-1 overflow-y-auto bg-muted/30 [scrollbar-width:thin]" onScroll={onScroll} ref={scrollRef}>
            <div className="flex flex-col gap-3 p-3 @3xl:p-4">
              {parsed.map(({ file, hunks, adds, dels, pairs: pairMap }) => {
                const isViewed = viewed.has(file.path);
                const isCollapsed = collapsed.has(file.path);
                const md = file.path.endsWith(".md");
                return (
                  <section
                    aria-label={file.path}
                    className="overflow-clip rounded-xl border bg-card shadow-xs/5"
                    key={file.path}
                    ref={(el) => {
                      if (el) fileRefs.current.set(file.path, el);
                      else fileRefs.current.delete(file.path);
                    }}
                  >
                    <div className={cn("sticky top-0 z-10 flex h-10 items-center gap-2 bg-card ps-1.5 pe-2", !isCollapsed && "border-b")}>
                      <button
                        aria-expanded={!isCollapsed}
                        aria-label={isCollapsed ? `Expand ${file.path}` : `Collapse ${file.path}`}
                        className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => toggleCollapsed(file.path)}
                        type="button"
                      >
                        <ChevronRightIcon className={cn("size-4 transition-transform duration-200 ease-out", !isCollapsed && "rotate-90")} />
                      </button>
                      <span className="min-w-0 flex-1 truncate font-mono text-xs">
                        <span className="text-muted-foreground">{file.path.split("/").slice(0, -1).join("/")}/</span>
                        <span className="font-medium text-foreground">{file.path.split("/").pop()}</span>
                      </span>
                      {file.status === "added" && (
                        <Badge className="hidden @md:inline-flex" variant="success">
                          New
                        </Badge>
                      )}
                      <span className="hidden font-mono text-xs tabular-nums @md:inline">
                        <span className="text-success-foreground">+{adds}</span>
                        {dels > 0 && <span className="ms-1 text-destructive-foreground">−{dels}</span>}
                      </span>
                      <label className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-muted-foreground text-xs focus-within:ring-2 focus-within:ring-ring transition-colors hover:text-foreground has-checked:border-success/40 has-checked:bg-success/8 has-checked:text-success-foreground">
                        <input checked={isViewed} className="sr-only" onChange={() => toggleViewed(file.path)} type="checkbox" />
                        <span className={cn("flex size-3.5 items-center justify-center rounded-[calc(var(--radius)*0.4)] border transition-colors", isViewed ? "border-success bg-success text-white" : "border-muted-foreground/50")}>
                          {isViewed && <CheckIcon className="size-2.5" strokeWidth={3} />}
                        </span>
                        Viewed
                      </label>
                    </div>
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.div
                          animate={{ height: "auto", opacity: 1 }}
                          className="overflow-hidden"
                          exit={{ height: 0, opacity: 0 }}
                          initial={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease }}
                        >
                          <div className="font-mono text-[12px] leading-5">
                            {hunks.map((h, hi) => (
                              <Fragment key={h.header}>
                                <div className="flex items-center gap-2 bg-info/6 px-3 py-1 text-info-foreground dark:bg-info/10">
                                  {hi > 0 && <span className="text-[11px]">⋯</span>}
                                  <span className="truncate">{h.header}</span>
                                </div>
                                {showSplit
                                  ? toSplit(h.lines).map((row, ri) => {
                                      const key = `${ri}-${row.left?.old ?? ""}-${row.right?.new ?? ""}`;
                                      const leftExtras = row.left && row.left.kind === "del" ? extras(file.path, row.left, "left", true) : null;
                                      const rightExtras = row.right ? extras(file.path, row.right, row.right.kind === "ctx" ? "both" : "right", true) : null;
                                      return (
                                        <Fragment key={key}>
                                          <div className="grid grid-cols-2">
                                            <div className={cn("group/line relative flex border-e", rowTone(row.left?.kind), !row.left && "bg-muted/40")}>
                                              {row.left && (
                                                <>
                                                  <span className={cn(lineNo, numTone(row.left.kind))}>{row.left.old}</span>
                                                  <span className="w-4 shrink-0 select-none text-center text-muted-foreground/70">{row.left.kind === "del" ? "−" : ""}</span>
                                                  <span className="min-w-0 flex-1 whitespace-pre-wrap pe-3 [overflow-wrap:anywhere]">
                                                    <CodeText line={row.left} md={md} partner={pairMap.get(row.left)} />
                                                  </span>
                                                  {row.left.kind === "del" && row.left.old && gutterButton(file.path, row.left.old, "old")}
                                                </>
                                              )}
                                            </div>
                                            <div className={cn("group/line relative flex", rowTone(row.right?.kind === "ctx" ? undefined : row.right?.kind), !row.right && "bg-muted/40")}>
                                              {row.right && (
                                                <>
                                                  <span className={cn(lineNo, numTone(row.right.kind === "ctx" ? undefined : row.right.kind))}>{row.right.new}</span>
                                                  <span className="w-4 shrink-0 select-none text-center text-muted-foreground/70">{row.right.kind === "add" ? "+" : ""}</span>
                                                  <span className="min-w-0 flex-1 whitespace-pre-wrap pe-3 [overflow-wrap:anywhere]">
                                                    <CodeText line={row.right} md={md} partner={pairMap.get(row.right)} />
                                                  </span>
                                                  {row.right.new && gutterButton(file.path, row.right.new, "new")}
                                                </>
                                              )}
                                            </div>
                                          </div>
                                          {leftExtras}
                                          {rightExtras}
                                        </Fragment>
                                      );
                                    })
                                  : h.lines.map((l, li) => (
                                      <Fragment key={`${li}-${l.old ?? ""}-${l.new ?? ""}`}>
                                        <div className={cn("group/line relative flex", rowTone(l.kind))}>
                                          <span className={cn(lineNo, "hidden @md:block", numTone(l.kind))}>{l.old ?? ""}</span>
                                          <span className={cn(lineNo, "hidden @md:block", numTone(l.kind))}>{l.new ?? ""}</span>
                                          <span className={cn(lineNo, "@md:hidden", numTone(l.kind))}>{l.new ?? l.old}</span>
                                          <span className="w-4 shrink-0 select-none text-center text-muted-foreground/70">
                                            {l.kind === "add" ? "+" : l.kind === "del" ? "−" : ""}
                                          </span>
                                          <span className="min-w-0 flex-1 whitespace-pre-wrap pe-3 [overflow-wrap:anywhere]">
                                            <CodeText line={l} md={md} partner={pairMap.get(l)} />
                                          </span>
                                          {(l.new ?? l.old) !== undefined && gutterButton(file.path, (l.new ?? l.old) as number, l.new ? "new" : "old")}
                                        </div>
                                        {extras(file.path, l, "both")}
                                      </Fragment>
                                    ))}
                              </Fragment>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                );
              })}
              <p className="py-4 text-center text-muted-foreground text-xs">
                That's every file. Press <Kbd>R</Kbd> to finish your review.
              </p>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {reviewOpen && (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              aria-label="Finish your review"
              className="absolute top-16 right-3 left-3 z-40 origin-top-right rounded-2xl border bg-popover p-3 shadow-lg/10 @xl:left-auto @xl:w-[380px]"
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              role="dialog"
              transition={{ duration: 0.16, ease }}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-medium">Finish your review</h2>
                <Button aria-label="Close" onClick={() => setReviewOpen(false)} size="icon-xs" variant="ghost">
                  <XIcon />
                </Button>
              </div>
              <textarea
                aria-label="Review summary"
                autoFocus
                className="mt-2 min-h-20 w-full resize-none rounded-lg border bg-background px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring/60 focus-visible:ring-3 focus-visible:ring-ring/16 dark:bg-input/32"
                onChange={(e) => setSummary(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitReview();
                }}
                placeholder="Leave a summary (optional)"
                value={summary}
              />
              <div aria-label="Verdict" className="mt-2 flex flex-col gap-1" role="radiogroup">
                {(
                  [
                    { id: "comment", label: "Comment", note: "General feedback, no verdict." },
                    { id: "approve", label: "Approve", note: "Good to merge as it is." },
                    { id: "changes", label: "Request changes", note: "Needs another pass before merging." },
                  ] as const
                ).map((o) => (
                  <button
                    aria-checked={verdict === o.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      verdict === o.id ? "border-foreground/20 bg-accent" : "border-transparent hover:bg-accent/50",
                    )}
                    key={o.id}
                    onClick={() => setVerdict(o.id)}
                    role="radio"
                    type="button"
                  >
                    <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", verdict === o.id ? "border-primary" : "border-muted-foreground/50")}>
                      {verdict === o.id && <motion.span className="size-2 rounded-full bg-primary" layoutId="verdict-dot" transition={{ type: "spring", stiffness: 600, damping: 40 }} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{o.label}</span>
                      <span className="block text-muted-foreground text-xs">{o.note}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  {openThreads} open {openThreads === 1 ? "thread" : "threads"}
                </span>
                <Button
                  className="ms-auto transition-[box-shadow,scale] duration-150 ease-out active:scale-[0.97]"
                  onClick={submitReview}
                  size="sm"
                  variant={verdict === "changes" ? "destructive" : "default"}
                >
                  Submit review
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <AnimatePresence mode="popLayout">
            {toast && (
              <motion.div
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="flex h-9 items-center gap-2 rounded-full border bg-popover px-4 text-sm shadow-lg/10"
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                key={toast.key}
                transition={{ duration: 0.2, ease }}
              >
                {submitted === "approve" && <CircleCheckIcon className="size-4 text-success" />}
                {toast.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
