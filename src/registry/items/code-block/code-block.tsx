"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  FileBracesIcon,
  FileCodeIcon,
  FileIcon,
  FileTerminalIcon,
  GitCompareArrowsIcon,
  type LucideIcon,
  WrapTextIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type CodeLanguage = "ts" | "tsx" | "js" | "jsx" | "json" | "bash" | "text";

export interface CodeFile {
  name: string;
  code: string;
  language?: CodeLanguage;
  previous?: string;
  highlight?: (number | [number, number])[];
}

export interface CodeBlockProps {
  files: CodeFile[];
  defaultFile?: string;
  defaultDiff?: boolean;
  defaultWrap?: boolean;
  maxLines?: number;
  className?: string;
}

const LINE = 24;
const PAD = 12;
const spring = { type: "spring", stiffness: 520, damping: 42, mass: 0.8 } as const;

type Tone = "plain" | "keyword" | "string" | "number" | "literal" | "comment" | "fn" | "type" | "tag" | "attr" | "punct" | "prop" | "muted";

const toneClass: Record<Tone, string> = {
  plain: "",
  keyword: "text-violet-700 dark:text-violet-400",
  string: "text-emerald-700 dark:text-emerald-400",
  number: "text-amber-700 dark:text-amber-300",
  literal: "text-rose-700 dark:text-rose-400",
  comment: "text-muted-foreground italic",
  fn: "text-sky-700 dark:text-sky-400",
  type: "text-orange-700 dark:text-orange-300",
  tag: "text-sky-700 dark:text-sky-400",
  attr: "text-cyan-700 dark:text-cyan-300",
  punct: "text-muted-foreground",
  prop: "text-sky-800 dark:text-sky-300",
  muted: "text-muted-foreground",
};

type Token = { text: string; tone: Tone };

const KEYWORDS = new Set(
  "import export from default function return const let var if else for while do switch case break continue new try catch finally throw await async class extends interface type enum implements public private protected readonly static as in of typeof instanceof void yield this super satisfies keyof declare".split(
    " ",
  ),
);
const LITERALS = new Set(["true", "false", "null", "undefined", "NaN"]);

function tokenizeScript(line: string, state: { inComment: boolean }): Token[] {
  const out: Token[] = [];
  let i = 0;
  let inTag = false;
  const push = (text: string, tone: Tone) => {
    if (text) out.push({ text, tone });
  };
  if (state.inComment) {
    const end = line.indexOf("*/");
    if (end === -1) return [{ text: line, tone: "comment" }];
    push(line.slice(0, end + 2), "comment");
    i = end + 2;
    state.inComment = false;
  }
  while (i < line.length) {
    const rest = line.slice(i);
    let m: RegExpMatchArray | null;
    if (rest.startsWith("//")) {
      push(rest, "comment");
      break;
    }
    if (rest.startsWith("/*")) {
      const end = rest.indexOf("*/", 2);
      if (end === -1) {
        push(rest, "comment");
        state.inComment = true;
        break;
      }
      push(rest.slice(0, end + 2), "comment");
      i += end + 2;
      continue;
    }
    if ((m = rest.match(/^(["'`])(?:\\.|(?!\1).)*\1?/))) {
      push(m[0], "string");
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^<\/?([A-Za-z][\w.]*)/)) && !/[\w)\]]\s*$/.test(line.slice(0, i))) {
      const lead = m[0].startsWith("</") ? "</" : "<";
      push(lead, "punct");
      push(m[1], /^[A-Z]/.test(m[1]) ? "type" : "tag");
      i += m[0].length;
      inTag = true;
      continue;
    }
    if ((m = rest.match(/^\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?n?/i))) {
      push(m[0], "number");
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^[A-Za-z_$][\w$]*/))) {
      const word = m[0];
      const after = line.slice(i + word.length);
      const before = line.slice(0, i);
      let tone: Tone = "plain";
      if (LITERALS.has(word)) tone = "literal";
      else if (KEYWORDS.has(word) && !before.endsWith(".")) tone = "keyword";
      else if (inTag && /^=(?!=)/.test(after)) tone = "attr";
      else if (/^\s*\(/.test(after) || /^\s*=\s*(async\s*)?\(/.test(after)) tone = "fn";
      else if (/^[A-Z]/.test(word)) tone = "type";
      else if (before.endsWith(".")) tone = "prop";
      else if (/^\??:(?!:)/.test(after) && /[{,]\s*$|^\s*$/.test(before)) tone = "prop";
      push(word, tone);
      i += word.length;
      continue;
    }
    const ch = line[i];
    if (ch === ">" || (ch === "/" && line[i + 1] === ">")) inTag = false;
    push(ch, /[\s]/.test(ch) ? "plain" : "punct");
    i += 1;
  }
  return out;
}

function tokenizeJson(line: string): Token[] {
  const out: Token[] = [];
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?|[{}[\],]/gi;
  let last = 0;
  for (const m of line.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: line.slice(last, at), tone: "plain" });
    if (m[1]) {
      out.push({ text: m[1], tone: m[2] ? "prop" : "string" });
      if (m[2]) out.push({ text: m[2], tone: "punct" });
    } else if (m[3]) out.push({ text: m[0], tone: "literal" });
    else if (/[{}[\],]/.test(m[0])) out.push({ text: m[0], tone: "punct" });
    else out.push({ text: m[0], tone: "number" });
    last = at + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), tone: "plain" });
  return out;
}

