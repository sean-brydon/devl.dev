"use client";

import { useEffect, useRef, useState } from "react";
import { Waitlist, type WaitlistReferral } from "@/registry/items/waitlist/waitlist";

const FRIENDS: WaitlistReferral[] = [
  { id: "r1", name: "Noor Haddad", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  { id: "r2", name: "Felix Brandt", tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  { id: "r3", name: "Aiko Tanaka", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
];

export default function WaitlistDemo() {
  const [referrals, setReferrals] = useState<WaitlistReferral[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <div className="px-4 py-12 sm:px-8 sm:py-16">
      <Waitlist
        defaultEmail="sam@northpaw.studio"
        onJoin={async () => {
          await new Promise((r) => setTimeout(r, 900));
          FRIENDS.forEach((f, i) => {
            timers.current.push(setTimeout(() => setReferrals((list) => [...list, f]), 3000 + i * 2800));
          });
          return { position: 2481, total: 6213, link: "parcel.so/r/sam-k4f9" };
        }}
        referrals={referrals}
        spotsPerReferral={250}
      />
    </div>
  );
}
