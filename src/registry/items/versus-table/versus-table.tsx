"use client";

import { ArrowRightIcon, CheckIcon, XIcon } from "lucide-react";
import { motion, MotionConfig, useReducedMotion } from "motion/react";
import { type CSSProperties, Fragment, type ReactNode, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export type VersusValue = boolean | string;

export interface VersusColumn {
  id: string;
  name: string;
  note?: string;
}

export interface VersusGroup {
  name: string;
  rows: { label: string; hint?: string; values: Record<string, VersusValue> }[];
}

export interface VersusTableProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  us: VersusColumn & { mark?: ReactNode };
  them: VersusColumn[];
  groups: VersusGroup[];
  cta?: { label: string; href: string };
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;

function Value({ value, ours, index }: { value: VersusValue | undefined; ours: boolean; index: number }) {
  if (value === true) {
    return (
      <motion.span
        className={cn(
          "inline-flex size-5 items-center justify-center rounded-full",
          ours ? "bg-primary text-primary-foreground" : "bg-foreground/8 text-foreground/70",
        )}
        initial={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 520, damping: 30, delay: Math.min(index, 14) * 0.03 }}
        viewport={{ once: true, amount: 0.5 }}
        whileInView={{ opacity: 1, scale: 1 }}
      >
        <CheckIcon aria-hidden className="size-3" strokeWidth={3} />
        <span className="sr-only">Yes</span>
      </motion.span>
    );
  }
  if (value === false || value === undefined) {
    return (
      <span className="inline-flex size-5 items-center justify-center text-muted-foreground/50">
        <XIcon aria-hidden className="size-3.5" strokeWidth={2.5} />
        <span className="sr-only">No</span>
      </span>
    );
  }
  return (
    <span className={cn("text-balance text-xs leading-snug", ours ? "font-medium text-foreground" : "text-muted-foreground")}>
      {value}
    </span>
  );
}

