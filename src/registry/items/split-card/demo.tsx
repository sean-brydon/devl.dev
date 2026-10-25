import { SplitCard } from "@/registry/items/split-card/split-card";

const usd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export default function SplitCardDemo() {
  return (
    <SplitCard
      defaultPeriod="30d"
      format={usd}
      good="down"
      periods={[
        {
          id: "7d",
          label: "7d",
          previousTotal: 12840,
          parts: [
            { id: "compute", label: "Compute", value: 4210 },
            { id: "inference", label: "Model inference", value: 5130 },
            { id: "storage", label: "Storage", value: 1460 },
            { id: "egress", label: "Bandwidth", value: 980 },
            { id: "logs", label: "Logs & traces", value: 620 },
          ],
        },
        {
          id: "30d",
          label: "30d",
          previousTotal: 49120,
          parts: [
            { id: "compute", label: "Compute", value: 19880 },
            { id: "inference", label: "Model inference", value: 16240 },
            { id: "storage", label: "Storage", value: 6120 },
            { id: "egress", label: "Bandwidth", value: 3410 },
            { id: "logs", label: "Logs & traces", value: 2560 },
          ],
        },
        {
          id: "90d",
          label: "90d",
          previousTotal: 131400,
          parts: [
            { id: "compute", label: "Compute", value: 58200 },
            { id: "inference", label: "Model inference", value: 34900 },
            { id: "storage", label: "Storage", value: 17650 },
            { id: "egress", label: "Bandwidth", value: 11200 },
            { id: "logs", label: "Logs & traces", value: 6980 },
          ],
        },
        {
          id: "1y",
          label: "1y",
          previousTotal: 402000,
          parts: [
            { id: "compute", label: "Compute", value: 214500 },
            { id: "inference", label: "Model inference", value: 98200 },
            { id: "storage", label: "Storage", value: 71300 },
            { id: "egress", label: "Bandwidth", value: 78400 },
            { id: "logs", label: "Logs & traces", value: 25100 },
          ],
        },
      ]}
      title="Cloud spend"
    />
  );
}
