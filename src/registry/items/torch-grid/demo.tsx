import { GitBranchIcon, GlobeIcon, type LucideIcon, ShieldCheckIcon, ZapIcon } from "lucide-react";
import { TorchCard, TorchGrid } from "@/registry/items/torch-grid/torch-grid";

const features: { icon: LucideIcon; title: string; body: string; stat: string }[] = [
  { icon: ZapIcon, title: "Instant sync", body: "Edits land on every open tab before you lift your finger.", stat: "38 ms p95" },
  { icon: ShieldCheckIcon, title: "Audit trail", body: "Every change signed, timestamped and searchable.", stat: "400 days" },
  { icon: GitBranchIcon, title: "Branch previews", body: "Each pull request gets its own live copy to click through.", stat: "Per PR" },
  { icon: GlobeIcon, title: "Edge regions", body: "Requests are served from whichever region answers first.", stat: "18 regions" },
];

export default function TorchGridDemo() {
  return (
    <div className="@container w-full max-w-xl">
      <TorchGrid className="grid grid-cols-1 gap-3 @md:grid-cols-2">
      {features.map((f) => (
        <TorchCard className="flex flex-col gap-6 p-5" key={f.title}>
          <div className="flex items-center justify-between">
            <span className="grid size-9 place-items-center rounded-xl border bg-background text-foreground shadow-xs/5">
              <f.icon className="size-4" />
            </span>
            <span className="font-mono text-muted-foreground text-xs tabular-nums">{f.stat}</span>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-medium text-sm">{f.title}</h3>
            <p className="text-pretty text-muted-foreground text-sm">{f.body}</p>
          </div>
        </TorchCard>
      ))}
      </TorchGrid>
    </div>
  );
}
