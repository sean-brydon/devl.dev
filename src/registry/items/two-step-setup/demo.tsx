"use client";

import { useState } from "react";
import { TwoStepSetup } from "@/registry/items/two-step-setup/two-step-setup";

export default function TwoStepSetupDemo() {
  const [round, setRound] = useState(0);
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-12 sm:px-8">
      <TwoStepSetup
        account="jo@quillstack.io"
        issuer="Quillstack"
        key={round}
        onCancel={() => setRound((r) => r + 1)}
        onDone={() => setRound((r) => r + 1)}
        verify={async (code) => {
          await new Promise((r) => setTimeout(r, 800));
          return code !== "000000";
        }}
      />
      <p className="text-center text-muted-foreground text-xs">Any code passes except 000000.</p>
    </div>
  );
}
