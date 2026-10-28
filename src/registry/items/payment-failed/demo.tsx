"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { type CardBrand, PaymentFailed, type PaymentCard } from "@/registry/items/payment-failed/payment-failed";

const CARDS: PaymentCard[] = [
  { id: "visa", brand: "visa", last4: "4242", expiry: "08/27" },
  { id: "mc", brand: "mastercard", last4: "8812", expiry: "03/28", note: "Backup" },
];
const DECLINES = { visa: "Declined Oct 28: insufficient funds" };

const brandOf = (number: string): CardBrand =>
  number.startsWith("4") ? "visa" : /^5[1-5]|^2[2-7]/.test(number) ? "mastercard" : /^3[47]/.test(number) ? "amex" : "card";

export default function PaymentFailedDemo() {
  const [cards, setCards] = useState(CARDS);
  const [declines, setDeclines] = useState<Record<string, string>>(DECLINES);
  const [status, setStatus] = useState<"due" | "processing" | "paid">("due");
  const [paidCardId, setPaidCardId] = useState<string>();
  const [run, setRun] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const pay = (cardId: string) => {
    setStatus("processing");
    timer.current = window.setTimeout(() => {
      if (cardId === "visa") {
        setDeclines((d) => ({ ...d, visa: "Declined again just now: insufficient funds. Try the backup card, or retry once the funds clear." }));
        setStatus("due");
        return;
      }
      setPaidCardId(cardId);
      setStatus("paid");
    }, 1100);
  };

  const replay = () => {
    window.clearTimeout(timer.current);
    setCards(CARDS);
    setDeclines(DECLINES);
    setStatus("due");
    setPaidCardId(undefined);
    setRun((r) => r + 1);
  };

  return (
    <div className="grid w-full max-w-md justify-items-center gap-3">
      <PaymentFailed
        billingEmail="billing@ridgeline.app"
        cards={cards}
        declines={declines}
        key={run}
        onAddCard={(details) =>
          setCards((list) => [
            ...list,
            { id: `card-${list.length}`, brand: brandOf(details.number), last4: details.number.slice(-4), expiry: details.expiry },
          ])
        }
        onPay={pay}
        paidCardId={paidCardId}
        status={status}
      />
      <Button className={status === "paid" ? undefined : "invisible"} onClick={replay} size="sm" variant="ghost">
        Replay
      </Button>
    </div>
  );
}
