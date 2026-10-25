"use client";

import { SendIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QuotaRing, QuotaRingGroup } from "@/registry/items/quota-ring/quota-ring";

const DAY = 86400000;

export default function QuotaRingDemo() {
  const [requests, setRequests] = useState(6240);
  const [resetsAt] = useState(() => Date.now() + 2 * DAY + 14 * 3600000 + 3 * 60000);

  return (
    <div className="flex w-full max-w-[480px] flex-col gap-3 rounded-2xl border bg-card p-3 shadow-xs/5">
      <div className="flex items-center justify-between gap-3 px-2 pt-1.5">
        <div className="flex flex-col">
          <span className="font-medium text-sm">Usage this cycle</span>
          <span className="text-muted-foreground text-xs">Team plan · Fernway Labs</span>
        </div>
        <Button onClick={() => setRequests((r) => (r >= 10600 ? 6240 : r + 900))} size="xs" variant="outline">
          <SendIcon />
          {requests >= 10600 ? "Reset demo" : "Send 900 calls"}
        </Button>
      </div>
      <QuotaRingGroup className="grid grid-cols-1 gap-1 min-[420px]:grid-cols-[repeat(3,auto)] min-[420px]:justify-between">
        <QuotaRing
          breakdown={[
            { label: "Production keys", value: Math.round(requests * 0.78) },
            { label: "Staging keys", value: Math.round(requests * 0.17) },
            { label: "Webhooks replay", value: requests - Math.round(requests * 0.78) - Math.round(requests * 0.17) },
          ]}
          label="API calls"
          limit={10000}
          resetsAt={resetsAt}
          used={requests}
        />
        <QuotaRing
          breakdown={[
            { label: "Uploads", value: 31 },
            { label: "Build cache", value: 6.4 },
            { label: "Logs", value: 3.2 },
          ]}
          label="Storage"
          limit={50}
          resetsAt={resetsAt}
          unit="GB"
          used={40.6}
        />
        <QuotaRing
          breakdown={[
            { label: "Admins", value: 3 },
            { label: "Members", value: 16 },
          ]}
          label="Seats"
          limit={20}
          used={19}
        />
      </QuotaRingGroup>
    </div>
  );
}
