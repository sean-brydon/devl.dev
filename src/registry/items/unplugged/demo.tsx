"use client";

import { useEffect, useState } from "react";
import { Unplugged, type UnpluggedStatus } from "@/registry/items/unplugged/unplugged";

export default function UnpluggedDemo() {
  const [status, setStatus] = useState<UnpluggedStatus>("offline");

  useEffect(() => {
    if (status === "offline") return;
    const t = setTimeout(() => setStatus(status === "connecting" ? "online" : "offline"), status === "connecting" ? 1200 : 3800);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <Unplugged
      description="Your edits are saved on this device and will sync once you're back."
      hue="sky"
      onReconnect={() => setStatus("connecting")}
      onlineDescription="All 12 changes synced. Pick up right where you left off."
      onlineTitle="You're back online"
      status={status}
      title="You're offline"
    />
  );
}
