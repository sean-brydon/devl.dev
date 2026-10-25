"use client";

import {
  ChevronRightIcon,
  FileBracesIcon,
  FileCodeIcon,
  FileCogIcon,
  FileIcon,
  FileImageIcon,
  FileLockIcon,
  FileTerminalIcon,
  FileTextIcon,
  FileTypeIcon,
  FolderIcon,
  FolderOpenIcon,
  GitBranchIcon,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export type GitStatus = "modified" | "added" | "untracked" | "renamed" | "deleted";

export interface FileNode {
  id: string;
  name: string;
  children?: FileNode[];
  status?: GitStatus;
}

export interface FileTreeProps {
  data: FileNode[];
  repo?: string;
  branch?: string;
  defaultExpanded?: string[];
  defaultSelected?: string;
  onOpen?: (node: FileNode) => void;
  onRename?: (node: FileNode, name: string) => void;
  onMove?: (node: FileNode, folderId: string | null) => void;
  onChange?: (data: FileNode[]) => void;
  className?: string;
}

const statuses: Record<GitStatus, { label: string; letter: string; dot: string; text: string }> = {
  modified: { label: "Modified", letter: "M", dot: "bg-warning", text: "text-warning-foreground" },
  added: { label: "Added", letter: "A", dot: "bg-success", text: "text-success-foreground" },
  untracked: { label: "Untracked", letter: "U", dot: "bg-info", text: "text-info-foreground" },
  renamed: { label: "Renamed", letter: "R", dot: "bg-muted-foreground", text: "text-muted-foreground" },
  deleted: { label: "Deleted", letter: "D", dot: "bg-destructive", text: "text-destructive-foreground" },
};

const statusRank: GitStatus[] = ["deleted", "modified", "renamed", "added", "untracked"];

function fileIcon(name: string): { Icon: LucideIcon; tone: string } {
  const lower = name.toLowerCase();
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".") + 1) : "";
  if (lower.endsWith(".lock") || lower === "pnpm-lock.yaml") return { Icon: FileLockIcon, tone: "text-muted-foreground" };
  if (lower.startsWith(".env") || lower.includes("config") || lower.startsWith(".")) {
    return { Icon: FileCogIcon, tone: "text-muted-foreground" };
  }
  if (["ts", "tsx", "js", "jsx", "mjs"].includes(ext)) return { Icon: FileCodeIcon, tone: "text-info" };
  if (["json", "yaml", "yml", "toml"].includes(ext)) return { Icon: FileBracesIcon, tone: "text-warning" };
  if (["md", "mdx", "txt"].includes(ext)) return { Icon: FileTextIcon, tone: "text-muted-foreground" };
  if (["png", "jpg", "jpeg", "svg", "webp", "gif"].includes(ext)) return { Icon: FileImageIcon, tone: "text-success" };
  if (["css", "scss", "woff2", "ttf"].includes(ext)) return { Icon: FileTypeIcon, tone: "text-violet-600 dark:text-violet-400" };
  if (["sh", "zsh", "bash"].includes(ext)) return { Icon: FileTerminalIcon, tone: "text-muted-foreground" };
  return { Icon: FileIcon, tone: "text-muted-foreground" };
}

const isFolder = (n: FileNode) => Array.isArray(n.children);

function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes]
    .map((n) => (n.children ? { ...n, children: sortNodes(n.children) } : n))
    .sort((a, b) => Number(isFolder(b)) - Number(isFolder(a)) || a.name.localeCompare(b.name));
}

interface Row {
  node: FileNode;
  depth: number;
  parentId: string | null;
  posinset: number;
  setsize: number;
}

function flatten(nodes: FileNode[], expanded: Set<string>, depth = 0, parentId: string | null = null): Row[] {
  return nodes.flatMap((node, i) => {
    const row: Row = { node, depth, parentId, posinset: i + 1, setsize: nodes.length };
    return node.children && expanded.has(node.id)
      ? [row, ...flatten(node.children, expanded, depth + 1, node.id)]
      : [row];
  });
}

function findNode(nodes: FileNode[], id: string): FileNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = n.children && findNode(n.children, id);
    if (hit) return hit;
  }
}

function findParentId(nodes: FileNode[], id: string, parent: string | null = null): string | null | undefined {
  for (const n of nodes) {
    if (n.id === id) return parent;
    if (n.children) {
      const hit = findParentId(n.children, id, n.id);
      if (hit !== undefined) return hit;
    }
  }
}

function removeNode(nodes: FileNode[], id: string): FileNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.children ? { ...n, children: removeNode(n.children, id) } : n));
}