function tokenizeBash(line: string): Token[] {
  const out: Token[] = [];
  const re = /(#.*$)|("(?:\\.|[^"\\])*"|'[^']*')|(\$\{?\w+\}?)|(\s--?[\w-]+)|(&&|\|\||[|;>])|(\S+)|(\s+)/g;
  let expectCommand = true;
  for (const m of line.matchAll(re)) {
    const [text, comment, str, variable, flag, op, word] = m;
    if (comment && (m.index === 0 || /\s/.test(line[(m.index ?? 1) - 1]))) out.push({ text, tone: "comment" });
    else if (str) out.push({ text, tone: "string" });
    else if (variable) out.push({ text, tone: "attr" });
    else if (flag) out.push({ text, tone: "muted" });
    else if (op) {
      out.push({ text, tone: "punct" });
      expectCommand = true;
      continue;
    } else if (word) {
      if (expectCommand && /^\w+=/.test(word)) out.push({ text, tone: "attr" });
      else if (expectCommand) {
        out.push({ text, tone: "fn" });
        expectCommand = false;
      } else out.push({ text, tone: /^\d+$/.test(word) ? "number" : "plain" });
    } else out.push({ text, tone: "plain" });
  }
  return out;
}

function tokenize(code: string, lang: CodeLanguage): Token[][] {
  const lines = code.split("\n");
  const state = { inComment: false };
  return lines.map((line) => {
    if (lang === "json") return tokenizeJson(line);
    if (lang === "bash") return tokenizeBash(line);
    if (lang === "text") return [{ text: line, tone: "plain" as Tone }];
    return tokenizeScript(line, state);
  });
}

function languageOf(file: CodeFile): CodeLanguage {
  if (file.language) return file.language;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["ts", "mts", "cts"].includes(ext)) return "ts";
  if (ext === "tsx") return "tsx";
  if (["js", "mjs", "cjs"].includes(ext)) return "js";
  if (ext === "jsx") return "jsx";
  if (ext === "json") return "json";
  if (["sh", "bash", "zsh"].includes(ext) || file.name.startsWith(".env")) return "bash";
  return "text";
}

function iconOf(lang: CodeLanguage): { Icon: LucideIcon; tone: string } {
  if (lang === "json") return { Icon: FileBracesIcon, tone: "text-amber-600 dark:text-amber-400" };
  if (lang === "bash") return { Icon: FileTerminalIcon, tone: "text-muted-foreground" };
  if (lang === "text") return { Icon: FileIcon, tone: "text-muted-foreground" };
  return { Icon: FileCodeIcon, tone: "text-sky-600 dark:text-sky-400" };
}

type DiffKind = "same" | "add" | "del";
interface Row {
  kind: DiffKind;
  tokens: Token[];
  n?: number;
}

function diffLines(before: string[], after: string[]): { kind: DiffKind; from: "a" | "b"; i: number }[] {
  const a = before.length;
  const b = after.length;
  const lcs = Array.from({ length: a + 1 }, () => new Uint16Array(b + 1));
  for (let i = a - 1; i >= 0; i--) {
    for (let j = b - 1; j >= 0; j--) {
      lcs[i][j] = before[i] === after[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: { kind: DiffKind; from: "a" | "b"; i: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < a || j < b) {
    if (i < a && j < b && before[i] === after[j]) {
      out.push({ kind: "same", from: "b", i: j });
      i++;
      j++;
    } else if (i < a && (j >= b || lcs[i + 1][j] >= lcs[i][j + 1])) {
      out.push({ kind: "del", from: "a", i });
      i++;
    } else {
      out.push({ kind: "add", from: "b", i: j });
      j++;
    }
  }
  return out;
}

function expandHighlight(spec: CodeFile["highlight"]): Set<number> {
  const set = new Set<number>();
  for (const s of spec ?? []) {
    if (typeof s === "number") set.add(s);
    else for (let n = Math.min(...s); n <= Math.max(...s); n++) set.add(n);
  }
  return set;
}

function IconTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children as React.ReactElement} />
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <IconTip label={copied ? "Copied" : "Copy code"}>
      <button
        aria-label={copied ? "Copied" : "Copy code"}
        className="relative grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-[color,background-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
          } catch {}
          setCopied(true);
        }}
        type="button"
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            className={cn("grid place-items-center", copied && "text-success-foreground")}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(2px)" }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(2px)" }}
            key={copied ? "done" : "copy"}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          >
            {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
          </motion.span>
        </AnimatePresence>
      </button>
    </IconTip>
  );
}

