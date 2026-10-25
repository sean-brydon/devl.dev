"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { RadialGauge } from "@/registry/items/radial-gauge/radial-gauge";

const regions = {
  US: { load: 58, peak: 81, nodes: 48, zone: "us-east-1" },
  EU: { load: 79, peak: 93, nodes: 32, zone: "eu-west-2" },
  APAC: { load: 91, peak: 97, nodes: 16, zone: "ap-south-1" },
} as const;
type Region = keyof typeof regions;

export default function RadialGaugeDemo() {
  const [region, setRegion] = useState<Region>("US");
  const [drift, setDrift] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setDrift(Math.round((Math.random() - 0.5) * 6)), 4000);
    return () => clearInterval(id);
  }, []);

  const r = regions[region];
  return (
    <RadialGauge
      action={
        <Tabs onValueChange={(v) => setRegion(v as Region)} value={region}>
          <TabsList aria-label="Region">
            {Object.keys(regions).map((k) => (
              <TabsTab className="px-2 text-xs sm:text-xs" key={k} value={k}>
                {k}
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>
      }
      caption={`${r.zone} · live`}
      label="Cluster CPU"
      target={75}
      value={Math.min(100, r.load + drift)}
    >
      <dl className="grid grid-cols-3 divide-x rounded-xl bg-muted/60 py-2.5 text-center text-xs dark:bg-muted">
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">Target</dt>
          <dd className="font-medium tabular-nums">75%</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">24h peak</dt>
          <dd className="font-medium tabular-nums">{r.peak}%</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">Nodes</dt>
          <dd className="font-medium tabular-nums">{r.nodes}</dd>
        </div>
      </dl>
    </RadialGauge>
  );
}
