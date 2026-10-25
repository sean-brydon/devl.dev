"use client";

import { BotIcon, CheckIcon, HandIcon, type LucideIcon, WrenchIcon, XIcon } from "lucide-react";
import { AnimatePresence, animate, MotionConfig, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export interface ConstellationAgent {
  id: string;
  name: string;
  icon?: LucideIcon;
  at?: [number, number];
  asks?: { tool: string; action: string }[];
}

export interface ConstellationTool {
  id: string;
  name: string;
  icon?: LucideIcon;
  at?: [number, number];
}

export interface ConstellationLink {
  agent: string;
  tool: string;
}

export interface ConstellationProps {
  agents: ConstellationAgent[];
  tools: ConstellationTool[];
  links: ConstellationLink[];
  title?: string;
  live?: boolean;
  autoApproveAfterMs?: number;
  onDecision?: (ask: ConstellationAsk, approved: boolean) => void;
  className?: string;
}

export interface ConstellationAsk {
  agent: string;
  tool: string;
  action: string;
}

type AgentStatus = "idle" | "working" | "waiting";

interface Pulse {
  id: number;
  agent: string;
  tool: string;
  dir: "call" | "answer";
}

interface LogLine {
  id: number;
  agent: string;
  tool: string;
  text: string;
  tone: "call" | "ok" | "warn" | "deny";
}

interface Point {
  x: number;
  y: number;
}

const W = 440;
const H = 260;
const CX = W / 2;
const CY = H / 2;

const key = (a: string, t: string) => `${a}→${t}`;

function ringLayout(agents: ConstellationAgent[], tools: ConstellationTool[], links: ConstellationLink[]) {
  const pos: Record<string, Point> = {};
  const angles: Record<string, number> = {};
  const n = agents.length;
  agents.forEach((a, i) => {
    const ang = n === 1 ? -Math.PI / 2 : -Math.PI / 2 + (i / n) * Math.PI * 2;
    angles[a.id] = ang;
    pos[a.id] = n === 1 ? { x: CX, y: CY } : { x: CX + Math.cos(ang) * 82, y: CY + Math.sin(ang) * 52 };
  });
  const want = tools.map((t) => {
    const users = links.filter((l) => l.tool === t.id).map((l) => angles[l.agent] ?? 0);
    const sx = users.reduce((s, a) => s + Math.cos(a), 0);
    const sy = users.reduce((s, a) => s + Math.sin(a), 0);
    return { id: t.id, ang: users.length ? Math.atan2(sy, sx) : 0 };
  });
  want.sort((a, b) => a.ang - b.ang);
  const m = want.length;
  const step = (Math.PI * 2) / Math.max(m, 1);
  let best = 0;
  let bestErr = Number.POSITIVE_INFINITY;
  for (let k = 0; k < 72; k++) {
    const off = (k / 72) * step;
    let err = 0;
    want.forEach((w, i) => {
      const d = Math.atan2(Math.sin(w.ang - (off + i * step - Math.PI)), Math.cos(w.ang - (off + i * step - Math.PI)));
      err += d * d;
    });
    if (err < bestErr) {
      bestErr = err;
      best = off;
    }
  }
  want.forEach((w, i) => {
    const ang = best + i * step - Math.PI;
    pos[w.id] = { x: CX + Math.cos(ang) * 176, y: CY + Math.sin(ang) * 104 };
  });
  for (const node of [...agents, ...tools]) if (node.at) pos[node.id] = { x: node.at[0] * W, y: node.at[1] * H };
  return pos;
}

function curve(a: Point, b: Point) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const bend = 0.12 * len;
  const c = { x: mx - (dy / len) * bend, y: my + (dx / len) * bend };
  return { c, d: `M${a.x} ${a.y} Q${c.x} ${c.y} ${b.x} ${b.y}` };
}