export function CodeBlock({
  files,
  defaultFile,
  defaultDiff = false,
  defaultWrap = false,
  maxLines = 14,
  className,
}: CodeBlockProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const [active, setActive] = useState(() => Math.max(0, files.findIndex((f) => f.name === defaultFile)));
  const [diff, setDiff] = useState(defaultDiff);
  const [wrap, setWrap] = useState(defaultWrap);
  const [expanded, setExpanded] = useState(false);
  const [marks, setMarks] = useState<Record<string, Set<number>>>(() =>
    Object.fromEntries(files.map((f) => [f.name, expandHighlight(f.highlight)])),
  );
  const anchor = useRef<number | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [fullHeight, setFullHeight] = useState<number | null>(null);

  const file = files[active] ?? files[0];
  const lang = languageOf(file);
  const canDiff = file.previous !== undefined;
  const showDiff = diff && canDiff;
  const highlighted = marks[file.name] ?? new Set<number>();

  const rows: Row[] = useMemo(() => {
    const now = tokenize(file.code, lang);
    if (!showDiff) return now.map((tokens, i) => ({ kind: "same", tokens, n: i + 1 }));
    const was = tokenize(file.previous ?? "", lang);
    return diffLines((file.previous ?? "").split("\n"), file.code.split("\n")).map((d) =>
      d.from === "a" ? { kind: d.kind, tokens: was[d.i] } : { kind: d.kind, tokens: now[d.i], n: d.i + 1 },
    );
  }, [file, lang, showDiff]);

  const stats = useMemo(() => {
    if (!canDiff) return null;
    const d = diffLines((file.previous ?? "").split("\n"), file.code.split("\n"));
    return { add: d.filter((x) => x.kind === "add").length, del: d.filter((x) => x.kind === "del").length };
  }, [file, canDiff]);

  const collapsible = maxLines > 0 && rows.length > maxLines + 2;
  const collapsedHeight = maxLines * LINE + PAD;

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setFullHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toggleMark = (n: number, extend: boolean) => {
    setMarks((prev) => {
      const next = new Set(prev[file.name]);
      if (extend && anchor.current !== null) {
        for (let k = Math.min(anchor.current, n); k <= Math.max(anchor.current, n); k++) next.add(k);
      } else if (next.has(n)) next.delete(n);
      else next.add(n);
      return { ...prev, [file.name]: next };
    });
    anchor.current = n;
  };

  const selectTab = (i: number) => {
    setActive(i);
    setExpanded(false);
    anchor.current = null;
  };

  const onTabKey = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (active + step + files.length) % files.length;
    selectTab(next);
    tabRefs.current[next]?.focus();
  };

  const isCollapsed = collapsible && !expanded;
  const height = isCollapsed ? collapsedHeight : (fullHeight ?? undefined);

  return (
    <TooltipProvider delay={500}>
      <div className={cn("w-full min-w-0 max-w-[560px] overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5", className)}>
        <div className="flex h-11 items-center gap-1 border-b ps-1.5 pe-1.5">
          <div
            aria-label="Files"
            className="-my-1 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto py-1 [mask-image:linear-gradient(to_right,black_calc(100%-20px),transparent)] [scrollbar-width:none]"
            onKeyDown={onTabKey}
            role="tablist"
          >
            {files.map((f, i) => {
              const { Icon, tone } = iconOf(languageOf(f));
              const selected = i === active;
              return (
                <button
                  aria-controls={`${uid}-panel`}
                  aria-selected={selected}
                  className={cn(
                    "relative flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 font-mono text-xs outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                    selected ? "text-foreground" : "text-muted-foreground [@media(hover:hover)]:hover:text-foreground",
                  )}
                  key={f.name}
                  onClick={() => selectTab(i)}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  role="tab"
                  tabIndex={selected ? 0 : -1}
                  type="button"
                >
                  {selected && (
                    <motion.span
                      className="absolute inset-0 -z-0 rounded-lg bg-muted"
                      layoutId={`${uid}-tab`}
                      transition={reduce ? { duration: 0 } : spring}
                    />
                  )}
                  <Icon className={cn("relative size-3.5", tone)} />
                  <span className="relative">{f.name}</span>
                </button>
              );
            })}
          </div>

          {canDiff && stats && (
            <IconTip label={showDiff ? "Show file" : "Show changes"}>
              <Toggle
                aria-label="Diff view"
                className="h-8 gap-1.5 rounded-lg px-2 font-mono text-xs tabular-nums"
                onPressedChange={setDiff}
                pressed={showDiff}
              >
                <GitCompareArrowsIcon className="size-3.5" />
                <span className="text-success-foreground">+{stats.add}</span>
                <span className="text-destructive-foreground">−{stats.del}</span>
              </Toggle>
            </IconTip>
          )}
          <IconTip label={wrap ? "Don’t wrap lines" : "Wrap lines"}>
            <Toggle aria-label="Wrap lines" className="size-8 min-w-8 rounded-lg p-0" onPressedChange={setWrap} pressed={wrap}>
              <WrapTextIcon className="size-4" />
            </Toggle>
          </IconTip>
          <CopyButton text={file.code} />
        </div>

        <motion.div
          animate={{ height }}
          className="relative overflow-hidden bg-code"
          id={`${uid}-panel`}
          initial={false}
          role="tabpanel"
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 40 }}
        >
          <div ref={bodyRef}>
            <div className={cn("overflow-x-auto", isCollapsed && "overflow-x-hidden")}>
              <pre
                aria-label={`${file.name}${showDiff ? " changes" : ""}`}
                className={cn("py-1.5 font-mono text-[12.5px] leading-6", wrap ? "w-full" : "w-max min-w-full")}
              >
                <code className="block">
                  {rows.map((row, idx) => {
                    const marked = row.n !== undefined && !showDiff && highlighted.has(row.n);
                    return (
                      <div
                        className={cn(
                          "group/line flex",
                          row.kind === "add" && "bg-success/10",
                          row.kind === "del" && "bg-destructive/10",
                          marked && "bg-info/10",
                        )}
                        key={`${file.name}-${showDiff}-${idx}`}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "sticky left-0 w-11 shrink-0 cursor-pointer select-none pe-3 text-end text-muted-foreground/60 tabular-nums transition-colors [@media(hover:hover)]:hover:text-foreground",
                            marked && "text-info-foreground shadow-[inset_2px_0_0_var(--color-info)]",
                            !wrap && "bg-code",
                            !wrap && row.kind === "add" && "bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-code))]",
                            !wrap && row.kind === "del" && "bg-[color-mix(in_srgb,var(--color-destructive)_10%,var(--color-code))]",
                            !wrap && marked && "bg-[color-mix(in_srgb,var(--color-info)_10%,var(--color-code))]",
                          )}
                          onClick={(e) => row.n !== undefined && !showDiff && toggleMark(row.n, e.shiftKey)}
                        >
                          {row.n ?? ""}
                        </span>
                        {showDiff && (
                          <span
                            aria-hidden
                            className={cn(
                              "w-5 shrink-0 select-none text-center",
                              row.kind === "add" && "text-success-foreground",
                              row.kind === "del" && "text-destructive-foreground",
                            )}
                          >
                            {row.kind === "add" ? "+" : row.kind === "del" ? "−" : ""}
                          </span>
                        )}
                        {showDiff && row.kind !== "same" && (
                          <span className="sr-only">{row.kind === "add" ? "added: " : "removed: "}</span>
                        )}
                        <span className={cn("min-w-0 flex-1 pe-4", wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre")}>
                          {row.tokens.length === 0 || (row.tokens.length === 1 && row.tokens[0].text === "") ? (
                            " "
                          ) : (
                            row.tokens.map((t, k) => (
                              <span className={toneClass[t.tone]} key={k}>
                                {t.text}
                              </span>
                            ))
                          )}
                        </span>
                      </div>
                    );
                  })}
                </code>
              </pre>
            </div>
          </div>

          <AnimatePresence>
            {isCollapsed && (
              <motion.div
                animate={{ opacity: 1 }}
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-code via-code/80 to-transparent"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {collapsible && (
          <button
            aria-expanded={expanded}
            className="flex h-9 w-full items-center justify-center gap-1.5 border-t text-muted-foreground text-xs outline-none transition-colors duration-150 focus-visible:bg-accent focus-visible:text-foreground [@media(hover:hover)]:hover:bg-accent/50 [@media(hover:hover)]:hover:text-foreground"
            onClick={() => setExpanded((v) => !v)}
            type="button"
          >
            {expanded ? "Collapse" : `Show all ${rows.length} lines`}
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
              <ChevronDownIcon className="size-3.5" />
            </motion.span>
          </button>
        )}
      </div>
    </TooltipProvider>
  );
}