function insertNode(nodes: FileNode[], folderId: string | null, node: FileNode): FileNode[] {
  if (folderId === null) return sortNodes([...nodes, node]);
  return nodes.map((n) =>
    n.id === folderId
      ? { ...n, children: sortNodes([...(n.children ?? []), node]) }
      : n.children
        ? { ...n, children: insertNode(n.children, folderId, node) }
        : n,
  );
}

function updateNode(nodes: FileNode[], id: string, patch: Partial<FileNode>): FileNode[] {
  return sortNodes(
    nodes.map((n) =>
      n.id === id ? { ...n, ...patch } : n.children ? { ...n, children: updateNode(n.children, id, patch) } : n,
    ),
  );
}

function contains(node: FileNode, id: string): boolean {
  return node.id === id || Boolean(node.children?.some((c) => contains(c, id)));
}

function folderStatus(node: FileNode): GitStatus | undefined {
  const found = new Set<GitStatus>();
  const walk = (n: FileNode) => {
    if (n.status) found.add(n.status);
    n.children?.forEach(walk);
  };
  node.children?.forEach(walk);
  return statusRank.find((s) => found.has(s));
}

function countChanges(nodes: FileNode[]): number {
  return nodes.reduce((sum, n) => sum + (n.status && !n.children ? 1 : 0) + (n.children ? countChanges(n.children) : 0), 0);
}

const ROW = 28;
const INDENT = 14;