function quad(a: Point, c: Point, b: Point, t: number) {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

function PulseDot({
  from,
  to,
  ctrl,
  tone,
  reduce,
  dim,
  onDone,
}: {
  dim: boolean;
  from: Point;
  to: Point;
  ctrl: Point;
  tone: "call" | "answer";
  reduce: boolean;
  onDone: () => void;
}) {
  const t = useMotionValue(0);
  const cx = useTransform(t, (v) => quad(from, ctrl, to, v).x);
  const cy = useTransform(t, (v) => quad(from, ctrl, to, v).y);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const c = animate(t, 1, {
      duration: reduce ? 0.05 : 0.75,
      ease: [0.45, 0, 0.25, 1],
      onComplete: () => done.current(),
    });
    return () => c.stop();
  }, [t, reduce]);
  return (
    <g className="transition-opacity duration-300" opacity={dim ? 0.15 : 1}>
      <motion.circle
        className={tone === "call" ? "fill-info/25" : "fill-success/25"}
        cx={cx}
        cy={cy}
        r={7}
      />
      <motion.circle className={tone === "call" ? "fill-info" : "fill-success"} cx={cx} cy={cy} r={3.25} />
    </g>
  );
}

export function Constellation({
  agents,
  tools,
  links,
  title = "Agent network",
  live = true,
  autoApproveAfterMs,
  onDecision,
  className,
}: ConstellationProps) {
  const reduce = useReducedMotionAfterMount();
  const pos = useMemo(() => ringLayout(agents, tools, links), [agents, tools, links]);
  const paths = useMemo(() => {
    const out: Record<string, { d: string; c: Point; a: Point; b: Point }> = {};
    for (const l of links) {
      const a = pos[l.agent];
      const b = pos[l.tool];
      if (!a || !b) continue;
      out[key(l.agent, l.tool)] = { ...curve(a, b), a, b };
    }
    return out;
  }, [links, pos]);

  const [status, setStatus] = useState<Record<string, AgentStatus>>(() =>
    Object.fromEntries(agents.map((a, i) => [a.id, i === agents.length - 1 ? "idle" : "working"])),
  );
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [heat, setHeat] = useState<Record<string, number>>({});
  const [toolBusy, setToolBusy] = useState<Record<string, number>>({});
  const [ask, setAsk] = useState<ConstellationAsk | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const [calls, setCalls] = useState(0);
  const [hoverId, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const hover = hoverId ?? pinned;

  const ids = useRef(0);
  const inFlight = useRef(new Set<string>());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const statusRef = useRef(status);
  statusRef.current = status;
  const askRef = useRef(ask);
  askRef.current = ask;

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  useEffect(() => {
    const t = timers.current;
    return () => {
      for (const id of t) clearTimeout(id);
      t.clear();
    };
  }, []);

  const pushLog = useCallback((line: Omit<LogLine, "id">) => {
    setLog((l) => [{ ...line, id: ++ids.current }, ...l].slice(0, 3));
  }, []);

  const fire = useCallback(
    (agent: string, tool: string) => {
      inFlight.current.add(agent);
      setPulses((p) => [...p, { id: ++ids.current, agent, tool, dir: "call" }]);
      setHeat((h) => ({ ...h, [key(agent, tool)]: Math.min((h[key(agent, tool)] ?? 0) + 1, 5) }));
      setCalls((c) => c + 1);
    },
    [],
  );

  const resolve = useCallback(
    (approved: boolean) => {
      const a = askRef.current;
      if (!a) return;
      setAsk(null);
      onDecision?.(a, approved);
      setStatus((s) => ({ ...s, [a.agent]: "working" }));
      const agentName = agents.find((x) => x.id === a.agent)?.name ?? a.agent;
      if (approved) {
        pushLog({ agent: agentName, tool: a.action, text: "approved", tone: "ok" });
        fire(a.agent, a.tool);
      } else {
        pushLog({ agent: agentName, tool: a.action, text: "denied", tone: "deny" });
        inFlight.current.delete(a.agent);
      }
    },
    [agents, fire, onDecision, pushLog],
  );

  useEffect(() => {
    if (!live) return;
    let tick = 0;
    let nextAsk = 8;
    const iv = setInterval(() => {
      tick++;
      const st = statusRef.current;
      for (const a of agents) {
        const s = st[a.id];
        if (s === "working" && !inFlight.current.has(a.id) && Math.random() < 0.5) {
          const mine = links.filter((l) => l.agent === a.id);
          const pick = mine[Math.floor(Math.random() * mine.length)];
          if (pick) fire(a.id, pick.tool);
        }
      }
      if (tick % 9 === 0) {
        const pool = agents.filter((a) => st[a.id] !== "waiting" && !inFlight.current.has(a.id));
        const flip = pool[Math.floor(Math.random() * pool.length)];
        const busy = agents.filter((a) => st[a.id] === "working").length;
        if (flip && (st[flip.id] === "idle" || busy > 2)) {
          setStatus((s) => ({ ...s, [flip.id]: s[flip.id] === "idle" ? "working" : "idle" }));
        }
      }
      if (askRef.current) nextAsk = tick + 16;
      else if (tick >= nextAsk) {
        const candidates = agents.filter((a) => a.asks?.length && st[a.id] === "working" && !inFlight.current.has(a.id));
        const who = candidates[Math.floor(Math.random() * candidates.length)];
        if (who?.asks) {
          const q = who.asks[Math.floor(Math.random() * who.asks.length)];
          inFlight.current.add(who.id);
          setStatus((s) => ({ ...s, [who.id]: "waiting" }));
          setAsk({ agent: who.id, tool: q.tool, action: q.action });
          pushLog({ agent: who.name, tool: q.action, text: "needs you", tone: "warn" });
        }
      }
      setHeat((h) => {
        const n: Record<string, number> = {};
        for (const [k, v] of Object.entries(h)) if (v * 0.88 > 0.05) n[k] = v * 0.88;
        return n;
      });
    }, 450);
    return () => clearInterval(iv);
  }, [live, agents, links, fire, pushLog]);

  useEffect(() => {
    if (!ask || !autoApproveAfterMs) return;
    const id = setTimeout(() => resolve(true), autoApproveAfterMs);
    return () => clearTimeout(id);
  }, [ask, autoApproveAfterMs, resolve]);

  const onPulseDone = useCallback(
    (p: Pulse) => {
      setPulses((list) => list.filter((x) => x.id !== p.id));
      if (p.dir === "call") {
        setToolBusy((b) => ({ ...b, [p.tool]: (b[p.tool] ?? 0) + 1 }));
        later(
          () => {
            setToolBusy((b) => ({ ...b, [p.tool]: Math.max((b[p.tool] ?? 1) - 1, 0) }));
            setPulses((list) => [...list, { id: ++ids.current, agent: p.agent, tool: p.tool, dir: "answer" }]);
          },
          250 + Math.random() * 550,
        );
      } else {
        inFlight.current.delete(p.agent);
        const a = agents.find((x) => x.id === p.agent);
        const t = tools.find((x) => x.id === p.tool);
        pushLog({
          agent: a?.name ?? p.agent,
          tool: t?.name ?? p.tool,
          text: `${Math.round(120 + Math.random() * 760)}ms`,
          tone: "call",
        });
      }
    },
    [agents, tools, later, pushLog],
  );

  const related = (k: string) => {
    if (!hover) return true;
    const [a, t] = k.split("→");
    return a === hover || t === hover;
  };

  const working = agents.filter((a) => status[a.id] === "working").length;
  const askAgent = ask ? agents.find((a) => a.id === ask.agent) : null;
  const askTool = ask ? tools.find((t) => t.id === ask.tool) : null;

  return (
    <MotionConfig reducedMotion="user">
    <div className={cn("w-full max-w-[480px] overflow-hidden rounded-2xl border bg-card shadow-xs/5", className)}>
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative flex size-2">
            {live && !reduce && <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />}
            <span className="relative size-2 rounded-full bg-success" />
          </span>
          <h3 className="truncate font-medium text-sm">{title}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-muted-foreground text-xs tabular-nums">
          <span>
            <span className="text-foreground">{working}</span>/{agents.length} working
          </span>
          <span>
            <span className="text-foreground">{calls}</span> calls
          </span>
        </div>
      </div>

      <div className="relative mx-auto aspect-[440/260] w-full">
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${W} ${H}`}>
          {links.map((l) => {
            const k = key(l.agent, l.tool);
            const p = paths[k];
            if (!p) return null;
            const h = heat[k] ?? 0;
            const pending = ask && ask.agent === l.agent && ask.tool === l.tool;
            return (
              <g key={k}>
              <motion.path
                animate={{
                  strokeWidth: pending ? 1.5 : 1 + h * 0.9,
                  opacity: related(k) ? (pending ? 1 : 0.35 + Math.min(h, 3) * 0.2) : 0.12,
                }}
                className={cn(pending ? "stroke-warning" : "stroke-foreground/45")}
                d={p.d}
                fill="none"
                initial={false}
                strokeDasharray={pending ? "4 4" : undefined}
                strokeLinecap="round"
                transition={{ type: "spring", stiffness: 140, damping: 22 }}
              />
              <motion.path
                animate={{
                  strokeWidth: 1 + h * 0.9,
                  opacity: pending || !related(k) ? 0 : Math.min(h / 2.5, 1) * 0.55,
                }}
                className="stroke-info"
                d={p.d}
                fill="none"
                initial={false}
                strokeLinecap="round"
                transition={{ type: "spring", stiffness: 140, damping: 22 }}
              />
              </g>
            );
          })}
          {pulses.map((p) => {
            const path = paths[key(p.agent, p.tool)];
            if (!path) return null;
            return (
              <PulseDot
                ctrl={path.c}
                dim={!related(key(p.agent, p.tool))}
                from={p.dir === "call" ? path.a : path.b}
                key={p.id}
                onDone={() => onPulseDone(p)}
                reduce={reduce}
                to={p.dir === "call" ? path.b : path.a}
                tone={p.dir}
              />
            );
          })}
        </svg>

        {tools.map((t) => {
          const p = pos[t.id];
          const Icon = t.icon ?? WrenchIcon;
          const busy = (toolBusy[t.id] ?? 0) > 0;
          const dim = hover && hover !== t.id && !links.some((l) => l.tool === t.id && l.agent === hover);
          return (
            <button
              aria-label={`${t.name}${busy ? ", running" : ""}`}
              aria-pressed={pinned === t.id}
              className={cn(
                "absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-full border bg-background py-0.5 pr-2 pl-1.5 after:absolute after:inset-x-0 after:-inset-y-1.5 font-mono text-[11px] text-muted-foreground outline-none transition-[color,border-color,opacity,box-shadow,scale] duration-300 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                pinned === t.id && "border-foreground/30 text-foreground",
                busy && "border-info/40 text-foreground ring-3 ring-info/12",
                dim && "border-border/50 text-muted-foreground/40 [&_svg]:opacity-40",
              )}
              key={t.id}
              onBlur={() => setHover(null)}
              onFocus={() => setHover(t.id)}
              onPointerEnter={(e) => e.pointerType === "mouse" && setHover(t.id)}
              onClick={() => setPinned((x) => (x === t.id ? null : t.id))}
              onPointerLeave={() => setHover(null)}
              style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` }}
              type="button"
            >
              <Icon className={cn("size-3 shrink-0 transition-colors", busy && "text-info")} />
              {t.name}
            </button>
          );
        })}

        {agents.map((a) => {
          const p = pos[a.id];
          const Icon = a.icon ?? BotIcon;
          const s = status[a.id];
          const dim = hover && hover !== a.id && !links.some((l) => l.agent === a.id && l.tool === hover);
          return (
            <button
              aria-label={`${a.name}: ${s === "waiting" ? "needs your approval" : s}`}
              aria-pressed={pinned === a.id}
              className={cn(
                "group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-full outline-none transition-[scale] duration-150 ease-out active:scale-[0.97]",
              )}
              key={a.id}
              onBlur={() => setHover(null)}
              onFocus={() => setHover(a.id)}
              onPointerEnter={(e) => e.pointerType === "mouse" && setHover(a.id)}
              onClick={() => setPinned((x) => (x === a.id ? null : a.id))}
              onPointerLeave={() => setHover(null)}
              style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` }}
              type="button"
            >
              <span className="relative flex size-10 items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-card" />
                {s !== "idle" && !reduce && !dim && (
                  <motion.span
                    animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                    className={cn("absolute inset-0 rounded-full", s === "waiting" ? "bg-warning/40" : "bg-info/25")}
                    transition={{ duration: s === "waiting" ? 1.4 : 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  />
                )}
                <span
                  className={cn(
                    "relative flex size-10 items-center justify-center rounded-full border bg-card shadow-xs/5 transition-[color,background-color,border-color,opacity] duration-300 group-focus-visible:ring-2 group-focus-visible:ring-ring",
                    dim && "opacity-40",
                    s === "working" && "border-info/50 text-info-foreground",
                    s === "waiting" && "border-warning bg-warning text-white",
                    s === "idle" && "text-muted-foreground",
                  )}
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      initial={{ scale: 0.9, opacity: 0 }}
                      key={s === "waiting" ? "hand" : "icon"}
                      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                    >
                      {s === "waiting" ? <HandIcon className="size-4" /> : <Icon className="size-4" />}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </span>
              <span
                className={cn(
                  "rounded-full px-1 font-medium text-[11px] leading-tight transition-opacity duration-300",
                  dim && "opacity-40",
                  s === "waiting" ? "text-warning-foreground" : s === "idle" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {a.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative h-[68px] border-t bg-muted/40">
        <AnimatePresence initial={false} mode="popLayout">
          {ask && askAgent ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 flex items-center gap-3 px-4"
              exit={{ opacity: 0, y: 8 }}
              initial={{ opacity: 0, y: 8 }}
              key="ask"
              role="alert"
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-warning/12 text-warning-foreground">
                <HandIcon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-medium text-foreground text-sm">{askAgent.name} needs you</p>
                <p className="truncate text-muted-foreground">
                  Wants to <span className="font-mono text-foreground">{ask.action}</span>
                  {askTool ? ` via ${askTool.name}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button aria-label="Deny" className="transition-[scale,box-shadow] duration-150 ease-out active:scale-[0.97]" onClick={() => resolve(false)} size="icon-sm" variant="outline">
                  <XIcon />
                </Button>
                <Button className="transition-[scale,box-shadow] duration-150 ease-out active:scale-[0.97]" onClick={() => resolve(true)} size="sm">
                  <CheckIcon />
                  Approve
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.ul
              animate={{ opacity: 1, y: 0 }}
              aria-live="polite"
              className="absolute inset-0 flex flex-col gap-0.5 overflow-hidden px-4 pt-2.5 font-mono text-[11px]"
              exit={{ opacity: 0, y: -8 }}
              initial={{ opacity: 0, y: -8 }}
              key="log"
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {log.length === 0 && <li className="text-muted-foreground">Waiting for the first call…</li>}
                {log.map((l, i) => (
                  <motion.li
                    animate={{ opacity: 1 - i * 0.3, y: 0 }}
                    className="flex h-4 items-center gap-1.5 overflow-hidden whitespace-nowrap leading-4"
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    initial={{ opacity: 0, y: -6 }}
                    key={l.id}
                    layout="position"
                    transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        l.tone === "call" && "bg-success",
                        l.tone === "ok" && "bg-info",
                        l.tone === "warn" && "bg-warning",
                        l.tone === "deny" && "bg-destructive",
                      )}
                    />
                    <span className="text-foreground">{l.agent}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="truncate text-foreground">{l.tool}</span>
                    <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">{l.text}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
    </MotionConfig>
  );
}
