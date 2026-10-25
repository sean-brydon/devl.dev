"use client";

import { compileCases, encode, type Fields, fieldLabel, matches, type Query, type QueryNode, type QueryOf, validateRule } from "@qnot/core";
import { textFormat } from "@qnot/core/formats/text";
import { CheckIcon, ChevronDownIcon, CircleAlertIcon, MinusIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface PlaygroundVariant {
  id: string;
  name: string;
  tone: string;
}

export interface PlaygroundRule {
  name: string;
  when: Query;
  serve: string;
}

export interface PlaygroundFlag {
  key: string;
  description: string;
  variants: PlaygroundVariant[];
  rules: PlaygroundRule[];
  rollout: Record<string, number>;
}

export interface ContextPreset {
  name: string;
  context: Record<string, unknown>;
}

export interface FlagPlaygroundProps {
  fields: Fields;
  flags: PlaygroundFlag[];
  presets: ContextPreset[];
  className?: string;
}

type Step = { state: "match" | "miss" | "skipped"; conditions: { text: string; pass: boolean }[] };

const easeOut = [0.23, 1, 0.32, 1] as const;
const sentence = textFormat();

function bucketOf(id: string, salt: string) {
  let h = 2166136261;
  for (const ch of `${salt}:${id}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) % 100;
}

function parseContext(text: string): { value: Record<string, unknown> } | { error: string } {
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return { error: "The context must be a JSON object" };
    return { value };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid JSON";
    const at = /position (\d+)/.exec(message);
    if (!at) return { error: message.replace(/^JSON\.parse: /, "") };
    const before = text.slice(0, Number(at[1]));
    const line = before.split("\n").length;
    const column = before.length - before.lastIndexOf("\n");
    return { error: `${message.replace(/ in JSON at position \d+.*$/, "").replace(/\s*\(line.*\)$/, "")} on line ${line}, column ${column}` };
  }
}

function evaluate(fields: Fields, flag: PlaygroundFlag, context: Record<string, unknown>) {
  const route = compileCases(fields, { cases: flag.rules.map((r) => ({ when: r.when as QueryOf<Fields>, then: r.serve })) }, { incompleteRules: false });
  const hit = route(context as never);
  const steps: Step[] = flag.rules.map((rule, index) => {
    const children: readonly QueryNode[] = rule.when.kind === "group" ? rule.when.children : [rule.when];
    const conditions = children.map((child) => {
      const single: Query = { kind: "group", combinator: "and", children: [child] };
      return { text: encode(sentence, single, fields), pass: matches(fields, single as QueryOf<Fields>, context as never, { incompleteRules: false }) };
    });
    const state = hit.index === -1 || index < hit.index ? "miss" : index === hit.index ? "match" : "skipped";
    return { state, conditions };
  });
  if (hit.index >= 0) return { variant: hit.value as string, reason: `Matched ${flag.rules[hit.index].name}`, steps, bucket: null };
  const id = String(context.id ?? context.key ?? "anonymous");
  const bucket = bucketOf(id, flag.key);
  let edge = 0;
  let variant = flag.variants[flag.variants.length - 1].id;
  for (const v of flag.variants) {
    edge += flag.rollout[v.id] ?? 0;
    if (bucket < edge) {
      variant = v.id;
      break;
    }
  }
  return { variant, reason: `Rollout bucket ${bucket}`, steps, bucket };
}

export function FlagPlayground({ fields, flags, presets, className }: FlagPlaygroundProps) {
  const reduce = useReducedMotion();
  const editorId = useId();
  const [preset, setPreset] = useState(0);
  const [text, setText] = useState(() => JSON.stringify(presets[0].context, null, 2));
  const [open, setOpen] = useState<string | null>(flags[0]?.key ?? null);
  const parsed = useMemo(() => parseContext(text), [text]);
  const [lastGood, setLastGood] = useState(presets[0].context);
  if ("value" in parsed && parsed.value !== lastGood) {
    setLastGood(parsed.value);
  }
  const context = "value" in parsed ? parsed.value : lastGood;
  const stale = "error" in parsed;

  const typeIssues = useMemo(
    () =>
      Object.entries(context).flatMap(([key, value]) => {
        const def = fields[key];
        if (!def || value === null) return [];
        return validateRule(fields, { kind: "rule", field: key, operator: "eq", value })
          .filter((i) => i.code === "type" || i.code === "option")
          .map((i) => ({ key, label: fieldLabel(key, def), message: i.message }));
      }),
    [context, fields],
  );

  const evaluated = useMemo(() => {
    if (!typeIssues.length) return context;
    const ignored = new Set(typeIssues.map((i) => i.key));
    return Object.fromEntries(Object.entries(context).filter(([key]) => !ignored.has(key)));
  }, [context, typeIssues]);

  const results = useMemo(() => flags.map((flag) => ({ flag, ...evaluate(fields, flag, evaluated) })), [flags, fields, evaluated]);

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-[600px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5",
        className,
      )}
    >
      <div className="flex flex-col gap-2.5 px-4 pt-3.5 pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <label className="font-medium" htmlFor={editorId}>
            User context
          </label>
          <span className="text-muted-foreground text-xs">Edit the JSON or pick someone</span>
        </div>
        <div aria-label="Example users" className="flex flex-wrap gap-1.5" role="group">
          {presets.map((p, i) => (
            <button
              aria-pressed={preset === i}
              className={cn(
                "h-7 rounded-full border px-2.5 text-xs outline-none transition-[background-color,border-color,color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                preset === i
                  ? "border-foreground/16 bg-foreground/6 font-medium text-foreground dark:bg-foreground/10"
                  : "border-input bg-background text-muted-foreground hover:text-foreground dark:bg-input/32",
              )}
              key={p.name}
              onClick={() => {
                setPreset(i);
                setText(JSON.stringify(p.context, null, 2));
              }}
              type="button"
            >
              {p.name}
            </button>
          ))}
        </div>
        <Textarea
          aria-describedby={`${editorId}-status`}
          aria-invalid={stale || undefined}
          className="font-mono text-[12px] leading-5 sm:text-[12px] [&_textarea]:h-49 [&_textarea]:resize-none [&_textarea]:[field-sizing:fixed]"
          id={editorId}
          onChange={(e) => {
            setText(e.target.value);
            setPreset(-1);
          }}
          rows={8}
          spellCheck={false}
          value={text}
        />
        <div className="min-h-5 text-xs" id={`${editorId}-status`}>
          {stale ? (
            <p className="flex items-start gap-1.5 text-destructive-foreground">
              <CircleAlertIcon className="mt-px size-3.5 shrink-0" />
              <span className="text-pretty">{parsed.error}. Showing the last valid context.</span>
            </p>
          ) : typeIssues.length > 0 ? (
            <p className="flex items-start gap-1.5 text-warning-foreground">
              <CircleAlertIcon className="mt-px size-3.5 shrink-0" />
              <span className="text-pretty">
                Ignoring {typeIssues.map((i) => `${i.label} (${i.message.toLowerCase()})`).join(", ")}
              </span>
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <CheckIcon className="size-3.5 shrink-0 text-success-foreground" />
              Valid context with {Object.keys(context).length} attributes
            </p>
          )}
        </div>
      </div>

      <ul className={cn("flex flex-col border-t transition-opacity duration-200", stale && "opacity-64")}>
        {results.map(({ flag, variant, reason, steps }) => {
          const served = flag.variants.find((v) => v.id === variant) ?? flag.variants[0];
          const expanded = open === flag.key;
          return (
            <li className="border-b last:border-b-0" key={flag.key}>
              <button
                aria-expanded={expanded}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-start outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40"
                onClick={() => setOpen(expanded ? null : flag.key)}
                type="button"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium font-mono text-xs">{flag.key}</span>
                  <span className="block truncate text-muted-foreground text-xs">{reason}</span>
                </span>
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 font-medium text-xs dark:bg-input/32"
                    exit={{ opacity: 0, y: reduce ? 0 : -6, filter: "blur(2px)" }}
                    initial={{ opacity: 0, y: reduce ? 0 : 6, filter: "blur(2px)" }}
                    key={served.id}
                    transition={{ duration: 0.2, ease: easeOut }}
                  >
                    <span className={cn("size-1.5 rounded-full", served.tone)} />
                    {served.name}
                  </motion.span>
                </AnimatePresence>
                <ChevronDownIcon
                  className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", expanded && "rotate-180")}
                />
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.22, ease: easeOut }}
                  >
                    <ol className="flex flex-col gap-1.5 px-4 pb-3">
                      {flag.rules.map((rule, i) => (
                        <RuleStep
                          index={i}
                          key={rule.name}
                          name={rule.name}
                          serve={flag.variants.find((v) => v.id === rule.serve) ?? flag.variants[0]}
                          step={steps[i]}
                        />
                      ))}
                      <FallthroughStep flag={flag} matched={steps.some((s) => s.state === "match")} served={served} />
                    </ol>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RuleStep({ step, name, index, serve }: { step: Step; name: string; index: number; serve: PlaygroundVariant }) {
  return (
    <li
      className={cn(
        "rounded-xl border px-3 py-2 transition-[background-color,border-color,opacity] duration-200",
        step.state === "match" && "border-success/32 bg-success/6 dark:bg-success/10",
        step.state === "skipped" && "opacity-48",
      )}
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="flex size-4.5 shrink-0 items-center justify-center rounded-md bg-muted font-medium text-[10px] tabular-nums">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
        <span className={cn("shrink-0 text-muted-foreground", step.state === "match" && "max-sm:sr-only")}>
          {step.state === "match" ? "Matched, serves" : step.state === "skipped" ? "Not reached" : "No match"}
        </span>
        {step.state === "match" && (
          <span className="flex shrink-0 items-center gap-1 font-medium">
            <span className={cn("size-1.5 rounded-full", serve.tone)} />
            {serve.name}
          </span>
        )}
      </div>
      <ul className="mt-1.5 flex flex-col gap-1 ps-6.5">
        {step.conditions.map((c) => (
          <li className="flex items-start gap-1.5 text-xs" key={c.text}>
            {step.state === "skipped" ? (
              <MinusIcon className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
            ) : c.pass ? (
              <CheckIcon className="mt-0.5 size-3 shrink-0 text-success-foreground" />
            ) : (
              <XIcon className="mt-0.5 size-3 shrink-0 text-destructive-foreground" />
            )}
            <span className={cn("min-w-0 text-pretty", !c.pass && step.state !== "skipped" && "text-muted-foreground")}>
              {c.text}
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}

function FallthroughStep({ flag, matched, served }: { flag: PlaygroundFlag; matched: boolean; served: PlaygroundVariant }) {
  const split = flag.variants.map((v) => `${flag.rollout[v.id] ?? 0}% ${v.name}`).join(" · ");
  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-xs transition-[background-color,border-color,opacity] duration-200",
        matched ? "opacity-48" : "border-success/32 border-solid bg-success/6 dark:bg-success/10",
      )}
    >
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium">Everyone else</span>
        <span className="text-muted-foreground"> · {split}</span>
      </span>
      {!matched && (
        <span className="flex shrink-0 items-center gap-1 font-medium">
          <span className={cn("size-1.5 rounded-full", served.tone)} />
          {served.name}
        </span>
      )}
    </li>
  );
}
