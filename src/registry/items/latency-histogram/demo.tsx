import { LatencyHistogram } from "@/registry/items/latency-histogram/latency-histogram";

export default function LatencyHistogramDemo() {
  return <LatencyHistogram caption="POST /v1/checkout · last hour" defaultRange={[750, 1050]} defaultScale="log" title="Request latency" />;
}
