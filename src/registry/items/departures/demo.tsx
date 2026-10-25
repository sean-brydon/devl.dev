"use client";

import { useEffect, useState } from "react";
import { type Departure, Departures } from "@/registry/items/departures/departures";

interface Job {
  task: string;
  gate: string;
  notes: string[];
  from?: string;
  delay?: string;
  ask?: string;
  handTo?: string;
  done: string;
}

const crew: { id: string; agent: string; jobs: Job[] }[] = [
  {
    id: "atlas",
    agent: "Atlas",
    jobs: [
      { task: "Migrate users", gate: "pg", notes: ["Batch 3 of 8", "Batch 7 of 8"], handTo: "Juno", done: "users table moved" },
      { task: "Seed staging", gate: "pg", notes: ["1,200 fake accounts"], done: "Took 4 min" },
    ],
  },
  {
    id: "juno",
    agent: "Juno",
    jobs: [
      { task: "Write tests", gate: "jest", from: "Atlas", notes: ["38 specs so far"], delay: "Snapshot drifted, retrying", done: "214 passing" },
      { task: "Review PR 482", gate: "git", notes: ["Reading the diff"], done: "2 comments left" },
    ],
  },
  {
    id: "vega",
    agent: "Vega",
    jobs: [
      { task: "Push to main", gate: "git", notes: ["3 commits ready"], ask: "Push 3 commits to main?", done: "Pushed a1f9c3e" },
      { task: "Tag v4.2.0", gate: "git", notes: ["Writing notes"], handTo: "Orion", done: "Tag is live" },
    ],
  },
  {
    id: "pike",
    agent: "Pike",
    jobs: [
      { task: "Fix flaky CI", gate: "ci", notes: ["Runner picked it up"], delay: "Runner queue backed up", done: "Green after 2 tries" },
      { task: "Triage bugs", gate: "issue", notes: ["9 of 12 sorted"], done: "3 need a human" },
    ],
  },
  {
    id: "orion",
    agent: "Orion",
    jobs: [
      { task: "Changelog", gate: "docs", from: "Vega", notes: ["Grouping 31 PRs"], done: "Posted to docs" },
      { task: "Bump deps", gate: "npm", notes: ["14 packages"], done: "No breaking changes" },
    ],
  },
];

type Frame = Pick<Departure, "status" | "remark" | "question" | "connectingTo">;

function frames(job: Job): Frame[] {
  return [
    { status: "boarding", remark: job.from ? `Handed over by ${job.from}` : "Next in line" },
    ...job.notes.map((remark): Frame => ({ status: "running", remark })),
    ...(job.delay ? [{ status: "delayed", remark: job.delay } as Frame, { status: "running", remark: "Back on track" } as Frame] : []),
    ...(job.ask ? [{ status: "needs-you", question: job.ask } as Frame, { status: "running", remark: "Approved, on its way" } as Frame] : []),
    { status: "landed", remark: job.done, connectingTo: job.handTo },
  ];
}

interface Slot {
  job: number;
  frame: number;
  eta: number;
}
interface Board {
  minute: number;
  turn: number;
  slots: Slot[];
}

const order = [3, 0, 2, 4, 1];
const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function advance(b: Board, i: number): Slot {
  const s = b.slots[i];
  const jobs = crew[i].jobs;
  let { job, frame } = s;
  frame += 1;
  if (frame >= frames(jobs[job]).length) {
    job = (job + 1) % jobs.length;
    frame = 0;
  }
  return { job, frame, eta: etaFor(jobs[job], frame, b.minute) };
}

function etaFor(job: Job, frame: number, minute: number) {
  const list = frames(job);
  const status = list[frame].status;
  if (status === "landed") return minute;
  return minute + (list.length - 1 - frame) * 3 + (status === "delayed" ? 6 : 2);
}

function tick(b: Board): Board {
  for (let k = 0; k < order.length; k++) {
    const turn = (b.turn + k) % order.length;
    const i = order[turn];
    const f = frames(crew[i].jobs[b.slots[i].job])[b.slots[i].frame];
    if (f.status === "needs-you") continue;
    const slots = b.slots.slice();
    slots[i] = advance(b, i);
    return { minute: b.minute + 1, turn: turn + 1, slots };
  }
  return { ...b, minute: b.minute + 1 };
}

function initial(): Board {
  const minute = 14 * 60 + 20;
  const start: [number, number, number][] = [[0, 1, 0], [1, 1, 0], [0, 2, 0], [0, 2, 0], [1, 2, 7]];
  return {
    minute,
    turn: 0,
    slots: start.map(([job, frame, ago], i) => ({ job, frame, eta: etaFor(crew[i].jobs[job], frame, minute - ago) })),
  };
}

export default function DeparturesDemo() {
  const [board, setBoard] = useState(initial);

  useEffect(() => {
    const id = window.setInterval(() => setBoard(tick), 2400);
    return () => window.clearInterval(id);
  }, []);

  const approve = (id: string) => {
    const i = crew.findIndex((c) => c.id === id);
    setBoard((b) => {
      const slots = b.slots.slice();
      slots[i] = advance(b, i);
      return { ...b, slots };
    });
  };

  const waiting = board.slots.findIndex((s, i) => frames(crew[i].jobs[s.job])[s.frame].status === "needs-you");
  useEffect(() => {
    if (waiting < 0) return;
    const t = window.setTimeout(() => approve(crew[waiting].id), 9000);
    return () => window.clearTimeout(t);
  }, [waiting]);

  const departures: Departure[] = crew.map((c, i) => {
    const s = board.slots[i];
    const job = c.jobs[s.job];
    return { id: c.id, agent: c.agent, task: job.task, gate: job.gate, eta: fmt(s.eta), ...frames(job)[s.frame] };
  });

  return <Departures departures={departures} onApprove={approve} time={fmt(board.minute)} title="Release crew · Northwind" />;
}
