"use client";

import { EyeIcon, EyeOffIcon, TimerIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const COMMON = [
  "password", "qwerty", "letmein", "welcome", "admin", "iloveyou", "monkey", "dragon", "football", "baseball",
  "sunshine", "princess", "summer", "winter", "autumn", "spring", "shadow", "master", "hello", "freedom",
  "whatever", "trustno1", "starwars", "login", "secret", "superman", "batman", "michael", "jordan", "charlie",
  "computer", "internet", "cookie", "pepper", "ginger", "orange", "banana", "chelsea", "liverpool", "arsenal",
  "soccer", "hockey", "flower", "purple", "silver", "golden", "abc123", "123456", "passw0rd", "changeme",
];
const RUNS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "abcdefghijklmnopqrstuvwxyz", "01234567890"];
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

export interface Analysis {
  score: 0 | 1 | 2 | 3 | 4;
  bits: number;
  reason: string;
  crackTime: string;
  checks: { id: string; label: string; met: boolean }[];
}

const OFFLINE_GUESSES_PER_SECOND = 1e10;

const humanTime = (seconds: number) => {
  if (seconds < 1) return "instantly";
  const units: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [30, "day"],
    [12, "month"],
    [100, "year"],
  ];
  let v = seconds;
  for (const [size, name] of units) {
    if (v < size) return `about ${Math.max(1, Math.round(v))} ${name}${Math.round(v) === 1 ? "" : "s"}`;
    v /= size;
  }
  return v < 1000 ? `about ${Math.round(v)} centuries` : "forever";
};

export function analysePassword(pw: string, minLength = 12): Analysis {
  const lower = /[a-z]/.test(pw);
  const upper = /[A-Z]/.test(pw);
  const digit = /\d/.test(pw);
  const symbol = /[^a-zA-Z0-9]/.test(pw);
  const pool = (lower ? 26 : 0) + (upper ? 26 : 0) + (digit ? 10 : 0) + (symbol ? 33 : 0) || 1;
  const perChar = Math.log2(pool);
  let bits = pw.length * perChar;
  const found: string[] = [];

  const plain = pw.toLowerCase().replace(/[013457@$!]/g, (c) => LEET[c] ?? c);
  const lowerPw = pw.toLowerCase();
  const exact = COMMON.includes(plain) || COMMON.includes(lowerPw);
  let word = exact ? undefined : COMMON.filter((w) => w.length >= 4 && plain.includes(w)).sort((a, b) => b.length - a.length)[0];
  let run = exact
    ? undefined
    : RUNS.flatMap((r) => [10, 9, 8, 7, 6, 5, 4].flatMap((len) => [...Array(Math.max(r.length - len + 1, 0))].map((_, i) => r.slice(i, i + len))))
        .sort((a, b) => b.length - a.length)
        .find((r) => lowerPw.includes(r));
  if (word && run) {
    const w = plain.indexOf(word);
    const r = lowerPw.indexOf(run);
    if (w < r + run.length && r < w + word.length) {
      if (run.length > word.length) word = undefined;
      else run = undefined;
    }
  }
  if (word) {
    bits -= word.length * perChar - 12;
    found.push(`it's built on the common word “${word}”`);
  }
  const year = pw.match(/(19|20)\d{2}/);
  if (year) {
    bits -= 4 * perChar - 7;
    found.push(`it has a year in it (${year[0]})`);
  }
  if (run) {
    bits -= run.length * perChar - 5;
    found.push(`“${run}” is a keyboard run`);
  }
  const repeat = pw.match(/(.)\1{2,}/);
  if (repeat) {
    bits -= (repeat[0].length - 1) * perChar;
    found.push(`it repeats “${repeat[1]}”`);
  }
  if (exact) bits = Math.min(bits, 8);
  bits = Math.max(0, bits);

  const score = (bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4) as Analysis["score"];
  const checks = [
    { id: "length", label: `${minLength}+ characters`, met: pw.length >= minLength },
    { id: "case", label: "Upper & lower case", met: lower && upper },
    { id: "mix", label: "Number or symbol", met: digit || symbol },
    { id: "pattern", label: "No common patterns", met: pw.length > 0 && !exact && found.length === 0 },
  ];

  let reason: string;
  if (!pw) reason = `Use ${minLength} or more characters. A short, odd phrase is easier to remember than symbols.`;
  else if (exact) reason = "That's one of the first passwords anyone would try.";
  else {
    const size =
      pw.length < 8
        ? `${pw.length} characters is very short`
        : pw.length < minLength
          ? `${pw.length} characters is on the short side`
          : pw.length >= 20
            ? "Lovely and long"
            : "Good length";
    if (found.length) {
      const joiner = pw.length >= minLength ? ", but " : ", and ";
      reason = `${size}${joiner}${found.slice(0, 2).join(" and ")}.`;
    } else if (score >= 3) {
      reason = `${size}, with no patterns an attacker would try first.`;
    } else {
      const missing = !upper || !lower ? "mixing upper and lower case" : !digit && !symbol ? "a number or symbol" : "a few more characters";
      reason = `${size}. ${pw.length < minLength ? "A few more characters" : `Try ${missing}`} would help most.`;
    }
  }

  const crackTime = humanTime(2 ** bits / 2 / OFFLINE_GUESSES_PER_SECOND);
  return { score, bits, reason, crackTime, checks };
}

