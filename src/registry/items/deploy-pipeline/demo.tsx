"use client";

import { FlaskConicalIcon, HammerIcon, PackageIcon, RocketIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DeployPipeline, type PipelineStage } from "@/registry/items/deploy-pipeline/deploy-pipeline";

type Script = { id: string; name: string; icon: PipelineStage["icon"]; ms: number; logs: string[]; fail?: { logs: string[]; error: string } };

const script: Script[] = [
  {
    id: "install",
    name: "Install",
    icon: PackageIcon,
    ms: 1800,
    logs: ["> pnpm install --frozen-lockfile", "Lockfile is up to date", "Packages: +418", "Progress: resolved 418, reused 415, downloaded 3", "✓ Done in 1.8s"],
  },
  {
    id: "build",
    name: "Build",
    icon: HammerIcon,
    ms: 3200,
    logs: ["> next build", "Creating an optimized production build…", "⚠ Large page: /dashboard is 164 kB", "✓ Compiled successfully in 3.1s", "Collecting page data…", "✓ Generated 14 static pages"],
  },
  {
    id: "test",
    name: "Test",
    icon: FlaskConicalIcon,
    ms: 2600,
    logs: ["> vitest run", "✓ src/lib/money.test.ts (9)", "✓ src/lib/invoice.test.ts (14)", "✓ src/app/api/checkout.test.ts (6)", "✓ 48 passed (12 files) in 2.5s"],
    fail: {
      logs: [
        "> vitest run",
        "✓ src/lib/money.test.ts (9)",
        "✗ src/lib/invoice.test.ts (14 | 2 failed)",
        "  × prorates seats mid-cycle",
        "    expected 1080 to equal 1086.67",
        "  × rounds VAT per line",
        "✓ src/app/api/checkout.test.ts (6)",
        "FAIL 2 failed | 46 passed (12 files)",
      ],
      error: "2 tests failed in src/lib/invoice.test.ts",
    },
  },
  {
    id: "deploy",
    name: "Deploy",
    icon: RocketIcon,
    ms: 2200,
    logs: ["Uploading 214 files (3.4 MB)…", "Warming 3 regions: fra1, iad1, sin1", "Aliasing northwind-git-main-a1f9.preview.dev", "✓ Ready"],
  },
];

const fresh = (): PipelineStage[] => script.map((s) => ({ id: s.id, name: s.name, icon: s.icon, status: "queued", logs: [] }));

export default function DeployPipelineDemo() {
  const [stages, setStages] = useState<PipelineStage[]>(fresh);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const attempts = useRef<Record<string, number>>({});

  const patch = (id: string, p: Partial<PipelineStage> | ((s: PipelineStage) => Partial<PipelineStage>)) =>
    setStages((ss) => ss.map((s) => (s.id === id ? { ...s, ...(typeof p === "function" ? p(s) : p) } : s)));

  const runFrom = (index: number) => {
    const step = script[index];
    if (!step) return;
    const attempt = (attempts.current[step.id] = (attempts.current[step.id] ?? 0) + 1);
    const fails = step.fail && attempt === 1;
    const logs = fails && step.fail ? step.fail.logs : step.logs;
    const started = Date.now();
    patch(step.id, { status: "running", logs: [], startedAt: started, durationMs: undefined, error: undefined });
    logs.forEach((line, i) => {
      timers.current.push(setTimeout(() => patch(step.id, (s) => ({ logs: [...s.logs, line] })), ((i + 0.5) / logs.length) * step.ms));
    });
    timers.current.push(
      setTimeout(() => {
        if (fails && step.fail) {
          patch(step.id, { status: "failed", durationMs: Date.now() - started, error: step.fail.error });
          return;
        }
        patch(step.id, { status: "success", durationMs: Date.now() - started });
        runFrom(index + 1);
      }, step.ms + 150),
    );
  };

  useEffect(() => {
    const t = setTimeout(() => runFrom(0), 500);
    const all = timers.current;
    return () => {
      clearTimeout(t);
      all.forEach(clearTimeout);
    };
  }, []);

  return (
    <DeployPipeline
      commit={{ message: "Prorate seat changes mid-cycle", sha: "b6d2a9f01c44", branch: "main", author: "Tomás Reyes" }}
      onRetry={(id) => runFrom(script.findIndex((s) => s.id === id))}
      stages={stages}
      url="https://northwind-git-main-a1f9.preview.dev"
    />
  );
}
