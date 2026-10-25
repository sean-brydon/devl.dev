"use client";

import { ArrowRightIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CURRENCIES, formatMoney, MoneyInput } from "@/registry/items/money-input/money-input";

const RATES: Record<string, number> = { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 151, INR: 83.4 };
const AVAILABLE_USD = 8420.5;

export default function MoneyInputDemo() {
  const [amount, setAmount] = useState<number | null>(1250);
  const [code, setCode] = useState("USD");
  const currency = CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
  const rate = RATES[code];
  const round = (v: number) => (code === "JPY" ? Math.floor(v) : Math.floor(v * 100) / 100);
  const max = round(AVAILABLE_USD * rate);
  const min = round(10 * rate);
  const valid = amount !== null && amount >= min && amount <= max;

  return (
    <div className="grid w-88 max-w-full gap-4 rounded-2xl border bg-card p-5 shadow-xs/5">
      <div className="grid gap-0.5">
        <p className="font-medium text-sm">Request a payout</p>
        <p className="text-muted-foreground text-xs">To Northwind Studio · •••• 4821</p>
      </div>
      <MoneyInput
        currency={code}
        hintAction={
          <Button className="shrink-0" onClick={() => setAmount(max)} size="xs" variant="ghost">
            Use max
          </Button>
        }
        label="Amount"
        max={max}
        min={min}
        onCurrencyChange={(next) => {
          const decimals = next === "JPY" ? 1 : 100;
          setAmount((a) => (a === null ? a : Math.round((a / RATES[code]) * RATES[next] * decimals) / decimals));
          setCode(next);
        }}
        onValueChange={setAmount}
        value={amount}
      />
      <Button disabled={!valid}>
        {valid ? `Send ${formatMoney(amount, currency)}` : amount === null ? "Enter an amount" : "Check the amount"}
        <ArrowRightIcon />
      </Button>
    </div>
  );
}