const LEVELS = [
  { label: "Very weak", bar: "bg-destructive", text: "text-destructive-foreground" },
  { label: "Weak", bar: "bg-destructive", text: "text-destructive-foreground" },
  { label: "Fair", bar: "bg-warning", text: "text-warning-foreground" },
  { label: "Good", bar: "bg-success", text: "text-success-foreground" },
  { label: "Strong", bar: "bg-success", text: "text-success-foreground" },
];

export interface PasswordStrengthProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, analysis: Analysis) => void;
  label?: string;
  minLength?: number;
  name?: string;
  autoComplete?: string;
  className?: string;
}

export function PasswordStrength({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  label = "Password",
  minLength = 12,
  name,
  autoComplete = "new-password",
  className,
}: PasswordStrengthProps) {
  const [inner, setInner] = useState(defaultValue);
  const value = valueProp ?? inner;
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();
  const id = useId();
  const analysis = useMemo(() => analysePassword(value, minLength), [value, minLength]);
  const level = LEVELS[analysis.score];
  const fill = value ? Math.min(Math.max(analysis.bits / 90, 0.06), 1) : 0;

  return (
    <div className={cn("grid w-full gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <label className="font-medium text-sm" htmlFor={id}>
          {label}
        </label>
        <span aria-live="polite" className={cn("font-medium text-xs transition-colors duration-200", value ? level.text : "text-muted-foreground")}>
          {value ? level.label : `${minLength}+ characters`}
        </span>
      </div>
      <div className="relative flex rounded-lg border border-input bg-background not-dark:bg-clip-padding shadow-xs/5 ring-ring/24 transition-shadow has-focus-visible:border-ring has-focus-visible:ring-[3px] dark:bg-input/32">
        <input
          aria-describedby={`${id}-reason`}
          autoComplete={autoComplete}
          className="h-9 w-0 min-w-0 flex-1 bg-transparent pr-1 pl-3 text-base outline-none placeholder:text-muted-foreground/72 sm:text-sm"
          id={id}
          name={name}
          onChange={(event) => {
            const next = event.target.value;
            if (valueProp === undefined) setInner(next);
            onValueChange?.(next, analysePassword(next, minLength));
          }}
          placeholder="Something only you would think of"
          spellCheck={false}
          type={visible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="mr-0.5 flex w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setVisible((v) => !v)}
          type="button"
        >
          {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </button>
      </div>

      <div className="relative h-1.5 overflow-hidden rounded-full bg-input">
        <motion.div
          animate={{ scaleX: fill }}
          className={cn("absolute inset-0 origin-left rounded-full transition-colors duration-300", level.bar)}
          initial={false}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
        />
      </div>

      <div className="grid min-h-17 content-start gap-1" id={`${id}-reason`}>
        <p className={cn("text-pretty text-xs", value ? "text-foreground" : "text-muted-foreground")}>{analysis.reason}</p>
        {value && (
          <p className="flex items-center gap-1 text-muted-foreground text-xs">
            <TimerIcon className="size-3.5 shrink-0" />
            <span className="truncate tabular-nums">
              {analysis.crackTime === "instantly"
                ? "Cracked instantly"
                : analysis.crackTime === "forever"
                  ? "Would outlast the sun to crack"
                  : `Takes ${analysis.crackTime} to crack`}
            </span>
          </p>
        )}
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t pt-3">
        {analysis.checks.map((check) => (
          <li
            className={cn("flex items-center gap-1.5 text-xs transition-colors duration-200", check.met ? "text-foreground" : "text-muted-foreground")}
            key={check.id}
          >
            <Tick met={check.met} reduce={!!reduce} />
            <span>{check.label}</span>
            <span className="sr-only">{check.met ? "(done)" : "(not yet)"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tick({ met, reduce }: { met: boolean; reduce: boolean }) {
  return (
    <svg aria-hidden className="size-4 shrink-0" viewBox="0 0 16 16">
      <motion.circle
        animate={{ scale: met ? 1 : 0.4, opacity: met ? 1 : 0 }}
        className="fill-success"
        cx={8}
        cy={8}
        initial={false}
        r={7}
        style={{ originX: "50%", originY: "50%" }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 28 }}
      />
      <circle className={cn("fill-none stroke-muted-foreground/40 transition-opacity", met && "opacity-0")} cx={8} cy={8} r={6.25} strokeWidth={1.5} />
      <motion.path
        animate={{ pathLength: met ? 1 : 0 }}
        d="M5 8.2 7.1 10.3 11 6.1"
        fill="none"
        initial={false}
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        transition={reduce ? { duration: 0 } : { duration: 0.2, delay: met ? 0.08 : 0, ease: [0.23, 1, 0.32, 1] }}
      />
    </svg>
  );
}
