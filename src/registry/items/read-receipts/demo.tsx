"use client";

import { useEffect, useRef, useState } from "react";
import { type ReceiptMessage, ReadReceipts, type ReceiptPerson } from "@/registry/items/read-receipts/read-receipts";

const people: ReceiptPerson[] = [
  { id: "ana", name: "Ana Ruiz", initials: "AR", avatarClassName: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  { id: "sam", name: "Sam Okafor", initials: "SO", avatarClassName: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  { id: "leo", name: "Leo Brandt", initials: "LB", avatarClassName: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  { id: "ivy", name: "Ivy Chen", initials: "IC", avatarClassName: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  { id: "kai", name: "Kai Moreno", initials: "KM", avatarClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
];

const initialMessages: ReceiptMessage[] = [
  { id: "m1", from: "ana", text: "New onboarding screens are up in the review board." },
  { id: "m2", from: "ana", text: "Mostly after a gut check on the empty states." },
  { id: "m3", from: "leo", text: "Step 2 feels long. Could the workspace name be optional?" },
  { id: "m4", from: "me", text: "Agree, we can default it to the company domain." },
  { id: "m5", from: "sam", text: "Easy change on our side. I'll take it." },
];

export default function ReadReceiptsDemo() {
  const [messages, setMessages] = useState(initialMessages);
  const [readUpTo, setReadUpTo] = useState<Record<string, string>>({ ana: "m5", leo: "m4", sam: "m5", ivy: "m2", kai: "m3" });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  const read = (id: string, to: string) => setReadUpTo((r) => ({ ...r, [id]: to }));

  useEffect(() => {
    later(900, () => read("kai", "m4"));
    later(1700, () => read("leo", "m5"));
    later(2500, () => read("ivy", "m4"));
    later(3200, () => read("kai", "m5"));
    later(4100, () => read("ivy", "m5"));
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const send = (text: string) => {
    const id = `m-${Date.now()}`;
    setMessages((m) => [...m, { id, from: "me", text }]);
    ["ana", "sam", "leo", "kai", "ivy"].forEach((p, i) => later(1100 + i * 650 + Math.random() * 300, () => read(p, id)));
  };

  return <ReadReceipts messages={messages} onSend={send} people={people} readUpTo={readUpTo} title="design-crit" />;
}
