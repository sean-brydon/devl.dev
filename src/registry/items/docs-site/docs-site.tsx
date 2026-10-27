"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  CornerDownLeftIcon,
  FileTextIcon,
  HashIcon,
  InfoIcon,
  MenuIcon,
  PencilIcon,
  SearchIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import {
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export type DocsLang = "node" | "python" | "go" | "curl";

export type DocsBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "callout"; tone: "info" | "warning"; title: string; text: string }
  | { type: "code"; samples: Partial<Record<DocsLang, string>>; title?: string }
  | { type: "table"; head: string[]; rows: string[][] };

export interface DocsSection {
  id: string;
  title: string;
  blocks: DocsBlock[];
}

export interface DocsPage {
  id: string;
  title: string;
  group: string;
  lead: string;
  updated: string;
  minutes: number;
  sections: DocsSection[];
}

export interface DocsSiteProps {
  product?: string;
  version?: string;
  pages?: DocsPage[];
  initialPage?: string;
  dashboardHref?: string;
  editHref?: (pageId: string) => string;
  className?: string;
}

const defaultPages: DocsPage[] = [
  {
    id: "introduction",
    title: "Introduction",
    group: "Getting started",
    lead: "Kestrel delivers events from your product to your customers' endpoints, with retries, signatures and a delivery log they can trust.",
    updated: "Oct 2",
    minutes: 2,
    sections: [
      {
        id: "what-you-can-build",
        title: "What you can build",
        blocks: [
          { type: "p", text: "Anything your customers would otherwise poll for. Teams use Kestrel to send order updates to warehouses, sync CRM records, trigger builds and page on-call when a job fails." },
          { type: "list", items: ["Outgoing webhooks with per-customer endpoints", "A hosted portal where customers manage their own endpoints", "Delivery logs, replays and alerts without building them yourself"] },
        ],
      },
      {
        id: "how-it-fits",
        title: "How it fits together",
        blocks: [
          { type: "p", text: "Your backend publishes an event once. Kestrel fans it out to every subscribed endpoint, signs each request, retries failures and records every attempt." },
        ],
      },
    ],
  },
  {
    id: "quickstart",
    title: "Quickstart",
    group: "Getting started",
    lead: "Send your first webhook in about five minutes.",
    updated: "Oct 18",
    minutes: 5,
    sections: [
      {
        id: "install",
        title: "Install the SDK",
        blocks: [
          {
            type: "code",
            samples: { node: "npm install @kestrel/node", python: "pip install kestrel", go: "go get kestrel.dev/go/v2", curl: "# No install needed. Every SDK call maps to one HTTP request." },
          },
        ],
      },
      {
        id: "send-event",
        title: "Send an event",
        blocks: [
          { type: "p", text: "Publish an event with a type and a JSON payload. Every endpoint subscribed to that type receives it." },
          {
            type: "code",
            samples: {
              node: `const kestrel = new Kestrel(process.env.KESTREL_KEY);\n\nawait kestrel.events.publish({\n  type: "order.shipped",\n  data: { orderId: "ord_9QX2", carrier: "Parcelwise" },\n});`,
              python: `kestrel = Kestrel(os.environ["KESTREL_KEY"])\n\nkestrel.events.publish(\n    type="order.shipped",\n    data={"order_id": "ord_9QX2", "carrier": "Parcelwise"},\n)`,
              go: `client := kestrel.New(os.Getenv("KESTREL_KEY"))\n\nclient.Events.Publish(ctx, kestrel.Event{\n\tType: "order.shipped",\n\tData: map[string]any{"orderId": "ord_9QX2"},\n})`,
              curl: `curl https://api.kestrel.dev/v2/events \\\n  -H "Authorization: Bearer $KESTREL_KEY" \\\n  -d type=order.shipped \\\n  -d data[orderId]=ord_9QX2`,
            },
          },
          { type: "callout", tone: "info", title: "Use a test key first", text: "Keys starting with kst_test_ deliver to test endpoints only, so you can try this without touching customer traffic." },
        ],
      },
    ],
  },
  {
    id: "authentication",
    title: "Authentication",
    group: "Getting started",
    lead: "Every API request is authenticated with a secret key from your dashboard.",
    updated: "Sep 12",
    minutes: 2,
    sections: [
      {
        id: "api-keys",
        title: "API keys",
        blocks: [
          {
            type: "table",
            head: ["Prefix", "Environment", "Can deliver to"],
            rows: [
              ["kst_live_", "Production", "Live endpoints"],
              ["kst_test_", "Test", "Test endpoints and the local CLI"],
            ],
          },
          { type: "callout", tone: "warning", title: "Keep secret keys on the server", text: "Anyone with a secret key can publish events as you. Never ship one in a browser bundle or a mobile app." },
        ],
      },
    ],
  },
  {
    id: "signatures",
    title: "Verifying signatures",
    group: "Webhooks",
    lead: "Kestrel signs every request so your customers can check it came from you and wasn't changed on the way.",
    updated: "Oct 9",
    minutes: 3,
    sections: [
      {
        id: "how-signing-works",
        title: "How signing works",
        blocks: [
          { type: "p", text: "Each request carries a Kestrel-Signature header: a timestamp and an HMAC-SHA256 of the timestamp and raw body, keyed with the endpoint's signing secret." },
        ],
      },
      {
        id: "verify",
        title: "Verify in your handler",
        blocks: [
          {
            type: "code",
            samples: {
              node: `const event = kestrel.webhooks.verify(\n  rawBody,\n  req.headers["kestrel-signature"],\n  process.env.ENDPOINT_SECRET,\n);`,
              python: `event = kestrel.webhooks.verify(\n    raw_body,\n    request.headers["Kestrel-Signature"],\n    os.environ["ENDPOINT_SECRET"],\n)`,
              go: `event, err := kestrel.Verify(body, r.Header.Get("Kestrel-Signature"), secret)`,
            },
          },
        ],
      },
    ],
  },
  {
    id: "retries",
    title: "Retries and dead letters",
    group: "Webhooks",
    lead: "When an endpoint fails, Kestrel retries with backoff, then parks the event in a dead-letter queue, so nothing is lost and one bad endpoint never holds up the rest.",
    updated: "Oct 22",
    minutes: 4,
    sections: [
      {
        id: "how-retries-work",
        title: "How retries work",
        blocks: [
          {
            type: "callout",
            tone: "info",
            title: "Changed in v2.4",
            text: "Events now move to the dead-letter queue after three failed attempts. Before v2.4 they were retried for up to 24 hours.",
          },
          { type: "p", text: "A delivery fails when the endpoint answers with anything other than a 2xx, takes longer than 15 seconds, or can't be reached. Each retry waits longer than the last, with jitter so a recovering endpoint isn't hit by every event at once." },
          {
            type: "table",
            head: ["Attempt", "Sent after", "If it fails"],
            rows: [
              ["1", "Immediately", "Retry in about 1 minute"],
              ["2", "~1 minute", "Retry in about 10 minutes"],
              ["3", "~10 minutes", "Move to the dead-letter queue"],
            ],
          },
          { type: "p", text: "An endpoint that answers 410 Gone is disabled straight away and its pending events are dead-lettered." },
        ],
      },
      {
        id: "dead-letter-queue",
        title: "The dead-letter queue",
        blocks: [
          { type: "p", text: "Dead-lettered events keep their payload, every attempt and the last error for 7 days. List them per endpoint to see what went wrong." },
          {
            type: "code",
            title: "List dead letters for an endpoint",
            samples: {
              node: `const parked = await kestrel.deadLetters.list({\n  endpointId: "ep_8fK21",\n  limit: 20,\n});\n\nfor (const letter of parked.data) {\n  console.log(letter.eventId, letter.lastError);\n}`,
              python: `parked = kestrel.dead_letters.list(endpoint_id="ep_8fK21", limit=20)\n\nfor letter in parked.data:\n    print(letter.event_id, letter.last_error)`,
              go: `parked, err := client.DeadLetters.List(ctx, &kestrel.DeadLetterParams{\n\tEndpointID: "ep_8fK21",\n\tLimit:      20,\n})`,
              curl: `curl "https://api.kestrel.dev/v2/dead_letters?endpoint_id=ep_8fK21&limit=20" \\\n  -H "Authorization: Bearer $KESTREL_KEY"`,
            },
          },
        ],
      },
      {
        id: "replaying",
        title: "Replaying events",
        blocks: [
          {
            type: "steps",
            items: [
              "Fix the endpoint, or wait until your customer confirms it's back.",
              "Open Deliveries, filter by Dead-lettered, and select the events to send again.",
              "Choose Replay. Each event is delivered once more and counted as a new attempt.",
            ],
          },
          {
            type: "code",
            title: "Replay from code",
            samples: {
              node: `await kestrel.deadLetters.replay("dl_3Hc9Ve");`,
              python: `kestrel.dead_letters.replay("dl_3Hc9Ve")`,
              go: `err := client.DeadLetters.Replay(ctx, "dl_3Hc9Ve")`,
              curl: `curl -X POST https://api.kestrel.dev/v2/dead_letters/dl_3Hc9Ve/replay \\\n  -H "Authorization: Bearer $KESTREL_KEY"`,
            },
          },
          {
            type: "callout",
            tone: "warning",
            title: "Replays can arrive out of order",
            text: "A replayed event may land after newer events for the same object. Compare the event's created timestamp before overwriting state.",
          },
        ],
      },
      {
        id: "limits",
        title: "Limits",
        blocks: [
          {
            type: "table",
            head: ["Limit", "Value"],
            rows: [
              ["Attempts per event", "3"],
              ["Request timeout", "15 seconds"],
              ["Dead-letter retention", "7 days"],
              ["Replay rate", "50 events/s per endpoint"],
            ],
          },
        ],
      },
    ],
  },
  {
    id: "replay-guide",
    title: "Bulk replays",
    group: "Webhooks",
    lead: "Send a whole window of events again after an outage, without flooding the endpoint.",
    updated: "Oct 22",
    minutes: 3,
    sections: [
      {
        id: "choose-window",
        title: "Choose a window",
        blocks: [
          { type: "p", text: "Pick a start and end time and an optional event type. Kestrel shows how many events match before anything is sent." },
          {
            type: "code",
            samples: {
              node: `await kestrel.replays.create({\n  endpointId: "ep_8fK21",\n  from: "2026-10-21T09:00:00Z",\n  to: "2026-10-21T09:40:00Z",\n});`,
              curl: `curl https://api.kestrel.dev/v2/replays \\\n  -H "Authorization: Bearer $KESTREL_KEY" \\\n  -d endpoint_id=ep_8fK21 \\\n  -d from=2026-10-21T09:00:00Z \\\n  -d to=2026-10-21T09:40:00Z`,
            },
          },
        ],
      },
      {
        id: "pacing",
        title: "Pacing",
        blocks: [{ type: "p", text: "Bulk replays are paced at the endpoint's replay rate and pause automatically if the endpoint starts failing again." }],
      },
    ],
  },
  {
    id: "events-api",
    title: "Events",
    group: "API reference",
    lead: "The Event object, and how to list and retrieve events.",
    updated: "Oct 14",
    minutes: 3,
    sections: [
      {
        id: "event-object",
        title: "The Event object",
        blocks: [
          {
            type: "table",
            head: ["Field", "Type", "Description"],
            rows: [
              ["id", "string", "Unique ID, prefixed evt_"],
              ["type", "string", "Dot-separated name, e.g. order.shipped"],
              ["data", "object", "Your payload, up to 256 KB"],
              ["created", "timestamp", "When you published it"],
            ],
          },
        ],
      },
      {
        id: "list-events",
        title: "List events",
        blocks: [
          {
            type: "code",
            samples: {
              node: `const events = await kestrel.events.list({ type: "order.shipped" });`,
              python: `events = kestrel.events.list(type="order.shipped")`,
              curl: `curl "https://api.kestrel.dev/v2/events?type=order.shipped" \\\n  -H "Authorization: Bearer $KESTREL_KEY"`,
            },
          },
        ],
      },
    ],
  },
  {
    id: "deliveries-api",
    title: "Deliveries",
    group: "API reference",
    lead: "Every attempt to send an event to an endpoint, with status, timing and response.",
    updated: "Oct 14",
    minutes: 2,
    sections: [
      {
        id: "delivery-object",
        title: "The Delivery object",
        blocks: [
          {
            type: "table",
            head: ["Field", "Type", "Description"],
            rows: [
              ["id", "string", "Unique ID, prefixed dlv_"],
              ["status", "enum", "succeeded, failed or dead_lettered"],
              ["attempt", "integer", "1 to 3"],
              ["duration_ms", "integer", "Time until the endpoint answered"],
            ],
          },
        ],
      },
    ],
  },
];