export function VersusTable({ eyebrow, title, description, us, them, groups, cta, className }: VersusTableProps) {
  const reduce = useReducedMotionSafe();
  const [compare, setCompare] = useState(them[0]?.id);
  const pillId = useId();
  const columns = [us, ...them];
  const hiddenOnPhone = (id: string) => id !== us.id && id !== compare;
  const cell = (id: string) =>
    cn("[grid-column:var(--cm)] sm:[grid-column:var(--c)]", hiddenOnPhone(id) && "max-sm:hidden");
  // Every cell gets an explicit row and column so the raised card can sit behind one column.
  const place = (id: string, row: number) =>
    ({ "--c": columns.findIndex((c) => c.id === id) + 2, "--cm": id === us.id ? 2 : 3, gridRow: row }) as CSSProperties;
  const totalRows = 1 + groups.reduce((n, g) => n + 1 + g.rows.length, 0) + (cta ? 1 : 0);
  let tick = 0;
  let r = 1;

  return (
    <MotionConfig reducedMotion="user">
      <section className={cn("mx-auto w-full max-w-[1100px]", className)}>
        <header className="mx-auto flex max-w-xl flex-col items-center text-center">
          {eyebrow && <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">{eyebrow}</p>}
          <h2 className="mt-2 text-balance font-heading font-semibold text-3xl tracking-tight sm:text-4xl">{title}</h2>
          {description && (
            <p className="mt-3 text-balance text-muted-foreground text-sm leading-relaxed sm:text-base">{description}</p>
          )}
        </header>

        {them.length > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2 sm:hidden">
            <span className="text-muted-foreground text-xs">Compare with</span>
            <div className="relative flex rounded-full border bg-muted p-0.5" role="radiogroup" aria-label="Compare with">
              {them.map((col) => {
                const on = compare === col.id;
                return (
                  <button
                    aria-checked={on}
                    className={cn(
                      "relative h-8 cursor-pointer rounded-full px-3 font-medium text-xs outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                      on ? "text-foreground" : "text-muted-foreground",
                    )}
                    key={col.id}
                    onClick={() => setCompare(col.id)}
                    role="radio"
                    type="button"
                  >
                    {on && (
                      <motion.span
                        className="absolute inset-0 -z-0 rounded-full bg-background shadow-xs/5 dark:bg-input"
                        layoutId={pillId}
                        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                      />
                    )}
                    <span className="relative">{col.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div
          className="relative mt-6 grid grid-cols-[minmax(0,1fr)_repeat(2,6rem)] sm:mt-12 sm:grid-cols-[minmax(0,1.5fr)_repeat(var(--n),minmax(0,1fr))]"
          role="table"
          style={{ "--n": columns.length } as CSSProperties}
        >
          <div
            aria-hidden
            className="pointer-events-none rounded-2xl bg-card"
            style={{ gridColumn: 2, gridRow: `1 / span ${totalRows}` }}
          />
          <div
            aria-hidden
            className="pointer-events-none z-30 rounded-2xl border shadow-lg/5 ring-1 ring-foreground/2 dark:shadow-black/30"
            style={{ gridColumn: 2, gridRow: `1 / span ${totalRows}` }}
          />

          <div className="contents" role="row">
            <div
              className="sticky top-0 z-20 flex items-end bg-background/95 pb-4 backdrop-blur-md"
              role="columnheader"
              style={{ gridColumn: 1, gridRow: 1 }}
            >
              <span className="text-muted-foreground text-xs">Features</span>
            </div>
            {columns.map((col) => {
              const ours = col.id === us.id;
              return (
                <div
                  className={cn(
                    "sticky top-0 z-20 flex flex-col items-center justify-end gap-1 px-2 pt-5 pb-4 text-center backdrop-blur-md",
                    ours ? "mx-px mt-px rounded-t-[calc(var(--radius-2xl)-1px)] bg-card/90" : "bg-background/95",
                    cell(col.id),
                  )}
                  key={col.id}
                  role="columnheader"
                  style={place(col.id, 1)}
                >
                  {ours && us.mark}
                  <span className={cn("text-balance font-medium text-sm leading-tight", !ours && "text-muted-foreground")}>
                    {col.name}
                  </span>
                  {col.note && <span className="hidden text-[0.6875rem] text-muted-foreground sm:block">{col.note}</span>}
                </div>
              );
            })}
          </div>

          {groups.map((group, g) => {
            const groupRow = ++r;
            return (
            <Fragment key={group.name}>
              <div className="contents" role="row">
                <div
                  className={cn(
                    "pb-2 font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-wider",
                    g === 0 ? "pt-2" : "pt-7",
                  )}
                  role="rowheader"
                  style={{ gridColumn: 1, gridRow: groupRow }}
                >
                  {group.name}
                </div>
              </div>
              {group.rows.map((row) => {
                const rowIndex = ++r;
                return (
                <div className="contents" key={row.label} role="row">
                  <div
                    className="flex min-h-12 flex-col justify-center border-t py-3 pe-3"
                    role="rowheader"
                    style={{ gridColumn: 1, gridRow: rowIndex }}
                  >
                    <span className="text-pretty text-sm leading-snug">{row.label}</span>
                    {row.hint && <span className="mt-0.5 hidden text-muted-foreground text-xs sm:block">{row.hint}</span>}
                  </div>
                  {columns.map((col) => {
                    const ours = col.id === us.id;
                    const index = ours ? tick++ : 0;
                    return (
                      <div
                        className={cn(
                          "flex min-h-12 items-center justify-center border-t px-2 py-3 text-center",
                          ours && "mx-px border-foreground/6",
                          cell(col.id),
                        )}
                        key={col.id}
                        role="cell"
                        style={place(col.id, rowIndex)}
                      >
                        <Value index={index} ours={ours} value={row.values[col.id]} />
                      </div>
                    );
                  })}
                </div>
                );
              })}
            </Fragment>
            );
          })}

          {cta && (
            <div className="contents" role="row">
              <div className="border-t" role="cell" style={{ gridColumn: 1, gridRow: totalRows }} />
              <div
                className="mx-px border-foreground/6 border-t px-1.5 pt-4 pb-4 sm:px-4"
                role="cell"
                style={{ gridColumn: 2, gridRow: totalRows }}
              >
                <Button
                  className="group w-full transition-[box-shadow,translate,scale,rotate] duration-150 ease-out active:scale-[0.97] max-sm:px-2 max-sm:text-sm"
                  render={<a href={cta.href} />}
                  size="sm"
                >
                  <span className="truncate">{cta.label}</span>
                  <ArrowRightIcon className="hidden transition-transform duration-200 ease-out group-hover:translate-x-0.5 sm:block" />
                </Button>
              </div>
              {them.map((col) => (
                <div className={cn("border-t", cell(col.id))} key={col.id} role="cell" style={place(col.id, totalRows)} />
              ))}
            </div>
          )}
        </div>
        <motion.p
          className="mt-6 text-balance text-center text-muted-foreground text-xs"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.4, ease }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1 }}
        >
          Compared against public plans and docs as of October 2026.
        </motion.p>
      </section>
    </MotionConfig>
  );
}
