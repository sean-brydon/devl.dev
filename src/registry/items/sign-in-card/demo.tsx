"use client";

import { Building2Icon, FingerprintIcon } from "lucide-react";
import { useState } from "react";
import { SignInCard } from "@/registry/items/sign-in-card/sign-in-card";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function SignInCardDemo() {
  const [round, setRound] = useState(0);
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-12 sm:px-8">
      <SignInCard
        defaultEmail="mara@fieldnote.co"
        key={round}
        onPasswordSignIn={async (_email, password) => {
          await wait(900);
          if (password === "wrong") return { ok: false, error: "That email and password don't match our records." };
          setTimeout(() => setRound((r) => r + 1), 2600);
          return { ok: true, name: "Mara" };
        }}
        onSendLink={() => wait(900)}
        providers={[
          { id: "passkey", label: "Passkey", icon: FingerprintIcon },
          { id: "sso", label: "Single sign-on", icon: Building2Icon },
        ]}
      />
      <p className="text-center text-muted-foreground text-xs">Any password signs you in. Type “wrong” to see the error.</p>
    </div>
  );
}
