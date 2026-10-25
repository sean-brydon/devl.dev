"use client";

import {
  ArrowDownLeftIcon,
  CheckIcon,
  CreditCardIcon,
  GoalIcon,
  HomeIcon,
  LayoutGridIcon,
  type LucideIcon,
  MenuIcon,
  PiggyBankIcon,
  ReceiptTextIcon,
  RepeatIcon,
  SearchIcon,
  ShoppingBagIcon,
  ShoppingBasketIcon,
  TicketIcon,
  TramFrontIcon,
  UtensilsIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { type PointerEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

export type MoneyCategory = "groceries" | "dining" | "transport" | "shopping" | "home" | "fun" | "income";

export interface MoneyAccount {
  id: string;
  name: string;
  kind: "checking" | "savings" | "credit";
  mask: string;
  balance: number;
}

export interface MoneyTransaction {
  id: string;
  merchant: string;
  category: MoneyCategory;
  amount: number;
  accountId: string;
  date: string;
  time: string;
}

export interface MoneyBill {
  id: string;
  name: string;
  amount: number;
  due: string;
  category: MoneyCategory;
  autopay?: boolean;
}

export interface MoneyBudget {
  category: MoneyCategory;
  limit: number;
}

type MoneyView = "overview" | "transactions" | "bills" | "budgets";

export interface MoneyProps {
  className?: string;
  accounts?: MoneyAccount[];
  transactions?: MoneyTransaction[];
  bills?: MoneyBill[];
  budgets?: MoneyBudget[];
  today?: string;
  userName?: string;
  productName?: string;
}

const spring = { type: "spring", stiffness: 520, damping: 46, mass: 1 } as const;
const roll = { type: "spring", stiffness: 210, damping: 30, mass: 1 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;
const press = "transition-[color,background-color,box-shadow,scale,opacity] duration-150 ease-out active:scale-[0.97]";
const card = "rounded-2xl border bg-card shadow-xs/5";

const categories: Record<
  MoneyCategory,
  { label: string; icon: LucideIcon; tile: string; dot: string; stroke: string }
> = {
  groceries: {
    label: "Groceries",
    icon: ShoppingBasketIcon,
    tile: "bg-teal-500/12 text-teal-700 dark:bg-teal-400/14 dark:text-teal-300",
    dot: "bg-teal-500 dark:bg-teal-400",
    stroke: "stroke-teal-500 dark:stroke-teal-400",
  },
  dining: {
    label: "Eating out",
    icon: UtensilsIcon,
    tile: "bg-orange-500/12 text-orange-700 dark:bg-orange-400/14 dark:text-orange-300",
    dot: "bg-orange-500 dark:bg-orange-400",
    stroke: "stroke-orange-500 dark:stroke-orange-400",
  },
  transport: {
    label: "Transport",
    icon: TramFrontIcon,
    tile: "bg-sky-500/12 text-sky-700 dark:bg-sky-400/14 dark:text-sky-300",
    dot: "bg-sky-500 dark:bg-sky-400",
    stroke: "stroke-sky-500 dark:stroke-sky-400",
  },
  shopping: {
    label: "Shopping",
    icon: ShoppingBagIcon,
    tile: "bg-violet-500/12 text-violet-700 dark:bg-violet-400/14 dark:text-violet-300",
    dot: "bg-violet-500 dark:bg-violet-400",
    stroke: "stroke-violet-500 dark:stroke-violet-400",
  },
  home: {
    label: "Home & bills",
    icon: HomeIcon,
    tile: "bg-amber-500/14 text-amber-700 dark:bg-amber-400/14 dark:text-amber-300",
    dot: "bg-amber-500 dark:bg-amber-400",
    stroke: "stroke-amber-500 dark:stroke-amber-400",
  },
  fun: {
    label: "Going out",
    icon: TicketIcon,
    tile: "bg-rose-500/12 text-rose-700 dark:bg-rose-400/14 dark:text-rose-300",
    dot: "bg-rose-500 dark:bg-rose-400",
    stroke: "stroke-rose-500 dark:stroke-rose-400",
  },
  income: {
    label: "Income",
    icon: ArrowDownLeftIcon,
    tile: "bg-success/12 text-success-foreground dark:bg-success/16",
    dot: "bg-success",
    stroke: "stroke-success",
  },
};

const accountIcons: Record<MoneyAccount["kind"], LucideIcon> = {
  checking: WalletIcon,
  savings: PiggyBankIcon,
  credit: CreditCardIcon,
};

const defaultAccounts: MoneyAccount[] = [
  { id: "everyday", name: "Everyday", kind: "checking", mask: "4021", balance: 4218.4 },
  { id: "savings", name: "Rainy day", kind: "savings", mask: "7730", balance: 18650 },
  { id: "credit", name: "Credit card", kind: "credit", mask: "0915", balance: -1342.18 },
];

const t = (
  id: string,
  merchant: string,
  category: MoneyCategory,
  amount: number,
  date: string,
  time: string,
  accountId = "everyday",
): MoneyTransaction => ({ id, merchant, category, amount, date, time, accountId });

const defaultTransactions: MoneyTransaction[] = [
  t("t1", "Ridely", "transport", -14.2, "2026-10-24", "6:05 pm", "credit"),
  t("t2", "Greenleaf Market", "groceries", -64.18, "2026-10-24", "12:40 pm"),
  t("t3", "Nimbus Coffee", "dining", -6.4, "2026-10-24", "8:12 am"),
  t("t4", "Pho Saigon Kitchen", "dining", -38.5, "2026-10-23", "7:48 pm", "credit"),
  t("t5", "Atlas Books", "shopping", -27.99, "2026-10-23", "1:15 pm"),
  t("t6", "Metro Transit", "transport", -2.9, "2026-10-23", "8:31 am"),
  t("t7", "Brightline Studio", "income", 3240, "2026-10-22", "9:00 am"),
  t("t8", "Fieldstone Grocers", "groceries", -41.72, "2026-10-22", "5:52 pm"),
  t("t9", "Cinema Lumière", "fun", -26, "2026-10-22", "8:20 pm", "credit"),
  t("t10", "Marlowe's Diner", "dining", -41.3, "2026-10-21", "12:30 pm"),
  t("t11", "Harbor Hardware", "home", -48.35, "2026-10-20", "11:04 am"),
  t("t12", "Sunday Supper Club", "dining", -92, "2026-10-19", "8:45 pm", "credit"),
  t("t13", "Nimbus Coffee", "dining", -5.8, "2026-10-19", "9:10 am"),
  t("t14", "Greenleaf Market", "groceries", -88.04, "2026-10-18", "10:22 am"),
  t("t15", "Spinwell Cycles", "transport", -34, "2026-10-18", "3:40 pm"),
  t("t16", "Pinball Parlour", "fun", -18, "2026-10-18", "9:15 pm"),
  t("t17", "Greenleaf Market", "groceries", -72.3, "2026-10-15", "6:02 pm"),
  t("t18", "Tidewater Ramen", "dining", -44.1, "2026-10-15", "7:30 pm", "credit"),
  t("t19", "Fieldstone Grocers", "groceries", -59.66, "2026-10-12", "11:48 am"),
  t("t20", "Corner Bakehouse", "dining", -12.75, "2026-10-12", "8:55 am"),
  t("t21", "Kiln & Co.", "shopping", -64, "2026-10-12", "2:10 pm", "credit"),
  t("t22", "Brightline Studio", "income", 3240, "2026-10-08", "9:00 am"),
  t("t23", "Greenleaf Market", "groceries", -66.4, "2026-10-08", "5:35 pm"),
  t("t24", "Velvet Room", "dining", -58.2, "2026-10-08", "10:40 pm", "credit"),
  t("t25", "Ticketpost", "fun", -68, "2026-10-07", "1:02 pm", "credit"),
  t("t26", "Northgate Pharmacy", "shopping", -18.45, "2026-10-05", "4:18 pm"),
  t("t27", "Metro Transit", "transport", -12.9, "2026-10-05", "7:58 am"),
  t("t28", "Corner Bakehouse", "dining", -9.6, "2026-10-05", "9:20 am"),
  t("t29", "Fieldstone Grocers", "groceries", -39.85, "2026-10-02", "6:44 pm"),
  t("t30", "Habitat Living", "home", -1450, "2026-10-01", "7:00 am"),
];

const defaultBills: MoneyBill[] = [
  { id: "b1", name: "Northwind Energy", amount: 86.4, due: "2026-10-26", category: "home", autopay: true },
  { id: "b2", name: "Fernway Fiber", amount: 55, due: "2026-10-28", category: "home" },
  { id: "b3", name: "Reelhouse", amount: 12.99, due: "2026-10-30", category: "fun", autopay: true },
  { id: "b4", name: "Habitat Living", amount: 1450, due: "2026-11-01", category: "home" },
  { id: "b5", name: "Ironbridge Insurance", amount: 38.2, due: "2026-11-04", category: "home" },
];

const defaultBudgets: MoneyBudget[] = [
  { category: "groceries", limit: 600 },
  { category: "dining", limit: 300 },
  { category: "transport", limit: 150 },
  { category: "fun", limit: 200 },
];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const money = (n: number) => usd.format(n);
const money0 = (n: number) => usd0.format(Math.round(n));

function parseDate(iso: string) {
  return new Date(`${iso}T12:00:00`);
}
function daysBetween(a: string, b: string) {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000);
}
function initials(name: string) {
  const words = name.replace(/[^A-Za-zÀ-ÿ\s]/g, "").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

function seededNoise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function history(account: MoneyAccount, end: number, days = 30) {
  const seed = account.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const out = new Array<number>(days);
  let v = end;
  out[days - 1] = v;
  for (let i = days - 2; i >= 0; i--) {
    const daysAgo = days - 1 - i;
    let step: number;
    if (account.kind === "savings") step = (daysAgo === 15 ? 1000 : daysAgo === 1 ? 600 : 0) + 1 + seededNoise(seed + i) * 2;
    else if (account.kind === "credit") step = -(seededNoise(seed + i) * 70) + (daysAgo === 18 ? -900 : 0);
    else {
      step = -(seededNoise(seed + i) * 90 + 15);
      if (daysAgo === 2 || daysAgo === 16) step += 3240;
      if (daysAgo === 23) step -= 1450;
      if (daysAgo === 15) step -= 1000;
      if (daysAgo === 1) step -= 600;
    }
    v -= step;
    out[i] = v;
  }
  return out;
}

function Odometer({ value, format }: { value: number; format: (n: number) => string }) {
  const text = format(value);
  const chars = text.split("");
  return (
    <span className="inline-flex items-center tabular-nums leading-none">
      <span className="sr-only">{text}</span>
      {chars.map((ch, i) => {
        const key = chars.length - i;
        return /\d/.test(ch) ? (
          <Digit digit={Number(ch)} key={`d${key}`} />
        ) : (
          <span aria-hidden className="flex h-[1.15em] items-center" key={`c${key}${ch}`}>
            {ch}
          </span>
        );
      })}
    </span>
  );
}

function Digit({ digit }: { digit: number }) {
  const reduce = useReducedMotion();
  return (
    <span
      aria-hidden
      className="relative inline-flex h-[1.15em] items-center overflow-hidden [mask-image:linear-gradient(transparent,black_18%,black_82%,transparent)]"
    >
      <span className="invisible">0</span>
      <motion.span
        animate={{ y: `${-digit * 1.15}em` }}
        className="absolute inset-x-0 top-0 flex flex-col items-center"
        initial={false}
        transition={reduce ? { duration: 0 } : roll}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span className="flex h-[1.15em] items-center" key={n}>
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function Tween({ value, format = money }: { value: number; format?: (n: number) => string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, format);
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { type: "spring", stiffness: 160, damping: 26 });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

function MerchantTile({ merchant, category }: { merchant: string; category: MoneyCategory }) {
  const c = categories[category];
  const Icon = c.icon;
  return (
    <span className="relative shrink-0">
      <span
        aria-hidden
        className={cn("flex size-9 items-center justify-center rounded-xl font-semibold text-[11px] tracking-wide", c.tile)}
      >
        {initials(merchant)}
      </span>
      <span
        aria-hidden
        className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-card text-muted-foreground ring-2 ring-card"
      >
        <Icon className="size-2.5" />
      </span>
    </span>
  );
}

export function Money({
  className,
  accounts: initialAccounts = defaultAccounts,
  transactions: initialTransactions = defaultTransactions,
  bills = defaultBills,
  budgets = defaultBudgets,
  today = "2026-10-24",
  userName = "Ines Moreau",
  productName = "Tally",
}: MoneyProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [accountId, setAccountId] = useState<string>("all");
  const [focusCat, setFocusCat] = useState<MoneyCategory | null>(null);
  const [filterCat, setFilterCat] = useState<MoneyCategory | null>(null);
  const [query, setQuery] = useState("");
  const [billState, setBillState] = useState<Record<string, "paying" | "paid">>({});
  const [drawer, setDrawer] = useState(false);
  const [view, setView] = useState<MoneyView>("overview");
  const hasSwitchedView = useRef(false);
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const drawerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (drawer) drawerRef.current?.focus();
  }, [drawer]);

  const month = today.slice(0, 7);
  const monthName = parseDate(today).toLocaleDateString("en-US", { month: "long" });
  const monthEnd = new Date(parseDate(today).getFullYear(), parseDate(today).getMonth() + 1, 0).getDate();
  const daysLeft = monthEnd - parseDate(today).getDate();
  const firstName = userName.split(" ")[0];

  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const selected = accounts.find((a) => a.id === accountId);
  const shown = selected ? selected.balance : total;

  const series = useMemo(() => {
    const per = accounts.map((a) => {
      const start = initialAccounts.find((b) => b.id === a.id) ?? a;
      const h = history(start, start.balance);
      h[h.length - 1] = a.balance;
      return h;
    });
    if (selected) return per[accounts.indexOf(selected)];
    return per[0].map((_, i) => per.reduce((s, p) => s + p[i], 0));
  }, [accounts, selected, initialAccounts]);
  const since = shown - series[0];

  const monthTx = transactions.filter((x) => x.date.startsWith(month));
  const spendBy = (cat: MoneyCategory) =>
    monthTx.filter((x) => x.category === cat && x.amount < 0).reduce((s, x) => s - x.amount, 0);
  const spendCats = (Object.keys(categories) as MoneyCategory[])
    .filter((c) => c !== "income")
    .map((c) => ({ cat: c, value: spendBy(c) }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
  const spent = spendCats.reduce((s, c) => s + c.value, 0);
  const income = monthTx.filter((x) => x.amount > 0).reduce((s, x) => s + x.amount, 0);

  const openBills = bills.filter((b) => billState[b.id] !== "paid");
  const dueTotal = openBills.reduce((s, b) => s + b.amount, 0);

  const payBill = (bill: MoneyBill) => {
    if (billState[bill.id]) return;
    setBillState((s) => ({ ...s, [bill.id]: "paying" }));
    timers.current.push(
      setTimeout(() => {
        setBillState((s) => ({ ...s, [bill.id]: "paid" }));
        setAccounts((all) => all.map((a) => (a.kind === "checking" ? { ...a, balance: a.balance - bill.amount } : a)));
        const from = accounts.find((a) => a.kind === "checking")?.id ?? accounts[0]?.id ?? "";
        setTransactions((all) => [
          {
            id: `pay-${bill.id}`,
            merchant: bill.name,
            category: bill.category,
            amount: -bill.amount,
            accountId: from,
            date: today,
            time: "Just now",
          },
          ...all,
        ]);
      }, 700),
    );
  };

  const q = query.trim().toLowerCase();
  const visibleTx = transactions.filter(
    (x) =>
      (!filterCat || x.category === filterCat) &&
      (!selected || x.accountId === selected.id) &&
      (!q || x.merchant.toLowerCase().includes(q) || categories[x.category].label.toLowerCase().includes(q)),
  );
  const groups: { date: string; items: MoneyTransaction[] }[] = [];
  for (const x of visibleTx) {
    const g = groups.at(-1);
    if (g && g.date === x.date) g.items.push(x);
    else groups.push({ date: x.date, items: [x] });
  }
  const dayLabel = (iso: string) => {
    const d = daysBetween(iso, today);
    if (d === 0) return "Today";
    if (d === 1) return "Yesterday";
    return parseDate(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const scrollTo = (el: HTMLElement | null) => {
    const root = scrollRef.current;
    if (!root || !el) return;
    const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 16;
    root.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  };

  const go = (next: MoneyView) => {
    setDrawer(false);
    if (next === view) {
      scrollRef.current?.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      return;
    }
    hasSwitchedView.current = true;
    setView(next);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const pickCategory = (cat: MoneyCategory) => {
    setFilterCat((c) => (c === cat && view !== "budgets" ? null : cat));
    if (view === "budgets") {
      hasSwitchedView.current = true;
      setView("transactions");
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    } else if (view === "overview") scrollTo(listRef.current);
  };

  const nav: { id: MoneyView; label: string; icon: ReactNode; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: <LayoutGridIcon /> },
    { id: "transactions", label: "Transactions", icon: <ReceiptTextIcon /> },
    { id: "bills", label: "Bills", icon: <RepeatIcon />, badge: openBills.length || undefined },
    { id: "budgets", label: "Budgets", icon: <GoalIcon /> },
  ];
  const viewLabel = nav.find((n) => n.id === view)?.label ?? "Overview";

  const sidebar = (where: "rail" | "drawer") => (
    <div className="flex h-full flex-col gap-6 p-3">
      <div className="flex items-center gap-2.5 px-1.5 pt-1">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <PiggyBankIcon className="size-4" />
        </span>
        <span className="font-heading font-semibold">{productName}</span>
      </div>
      <nav aria-label="Main" className="isolate flex flex-col gap-0.5">
        {nav.map((n) => {
          const active = n.id === view;
          return (
            <button
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4 [&_svg]:opacity-80",
                press,
                active ? "font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
              key={n.id}
              onClick={() => go(n.id)}
              type="button"
            >
              {active && (
                <motion.span
                  className="absolute inset-0 -z-10 rounded-lg bg-accent"
                  layoutId={`${uid}-${where}-nav`}
                  transition={reduce ? { duration: 0 } : spring}
                />
              )}
              {n.icon}
              <span className="flex-1">{n.label}</span>
              {n.badge ? (
                <Badge className="tabular-nums" size="sm" variant="secondary">
                  {n.badge}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </nav>
      <div className="isolate flex flex-col gap-1">
        <span className="px-2.5 font-medium text-muted-foreground text-xs">Accounts</span>
        {accounts.map((a) => {
          const Icon = accountIcons[a.kind];
          const active = a.id === accountId;
          return (
            <button
              aria-pressed={active}
              className={cn(
                "relative flex h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                press,
                !active && "hover:bg-accent/60",
              )}
              key={a.id}
              onClick={() => {
                setAccountId(active ? "all" : a.id);
                setDrawer(false);
              }}
              type="button"
            >
              {active && (
                <motion.span
                  className="absolute inset-0 -z-10 rounded-lg bg-accent"
                  layoutId={`${uid}-${where}-account`}
                  transition={reduce ? { duration: 0 } : spring}
                />
              )}
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("truncate", active && "font-medium")}>{a.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">•• {a.mask}</span>
              </span>
              <span className={cn("text-xs", a.balance < 0 ? "text-muted-foreground" : "text-foreground")}>
                <Tween value={a.balance} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-auto flex items-center gap-2.5 rounded-xl border bg-card p-2.5">
        <Avatar className="[--avatar-size:--spacing(7)]">
          <AvatarFallback className="bg-teal-500/20 dark:bg-teal-400/20">{initials(userName)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-xs">{userName}</span>
          <span className="text-muted-foreground text-xs">Personal plan</span>
        </div>
      </div>
    </div>
  );

  const pills = [{ id: "all", name: "All accounts" }, ...accounts.map((a) => ({ id: a.id, name: a.name }))];

  const balanceSection = (
    <section aria-label="Balance" className={cn(card, "order-1 overflow-hidden")}>
      <div className="flex flex-col gap-4 p-4 pb-0 @lg:p-5 @lg:pb-0">
        <div
          aria-label="Account"
          className="-mx-4 isolate flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] @lg:-mx-5 @lg:px-5"
          role="group"
        >
          {pills.map((p) => {
            const active = p.id === accountId;
            return (
              <button
                aria-pressed={active}
                className={cn(
                  "relative h-7 shrink-0 cursor-pointer rounded-full px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  press,
                  active ? "font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                key={p.id}
                onClick={() => setAccountId(p.id)}
                type="button"
              >
                {active && (
                  <motion.span
                    className="absolute inset-0 -z-10 rounded-full bg-primary"
                    layoutId={`${uid}-pill`}
                    transition={reduce ? { duration: 0 } : spring}
                  />
                )}
                {p.name}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs">
              {selected ? (selected.kind === "credit" ? "Card balance" : `${selected.name} balance`) : "Total balance"}
            </span>
            <span className="font-heading font-semibold text-[2.5rem] tracking-tight @lg:text-5xl">
              <Odometer format={money} value={shown} />
            </span>
          </div>
          <Badge className="mb-1.5" size="lg" variant={since >= 0 ? "success" : "error"}>
            <Tween format={(n) => `${n >= 0 ? "+" : "−"}${money(Math.abs(n))}`} value={since} />
            <span className="font-normal opacity-80">in 30 days</span>
          </Badge>
        </div>
      </div>
      <BalanceChart series={series} today={today} />
    </section>
  );

  const spendingSection = (
    <section aria-labelledby={`${uid}-spend`} className={cn(card, "order-4 p-4 @lg:p-5")}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium" id={`${uid}-spend`}>
          Spending in {monthName}
        </h3>
        <span className="text-muted-foreground text-xs">Tap a category to filter</span>
      </div>
      <div className="mt-4 flex flex-col items-center gap-5 @lg:flex-row @lg:items-center @lg:gap-6">
        <Donut focus={focusCat ?? filterCat} onFocus={setFocusCat} onPick={pickCategory} parts={spendCats} total={spent} />
        <ul className="flex w-full min-w-0 flex-1 flex-col gap-0.5">
          {spendCats.map((s) => {
            const c = categories[s.cat];
            const active = filterCat === s.cat;
            return (
              <li key={s.cat}>
                <button
                  aria-pressed={active}
                  className={cn(
                    "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    press,
                    active ? "bg-accent" : "hover:bg-accent/60",
                  )}
                  onBlur={() => setFocusCat(null)}
                  onClick={() => pickCategory(s.cat)}
                  onFocus={() => setFocusCat(s.cat)}
                  onPointerEnter={() => setFocusCat(s.cat)}
                  onPointerLeave={() => setFocusCat(null)}
                  type="button"
                >
                  <span className={cn("size-2 shrink-0 rounded-full", c.dot)} />
                  <span className="flex-1 truncate">{c.label}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">{Math.round((s.value / spent) * 100)}%</span>
                  <span className="w-[4.75rem] text-right font-medium tabular-nums">
                    <Tween value={s.value} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );

  const txSection = (
    <section aria-labelledby={`${uid}-tx`} className={cn(card, "order-5 overflow-hidden")} ref={listRef}>
      <div className="flex flex-col gap-3 border-b p-4 @lg:flex-row @lg:items-center @lg:px-5">
        <div className="flex flex-1 items-center gap-2">
          <h3 className="font-medium" id={`${uid}-tx`}>
            Transactions
          </h3>
          <AnimatePresence initial={false}>
            {filterCat && (
              <motion.button
                animate={{ opacity: 1, scale: 1 }}
                aria-label={`Remove ${categories[filterCat].label} filter`}
                className={cn(
                  "relative flex h-6 cursor-pointer items-center gap-1.5 rounded-full border bg-background ps-2 pe-1.5 text-xs outline-none after:absolute after:-inset-y-1.5 after:inset-x-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring",
                  press,
                )}
                exit={{ opacity: 0, scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.95 }}
                onClick={() => setFilterCat(null)}
                transition={{ duration: 0.15, ease: easeOut }}
                type="button"
              >
                <span className={cn("size-1.5 rounded-full", categories[filterCat].dot)} />
                {categories[filterCat].label}
                <XIcon className="size-3 text-muted-foreground" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <InputGroup className="@lg:w-56">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search transactions"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search merchants"
            type="search"
            value={query}
          />
        </InputGroup>
      </div>
      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchIcon className="size-4" />
          </span>
          <p className="font-medium">Nothing matches</p>
          <p className="text-muted-foreground">Try another merchant, or clear the filter.</p>
          <Button
            className={cn("mt-1", press)}
            onClick={() => {
              setQuery("");
              setFilterCat(null);
            }}
            size="sm"
            variant="outline"
          >
            Clear search
          </Button>
        </div>
      ) : (
        <div className="flex flex-col pb-2">
          {groups.map((g) => {
            const net = g.items.reduce((s, x) => s + x.amount, 0);
            return (
              <div key={g.date}>
                <div className="flex items-center justify-between px-4 pt-4 pb-1.5 text-muted-foreground text-xs @lg:px-5">
                  <span className="font-medium">{dayLabel(g.date)}</span>
                  <span className="tabular-nums">
                    {net > 0 ? "+" : "−"}
                    {money(Math.abs(net))}
                  </span>
                </div>
                <ul>
                  <AnimatePresence initial={false}>
                    {g.items.map((x) => {
                      const acct = accounts.find((a) => a.id === x.accountId);
                      return (
                        <motion.li
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 px-4 py-2 @lg:px-5"
                          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                          key={x.id}
                          layout={reduce ? false : "position"}
                          transition={spring}
                        >
                          <MerchantTile category={x.category} merchant={x.merchant} />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate font-medium">{x.merchant}</span>
                            <span className="truncate text-muted-foreground text-xs">
                              {categories[x.category].label} · {acct?.name ?? "Account"} · {x.time}
                            </span>
                          </div>
                          <span className={cn("shrink-0 font-medium tabular-nums", x.amount > 0 && "text-success-foreground")}>
                            {x.amount > 0 ? "+" : "−"}
                            {money(Math.abs(x.amount))}
                          </span>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  const budgetsSection = (
    <section aria-labelledby={`${uid}-budgets`} className={cn(card, "order-2 p-4 @lg:p-5")}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium" id={`${uid}-budgets`}>
          Budgets
        </h3>
        <span className="text-muted-foreground text-xs">{daysLeft} days to go</span>
      </div>
      <div
        className={cn(
          "mt-3 grid grid-cols-2 gap-1 @xl:grid-cols-4",
          view === "overview" && "@5xl:grid-cols-2",
        )}
      >
        {budgets.map((b) => (
          <BudgetRing
            category={b.category}
            key={b.category}
            limit={b.limit}
            onPick={() => pickCategory(b.category)}
            spent={spendBy(b.category)}
          />
        ))}
      </div>
    </section>
  );

  const billsSection = (
    <section aria-labelledby={`${uid}-bills`} className={cn(card, "order-3 overflow-hidden")}>
      <div className="flex items-baseline justify-between gap-3 p-4 pb-2 @lg:px-5 @lg:pt-5">
        <h3 className="font-medium" id={`${uid}-bills`}>
          Upcoming bills
        </h3>
        <span className="text-muted-foreground text-xs">
          {openBills.length ? (
            <>
              <span className="text-foreground">
                <Tween value={dueTotal} />
              </span>{" "}
              due
            </>
          ) : (
            "All paid"
          )}
        </span>
      </div>
      <ul className="flex flex-col pb-2">
        {bills.map((b) => {
          const state = billState[b.id];
          const d = daysBetween(today, b.due);
          const due = parseDate(b.due);
          return (
            <li
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 transition-opacity duration-200 @lg:px-5",
                state === "paid" && "opacity-60",
              )}
              key={b.id}
            >
              <span className="flex w-10 shrink-0 flex-col items-center rounded-lg border bg-background py-1 leading-none">
                <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                  {due.toLocaleDateString("en-US", { month: "short" })}
                </span>
                <span className="mt-1 font-semibold tabular-nums">{due.getDate()}</span>
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{b.name}</span>
                <span className="flex items-center gap-1 truncate text-muted-foreground text-xs">
                  <span className={cn(d <= 2 && state !== "paid" && "text-warning-foreground")}>
                    {state === "paid" ? "Paid today" : d === 0 ? "Due today" : d === 1 ? "Tomorrow" : `In ${d} days`}
                  </span>
                  {b.autopay && state !== "paid" && (
                    <>
                      <span aria-hidden>·</span>
                      <RepeatIcon aria-hidden className="size-3" /> Autopay
                    </>
                  )}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-medium tabular-nums">{money(b.amount)}</span>
                <PayButton name={b.name} onPay={() => payBill(b)} state={state} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <div
      className={cn(
        "@container relative isolate flex h-[760px] w-full overflow-hidden bg-background text-foreground text-sm",
        className,
      )}
      onKeyDown={(e) => {
        if (e.key === "Escape" && drawer) setDrawer(false);
      }}
    >
      <aside className="hidden w-60 shrink-0 border-r bg-muted/40 @4xl:block">{sidebar("rail")}</aside>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              aria-hidden
              className="absolute inset-0 z-40 bg-black/32 @4xl:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="backdrop"
              onClick={() => setDrawer(false)}
              transition={{ duration: 0.2, ease: easeOut }}
            />
            <motion.div
              animate={{ x: 0 }}
              aria-label="Navigation"
              aria-modal
              className="absolute inset-y-0 left-0 z-50 w-72 max-w-[85%] border-r bg-background outline-none @4xl:hidden"
              exit={{ x: "-100%" }}
              initial={{ x: "-100%" }}
              key="drawer"
              ref={drawerRef}
              role="dialog"
              tabIndex={-1}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 42 }}
            >
              <Button
                aria-label="Close navigation"
                className="absolute top-3 right-3"
                onClick={() => setDrawer(false)}
                size="icon-sm"
                variant="ghost"
              >
                <XIcon />
              </Button>
              {sidebar("drawer")}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 @4xl:hidden">
          <Button aria-label="Open navigation" onClick={() => setDrawer(true)} size="icon-sm" variant="ghost">
            <MenuIcon />
          </Button>
          <span className="font-heading font-semibold">{productName}</span>
          <span className="truncate text-muted-foreground">/ {viewLabel}</span>
          <Avatar className="ms-auto [--avatar-size:--spacing(7)]">
            <AvatarFallback className="bg-teal-500/20 text-xs dark:bg-teal-400/20">{initials(userName)}</AvatarFallback>
          </Avatar>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
          <motion.div
            animate={{ opacity: 1 }}
            className="flex flex-col gap-5 px-4 pt-5 pb-10 @4xl:px-6 @4xl:pt-6"
            initial={hasSwitchedView.current && !reduce ? { opacity: 0 } : false}
            key={view}
            transition={{ duration: 0.15, ease: easeOut }}
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-balance font-heading font-semibold text-xl tracking-tight">
                {view === "overview" ? `Evening, ${firstName}` : viewLabel}
              </h2>
              <p className="text-pretty text-muted-foreground">
                {view === "bills" ? (
                  <>
                    {openBills.length
                      ? `${openBills.length} ${openBills.length === 1 ? "bill" : "bills"} due in the next two weeks.`
                      : "Nothing left to pay this cycle."}
                  </>
                ) : view === "transactions" ? (
                  <>
                    {visibleTx.length} {visibleTx.length === 1 ? "transaction" : "transactions"}
                    {selected ? ` on ${selected.name}` : " across all accounts"}.
                  </>
                ) : (
                  <>
                    {daysLeft} days left in {monthName}. You’ve spent{" "}
                    <span className="text-foreground">
                      <Tween format={money0} value={spent} />
                    </span>{" "}
                    and brought in{" "}
                    <span className="text-foreground">
                      <Tween format={money0} value={income} />
                    </span>
                    .
                  </>
                )}
              </p>
            </div>

            {view === "overview" ? (
              <div className="flex flex-col gap-4 @5xl:grid @5xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)] @5xl:items-start @5xl:gap-5">
                <div className="contents @5xl:flex @5xl:flex-col @5xl:gap-5">
                  {balanceSection}
                  {spendingSection}
                  {txSection}
                </div>
                <div className="contents @5xl:flex @5xl:flex-col @5xl:gap-5">
                  {budgetsSection}
                  {billsSection}
                </div>
              </div>
            ) : view === "transactions" ? (
              <div className="flex max-w-3xl flex-col gap-4">{txSection}</div>
            ) : view === "bills" ? (
              <div className="flex max-w-xl flex-col gap-4">{billsSection}</div>
            ) : (
              <div className="flex max-w-3xl flex-col gap-4">
                {budgetsSection}
                {spendingSection}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
function PayButton({ state, onPay, name }: { state?: "paying" | "paid"; onPay: () => void; name: string }) {
  const reduce = useReducedMotion();
  return (
    <button
      aria-label={state === "paid" ? `${name} paid` : `Pay ${name}`}
      className={cn(
        "relative -my-1 flex h-6 min-w-12 cursor-pointer items-center justify-center overflow-hidden rounded-full px-2 font-medium text-xs outline-none after:absolute after:-inset-x-1 after:-inset-y-2 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
        press,
        state === "paid"
          ? "text-success-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      )}
      disabled={Boolean(state)}
      onClick={onPay}
      type="button"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          className="flex items-center gap-1"
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(2px)" }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(2px)" }}
          key={state ?? "idle"}
          transition={{ duration: 0.18, ease: easeOut }}
        >
          {state === "paid" ? (
            <>
              <CheckIcon className="size-3" /> Paid
            </>
          ) : state === "paying" ? (
            <span aria-hidden className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
                  className="size-1 rounded-full bg-current"
                  key={i}
                  transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY, delay: i * 0.12, ease: "linear" }}
                />
              ))}
            </span>
          ) : (
            "Pay"
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function BalanceChart({ series, today }: { series: number[]; today: string }) {
  const reduce = useReducedMotion();
  const gid = `bal-${useId().replace(/:/g, "")}`;
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = 120;
  const pad = 8;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const x = (i: number) => (i / (series.length - 1)) * W;
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);
  const line = series.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, i)));
  };
  const dateFor = (i: number) => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - (series.length - 1 - i));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const morph = reduce ? { duration: 0 } : { duration: 0.45, ease: easeOut };
  const hi = hover ?? null;

  return (
    <div className="relative mt-3 h-32 text-foreground">
      <svg
        aria-label="Balance over the last 30 days"
        className="absolute inset-0 size-full touch-pan-y overflow-visible"
        onPointerLeave={() => setHover(null)}
        onPointerMove={onMove}
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${W} ${H}`}
      >
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path animate={{ d: area }} fill={`url(#${gid})`} initial={false} transition={morph} />
        <motion.path
          animate={{ d: line }}
          fill="none"
          initial={false}
          stroke="currentColor"
          strokeLinejoin="round"
          strokeOpacity={0.8}
          strokeWidth={1.75}
          transition={morph}
          vectorEffect="non-scaling-stroke"
        />
        {hi !== null && (
          <line
            stroke="currentColor"
            strokeDasharray="3 3"
            strokeOpacity={0.3}
            vectorEffect="non-scaling-stroke"
            x1={x(hi)}
            x2={x(hi)}
            y1={0}
            y2={H}
          />
        )}
      </svg>
      {hi !== null && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-card"
            style={{ left: `${(hi / (series.length - 1)) * 100}%`, top: `${(y(series[hi]) / H) * 100}%` }}
          />
          <span
            className="pointer-events-none absolute top-1 rounded-md border bg-popover px-2 py-1 text-xs shadow-xs/5"
            style={{
              left: `clamp(0.5rem, calc(${(hi / (series.length - 1)) * 100}% - 3.5rem), calc(100% - 7.5rem))`,
            }}
          >
            <span className="text-muted-foreground">{dateFor(hi)}</span>{" "}
            <span className="font-medium tabular-nums">{money(series[hi])}</span>
          </span>
        </>
      )}
    </div>
  );
}

function Donut({
  parts,
  total,
  focus,
  onFocus,
  onPick,
}: {
  parts: { cat: MoneyCategory; value: number }[];
  total: number;
  focus: MoneyCategory | null;
  onFocus: (c: MoneyCategory | null) => void;
  onPick: (c: MoneyCategory) => void;
}) {
  const reduce = useReducedMotion();
  const gap = 1.4;
  let start = 0;
  const focused = parts.find((p) => p.cat === focus);
  return (
    <div className="relative size-40 shrink-0">
      <svg aria-hidden className="size-full -rotate-90" viewBox="0 0 120 120">
        <circle className="stroke-muted" cx="60" cy="60" fill="none" r="48" strokeWidth="14" />
        {parts.map((p) => {
          const pct = (p.value / (total || 1)) * 100;
          const dash = Math.max(pct - gap, 0.5);
          const offset = -start;
          start += pct;
          return (
            <motion.circle
              animate={{ strokeDasharray: `${dash} ${100 - dash}`, strokeDashoffset: offset, opacity: !focus || focus === p.cat ? 1 : 0.3 }}
              className={cn("cursor-pointer", categories[p.cat].stroke)}
              cx="60"
              cy="60"
              fill="none"
              initial={false}
              key={p.cat}
              onClick={() => onPick(p.cat)}
              onPointerEnter={() => onFocus(p.cat)}
              onPointerLeave={() => onFocus(null)}
              pathLength={100}
              r="48"
              strokeWidth="14"
              style={{ pointerEvents: "stroke" }}
              transition={reduce ? { duration: 0 } : { duration: 0.35, ease: easeOut }}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-muted-foreground text-xs">{focused ? categories[focused.cat].label : "Spent"}</span>
        <span className="font-heading font-semibold text-lg tracking-tight">
          <Tween format={money0} value={focused ? focused.value : total} />
        </span>
      </div>
    </div>
  );
}

function BudgetRing({
  category,
  spent,
  limit,
  onPick,
}: {
  category: MoneyCategory;
  spent: number;
  limit: number;
  onPick: () => void;
}) {
  const reduce = useReducedMotion();
  const c = categories[category];
  const ratio = spent / limit;
  const over = ratio > 1;
  const left = limit - spent;
  return (
    <button
      aria-label={`${c.label}: ${money0(spent)} of ${money0(limit)}${over ? `, ${money0(-left)} over` : `, ${money0(left)} left`}`}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-2.5 rounded-xl px-2 py-3 text-center outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring",
        press,
      )}
      onClick={onPick}
      type="button"
    >
      <span className="relative size-16 shrink-0">
        <svg aria-hidden className="size-full -rotate-90" viewBox="0 0 64 64">
          <circle className="stroke-muted" cx="32" cy="32" fill="none" r="27" strokeWidth="6" />
          <motion.circle
            animate={{ pathLength: Math.min(ratio, 1) }}
            className={over ? "stroke-destructive" : c.stroke}
            cx="32"
            cy="32"
            fill="none"
            initial={false}
            r="27"
            strokeLinecap="round"
            strokeWidth="6"
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 24 }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center">
          <c.icon aria-hidden className={cn("size-5", over ? "text-destructive-foreground" : "text-muted-foreground")} />
        </span>
      </span>
      <span className="flex min-w-0 flex-col items-center gap-0.5">
        <span className="truncate text-muted-foreground text-xs">{c.label}</span>
        <span className="font-medium tabular-nums">
          <Tween format={money0} value={spent} />
          <span className="font-normal text-muted-foreground"> / {money0(limit)}</span>
        </span>
        <span className={cn("text-xs tabular-nums", over ? "text-destructive-foreground" : "text-muted-foreground")}>
          {over ? `${money0(-left)} over` : `${money0(left)} left`}
        </span>
      </span>
    </button>
  );
}