const LANGS: { id: DocsLang; label: string }[] = [
  { id: "node", label: "Node.js" },
  { id: "python", label: "Python" },
  { id: "go", label: "Go" },
  { id: "curl", label: "cURL" },
];

const navLinks = ["Guides", "API reference"] as const;

const ease = [0.23, 1, 0.32, 1] as const;
const spring = { type: "spring", stiffness: 520, damping: 42 } as const;

const KEYWORDS =
  /^(const|let|var|await|async|for|of|in|new|return|import|from|if|else|func|err|nil|range|def|print|True|False|None|curl)$/;

function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /((?:\/\/|#).*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\s-[A-Za-z]\b|\s--?[a-z-]+)|(\b\d[\d_.]*\b)|([A-Za-z_$][\w$]*)/gm;
  let last = 0;
  let k = 0;
  for (let m = re.exec(code); m; m = re.exec(code)) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const tok = m[0];
    if (m[1] && (m[1].startsWith("//") || /(^|\s)#/.test(code.slice(Math.max(0, m.index - 1), m.index + 1))))
      out.push(<span className="text-muted-foreground italic" key={k++}>{tok}</span>);
    else if (m[2]) out.push(<span className="text-emerald-700 dark:text-emerald-300" key={k++}>{tok}</span>);
    else if (m[3]) out.push(<span className="text-sky-700 dark:text-sky-300" key={k++}>{tok}</span>);
    else if (m[4]) out.push(<span className="text-amber-700 dark:text-amber-300" key={k++}>{tok}</span>);
    else if (m[5] && KEYWORDS.test(tok)) out.push(<span className="text-violet-700 dark:text-violet-300" key={k++}>{tok}</span>);
    else if (m[5] && /^[A-Z]/.test(tok)) out.push(<span className="text-sky-700 dark:text-sky-300" key={k++}>{tok}</span>);
    else if (m[5] && code[re.lastIndex] === "(") out.push(<span className="text-blue-700 dark:text-blue-300" key={k++}>{tok}</span>);
    else out.push(tok);
    last = re.lastIndex;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

function CodeTabs({ samples, title, lang, onLang }: { samples: Partial<Record<DocsLang, string>>; title?: string; lang: DocsLang; onLang: (l: DocsLang) => void }) {
  const available = LANGS.filter((l) => samples[l.id]);
  const current = samples[lang] ? lang : available[0].id;
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);
  const single = available.length === 1 && !title;
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs/5">
      <div className="flex h-10 items-center gap-1 border-b bg-muted/40 ps-1.5 pe-1.5">
        {title && <span className="hidden min-w-0 flex-1 truncate ps-1.5 pe-2 font-medium text-muted-foreground text-xs @2xl:block">{title}</span>}
        <div className="flex min-w-0 gap-0.5 overflow-x-auto [scrollbar-width:none]" role="tablist">
          {single ? (
            <span className="px-1.5 font-mono text-muted-foreground text-xs">terminal</span>
          ) : (
            available.map((l) => (
              <button
                aria-selected={current === l.id}
                className={cn(
                  "relative h-7 shrink-0 cursor-pointer rounded-md px-2 font-medium text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  current === l.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                key={l.id}
                onClick={() => onLang(l.id)}
                role="tab"
                type="button"
              >
                {current === l.id && <span className="absolute inset-0 rounded-md bg-background shadow-xs/5 ring-1 ring-border dark:bg-accent dark:ring-0" />}
                <span className="relative">{l.label}</span>
              </button>
            ))
          )}
        </div>
        <button
          aria-label={copied ? "Copied" : "Copy code"}
          className={cn("ms-auto flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-[color,background-color,scale] duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-90", title && "@2xl:ms-1")}
          onClick={() => {
            navigator.clipboard?.writeText(samples[current] ?? "").catch(() => {});
            setCopied(true);
          }}
          type="button"
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} initial={{ opacity: 0, scale: 0.8 }} key={copied ? "y" : "n"} transition={{ duration: 0.12 }}>
              {copied ? <CheckIcon className="size-3.5 text-success" /> : <CopyIcon className="size-3.5" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-6 [scrollbar-width:thin]">
        <code>{highlight(samples[current] ?? "")}</code>
      </pre>
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(kst_live_|kst_test_|Kestrel-Signature|evt_|dlv_|order\.shipped|410 Gone|2xx)/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <code className="rounded-md border bg-muted px-1 py-px font-mono text-[0.8125rem]" key={i}>
            {p}
          </code>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

function Block({ block, lang, onLang }: { block: DocsBlock; lang: DocsLang; onLang: (l: DocsLang) => void }) {
  switch (block.type) {
    case "p":
      return (
        <p className="text-pretty text-[15px] text-foreground/85 leading-7">
          <Inline text={block.text} />
        </p>
      );
    case "list":
      return (
        <ul className="flex flex-col gap-1 ps-1">
          {block.items.map((it) => (
            <li className="flex gap-3 text-[15px] leading-7" key={it}>
              <span className="mt-[13px] size-1 shrink-0 rounded-full bg-muted-foreground/70" />
              <span className="text-foreground/85">{it}</span>
            </li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="relative flex flex-col gap-3 before:absolute before:top-3 before:bottom-3 before:left-3 before:w-px before:bg-border">
          {block.items.map((it, i) => (
            <li className="relative flex gap-3" key={it}>
              <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background font-medium text-xs tabular-nums">{i + 1}</span>
              <span className="text-pretty text-[15px] text-foreground/85 leading-6">{it}</span>
            </li>
          ))}
        </ol>
      );
    case "callout": {
      const Icon = block.tone === "info" ? InfoIcon : TriangleAlertIcon;
      return (
        <div
          className={cn(
            "flex gap-3 rounded-xl border px-4 py-3.5",
            block.tone === "info" ? "border-info/16 bg-info/4 dark:border-info/14 dark:bg-info/6" : "border-warning/20 bg-warning/5 dark:border-warning/14 dark:bg-warning/6",
          )}
          role="note"
        >
          <Icon className={cn("mt-[3px] size-4 shrink-0", block.tone === "info" ? "text-info-foreground" : "text-warning-foreground")} />
          <div className="min-w-0">
            <div className="font-medium">{block.title}</div>
            <p className="mt-1 text-pretty text-muted-foreground leading-6">
              <Inline text={block.text} />
            </p>
          </div>
        </div>
      );
    }
    case "code":
      return <CodeTabs lang={lang} onLang={onLang} samples={block.samples} title={block.title} />;
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border [scrollbar-width:thin]">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-muted/30">
              <tr>
                {block.head.map((h) => (
                  <th className="border-b px-3.5 py-2 font-medium text-muted-foreground text-xs" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r) => (
                <tr className="border-b last:border-b-0" key={r.join()}>
                  {r.map((c, i) => (
                    <td className={cn("px-3.5 py-2 align-baseline leading-6", i === 0 ? "font-mono text-[0.8125rem] text-foreground" : "text-foreground/85")} key={c}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

interface SearchHit {
  id: string;
  page: DocsPage;
  section?: DocsSection;
}

function SearchDialog({ pages, onPick, onClose }: { pages: DocsPage[]; onPick: (page: string, section?: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);
  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    const all: SearchHit[] = pages.flatMap((p) => [
      { id: p.id, page: p },
      ...p.sections.map((s) => ({ id: `${p.id}#${s.id}`, page: p, section: s })),
    ]);
    if (!q) return all.filter((h) => !h.section).slice(0, 8);
    const score = (h: SearchHit) => {
      const title = (h.section ? h.section.title : h.page.title).toLowerCase();
      if (title.startsWith(q)) return 0;
      if (title.includes(q)) return 1;
      if (h.page.title.toLowerCase().includes(q)) return 2;
      const body = h.section ? h.section.blocks.map((b) => ("text" in b ? b.text : "")).join(" ") : h.page.lead;
      return body.toLowerCase().includes(q) ? 3 : 9;
    };
    return all
      .map((h) => ({ h, s: score(h) }))
      .filter((x) => x.s < 9)
      .sort((a, b) => a.s - b.s)
      .slice(0, 10)
      .map((x) => x.h);
  }, [pages, query]);

  const mark = (text: string) => {
    const q = query.trim();
    if (!q) return text;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return text;
    return (
      <>
        {text.slice(0, i)}
        <mark className="rounded-sm bg-warning/24 text-foreground">{text.slice(i, i + q.length)}</mark>
        {text.slice(i + q.length)}
      </>
    );
  };

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex items-start justify-center bg-black/24 px-3 pt-16"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      transition={{ duration: 0.12 }}
    >
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        aria-label="Search documentation"
        aria-modal="true"
        className="flex max-h-[440px] w-full max-w-xl origin-top flex-col overflow-hidden rounded-2xl border bg-popover shadow-lg/10"
        exit={{ opacity: 0, scale: 0.98 }}
        initial={{ opacity: 0, scale: 0.98 }}
        role="dialog"
        transition={{ duration: 0.14, ease }}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            aria-label="Search the docs"
            className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(hits.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter" && hits[active]) {
                onPick(hits[active].page.id, hits[active].section?.id);
              } else if (e.key === "Escape") {
                e.stopPropagation();
                onClose();
              }
            }}
            placeholder="Search guides and API reference…"
            ref={inputRef}
            value={query}
          />
          <Kbd>Esc</Kbd>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5" role="listbox">
          {hits.length === 0 ? (
            <div className="px-4 py-10 text-center text-muted-foreground text-sm">
              Nothing for “{query}”. Try “retry”, “signature” or “replay”.
            </div>
          ) : (
            <>
              {!query && <div className="px-2.5 pt-1.5 pb-1 font-medium text-muted-foreground text-xs">Pages</div>}
              {hits.map((h, i) => (
                <div
                  aria-selected={i === active}
                  className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2", i === active && "bg-accent")}
                  key={h.id}
                  onClick={() => onPick(h.page.id, h.section?.id)}
                  onMouseMove={() => setActive(i)}
                  role="option"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground">
                    {h.section ? <HashIcon className="size-3.5" /> : <FileTextIcon className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{mark(h.section ? h.section.title : h.page.title)}</span>
                    <span className="block truncate text-muted-foreground text-xs">
                      {h.page.group}
                      {h.section ? ` › ${h.page.title}` : ""}
                    </span>
                  </span>
                  {i === active && <CornerDownLeftIcon className="size-3.5 shrink-0 text-muted-foreground" />}
                </div>
              ))}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function DocsSite({
  product = "Kestrel",
  version = "v2.4",
  pages = defaultPages,
  initialPage = "retries",
  dashboardHref,
  editHref,
  className,
}: DocsSiteProps) {
  const [pageId, setPageId] = useState(initialPage);
  const [lang, setLang] = useState<DocsLang>("node");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [search, setSearch] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, "yes" | "no">>({});
  const [closedGroups, setClosedGroups] = useState<Set<string>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingSection = useRef<string | null>(null);

  const page = pages.find((p) => p.id === pageId) ?? pages[0];
  const index = pages.indexOf(page);
  const prev = pages[index - 1];
  const next = pages[index + 1];
  const groups = Array.from(new Set(pages.map((p) => p.group)));

  const scrollToSection = (id: string, smooth = true) => {
    const box = scrollRef.current;
    const el = box?.querySelector<HTMLElement>(`[data-section="${id}"]`);
    if (box && el) box.scrollTo({ top: el.offsetTop - 16, behavior: smooth ? "smooth" : "auto" });
  };

  const go = (id: string, section?: string) => {
    setSearch(false);
    setDrawer(false);
    setTocOpen(false);
    if (id === pageId) {
      if (section) scrollToSection(section);
      else scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    pendingSection.current = section ?? null;
    setPageId(id);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per page change
  useLayoutEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    if (pendingSection.current) {
      scrollToSection(pendingSection.current, false);
      pendingSection.current = null;
    } else box.scrollTop = 0;
    setActiveSection(page.sections[0]?.id ?? null);
  }, [pageId]);

  const onScroll = () => {
    const box = scrollRef.current;
    if (!box) return;
    let current = page.sections[0]?.id ?? null;
    for (const s of page.sections) {
      const el = box.querySelector<HTMLElement>(`[data-section="${s.id}"]`);
      if (el && el.offsetTop - 120 <= box.scrollTop) current = s.id;
    }
    if (box.scrollTop + box.clientHeight >= box.scrollHeight - 4) current = page.sections[page.sections.length - 1]?.id ?? current;
    if (current !== activeSection) setActiveSection(current);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (search) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setSearch(true);
      return;
    }
    const t = e.target as HTMLElement;
    if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "/") {
      e.preventDefault();
      setSearch(true);
    } else if (e.key === "Escape") {
      setDrawer(false);
      setTocOpen(false);
    } else if (e.key === "[" && prev) go(prev.id);
    else if (e.key === "]" && next) go(next.id);
  };

  const sidebar = (
    <nav aria-label="Documentation" className="flex flex-col gap-6 px-3 py-5">
      {groups.map((g) => {
        const closed = closedGroups.has(g);
        return (
          <div key={g}>
            <button
              aria-expanded={!closed}
              className="group/g flex h-6 w-full cursor-pointer items-center justify-between rounded-md px-2.5 mb-1 text-left font-medium text-foreground text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() =>
                setClosedGroups((c) => {
                  const n = new Set(c);
                  if (n.has(g)) n.delete(g);
                  else n.add(g);
                  return n;
                })
              }
              type="button"
            >
              {g}
              <ChevronDownIcon className={cn("size-3.5 text-muted-foreground/70 transition-[rotate,color] duration-200 group-hover/g:text-foreground", closed && "-rotate-90")} />
            </button>
            <AnimatePresence initial={false}>
              {!closed && (
                <motion.ul
                  animate={{ height: "auto", opacity: 1 }}
                  className="flex flex-col overflow-hidden"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease }}
                >
                  {pages
                    .filter((p) => p.group === g)
                    .map((p) => {
                      const on = p.id === page.id;
                      return (
                        <li key={p.id}>
                          <button
                            aria-current={on ? "page" : undefined}
                            className={cn(
                              "relative flex h-8 w-full cursor-pointer items-center rounded-lg px-2.5 text-left text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                              on ? "font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                            )}
                            onClick={() => go(p.id)}
                            type="button"
                          >
                            {on && <motion.span className="absolute inset-0 rounded-lg bg-accent" layoutId="docs-nav-pill" transition={spring} />}
                            <span className="relative truncate">{p.title}</span>
                            {p.id === "retries" && <span className="relative ms-auto rounded-full bg-info/12 px-1.5 font-medium text-[10px] text-info-foreground">New</span>}
                          </button>
                        </li>
                      );
                    })}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );

  const toc = (
    <LayoutGroup id="docs-toc">
      <ul className="relative flex flex-col border-s">
        {page.sections.map((s) => {
          const on = s.id === activeSection;
          return (
            <li className="relative" key={s.id}>
              {on && <motion.span className="absolute inset-y-1 -left-px w-0.5 rounded-full bg-foreground" layoutId="toc-rail" transition={spring} />}
              <button
                className={cn(
                  "w-full cursor-pointer rounded-e-md py-1.5 ps-3.5 pe-2 text-left text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  on ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => go(page.id, s.id)}
                type="button"
              >
                {s.title}
              </button>
            </li>
          );
        })}
      </ul>
    </LayoutGroup>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn("@container relative isolate flex h-[760px] w-full flex-col overflow-hidden bg-background text-foreground text-sm outline-none", className)}
        onKeyDown={onKeyDown}
        tabIndex={-1}
      >
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3 @3xl:px-5">
          <Button aria-label="Open navigation" className="@4xl:hidden" onClick={() => setDrawer(true)} size="icon-sm" variant="ghost">
            <MenuIcon />
          </Button>
          <a className="flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring" href="#top" onClick={(e) => { e.preventDefault(); go("introduction"); }}>
            <svg aria-hidden className="size-6" viewBox="0 0 24 24">
              <rect className="fill-foreground" height="24" rx="7" width="24" />
              <path className="stroke-background" d="M7 17 12 7l5 10M9.2 13h5.6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span className="font-heading font-semibold tracking-tight">{product}</span>
            <span className="hidden text-muted-foreground @md:inline">Docs</span>
          </a>
          <span className="hidden rounded-md border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground @xl:inline">{version}</span>
          <LayoutGroup id="docs-top">
            <nav aria-label="Sections" className="ms-2 hidden items-center gap-1 @4xl:flex">
              {navLinks.map((l) => {
                const on = (l === "API reference" && page.group === "API reference") || (l === "Guides" && page.group !== "API reference");
                return (
                  <button
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "relative flex h-14 cursor-pointer items-center px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      on ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    key={l}
                    onClick={() => go(l === "API reference" ? (pages.find((p) => p.group === "API reference")?.id ?? pages[0].id) : pages[0].id)}
                    type="button"
                  >
                    {l}
                    {on && <motion.span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-foreground" layoutId="docs-top-line" transition={spring} />}
                  </button>
                );
              })}
            </nav>
          </LayoutGroup>
          <div className="ms-auto flex items-center gap-2">
            <button
              className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border bg-background px-2.5 text-muted-foreground shadow-xs/5 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring @xl:w-56 dark:bg-input/32"
              onClick={() => setSearch(true)}
              type="button"
            >
              <SearchIcon className="size-4" />
              <span className="hidden flex-1 text-left @xl:inline">Search docs</span>
              <Kbd className="hidden @xl:inline-flex">⌘K</Kbd>
            </button>
            {dashboardHref && (
              <Button className="hidden @2xl:inline-flex" render={<a href={dashboardHref} rel="noreferrer" target="_blank" />} size="sm" variant="outline">
                Dashboard
              </Button>
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside aria-label="Pages" className="hidden w-60 shrink-0 overflow-y-auto border-e [scrollbar-width:thin] @4xl:block">
            {sidebar}
          </aside>

          <div className="min-w-0 flex-1 overflow-y-auto [scroll-padding-top:16px] [scrollbar-width:thin]" onScroll={onScroll} ref={scrollRef}>
            <div className="mx-auto flex max-w-[1040px] gap-10 px-4 pt-8 pb-16 @3xl:px-10">
              <motion.article
                animate={{ opacity: 1, y: 0 }}
                className="min-w-0 max-w-[680px] flex-1"
                initial={{ opacity: 0, y: 6 }}
                key={page.id}
                transition={{ duration: 0.2, ease }}
              >
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <span>{page.group}</span>
                  <ChevronRightIcon className="size-3" />
                  <span className="text-foreground">{page.title}</span>
                </div>
                <h1 className="mt-3 text-balance font-heading font-semibold text-3xl tracking-tight">{page.title}</h1>
                <p className="mt-3 text-pretty text-[17px] text-muted-foreground leading-7">{page.lead}</p>
                <div className="mt-4 flex items-center gap-3 text-muted-foreground text-xs">
                  <span>Updated {page.updated}</span>
                  <span className="size-0.5 rounded-full bg-muted-foreground" />
                  <span>{page.minutes} min read</span>
                </div>

                {page.sections.length > 1 && (
                  <div className="mt-6 rounded-xl border @6xl:hidden">
                    <button
                      aria-expanded={tocOpen}
                      className="flex h-10 w-full cursor-pointer items-center justify-between rounded-xl px-3.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setTocOpen((o) => !o)}
                      type="button"
                    >
                      On this page
                      <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform duration-200", tocOpen && "rotate-180")} />
                    </button>
                    <AnimatePresence initial={false}>
                      {tocOpen && (
                        <motion.div
                          animate={{ height: "auto", opacity: 1 }}
                          className="overflow-hidden"
                          exit={{ height: 0, opacity: 0 }}
                          initial={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease }}
                        >
                          <div className="px-3.5 pb-3">{toc}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {page.sections.map((s) => (
                  <section className="mt-10 flex flex-col gap-4" data-section={s.id} key={s.id}>
                    <h2 className="group/h flex items-center gap-2 font-heading font-semibold text-xl tracking-tight">
                      {s.title}
                      <button
                        aria-label={`Link to ${s.title}`}
                        className="cursor-pointer rounded text-muted-foreground opacity-0 outline-none transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/h:opacity-100"
                        onClick={() => go(page.id, s.id)}
                        type="button"
                      >
                        <HashIcon className="size-4" />
                      </button>
                    </h2>
                    {s.blocks.map((b, i) => (
                      <Block block={b} key={i} lang={lang} onLang={setLang} />
                    ))}
                  </section>
                ))}

                <div className="mt-12 flex flex-wrap items-center gap-3 border-t pt-6">
                  <AnimatePresence initial={false} mode="wait">
                    {feedback[page.id] ? (
                      <motion.p animate={{ opacity: 1 }} className="text-muted-foreground" exit={{ opacity: 0 }} initial={{ opacity: 0 }} key="thanks" transition={{ duration: 0.15 }}>
                        {feedback[page.id] === "yes" ? "Thanks! Glad it helped." : "Thanks. We read every one of these and fix the page."}
                      </motion.p>
                    ) : (
                      <motion.div animate={{ opacity: 1 }} className="flex items-center gap-3" exit={{ opacity: 0 }} initial={{ opacity: 0 }} key="ask" transition={{ duration: 0.15 }}>
                        <span className="text-muted-foreground">Was this page helpful?</span>
                        <Button onClick={() => setFeedback((f) => ({ ...f, [page.id]: "yes" }))} size="sm" variant="outline">
                          <ThumbsUpIcon />
                          Yes
                        </Button>
                        <Button onClick={() => setFeedback((f) => ({ ...f, [page.id]: "no" }))} size="sm" variant="outline">
                          <ThumbsDownIcon />
                          No
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {editHref && (
                    <a
                      className="ms-auto flex items-center gap-1.5 rounded text-muted-foreground text-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring @6xl:hidden"
                      href={editHref(page.id)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <PencilIcon className="size-3.5" />
                      Edit this page
                    </a>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 @xl:grid-cols-2">
                  {prev ? (
                    <button
                      className="group/pn flex cursor-pointer flex-col items-start gap-1 rounded-xl border p-4 text-left outline-none transition-[border-color,scale] duration-150 ease-out hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                      onClick={() => go(prev.id)}
                      type="button"
                    >
                      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <ArrowLeftIcon className="size-3.5 transition-transform duration-150 group-hover/pn:-translate-x-0.5" />
                        Previous <Kbd className="h-4 text-[10px]">[</Kbd>
                      </span>
                      <span className="font-medium">{prev.title}</span>
                    </button>
                  ) : (
                    <span className="hidden @xl:block" />
                  )}
                  {next && (
                    <button
                      className="group/pn flex cursor-pointer flex-col items-end gap-1 rounded-xl border p-4 text-right outline-none transition-[border-color,scale] duration-150 ease-out hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                      onClick={() => go(next.id)}
                      type="button"
                    >
                      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Kbd className="h-4 text-[10px]">]</Kbd> Next
                        <ArrowRightIcon className="size-3.5 transition-transform duration-150 group-hover/pn:translate-x-0.5" />
                      </span>
                      <span className="font-medium">{next.title}</span>
                    </button>
                  )}
                </div>
              </motion.article>

              <aside aria-label="On this page" className="sticky top-8 hidden h-fit w-52 shrink-0 @6xl:block">
                <div className="mb-2 font-medium text-xs">On this page</div>
                {toc}
                <div className="mt-6 flex flex-col gap-2 border-t pt-4 text-muted-foreground text-xs">
                  {editHref && (
                    <a
                      className="flex items-center gap-1.5 rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      href={editHref(page.id)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <PencilIcon className="size-3.5" />
                      Edit this page
                    </a>
                  )}
                  <button
                    className="flex cursor-pointer items-center gap-1.5 rounded text-left outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                    type="button"
                  >
                    <ArrowLeftIcon className="size-3.5 rotate-90" />
                    Back to top
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {drawer && (
            <>
              <motion.div
                animate={{ opacity: 1 }}
                aria-hidden
                className="absolute inset-0 z-40 bg-black/32 @4xl:hidden"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                onClick={() => setDrawer(false)}
              />
              <motion.div
                animate={{ x: 0 }}
                aria-label="Documentation"
                aria-modal="true"
                className="absolute inset-y-2 left-2 z-50 flex w-[272px] max-w-[calc(100%-3rem)] flex-col overflow-hidden rounded-2xl border bg-background shadow-lg/10 @4xl:hidden"
                exit={{ x: "-110%" }}
                initial={{ x: "-110%" }}
                role="dialog"
                transition={{ type: "spring", stiffness: 420, damping: 40 }}
              >
                <div className="flex h-12 items-center justify-between border-b ps-4 pe-2">
                  <span className="font-medium">
                    {product} Docs <span className="font-mono text-muted-foreground text-xs">{version}</span>
                  </span>
                  <Button aria-label="Close navigation" onClick={() => setDrawer(false)} size="icon-sm" variant="ghost">
                    <XIcon />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">{sidebar}</div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>{search && <SearchDialog onClose={() => setSearch(false)} onPick={go} pages={pages} />}</AnimatePresence>
      </div>
    </MotionConfig>
  );
}
