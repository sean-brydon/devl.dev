"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, CheckIcon, Redo2Icon, Undo2Icon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type ClipboardEvent,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type CellValue = string | number | null;

export interface SheetColumn {
  key: string;
  label: string;
  type?: "text" | "number";
  format?: Intl.NumberFormatOptions;
  width?: number;
}

export interface SheetRow {
  id: string;
  [key: string]: CellValue;
}

export interface MiniSheetProps {
  columns?: SheetColumn[];
  rows?: SheetRow[];
  onRowsChange?: (rows: SheetRow[]) => void;
  locale?: string;
  className?: string;
}

type Cell = { r: number; c: number };
type Sort = { key: string; dir: "asc" | "desc" } | null;
type Editing = { r: number; c: number; value: string; replace: boolean; session: number } | null;

const MotionRow = motion.create(TableRow);

const defaultColumns: SheetColumn[] = [
  { key: "company", label: "Company", width: 152 },
  { key: "owner", label: "Owner", width: 112 },
  { key: "plan", label: "Plan", width: 92 },
  { key: "seats", label: "Seats", type: "number", width: 72 },
  { key: "mrr", label: "MRR", type: "number", width: 96, format: { style: "currency", currency: "USD", maximumFractionDigits: 0 } },
];

const defaultRows: SheetRow[] = [
  { id: "1", company: "Bluebird Labs", owner: "Maya Ortiz", plan: "Team", seats: 24, mrr: 1920 },
  { id: "2", company: "Kestrel Freight", owner: "Jon Bakker", plan: "Enterprise", seats: 140, mrr: 11200 },
  { id: "3", company: "Pinecone Studio", owner: "Ava Lindqvist", plan: "Pro", seats: 6, mrr: 294 },
  { id: "4", company: "Harbor Analytics", owner: "Theo Nakamura", plan: "Team", seats: 38, mrr: 3040 },
  { id: "5", company: "Orchard Health", owner: "Priya Raman", plan: "Enterprise", seats: 92, mrr: 7360 },
  { id: "6", company: "Lumen & Co", owner: "Sam Okafor", plan: "Starter", seats: 3, mrr: 57 },
  { id: "7", company: "Atlas Robotics", owner: "Lena Fischer", plan: "Pro", seats: 12, mrr: 588 },
];

const colName = (c: number) => String.fromCharCode(65 + c);