export function FileTree({
  data,
  repo = "workspace",
  branch,
  defaultExpanded = [],
  defaultSelected,
  onOpen,
  onRename,
  onMove,
  onChange,
  className,
}: FileTreeProps) {
  const reduce = useReducedMotion();
  const [tree, setTree] = useState(() => sortNodes(data));
  const [expanded, setExpanded] = useState(() => new Set(defaultExpanded));
  const [selected, setSelected] = useState<string | null>(defaultSelected ?? null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [renameError, setRenameError] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | "root" | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusAfter = useRef<string | null>(null);

  const rows = useMemo(() => flatten(tree, expanded), [tree, expanded]);
  const changes = useMemo(() => countChanges(tree), [tree]);
  const activeId = selected && rows.some((r) => r.node.id === selected) ? selected : (rows[0]?.node.id ?? null);

  const commit = useCallback(
    (next: FileNode[]) => {
      setTree(next);
      onChange?.(next);
    },
    [onChange],
  );

  useEffect(() => () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);

  useEffect(() => {
    if (focusAfter.current) {
      rowRefs.current.get(focusAfter.current)?.focus();
      focusAfter.current = null;
    }
  });

  const focusRow = (id: string) => {
    setSelected(id);
    focusAfter.current = id;
  };

  const toggle = (id: string, open?: boolean) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      const shouldOpen = open ?? !next.has(id);
      if (shouldOpen) next.add(id);
      else next.delete(id);
      return next;
    });

  const startRename = (node: FileNode) => {
    setSelected(node.id);
    setRenaming(node.id);
    setDraft(node.name);
    setRenameError(false);
  };

  const finishRename = (save: boolean) => {
    const id = renaming;
    if (!id) return;
    const node = findNode(tree, id);
    const name = draft.trim();
    if (save && node && name && name !== node.name) {
      const parentId = findParentId(tree, id);
      const siblings = parentId ? (findNode(tree, parentId)?.children ?? []) : tree;
      if (siblings.some((s) => s.id !== id && s.name.toLowerCase() === name.toLowerCase())) {
        setRenameError(true);
        return;
      }
      const status: GitStatus | undefined =
        isFolder(node) || node.status === "added" || node.status === "untracked" ? node.status : "renamed";
      commit(updateNode(tree, id, { name, status }));
      onRename?.(node, name);
    }
    setRenaming(null);
    focusRow(id);
  };

  const move = (id: string, folderId: string | null) => {
    const node = findNode(tree, id);
    if (!node) return;
    if (folderId && contains(node, folderId)) return;
    if (findParentId(tree, id) === folderId) return;
    const siblings = folderId ? (findNode(tree, folderId)?.children ?? []) : tree;
    const clash = siblings.some((s) => s.name.toLowerCase() === node.name.toLowerCase());
    if (clash) return;
    const moved: FileNode =
      isFolder(node) || node.status === "added" || node.status === "untracked" ? node : { ...node, status: "renamed" };
    commit(insertNode(removeNode(tree, id), folderId, moved));
    if (folderId) toggle(folderId, true);
    onMove?.(node, folderId);
    focusRow(id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (renaming || !activeId) return;
    const index = rows.findIndex((r) => r.node.id === activeId);
    const row = rows[index];
    if (!row) return;
    const folder = isFolder(row.node);
    const open = expanded.has(row.node.id);
    const go = (i: number) => {
      const target = rows[Math.max(0, Math.min(rows.length - 1, i))];
      if (target) focusRow(target.node.id);
    };
    switch (e.key) {
      case "ArrowDown":
        go(index + 1);
        break;
      case "ArrowUp":
        go(index - 1);
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(rows.length - 1);
        break;
      case "ArrowRight":
        if (folder && !open) toggle(row.node.id, true);
        else if (folder && row.node.children?.length) go(index + 1);
        break;
      case "ArrowLeft":
        if (folder && open) toggle(row.node.id, false);
        else if (row.parentId) focusRow(row.parentId);
        break;
      case "Enter":
      case " ":
        if (folder) toggle(row.node.id);
        else onOpen?.(row.node);
        break;
      case "F2":
        startRename(row.node);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const targetFor = (row: Row): string | "root" => (isFolder(row.node) ? row.node.id : (row.parentId ?? "root"));

  const onDragOverRow = (e: DragEvent, row: Row) => {
    if (!dragId) return;
    const target = targetFor(row);
    const dragged = findNode(tree, dragId);
    if (dragged && target !== "root" && contains(dragged, target)) {
      setDropTarget(null);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dropTarget !== target) {
      setDropTarget(target);
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      if (target !== "root" && !expanded.has(target)) {
        hoverTimer.current = setTimeout(() => toggle(target, true), 650);
      }
    }
  };

  const endDrag = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setDragId(null);
    setDropTarget(null);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const id = dragId ?? e.dataTransfer.getData("text/plain");
    if (id && dropTarget) move(id, dropTarget === "root" ? null : dropTarget);
    endDrag();
  };

  const inTarget = (row: Row) => {
    if (!dropTarget || dropTarget === "root") return false;
    let parent: string | null = row.node.id;
    while (parent) {
      if (parent === dropTarget) return true;
      parent = findParentId(tree, parent) ?? null;
    }
    return false;
  };

  const rowTransition = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 520, damping: 42, mass: 0.7 };

  return (
    <div
      className={cn(
        "flex w-full max-w-[340px] flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{repo}</p>
          {branch && (
            <p className="flex items-center gap-1 text-muted-foreground text-xs">
              <GitBranchIcon aria-hidden className="size-3" />
              <span className="truncate font-mono">{branch}</span>
            </p>
          )}
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs tabular-nums">
          <AnimatedCount value={changes} /> {changes === 1 ? "change" : "changes"}
        </span>
      </div>

      <div
        className={cn(
          "relative p-1.5 transition-colors",
          dropTarget === "root" && "bg-primary/4 shadow-[inset_0_0_0_1px_var(--color-ring)]",
        )}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null);
        }}
        onDragOver={(e) => {
          if (!dragId) return;
          e.preventDefault();
          if (dropTarget !== "root") setDropTarget("root");
        }}
        onDrop={onDrop}
      >
        <ul aria-label={`${repo} files`} className="outline-none" onKeyDown={onKeyDown} role="tree">
          <AnimatePresence initial={false}>
            {rows.map((row) => {
              const { node, depth } = row;
              const folder = isFolder(node);
              const open = expanded.has(node.id);
              const isActive = node.id === activeId;
              const isRenaming = renaming === node.id;
              const status = folder ? folderStatus(node) : node.status;
              const { Icon, tone } = folder
                ? { Icon: open ? FolderOpenIcon : FolderIcon, tone: "text-muted-foreground" }
                : fileIcon(node.name);
              const highlighted = inTarget(row);
              return (
                <motion.li
                  animate={{ opacity: 1, height: ROW }}
                  aria-expanded={folder ? open : undefined}
                  aria-label={`${node.name}${status && !folder ? `, ${statuses[status].label}` : ""}`}
                  aria-level={depth + 1}
                  aria-posinset={row.posinset}
                  aria-selected={isActive}
                  aria-setsize={row.setsize}
                  className={cn(
                    "group/row relative cursor-default select-none overflow-hidden rounded-lg outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  )}
                  exit={{ opacity: 0, height: 0 }}
                  initial={{ opacity: 0, height: 0 }}
                  key={node.id}
                  layout="position"
                  onClick={() => {
                    setSelected(node.id);
                    if (folder) toggle(node.id);
                  }}
                  onDoubleClick={() => (folder ? undefined : startRename(node))}
                  onDragOver={(e) => onDragOverRow(e, row)}
                  onDrop={onDrop}
                  ref={(el) => {
                    if (el) rowRefs.current.set(node.id, el);
                    else rowRefs.current.delete(node.id);
                  }}
                  role="treeitem"
                  tabIndex={isActive && !isRenaming ? 0 : -1}
                  transition={rowTransition}
                >
                <div
                  className={cn("relative flex h-7 items-center", dragId === node.id && "opacity-48")}
                  draggable={!isRenaming}
                  onDragEnd={endDrag}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", node.id);
                    setDragId(node.id);
                    setSelected(node.id);
                  }}
                  style={{ paddingLeft: 6 + depth * INDENT }}
                >
                  {highlighted && <span aria-hidden className="absolute inset-0 rounded-lg bg-primary/6" />}
                  {isActive && <span aria-hidden className="absolute inset-0 rounded-lg bg-accent" />}
                  {!isActive && <span aria-hidden className="absolute inset-0 rounded-lg group-hover/row:bg-accent/50" />}
                  {depth > 0 &&
                    Array.from({ length: depth }, (_, i) => (
                      <span
                        aria-hidden
                        className="absolute inset-y-0 w-px bg-border"
                        key={i}
                        style={{ left: 6 + i * INDENT + 7 }}
                      />
                    ))}
                  <span className="relative flex w-3.5 shrink-0 items-center justify-center">
                    {folder && (
                      <ChevronRightIcon
                        aria-hidden
                        className={cn(
                          "size-3.5 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
                          open && "rotate-90",
                        )}
                      />
                    )}
                  </span>
                  <Icon aria-hidden className={cn("relative ms-1 size-4 shrink-0", tone)} />
                  {isRenaming ? (
                    <input
                      aria-invalid={renameError || undefined}
                      aria-label={`Rename ${node.name}`}
                      autoFocus
                      className={cn(
                        "relative ms-1.5 me-1 h-6 min-w-0 flex-1 rounded-md border border-ring bg-background px-1.5 font-mono text-xs outline-none ring-2 ring-ring/24",
                        renameError && "border-destructive ring-destructive/16",
                      )}
                      onBlur={() => finishRename(true)}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        setRenameError(false);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => {
                        const dot = e.target.value.lastIndexOf(".");
                        e.target.setSelectionRange(0, dot > 0 && !folder ? dot : e.target.value.length);
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") finishRename(true);
                        if (e.key === "Escape") finishRename(false);
                      }}
                      spellCheck={false}
                      value={draft}
                    />
                  ) : (
                    <span
                      className={cn(
                        "relative ms-1.5 min-w-0 flex-1 truncate text-sm",
                        node.status === "deleted" && "text-muted-foreground line-through",
                        isActive ? "text-foreground" : "text-foreground/88",
                      )}
                    >
                      {node.name}
                    </span>
                  )}
                  {status && !isRenaming && (
                    <span className="relative me-1.5 flex shrink-0 items-center gap-1.5">
                      {!folder && (
                        <span
                          aria-hidden
                          className={cn(
                            "font-medium font-mono text-[10px] opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-visible/row:opacity-100",
                            statuses[status].text,
                            isActive && "opacity-100",
                          )}
                        >
                          {statuses[status].letter}
                        </span>
                      )}
                      <motion.span
                        animate={{ scale: 1, opacity: folder ? 0.7 : 1 }}
                        aria-hidden
                        className={cn("size-1.5 rounded-full", statuses[status].dot, folder && "size-1")}
                        initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                        key={status}
                        title={statuses[status].label}
                        transition={reduce ? { duration: 0 } : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                      />
                    </span>
                  )}
                </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>

      <div className="flex items-center justify-between gap-3 border-t px-3.5 py-2 text-muted-foreground text-xs">
        <div className="flex items-center gap-2.5">
          {(["modified", "added", "renamed"] as const).map((s) => (
            <span className="flex items-center gap-1" key={s}>
              <span aria-hidden className={cn("size-1.5 rounded-full", statuses[s].dot)} />
              {statuses[s].label}
            </span>
          ))}
        </div>
        <span className="hidden items-center gap-1 sm:flex">
          <Kbd>F2</Kbd> rename
        </span>
      </div>
    </div>
  );
}

function AnimatedCount({ value }: { value: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-flex overflow-hidden align-bottom">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: -10, opacity: 0 }}
          initial={reduce ? { opacity: 0 } : { y: 10, opacity: 0 }}
          key={value}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 34 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
