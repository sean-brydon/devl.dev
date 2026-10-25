"use client";

import {
  ArrowLeftRightIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  ClockIcon,
  CornerDownLeftIcon,
  CreditCardIcon,
  FileTextIcon,
  InfoIcon,
  LifeBuoyIcon,
  MailIcon,
  MessageCircleIcon,
  PlugIcon,
  RocketIcon,
  SearchIcon,
  SearchXIcon,
  ShieldCheckIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Textarea } from "@/components/ui/textarea";

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export type HelpTone = "sky" | "emerald" | "amber" | "violet" | "rose" | "teal";
export type HelpIcon = "rocket" | "payments" | "invoices" | "billing" | "security" | "integrations";

export interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: HelpIcon;
  tone: HelpTone;
}

export type HelpBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "callout"; tone: "info" | "warning"; text: string };

export interface HelpArticle {
  id: string;
  title: string;
  categoryId: string;
  summary: string;
  updated: string;
  minutes: number;
  popular?: boolean;
  body: HelpBlock[];
}

export interface HelpCentreProps {
  className?: string;
  productName?: string;
  categories?: HelpCategory[];
  articles?: HelpArticle[];
  popularSearches?: string[];
  replyTime?: string;
}

const easeOut = [0.23, 1, 0.32, 1] as const;
const spring = { type: "spring", stiffness: 520, damping: 46, mass: 1 } as const;
const press = "transition-[color,background-color,box-shadow,scale,border-color] duration-150 ease-out active:scale-[0.97]";
const ring = "outline-none focus-visible:ring-2 focus-visible:ring-ring";

const icons: Record<HelpIcon, ReactNode> = {
  rocket: <RocketIcon />,
  payments: <ArrowLeftRightIcon />,
  invoices: <FileTextIcon />,
  billing: <CreditCardIcon />,
  security: <ShieldCheckIcon />,
  integrations: <PlugIcon />,
};

const toneTile: Record<HelpTone, string> = {
  sky: "bg-sky-500/12 text-sky-700 dark:bg-sky-400/16 dark:text-sky-300",
  emerald: "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/16 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-700 dark:bg-amber-400/16 dark:text-amber-300",
  violet: "bg-violet-500/12 text-violet-700 dark:bg-violet-400/16 dark:text-violet-300",
  rose: "bg-rose-500/12 text-rose-700 dark:bg-rose-400/16 dark:text-rose-300",
  teal: "bg-teal-500/12 text-teal-700 dark:bg-teal-400/16 dark:text-teal-300",
};

const defaultCategories: HelpCategory[] = [
  { id: "start", name: "Getting started", description: "Set up your workspace and send your first invoice.", icon: "rocket", tone: "sky" },
  { id: "payments", name: "Payments & payouts", description: "Get paid by card or bank transfer, and know when money lands.", icon: "payments", tone: "emerald" },
  { id: "invoices", name: "Invoices & quotes", description: "Templates, reminders, taxes and credit notes.", icon: "invoices", tone: "amber" },
  { id: "billing", name: "Plans & billing", description: "Change plan, update your card, download receipts.", icon: "billing", tone: "violet" },
  { id: "security", name: "Account & security", description: "Two-factor, passkeys, sessions and data exports.", icon: "security", tone: "rose" },
  { id: "integrations", name: "Integrations", description: "Connect accounting tools and bank feeds.", icon: "integrations", tone: "teal" },
];

const brief = (intro: string, heading: string, steps: string[], tail?: string): HelpBlock[] => [
  { type: "p", text: intro },
  { type: "h2", text: heading },
  { type: "steps", items: steps },
  ...(tail ? [{ type: "p", text: tail } as HelpBlock] : []),
];