function offsetWithin(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

function parseCell(raw: string, column: SheetColumn): CellValue {
  const text = raw.trim();
  if (column.type !== "number") return text;
  if (text === "") return null;
  const n = Number(text.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : Number.NaN;
}

export function MiniSheet({
  columns = defaultColumns,
  rows: initialRows = defaultRows,
  onRowsChange,
  locale = "en-US",
  className,
}: MiniSheetProps) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  const dragging = useRef(false);
  const session = useRef(0);
  const finished = useRef(-1);

  const [rows, setRows] = useState(initialRows);
  const [past, setPast] = useState<SheetRow[][]>([]);
  const [future, setFuture] = useState<SheetRow[][]>([]);
  const [sort, setSort] = useState<Sort>(null);
  const [anchor, setAnchor] = useState<Cell>({ r: 0, c: 0 });
  const [focus, setFocus] = useState<Cell>({ r: 0, c: 0 });
  const [editing, setEditing] = useState<Editing>(null);
  const [hasFocus, setHasFocus] = useState(false);
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);
  const [frame, setFrame] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [glide, setGlide] = useState(true);

  const formatters = useMemo(
    () => columns.map((col) => (col.type === "number" ? new Intl.NumberFormat(locale, col.format) : null)),
    [columns, locale],
  );

  const view = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (x === null || x === "") return 1;
      if (y === null || y === "") return -1;
      if (col?.type === "number") return (Number(x) - Number(y)) * sign;
      return String(x).localeCompare(String(y), locale) * sign;
    });
  }, [rows, sort, columns, locale]);

  const maxR = view.length - 1;
  const maxC = columns.length - 1;
  const top = Math.min(anchor.r, focus.r);
  const bottom = Math.max(anchor.r, focus.r);
  const left = Math.min(anchor.c, focus.c);
  const right = Math.max(anchor.c, focus.c);
  const inRange = (r: number, c: number) => r >= top && r <= bottom && c >= left && c <= right;
  const cellId = (r: number, c: number) => `${uid}-${r}-${c}`;

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 1600);
    return () => clearTimeout(t);
  }, [notice]);

  // Measured with offsets so row layout animations don't skew the frame.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const grid = gridRef.current;
    if (!wrap || !grid) return;
    const a = grid.querySelector<HTMLElement>(`#${CSS.escape(cellId(top, left))}`);
    const b = grid.querySelector<HTMLElement>(`#${CSS.escape(cellId(bottom, right))}`);
    if (!a || !b) {
      setFrame(null);
      return;
    }
    const pa = offsetWithin(a, wrap);
    const pb = offsetWithin(b, wrap);
    setFrame({ x: pa.x, y: pa.y, w: pb.x + b.offsetWidth - pa.x, h: pb.y + b.offsetHeight - pa.y });
  }, [top, left, bottom, right, view, columns]);

  useEffect(() => {
    const scroller = scrollRef.current;
    const wrap = wrapRef.current;
    const cell = gridRef.current?.querySelector<HTMLElement>(`#${CSS.escape(cellId(focus.r, focus.c))}`);
    if (!hasFocus || !scroller || !wrap || !cell) return;
    const x = offsetWithin(cell, wrap).x;
    const rowHead = 36;
    if (x - rowHead < scroller.scrollLeft) scroller.scrollLeft = x - rowHead;
    else if (x + cell.offsetWidth > scroller.scrollLeft + scroller.clientWidth)
      scroller.scrollLeft = x + cell.offsetWidth - scroller.clientWidth;
  }, [focus, hasFocus]);

  function display(value: CellValue, c: number) {
    if (value === null || value === "") return "";
    const f = formatters[c];
    return f && typeof value === "number" ? f.format(value) : String(value);
  }

  function commitRows(next: SheetRow[]) {
    setPast((p) => [...p.slice(-49), rows]);
    setFuture([]);
    setRows(next);
    onRowsChange?.(next);
  }

  function writeCells(cells: { r: number; c: number; value: CellValue }[]) {
    const byId = new Map(rows.map((row) => [row.id, { ...row }]));
    let changed = false;
    for (const { r, c, value } of cells) {
      const viewRow = view[r];
      const col = columns[c];
      if (!viewRow || !col) continue;
      if (typeof value === "number" && Number.isNaN(value)) continue;
      const target = byId.get(viewRow.id);
      if (target && target[col.key] !== value) {
        target[col.key] = value;
        changed = true;
      }
    }
    if (changed) commitRows(rows.map((row) => byId.get(row.id) ?? row));
    return changed;
  }

  function undo() {
    const prev = past[past.length - 1];
    if (!prev) return;
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [rows, ...f]);
    setRows(prev);
    onRowsChange?.(prev);
    setNotice({ id: Date.now(), text: "Undone" });
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, rows]);
    setRows(next);
    onRowsChange?.(next);
    setNotice({ id: Date.now(), text: "Redone" });
  }

  function select(cell: Cell, extend: boolean) {
    const clamped = { r: Math.max(0, Math.min(maxR, cell.r)), c: Math.max(0, Math.min(maxC, cell.c)) };
    if (extend) setFocus(clamped);
    else {
      setAnchor(clamped);
      setFocus(clamped);
    }
  }

  function startEdit(replaceWith?: string) {
    const value = view[anchor.r]?.[columns[anchor.c].key] ?? null;
    setFocus(anchor);
    setEditing({
      r: anchor.r,
      c: anchor.c,
      value: replaceWith ?? (value === null ? "" : String(value)),
      replace: replaceWith !== undefined,
      session: ++session.current,
    });
  }

  function finishEdit(move: "down" | "right" | "left" | "none", cancel = false) {
    if (!editing || finished.current === editing.session) return;
    finished.current = editing.session;
    if (gridRef.current?.contains(document.activeElement)) gridRef.current.focus();
    if (!cancel) {
      const value = parseCell(editing.value, columns[editing.c]);
      writeCells([{ r: editing.r, c: editing.c, value }]);
    }
    setEditing(null);
    if (move === "down") select({ r: editing.r + 1, c: editing.c }, false);
    if (move === "right") select({ r: editing.r, c: editing.c + 1 }, false);
    if (move === "left") select({ r: editing.r, c: editing.c - 1 }, false);
  }

  function cycleSort(key: string) {
    setGlide(true);
    setSort((s) => (!s || s.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));
  }

  function rangeText() {
    const lines: string[] = [];
    for (let r = top; r <= bottom; r++) {
      const cells: string[] = [];
      for (let c = left; c <= right; c++) {
        const v = view[r]?.[columns[c].key];
        cells.push(v === null || v === undefined ? "" : String(v));
      }
      lines.push(cells.join("\t"));
    }
    return lines.join("\n");
  }

  const cellCount = (bottom - top + 1) * (right - left + 1);

  function onCopy(e: ClipboardEvent<HTMLTableElement>) {
    if (editing) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", rangeText());
    setNotice({ id: Date.now(), text: `Copied ${cellCount} ${cellCount === 1 ? "cell" : "cells"}` });
  }

  function clearRange() {
    const cells = [];
    for (let r = top; r <= bottom; r++)
      for (let c = left; c <= right; c++) cells.push({ r, c, value: columns[c].type === "number" ? null : "" });
    return writeCells(cells);
  }

  function onCut(e: ClipboardEvent<HTMLTableElement>) {
    if (editing) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", rangeText());
    clearRange();
    setNotice({ id: Date.now(), text: `Cut ${cellCount} ${cellCount === 1 ? "cell" : "cells"}` });
  }

  function onPaste(e: ClipboardEvent<HTMLTableElement>) {
    if (editing) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").replace(/\r/g, "").replace(/\n$/, "");
    if (!text) return;
    const grid = text.split("\n").map((line) => line.split("\t"));
    const cells: { r: number; c: number; value: CellValue }[] = [];
    const single = grid.length === 1 && grid[0].length === 1;
    if (single && cellCount > 1) {
      for (let r = top; r <= bottom; r++)
        for (let c = left; c <= right; c++) cells.push({ r, c, value: parseCell(grid[0][0], columns[c]) });
    } else {
      grid.forEach((line, dr) =>
        line.forEach((raw, dc) => {
          const r = top + dr;
          const c = left + dc;
          if (r <= maxR && c <= maxC) cells.push({ r, c, value: parseCell(raw, columns[c]) });
        }),
      );
      const lastR = Math.min(maxR, top + grid.length - 1);
      const lastC = Math.min(maxC, left + Math.max(...grid.map((l) => l.length)) - 1);
      setAnchor({ r: top, c: left });
      setFocus({ r: lastR, c: lastC });
    }
    if (writeCells(cells)) setNotice({ id: Date.now(), text: `Pasted ${cells.length} ${cells.length === 1 ? "cell" : "cells"}` });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTableElement>) {
    if (editing || view.length === 0) return;
    setGlide(false);
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key;
    if (mod && key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
      return;
    }
    if (mod && key.toLowerCase() === "a") {
      e.preventDefault();
      setAnchor({ r: 0, c: 0 });
      setFocus({ r: maxR, c: maxC });
      return;
    }
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (moves[key]) {
      e.preventDefault();
      const [dr, dc] = moves[key];
      const from = e.shiftKey ? focus : anchor;
      const jump = mod ? { r: dr ? (dr > 0 ? maxR : 0) : from.r, c: dc ? (dc > 0 ? maxC : 0) : from.c } : null;
      select(jump ?? { r: from.r + dr, c: from.c + dc }, e.shiftKey);
      return;
    }
    if (key === "Enter" || key === "F2") {
      e.preventDefault();
      startEdit();
      return;
    }
    if (key === "Backspace" || key === "Delete") {
      e.preventDefault();
      clearRange();
      return;
    }
    if (key === "Escape") {
      setFocus(anchor);
      return;
    }
    if (key.length === 1 && !mod && !e.altKey) {
      e.preventDefault();
      startEdit(key);
    }
  }

  function cellFromPoint(x: number, y: number): Cell | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-cell]");
    if (!el || !gridRef.current?.contains(el)) return null;
    return { r: Number(el.dataset.r), c: Number(el.dataset.c) };
  }

  function onPointerDown(e: PointerEvent<HTMLTableElement>) {
    if (e.button !== 0) return;
    setGlide(true);
    const target = e.target as HTMLElement;
    if (target.closest("input, button")) return;
    const rowHead = target.closest<HTMLElement>("[data-row-head]");
    if (rowHead) {
      const r = Number(rowHead.dataset.rowHead);
      if (e.shiftKey) setFocus({ r, c: maxC });
      else {
        setAnchor({ r, c: 0 });
        setFocus({ r, c: maxC });
      }
      e.preventDefault();
      gridRef.current?.focus();
      return;
    }
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    e.preventDefault();
    gridRef.current?.focus();
    select(cell, e.shiftKey);
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLTableElement>) {
    if (!dragging.current) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell && (cell.r !== focus.r || cell.c !== focus.c)) setFocus(cell);
  }

  function onPointerUp(e: PointerEvent<HTMLTableElement>) {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  let count = 0;
  let sum = 0;
  let numeric = 0;
  const numericCols = new Set<number>();
  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      const v = view[r]?.[columns[c].key];
      if (v === null || v === "" || v === undefined) continue;
      count++;
      if (typeof v === "number") {
        sum += v;
        numeric++;
        numericCols.add(c);
      }
    }
  }
  const statFmt =
    numericCols.size === 1 ? formatters[[...numericCols][0]] : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const ref =
    cellCount === 1 ? `${colName(left)}${top + 1}` : `${colName(left)}${top + 1}:${colName(right)}${bottom + 1}`;
  const frameMotion = reduce || !glide ? { duration: 0 } : { type: "spring" as const, stiffness: 700, damping: 50 };

  return (
    <div className={cn("w-full max-w-[640px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}>
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="min-w-14 rounded-md bg-muted px-2 py-1 text-center font-mono text-xs tabular-nums">{ref}</span>
          <span className="truncate text-muted-foreground text-xs">
            {editing ? "Editing · Enter to save, Esc to cancel" : "Double-click or type to edit"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button aria-label="Undo" disabled={!past.length} onClick={undo} size="icon" variant="ghost">
            <Undo2Icon />
          </Button>
          <Button aria-label="Redo" disabled={!future.length} onClick={redo} size="icon" variant="ghost">
            <Redo2Icon />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto" ref={scrollRef}>
        <div className="relative" ref={wrapRef} style={{ minWidth: 36 + columns.reduce((sum, col) => sum + (col.width ?? 120), 0) }}>
          <Table
            aria-activedescendant={editing ? undefined : cellId(anchor.r, anchor.c)}
            aria-colcount={columns.length}
            aria-label="Spreadsheet"
            aria-multiselectable
            aria-rowcount={view.length + 1}
            className="table-fixed select-none outline-none"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHasFocus(false);
            }}
            onCopy={onCopy}
            onCut={onCut}
            onDoubleClick={(e) => {
              // Pointer capture retargets clicks to the table, so find the cell from the pointer position.
              const cell = cellFromPoint(e.clientX, e.clientY);
              if (!cell || editing) return;
              const value = view[cell.r]?.[columns[cell.c].key] ?? null;
              select(cell, false);
              setEditing({
                r: cell.r,
                c: cell.c,
                value: value === null ? "" : String(value),
                replace: false,
                session: ++session.current,
              });
            }}
            onFocus={() => setHasFocus(true)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onPointerCancel={onPointerUp}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            ref={gridRef}
            role="grid"
            tabIndex={0}
          >
            <colgroup>
              <col style={{ width: 36 }} />
              {columns.map((col) => (
                <col key={col.key} style={{ width: col.width }} />
              ))}
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent!">
                <TableHead className="h-9 px-0 text-center font-mono text-[10px]" />
                {columns.map((col, c) => {
                  const dir = sort?.key === col.key ? sort.dir : null;
                  const SortIcon = dir === "asc" ? ArrowUpIcon : dir === "desc" ? ArrowDownIcon : ArrowUpDownIcon;
                  return (
                    <TableHead
                      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
                      className={cn("h-9 px-1", c >= left && c <= right && "text-foreground")}
                      key={col.key}
                    >
                      <button
                        className={cn(
                          "flex h-8 w-full cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                          col.type === "number" && "flex-row-reverse",
                        )}
                        onClick={() => cycleSort(col.key)}
                        type="button"
                      >
                        <span className="truncate">{col.label}</span>
                        <motion.span
                          animate={{ y: 0, opacity: dir ? 1 : 0.4 }}
                          className="inline-flex"
                          key={dir ?? "none"}
                          initial={{ y: dir === "asc" ? 4 : dir === "desc" ? -4 : 0, opacity: 0 }}
                          transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.2, bounce: 0 }}
                        >
                          <SortIcon className="size-3" />
                        </motion.span>
                      </button>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.length === 0 && (
                <TableRow className="hover:bg-transparent!">
                  <TableCell className="h-24 text-center text-muted-foreground text-sm" colSpan={columns.length + 1}>
                    No rows yet. Paste from a spreadsheet to fill it.
                  </TableCell>
                </TableRow>
              )}
              {view.map((row, r) => (
                <MotionRow
                  aria-rowindex={r + 2}
                  className="hover:bg-transparent!"
                  key={row.id}
                  layout={reduce ? false : "position"}
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                >
                  <TableCell
                    className={cn(
                      "cursor-pointer px-0 text-center font-mono text-[10px] text-muted-foreground tabular-nums transition-colors",
                      r >= top && r <= bottom && "bg-muted text-foreground",
                    )}
                    data-row-head={r}
                  >
                    {r + 1}
                  </TableCell>
                  {columns.map((col, c) => {
                    const value = row[col.key] ?? null;
                    const selected = inRange(r, c);
                    const isEditing = editing?.r === r && editing.c === c;
                    return (
                      <TableCell
                        aria-selected={selected}
                        className={cn(
                          "relative h-9 cursor-cell truncate px-2.5 py-0 transition-colors",
                          col.type === "number" && "text-right tabular-nums",
                          selected && cellCount > 1 && "bg-info/8 dark:bg-info/12",
                        )}
                        data-c={c}
                        data-cell=""
                        data-r={r}
                        id={cellId(r, c)}
                        key={col.key}
                        role="gridcell"
                      >
                        {display(value, c)}
                        {isEditing && editing && (
                          <input
                            aria-label={`Edit ${col.label}, row ${r + 1}`}
                            autoFocus
                            className={cn(
                              "absolute inset-0 z-20 w-full bg-popover px-2.5 text-sm outline-2 outline-info -outline-offset-2 rounded-[calc(var(--radius)*0.3)]",
                              col.type === "number" && "text-right tabular-nums",
                            )}
                            inputMode={col.type === "number" ? "decimal" : undefined}
                            onBlur={() => finishEdit("none")}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            onFocus={(e) => {
                              const input = e.currentTarget;
                              if (editing.replace) input.setSelectionRange(input.value.length, input.value.length);
                              else input.select();
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") {
                                e.preventDefault();
                                finishEdit("down");
                              } else if (e.key === "Tab") {
                                e.preventDefault();
                                finishEdit(e.shiftKey ? "left" : "right");
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                finishEdit("none", true);
                              }
                            }}
                            value={editing.value}
                          />
                        )}
                      </TableCell>
                    );
                  })}
                </MotionRow>
              ))}
            </TableBody>
          </Table>

          {frame && (
            <motion.div
              animate={{ opacity: hasFocus || editing ? 1 : 0.45 }}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10"
              initial={false}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <motion.span
                animate={{ x: frame.x, y: frame.y, scaleX: frame.w }}
                className="absolute top-0 left-0 h-0.5 w-px origin-left bg-info"
                initial={false}
                transition={frameMotion}
              />
              <motion.span
                animate={{ x: frame.x, y: frame.y + frame.h - 2, scaleX: frame.w }}
                className="absolute top-0 left-0 h-0.5 w-px origin-left bg-info"
                initial={false}
                transition={frameMotion}
              />
              <motion.span
                animate={{ x: frame.x, y: frame.y, scaleY: frame.h }}
                className="absolute top-0 left-0 h-px w-0.5 origin-top bg-info"
                initial={false}
                transition={frameMotion}
              />
              <motion.span
                animate={{ x: frame.x + frame.w - 2, y: frame.y, scaleY: frame.h }}
                className="absolute top-0 left-0 h-px w-0.5 origin-top bg-info"
                initial={false}
                transition={frameMotion}
              />
              <motion.span
                animate={{ x: frame.x + frame.w - 4, y: frame.y + frame.h - 4 }}
                className="absolute top-0 left-0 size-1.5 rounded-[1px] border border-card bg-info"
                initial={false}
                transition={frameMotion}
              />
            </motion.div>
          )}
        </div>
      </div>

      <div className="relative flex h-10 items-center justify-between gap-3 border-t px-3 text-muted-foreground text-xs">
        <div className="flex items-center gap-3 tabular-nums">
          <span>
            Count <span className="ms-0.5 font-medium text-foreground">{count}</span>
          </span>
          {numeric > 0 && (
            <>
              <span>
                Sum <span className="ms-0.5 font-medium text-foreground">{statFmt?.format(sum) ?? String(sum)}</span>
              </span>
              <span className="hidden sm:inline">
                Avg{" "}
                <span className="ms-0.5 font-medium text-foreground">{statFmt?.format(sum / numeric) ?? ""}</span>
              </span>
            </>
          )}
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <Kbd>⌘C</Kbd>
          <Kbd>⌘V</Kbd>
          <Kbd>⌘Z</Kbd>
        </div>
        <AnimatePresence>
          {notice && (
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute right-3 flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 font-medium text-primary-foreground shadow-xs/5"
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              key={notice.id}
              role="status"
              style={{ originX: 1 }}
              transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.25, bounce: 0 }}
            >
              <CheckIcon className="size-3" />
              {notice.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