const defaultArticles: HelpArticle[] = [
  {
    id: "payout-timing",
    title: "How long do payouts take?",
    categoryId: "payments",
    summary: "Most payouts reach your bank in 2 business days. Timing depends on the payment method and your bank.",
    updated: "Oct 12, 2026",
    minutes: 3,
    popular: true,
    body: [
      { type: "p", text: "Most payouts reach your bank in 2 business days. The exact timing depends on how your customer paid and where your bank is." },
      { type: "h2", text: "Payout timing by method" },
      {
        type: "list",
        items: [
          "Card payments: 2 business days after the payment clears.",
          "Bank transfers (ACH or SEPA): 3 to 4 business days.",
          "Instant payouts: within 30 minutes, for a 1% fee.",
        ],
      },
      { type: "callout", tone: "info", text: "Payouts don't move on weekends or bank holidays. A payment made on Friday evening usually lands on Tuesday." },
      { type: "h2", text: "Check when a payout will arrive" },
      {
        type: "steps",
        items: [
          "Open Payments in the sidebar.",
          "Select the Payouts tab.",
          "Find the payout and check the Expected column. Hover the date to see which payments it includes.",
        ],
      },
      { type: "h2", text: "If a payout is late" },
      {
        type: "p",
        text: "If a payout hasn't arrived 2 business days after its expected date, check your bank details under Settings → Payouts, then contact us with the payout ID. It starts with po_.",
      },
    ],
  },
  {
    id: "two-factor",
    title: "Set up two-factor authentication",
    categoryId: "security",
    summary: "Add a second step at sign-in so a stolen password alone can't open your account.",
    updated: "Sep 28, 2026",
    minutes: 2,
    popular: true,
    body: [
      { type: "p", text: "Two-factor authentication (2FA) asks for a second step when you sign in, so a stolen password alone can't get into your account." },
      { type: "h2", text: "Turn on 2FA" },
      {
        type: "steps",
        items: [
          "Go to Settings → Security.",
          "Under Two-factor authentication, choose Authenticator app.",
          "Scan the QR code with your app and enter the 6-digit code it shows.",
          "Save your backup codes somewhere safe. Each one works once.",
        ],
      },
      { type: "callout", tone: "warning", text: "If you lose your phone and your backup codes, we have to verify your identity before restoring access. That can take up to 3 business days." },
      { type: "h2", text: "Require 2FA for your team" },
      { type: "p", text: "Owners and admins can make 2FA mandatory under Settings → Team → Security policy. Teammates without it are asked to set it up the next time they sign in." },
    ],
  },
  {
    id: "reminders",
    title: "Send automatic payment reminders",
    categoryId: "invoices",
    summary: "Choose when reminders go out before and after the due date, and what they say.",
    updated: "Oct 3, 2026",
    minutes: 2,
    popular: true,
    body: [
      { type: "p", text: "Reminders go out on a schedule you choose, so you don't have to chase late invoices yourself." },
      { type: "h2", text: "Set a reminder schedule" },
      {
        type: "steps",
        items: [
          "Open Invoices → Settings → Reminders.",
          "Pick when reminders go out: before the due date, on it, and after it.",
          "Edit the message for each reminder, or keep the default wording.",
          "Click Save. The schedule applies to every new invoice.",
        ],
      },
      { type: "h2", text: "Turn reminders off for one customer" },
      { type: "p", text: "Open the customer, choose Edit, and switch off Send payment reminders. Invoices already sent keep their schedule until you pause them." },
      { type: "callout", tone: "info", text: "Reminders stop automatically as soon as an invoice is paid in full." },
    ],
  },
  {
    id: "declined",
    title: "Why was a payment declined?",
    categoryId: "payments",
    summary: "The customer's bank made the call. Here's what each decline reason means and how to retry.",
    updated: "Oct 18, 2026",
    minutes: 3,
    popular: true,
    body: [
      { type: "p", text: "When a card payment is declined, the customer's bank made the call. We show the reason the bank gave on the payment's timeline." },
      { type: "h2", text: "Common reasons" },
      {
        type: "list",
        items: [
          "Insufficient funds: the customer should try another card or pay by bank transfer.",
          "Do not honour: a generic refusal. The customer needs to call their bank.",
          "Suspected fraud: the bank flagged it. Ask the customer to approve the charge in their banking app, then retry.",
        ],
      },
      { type: "h2", text: "Retry a declined payment" },
      {
        type: "steps",
        items: [
          "Open the invoice.",
          "Click Send payment link to email the customer a fresh link.",
          "Or, if they asked you to, choose Retry card to charge the saved card again.",
        ],
      },
      { type: "callout", tone: "warning", text: "Retrying the same card more than 3 times in 24 hours can get it blocked. Ask the customer first." },
    ],
  },
  {
    id: "change-plan",
    title: "Change or cancel your plan",
    categoryId: "billing",
    summary: "Upgrades apply right away. Downgrades and cancellations take effect at the end of your billing period.",
    updated: "Aug 30, 2026",
    minutes: 2,
    popular: true,
    body: brief(
      "Upgrades apply right away and you're charged the difference for the rest of the period. Downgrades and cancellations take effect when the current period ends.",
      "Change your plan",
      ["Go to Settings → Plan & billing.", "Click Change plan and pick the new plan.", "Review the price change, then confirm."],
      "Cancelling keeps your data for 90 days, so you can come back without losing invoices or customers.",
    ),
  },
  {
    id: "invite-accountant",
    title: "Invite your accountant",
    categoryId: "start",
    summary: "Give your accountant read-only access to invoices, payouts and reports. It doesn't use a paid seat.",
    updated: "Sep 9, 2026",
    minutes: 1,
    popular: true,
    body: brief(
      "Accountants get read-only access to invoices, payouts and reports. The Accountant role is free and doesn't count towards your seats.",
      "Send the invite",
      ["Open Settings → Team.", "Click Invite and enter their email.", "Choose the Accountant role and send."],
    ),
  },
  {
    id: "first-invoice",
    title: "Create your first invoice",
    categoryId: "start",
    summary: "Add a customer, line items and a due date, then send it by email or share a link.",
    updated: "Jul 22, 2026",
    minutes: 3,
    body: brief(
      "An invoice needs a customer, at least one line item and a due date. Everything else is optional.",
      "Create and send",
      ["Click New → Invoice.", "Pick a customer or add a new one.", "Add line items, then set the due date.", "Click Send, or Copy link to share it yourself."],
    ),
  },
  {
    id: "vat",
    title: "Add VAT or sales tax to invoices",
    categoryId: "invoices",
    summary: "Save tax rates once and apply them per line item. Totals and tax summaries update automatically.",
    updated: "Oct 1, 2026",
    minutes: 2,
    body: brief(
      "Save each tax rate once, then apply it to any line item. Invoice totals and the tax summary update as you go.",
      "Add a tax rate",
      ["Go to Invoices → Settings → Taxes.", "Click Add rate, name it (for example “VAT 20%”) and enter the percentage.", "On any invoice, pick the rate from the Tax column."],
    ),
  },
  {
    id: "bank-feed",
    title: "Connect a bank feed",
    categoryId: "integrations",
    summary: "Match incoming payments to invoices automatically by connecting your business bank account.",
    updated: "Sep 17, 2026",
    minutes: 2,
    body: brief(
      "A bank feed brings in transactions every few hours so we can match them to open invoices for you.",
      "Connect your bank",
      ["Open Integrations → Bank feeds.", "Search for your bank and sign in through its secure page.", "Pick the accounts to sync. The first import covers 90 days."],
    ),
  },
  {
    id: "receipts",
    title: "Download receipts and tax invoices",
    categoryId: "billing",
    summary: "Every charge has a PDF receipt. You can also add your tax ID so it appears on them.",
    updated: "Aug 4, 2026",
    minutes: 1,
    body: brief(
      "Every charge for your plan has a receipt you can download as a PDF.",
      "Find a receipt",
      ["Go to Settings → Plan & billing.", "Scroll to Billing history.", "Click Download next to the charge."],
      "To show your tax ID on receipts, add it under Billing details. It applies to future receipts only.",
    ),
  },
  {
    id: "passkey",
    title: "Sign in with a passkey",
    categoryId: "security",
    summary: "Use your fingerprint, face or device PIN instead of a password.",
    updated: "Oct 20, 2026",
    minutes: 1,
    body: brief(
      "Passkeys let you sign in with your fingerprint, face or device PIN. They can't be phished or reused.",
      "Add a passkey",
      ["Go to Settings → Security.", "Under Passkeys, click Add passkey.", "Follow your device's prompt to confirm."],
    ),
  },
  {
    id: "accounting-sync",
    title: "Sync invoices to your accounting software",
    categoryId: "integrations",
    summary: "Invoices, payments and fees sync both ways, every 15 minutes.",
    updated: "Sep 25, 2026",
    minutes: 3,
    body: brief(
      "Once connected, invoices, payments and fees sync both ways every 15 minutes.",
      "Turn on sync",
      ["Open Integrations and choose your accounting tool.", "Sign in and approve access.", "Map your income and fee accounts, then click Start syncing."],
    ),
  },
  {
    id: "refund",
    title: "Issue a refund or credit note",
    categoryId: "invoices",
    summary: "Refund all or part of a payment. A credit note is created for your records automatically.",
    updated: "Oct 9, 2026",
    minutes: 2,
    body: brief(
      "You can refund all or part of a card payment. We create a matching credit note so your books stay balanced.",
      "Refund a payment",
      ["Open the paid invoice.", "Click Refund and enter the amount.", "Add a reason (the customer sees it) and confirm."],
      "Refunds take 5 to 10 business days to reach the customer's card.",
    ),
  },
  {
    id: "payout-account",
    title: "Update your payout bank account",
    categoryId: "payments",
    summary: "Change where payouts go. Pending payouts still go to the old account.",
    updated: "Sep 2, 2026",
    minutes: 1,
    body: brief(
      "You can change the bank account payouts go to at any time. Payouts already on their way still go to the old account.",
      "Change the account",
      ["Go to Settings → Payouts.", "Click Change next to your bank account.", "Enter the new details and confirm with your 2FA code."],
    ),
  },
];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function Mark({ text, query }: { text: string; query: string }) {
  const words = query.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 ? (
          <mark className="rounded-[3px] bg-warning/25 text-foreground" key={i}>
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function score(a: HelpArticle, query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const title = a.title.toLowerCase();
  const text = `${a.summary} ${a.body.map((b) => ("text" in b ? b.text : b.items.join(" "))).join(" ")}`.toLowerCase();
  let s = 0;
  for (const w of words) {
    if (title.includes(w)) s += 3;
    else if (text.includes(w)) s += 1;
    else return 0;
  }
  return s;
}

function search(articles: HelpArticle[], query: string) {
  return articles
    .map((a) => ({ a, s: score(a, query) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s)
    .map((x) => x.a);
}

type View =
  | { name: "home" }
  | { name: "category"; id: string }
  | { name: "results"; query: string }
  | { name: "article"; id: string };

function SearchBox({
  articles,
  categories,
  onOpen,
  onSearch,
  size,
  initial = "",
}: {
  articles: HelpArticle[];
  categories: HelpCategory[];
  onOpen: (id: string) => void;
  onSearch: (q: string) => void;
  size: "hero" | "compact";
  initial?: string;
}) {
  const [query, setQuery] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const reduce = useReducedMotionAfterMount();
  const results = search(articles, query).slice(0, 5);
  const showList = open && query.trim().length > 0;

  useEffect(() => setActive(-1), [query]);

  const commit = () => {
    if (active >= 0 && results[active]) onOpen(results[active].id);
    else if (query.trim()) onSearch(query.trim());
    setOpen(false);
  };

  const hero = size === "hero";

  return (
    <div
      className="relative w-full"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <div
        className={cn(
          "relative flex items-center rounded-xl border border-input bg-background text-foreground shadow-xs/5 transition-shadow has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/24 dark:bg-input/32",
          hero ? "h-12 @lg:h-13" : "h-9",
        )}
      >
        <SearchIcon className={cn("pointer-events-none absolute text-muted-foreground", hero ? "left-4 size-4.5" : "left-3 size-4")} />
        <input
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showList}
          aria-label="Search help articles"
          className={cn(
            "size-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground/72 [&::-webkit-search-cancel-button]:hidden",
            hero ? "ps-11 pe-11 text-base" : "ps-9 pe-8 text-sm",
          )}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(-1, a - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              if (showList) setOpen(false);
              else setQuery("");
            }
          }}
          placeholder={hero ? "Search for answers, e.g. “payout”" : "Search help"}
          role="combobox"
          type="search"
          value={query}
        />
        {query ? (
          <button
            aria-label="Clear search"
            className={cn("absolute flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", ring, hero ? "right-3" : "right-1")}
            onClick={() => setQuery("")}
            type="button"
          >
            <XIcon className="size-4" />
          </button>
        ) : (
          hero && <Kbd className="absolute right-4 hidden @lg:inline-flex">/</Kbd>
        )}
      </div>

      <AnimatePresence>
        {showList && (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute inset-x-0 top-full z-30 mt-2 origin-top overflow-hidden rounded-xl border bg-popover text-left text-popover-foreground shadow-lg/5"
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: easeOut }}
          >
            {results.length ? (
              <ul className="p-1.5" id={listId} role="listbox">
                {results.map((a, i) => {
                  const cat = categories.find((c) => c.id === a.categoryId);
                  return (
                    <li aria-selected={active === i} id={`${listId}-${i}`} key={a.id} role="option">
                      <button
                        className={cn("flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left", active === i ? "bg-accent" : "hover:bg-accent/60")}
                        onClick={() => {
                          onOpen(a.id);
                          setOpen(false);
                        }}
                        onMouseEnter={() => setActive(i)}
                        tabIndex={-1}
                        type="button"
                      >
                        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4", cat && toneTile[cat.tone])}>
                          {cat && icons[cat.icon]}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium text-sm">
                            <Mark query={query} text={a.title} />
                          </span>
                          <span className="truncate text-muted-foreground text-xs">{cat?.name}</span>
                        </span>
                        {active === i && <CornerDownLeftIcon className="size-3.5 shrink-0 text-muted-foreground" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex items-center gap-2.5 px-4 py-3.5 text-muted-foreground text-sm" id={listId} role="listbox">
                <SearchXIcon className="size-4" /> No articles match “{query.trim()}”
              </div>
            )}
            <button
              className="flex w-full cursor-pointer items-center justify-between gap-2 border-t px-4 py-2.5 text-muted-foreground text-xs hover:bg-accent/60 hover:text-foreground"
              onClick={() => {
                onSearch(query.trim());
                setOpen(false);
              }}
              tabIndex={-1}
              type="button"
            >
              <span className="truncate">
                See all results for “<span className="font-medium text-foreground">{query.trim()}</span>”
              </span>
              <Kbd>↵</Kbd>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ArticleRow({ article, category, query = "", onOpen }: { article: HelpArticle; category?: HelpCategory; query?: string; onOpen: () => void }) {
  return (
    <li>
      <button
        className={cn("group/row flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-accent/60", ring, press, "active:scale-[0.99]")}
        onClick={onOpen}
        type="button"
      >
        <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-medium">
            <Mark query={query} text={article.title} />
          </span>
          <span className="line-clamp-2 text-pretty text-muted-foreground text-xs leading-5">
            <Mark query={query} text={article.summary} />
          </span>
          {category && <span className="mt-1 text-muted-foreground text-xs">{category.name}</span>}
        </span>
        <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/60 transition-transform duration-150 ease-out [@media(hover:hover)]:group-hover/row:translate-x-0.5" />
      </button>
    </li>
  );
}

const reasons = ["Out of date", "Hard to follow", "Didn't fix my problem", "Something else"];

export function HelpCentre({
  className,
  productName = "Kite",
  categories = defaultCategories,
  articles = defaultArticles,
  popularSearches = ["payouts", "2FA", "refund", "VAT", "cancel plan"],
  replyTime = "4 min",
}: HelpCentreProps) {
  const reduce = useReducedMotionAfterMount();
  const [view, setView] = useState<View>({ name: "home" });
  const [feedback, setFeedback] = useState<Record<string, { vote: "up" | "down"; reason?: string; note?: string; sent?: boolean }>>({});
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const [contact, setContact] = useState<null | "form" | "sent">(null);
  const [contactTopic, setContactTopic] = useState("Payments & payouts");
  const [contactMsg, setContactMsg] = useState("");
  const [contactError, setContactError] = useState(false);
  const [heroKey, setHeroKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const msgRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (contact === "form") msgRef.current?.focus({ preventScroll: true });
  }, [contact]);

  const go = (v: View) => {
    setView(v);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const cat = (id: string) => categories.find((c) => c.id === id);
  const count = (id: string) => articles.filter((a) => a.categoryId === id).length;
  const article = view.name === "article" ? articles.find((a) => a.id === view.id) : undefined;
  const headings = article ? article.body.filter((b) => b.type === "h2").map((b) => (b as { text: string }).text) : [];

  useEffect(() => {
    const box = scrollRef.current;
    if (!box || !article) return;
    const onScroll = () => {
      const els = Array.from(box.querySelectorAll<HTMLElement>("[data-heading]"));
      const top = box.getBoundingClientRect().top + 96;
      let current: string | null = els[0]?.dataset.heading ?? null;
      for (const el of els) if (el.getBoundingClientRect().top <= top) current = el.dataset.heading ?? current;
      if (box.scrollTop + box.clientHeight >= box.scrollHeight - 4 && els.length) current = els[els.length - 1].dataset.heading ?? current;
      setActiveHeading(current);
    };
    onScroll();
    box.addEventListener("scroll", onScroll, { passive: true });
    return () => box.removeEventListener("scroll", onScroll);
  }, [article]);

  const jumpTo = (h: string) => {
    const box = scrollRef.current;
    const el = box?.querySelector<HTMLElement>(`[data-heading="${slug(h)}"]`);
    if (!box || !el) return;
    box.scrollTo({ top: el.offsetTop - 24, behavior: reduce ? "auto" : "smooth" });
  };

  const openContact = () => {
    setContact("form");
    setContactError(false);
    if (article) setContactTopic(cat(article.categoryId)?.name ?? contactTopic);
  };

  const crumbs = (items: { label: string; onClick?: () => void }[]) => {
    const parent = [...items].reverse().find((c) => c.onClick && c !== items[items.length - 1]);
    return (
    <>
    {parent && (
      <button
        className={cn("-ms-1 flex w-fit cursor-pointer items-center gap-0.5 rounded text-muted-foreground text-xs hover:text-foreground @lg:hidden", ring)}
        onClick={parent.onClick}
        type="button"
      >
        <ChevronLeftIcon className="size-4" /> {parent.label}
      </button>
    )}
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-muted-foreground text-xs @lg:flex">
      {items.map((c, i) => (
        <span className="flex min-w-0 items-center gap-1" key={c.label}>
          {i > 0 && <ChevronRightIcon className="size-3.5 shrink-0 opacity-60" />}
          {c.onClick ? (
            <button className={cn("cursor-pointer truncate rounded hover:text-foreground", ring)} onClick={c.onClick} type="button">
              {c.label}
            </button>
          ) : (
            <span aria-current="page" className="truncate text-foreground">
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
    </>
    );
  };

  const contactCard = (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs/5 @2xl:flex-row @2xl:items-center">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
        <LifeBuoyIcon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 className="font-heading font-semibold">Still stuck?</h2>
        <p className="text-pretty text-muted-foreground">
          Our support team replies in about <span className="font-medium text-foreground tabular-nums">{replyTime}</span> on weekdays.
        </p>
      </div>
      <div className="flex gap-2">
        <Button className={press} onClick={openContact}>
          <MessageCircleIcon /> Contact support
        </Button>
      </div>
    </section>
  );

  let body: ReactNode;
  if (view.name === "home") {
    const popular = articles.filter((a) => a.popular);
    body = (
      <>
        <section className="relative isolate overflow-visible border-b px-4 pt-12 pb-12 @2xl:pt-16 @2xl:pb-16">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_75%)]" />
            <div className="absolute -top-24 left-1/2 h-64 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-sky-400/15 blur-3xl dark:bg-sky-400/10" />
          </div>
          <div className="mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
            <h1 className="text-balance font-heading font-semibold text-2xl tracking-tight @2xl:text-3xl">How can we help?</h1>
            <SearchBox articles={articles} categories={categories} key={heroKey} onOpen={(id) => go({ name: "article", id })} onSearch={(q) => go({ name: "results", query: q })} size="hero" />
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Popular:</span>
              {popularSearches.map((p) => (
                <button
                  className={cn("h-7 cursor-pointer rounded-full border bg-background px-2.5 text-muted-foreground hover:border-foreground/20 hover:text-foreground dark:bg-input/32", ring, press)}
                  key={p}
                  onClick={() => go({ name: "results", query: p })}
                  type="button"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10 @2xl:px-8">
          <section aria-labelledby="hc-cats" className="flex flex-col gap-4">
            <h2 className="font-heading font-semibold text-base" id="hc-cats">
              Browse by topic
            </h2>
            <ul className="grid grid-cols-1 gap-3 @lg:grid-cols-2 @4xl:grid-cols-3">
              {categories.map((c, i) => (
                <motion.li
                  animate={{ opacity: 1, y: 0 }}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  key={c.id}
                  transition={{ duration: 0.25, ease: easeOut, delay: Math.min(i, 6) * 0.03 }}
                >
                  <button
                    className={cn(
                      "group/cat flex h-full w-full cursor-pointer items-start gap-3.5 rounded-2xl border bg-card p-4 text-left shadow-xs/5 hover:border-foreground/15 hover:bg-accent/40",
                      ring,
                      press,
                      "active:scale-[0.98]",
                    )}
                    onClick={() => go({ name: "category", id: c.id })}
                    type="button"
                  >
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5", toneTile[c.tone])}>{icons[c.icon]}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center justify-between gap-2 font-medium">
                        {c.name}
                        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground/0 transition-[color,translate] duration-150 ease-out [@media(hover:hover)]:group-hover/cat:translate-x-0.5 [@media(hover:hover)]:group-hover/cat:text-muted-foreground" />
                      </span>
                      <span className="text-pretty text-muted-foreground text-xs leading-5">{c.description}</span>
                      <span className="mt-1 text-muted-foreground text-xs tabular-nums">{count(c.id)} articles</span>
                    </span>
                  </button>
                </motion.li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="hc-popular" className="flex flex-col gap-2">
            <h2 className="font-heading font-semibold text-base" id="hc-popular">
              Popular articles
            </h2>
            <ul className="-mx-3 grid grid-cols-1 @3xl:grid-cols-2 @3xl:gap-x-4">
              {popular.map((a) => (
                <ArticleRow article={a} category={cat(a.categoryId)} key={a.id} onOpen={() => go({ name: "article", id: a.id })} />
              ))}
            </ul>
          </section>

          {contactCard}
        </div>
      </>
    );
  } else if (view.name === "category" || view.name === "results") {
    const c = view.name === "category" ? cat(view.id) : undefined;
    const list = view.name === "category" ? articles.filter((a) => a.categoryId === view.id) : search(articles, view.query);
    body = (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 @2xl:px-8">
        {crumbs([{ label: "Help Centre", onClick: () => go({ name: "home" }) }, { label: c ? c.name : "Search" }])}
        <div className="flex items-start gap-4">
          {c && <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl [&_svg]:size-6", toneTile[c.tone])}>{icons[c.icon]}</span>}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-balance font-heading font-semibold text-xl tracking-tight">
              {c ? c.name : view.name === "results" ? <>Results for “{view.query}”</> : null}
            </h1>
            <p className="text-pretty text-muted-foreground">
              {c ? c.description : `${list.length} ${list.length === 1 ? "article" : "articles"} found`}
            </p>
          </div>
        </div>
        {list.length ? (
          <ul className="-mx-3 flex flex-col">
            {list.map((a) => (
              <ArticleRow
                article={a}
                category={view.name === "results" ? cat(a.categoryId) : undefined}
                key={a.id}
                onOpen={() => go({ name: "article", id: a.id })}
                query={view.name === "results" ? view.query : ""}
              />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-12 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <SearchXIcon className="size-4.5" />
            </span>
            <div className="flex max-w-xs flex-col gap-1">
              <span className="font-medium">Nothing matched that</span>
              <span className="text-pretty text-muted-foreground text-xs">Try fewer or different words, or ask us directly. A person reads every message.</span>
            </div>
            <div className="flex gap-2">
              <Button className={press} onClick={() => go({ name: "home" })} size="sm" variant="outline">
                Browse topics
              </Button>
              <Button className={press} onClick={openContact} size="sm">
                Contact support
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  } else if (article) {
    const c = cat(article.categoryId);
    const fb = feedback[article.id];
    const related = articles.filter((a) => a.categoryId === article.categoryId && a.id !== article.id).slice(0, 3);
    let step = 0;
    body = (
      <div className="mx-auto flex w-full max-w-5xl gap-10 px-4 py-8 @2xl:px-8">
        <article className="flex min-w-0 max-w-2xl flex-1 flex-col" ref={articleRef}>
          {crumbs([
            { label: "Help Centre", onClick: () => go({ name: "home" }) },
            { label: c?.name ?? "", onClick: () => go({ name: "category", id: article.categoryId }) },
            { label: article.title },
          ])}
          <h1 className="mt-5 text-balance font-heading font-semibold text-2xl tracking-tight">{article.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
            <span>Updated {article.updated}</span>
            <span className="flex items-center gap-1 tabular-nums">
              <ClockIcon className="size-3.5" /> {article.minutes} min read
            </span>
          </p>

          <div className="mt-6 flex flex-col gap-4 leading-6">
            {article.body.map((b, i) => {
              if (b.type === "p") return <p className="text-pretty" key={i}>{b.text}</p>;
              if (b.type === "h2")
                return (
                  <h2 className="mt-4 scroll-mt-6 font-heading font-semibold text-lg tracking-tight" data-heading={slug(b.text)} id={`hc-${slug(b.text)}`} key={i}>
                    {b.text}
                  </h2>
                );
              if (b.type === "list")
                return (
                  <ul className="flex flex-col gap-2 ps-1" key={i}>
                    {b.items.map((it) => {
                      const [lead, ...rest] = it.split(": ");
                      return (
                        <li className="flex gap-3" key={it}>
                          <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-foreground/50" />
                          <span className="text-pretty">
                            {rest.length ? (
                              <>
                                <span className="font-medium">{lead}:</span> {rest.join(": ")}
                              </>
                            ) : (
                              it
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                );
              if (b.type === "steps") {
                step = 0;
                return (
                  <ol className="flex flex-col gap-3" key={i}>
                    {b.items.map((it) => {
                      step += 1;
                      return (
                        <li className="flex gap-3" key={it}>
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-xs tabular-nums">{step}</span>
                          <span className="text-pretty pt-px">{it}</span>
                        </li>
                      );
                    })}
                  </ol>
                );
              }
              return (
                <div
                  className={cn(
                    "flex gap-3 rounded-xl border p-3.5 text-sm",
                    b.tone === "info" ? "border-info/20 bg-info/6 dark:bg-info/10" : "border-warning/25 bg-warning/8 dark:bg-warning/10",
                  )}
                  key={i}
                  role="note"
                >
                  {b.tone === "info" ? (
                    <InfoIcon className="mt-0.5 size-4 shrink-0 text-info-foreground" />
                  ) : (
                    <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
                  )}
                  <p className="text-pretty">{b.text}</p>
                </div>
              );
            })}
          </div>

          <section aria-label="Article feedback" className="mt-10 rounded-2xl border bg-card p-4 shadow-xs/5 @lg:p-5">
            <AnimatePresence initial={false} mode="popLayout">
              {fb?.sent || fb?.vote === "up" ? (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                  key="thanks"
                  transition={{ duration: 0.2, ease: easeOut }}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/12 text-success-foreground">
                    <CheckIcon className="size-4" />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-medium">{fb.vote === "up" ? "Glad it helped." : "Thanks, we'll use this to fix the article."}</span>
                    <span className="text-muted-foreground text-xs">
                      {fb.vote === "up" ? "Your vote helps others find the right answer." : "The docs team reviews every note within a week."}
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className="flex flex-col gap-4"
                  exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
                  key="ask"
                  layout={reduce ? false : "size"}
                  transition={spring}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-medium">Was this article helpful?</span>
                    <div className="flex gap-2">
                      <Button
                        aria-pressed={false}
                        className={press}
                        onClick={() => setFeedback((f) => ({ ...f, [article.id]: { vote: "up" } }))}
                        size="sm"
                        variant="outline"
                      >
                        <ThumbsUpIcon /> Yes
                      </Button>
                      <Button
                        aria-pressed={fb?.vote === "down"}
                        className={cn(press, fb?.vote === "down" && "border-foreground/30 bg-accent")}
                        onClick={() => setFeedback((f) => ({ ...f, [article.id]: { vote: "down" } }))}
                        size="sm"
                        variant="outline"
                      >
                        <ThumbsDownIcon /> No
                      </Button>
                    </div>
                  </div>
                  {fb?.vote === "down" && (
                    <motion.form
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-3"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                      onSubmit={(e) => {
                        e.preventDefault();
                        setFeedback((f) => ({ ...f, [article.id]: { ...f[article.id], sent: true } }));
                      }}
                      transition={{ duration: 0.2, ease: easeOut }}
                    >
                      <fieldset className="flex flex-col gap-2">
                        <legend className="mb-2 text-muted-foreground text-xs">What went wrong?</legend>
                        <div className="flex flex-wrap gap-1.5">
                          {reasons.map((r) => {
                            const on = fb.reason === r;
                            return (
                              <button
                                aria-pressed={on}
                                className={cn(
                                  "h-8 cursor-pointer rounded-full border px-3 text-xs",
                                  ring,
                                  press,
                                  on ? "border-primary bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-accent dark:bg-input/32",
                                )}
                                key={r}
                                onClick={() => setFeedback((f) => ({ ...f, [article.id]: { ...f[article.id], reason: r } }))}
                                type="button"
                              >
                                {r}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                      <Textarea
                        aria-label="Tell us more (optional)"
                        onChange={(e) => setFeedback((f) => ({ ...f, [article.id]: { ...f[article.id], note: e.target.value } }))}
                        placeholder="Tell us more (optional)"
                        size="sm"
                        value={fb.note ?? ""}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button className={press} onClick={() => setFeedback((f) => {
                          const { [article.id]: _, ...rest } = f;
                          return rest;
                        })} size="sm" type="button" variant="ghost">
                          Cancel
                        </Button>
                        <Button className={press} disabled={!fb.reason} size="sm" type="submit">
                          Send feedback
                        </Button>
                      </div>
                    </motion.form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {related.length > 0 && (
            <section aria-labelledby="hc-related" className="mt-10 flex flex-col gap-2">
              <h2 className="font-heading font-semibold text-base" id="hc-related">
                Related articles
              </h2>
              <ul className="-mx-3 flex flex-col">
                {related.map((a) => (
                  <ArticleRow article={a} key={a.id} onOpen={() => go({ name: "article", id: a.id })} />
                ))}
              </ul>
            </section>
          )}

          <div className="mt-10">{contactCard}</div>
        </article>

        {headings.length > 1 && (
          <aside className="sticky top-8 hidden w-48 shrink-0 self-start @4xl:block">
            <h2 className="mb-2 font-medium text-muted-foreground text-xs">On this page</h2>
            <ul className="relative flex flex-col border-l">
              {headings.map((h) => {
                const on = activeHeading === slug(h);
                return (
                  <li className="relative" key={h}>
                    {on && (
                      <motion.span
                        className="absolute inset-y-1 -left-px w-0.5 rounded-full bg-foreground"
                        layoutId="hc-toc"
                        transition={reduce ? { duration: 0 } : spring}
                      />
                    )}
                    <button
                      className={cn(
                        "w-full cursor-pointer rounded-r-md py-1.5 ps-3 text-left text-xs leading-5 transition-colors",
                        ring,
                        on ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => jumpTo(h)}
                      type="button"
                    >
                      {h}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}
      </div>
    );
  }

  const viewKey = view.name === "article" ? `a-${view.id}` : view.name === "category" ? `c-${view.id}` : view.name === "results" ? `r-${view.query}` : "home";

  return (
    <div
      className={cn("@container relative isolate flex h-[760px] w-full flex-col overflow-hidden bg-background text-foreground text-sm", className)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && contact) setContact(null);
        const t = e.target as HTMLElement;
        if (e.key === "/" && !t.closest("input, textarea")) {
          e.preventDefault();
          (e.currentTarget.querySelector('input[role="combobox"]') as HTMLInputElement | null)?.focus();
        }
      }}
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 @2xl:px-6">
        <button
          className={cn("flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg", ring)}
          onClick={() => {
            go({ name: "home" });
            setHeroKey((k) => k + 1);
          }}
          type="button"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg aria-hidden className="size-4" fill="none" viewBox="0 0 16 16">
              <path d="M8 1.5 14 8l-6 6.5L2 8z" fill="currentColor" opacity=".9" />
              <path d="M8 1.5V14.5" stroke="var(--primary)" strokeWidth="1.2" />
            </svg>
          </span>
          <span className="font-heading font-semibold">{productName}</span>
          <span className="hidden text-muted-foreground @md:inline">Help Centre</span>
        </button>
        {view.name !== "home" && (
          <div className="ms-2 hidden w-full max-w-xs @3xl:block">
            <SearchBox
              articles={articles}
              categories={categories}
              initial={view.name === "results" ? view.query : ""}
              key={viewKey}
              onOpen={(id) => go({ name: "article", id })}
              onSearch={(q) => go({ name: "results", query: q })}
              size="compact"
            />
          </div>
        )}
        <div className="ms-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-muted-foreground text-xs @2xl:flex">
            <span className="size-1.5 rounded-full bg-success" /> All systems normal
          </span>
          {view.name !== "home" && (
            <Button aria-label="Search" className="@3xl:hidden" onClick={() => go({ name: "home" })} size="icon-sm" variant="ghost">
              <SearchIcon />
            </Button>
          )}
          <Button className={press} onClick={openContact} size="sm" variant="outline">
            <MailIcon /> <span className="hidden @md:inline">Contact us</span>
            <span className="@md:hidden">Contact</span>
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
          key={viewKey}
          transition={{ duration: 0.2, ease: easeOut }}
        >
          {body}
        </motion.div>
      </div>

      <AnimatePresence>
        {contact && (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              aria-hidden
              className="absolute inset-0 z-40 bg-black/32"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setContact(null)}
              transition={{ duration: 0.2, ease: easeOut }}
            />
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              aria-labelledby="hc-contact-title"
              aria-modal
              className="absolute inset-x-3 bottom-3 z-50 mx-auto flex max-w-md flex-col gap-4 rounded-2xl border bg-popover p-5 text-popover-foreground shadow-lg/10 @2xl:top-24 @2xl:bottom-auto"
              exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15, ease: easeOut } }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
              role="dialog"
              transition={{ duration: 0.22, ease: easeOut }}
            >
              <div className="flex items-start gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <h2 className="font-heading font-semibold text-base" id="hc-contact-title">
                    {contact === "sent" ? "Message sent" : "Contact support"}
                  </h2>
                  <p className="text-pretty text-muted-foreground text-xs">
                    {contact === "sent" ? "We've emailed you a copy. Replies land in your inbox." : `A real person replies, usually within ${replyTime}.`}
                  </p>
                </div>
                <Button aria-label="Close" className="-me-2 -mt-1" onClick={() => setContact(null)} size="icon-sm" variant="ghost">
                  <XIcon />
                </Button>
              </div>
              {contact === "sent" ? (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-3 rounded-xl bg-muted/60 px-4 py-6 text-center"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.22, ease: easeOut }}
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-success/12 text-success-foreground">
                    <CheckIcon className="size-5" />
                  </span>
                  <span className="font-medium">
                    Ticket <span className="font-mono">#48213</span> is open
                  </span>
                  <Button className={press} onClick={() => setContact(null)} size="sm" variant="outline">
                    Done
                  </Button>
                </motion.div>
              ) : (
                <form
                  className="flex flex-col gap-4"
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (contactMsg.trim().length < 10) {
                      setContactError(true);
                      msgRef.current?.focus();
                      return;
                    }
                    setContact("sent");
                    setContactMsg("");
                  }}
                >
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 font-medium text-xs">Topic</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map((c) => {
                        const on = contactTopic === c.name;
                        return (
                          <button
                            aria-pressed={on}
                            className={cn(
                              "h-8 cursor-pointer rounded-full border px-3 text-xs",
                              ring,
                              press,
                              on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent dark:bg-input/32",
                            )}
                            key={c.id}
                            onClick={() => setContactTopic(c.name)}
                            type="button"
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <label className="flex flex-col gap-2">
                    <span className="font-medium text-xs">How can we help?</span>
                    <Textarea
                      aria-describedby={contactError ? "hc-contact-err" : undefined}
                      aria-invalid={contactError || undefined}
                      onChange={(e) => {
                        setContactMsg(e.target.value);
                        if (contactError && e.target.value.trim().length >= 10) setContactError(false);
                      }}
                      placeholder="Describe what happened and what you expected. Include IDs like po_ or inv_ if you have them."
                      ref={msgRef}
                      value={contactMsg}
                    />
                    <AnimatePresence initial={false}>
                      {contactError && (
                        <motion.span
                          animate={{ opacity: 1, height: "auto" }}
                          className="overflow-hidden text-destructive-foreground text-xs"
                          exit={{ opacity: 0, height: 0 }}
                          id="hc-contact-err"
                          initial={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18, ease: easeOut }}
                        >
                          Add a few more words so we can help on the first reply.
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </label>
                  <div className="flex items-center gap-2">
                    <Input aria-label="Your email" className="flex-1" defaultValue="maya@larkfield.studio" type="email" />
                    <Button className={press} type="submit">
                      Send
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
