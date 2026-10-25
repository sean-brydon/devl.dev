"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { type CartLine, CartDrawer } from "@/registry/items/cart-drawer/cart-drawer";

function Mug() {
  return (
    <div className="relative flex size-full items-center justify-center bg-sky-100 dark:bg-sky-950/60">
      <div className="relative mt-1 h-[42%] w-[38%] rounded-b-[30%] rounded-t-[6%] bg-sky-700 shadow-[inset_-4px_0_0_--theme(--color-black/12%)] dark:bg-sky-500">
        <div className="absolute top-[18%] -right-[34%] h-[52%] w-[42%] rounded-e-full border-[3px] border-sky-700 border-s-0 dark:border-sky-500" />
        <div className="absolute inset-x-0 top-0 h-[10%] rounded-t-[inherit] bg-black/15" />
      </div>
    </div>
  );
}

function Candle() {
  return (
    <div className="relative flex size-full items-end justify-center bg-amber-100 pb-[22%] dark:bg-amber-950/50">
      <div className="relative h-[44%] w-[36%] rounded-[12%] bg-amber-50 shadow-[inset_0_-6px_0_--theme(--color-amber-900/14%)] ring-1 ring-amber-900/10 dark:bg-amber-200">
        <div className="absolute top-[34%] inset-x-0 h-[30%] bg-amber-700/80" />
        <div className="absolute -top-[22%] left-1/2 h-[22%] w-px -translate-x-1/2 bg-neutral-700" />
        <div className="absolute -top-[52%] left-1/2 h-[30%] w-[22%] -translate-x-1/2 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] bg-amber-400 shadow-[0_0_10px_2px_--theme(--color-amber-300/70%)]" />
      </div>
    </div>
  );
}

function Tote() {
  return (
    <div className="relative flex size-full items-end justify-center bg-stone-200 pb-[18%] dark:bg-stone-800/70">
      <div className="relative h-[46%] w-[50%] rounded-b-[8%] rounded-t-[4%] bg-stone-50 shadow-[inset_0_-5px_0_--theme(--color-black/6%)] dark:bg-stone-300">
        <div className="absolute -top-[46%] left-[18%] h-[56%] w-[28%] rounded-t-full border-[3px] border-stone-500 border-b-0" />
        <div className="absolute -top-[46%] right-[18%] h-[56%] w-[28%] rounded-t-full border-[3px] border-stone-500 border-b-0" />
        <div className="absolute top-[38%] left-1/2 size-[26%] -translate-x-1/2 rounded-full bg-emerald-600" />
      </div>
    </div>
  );
}

function Planter() {
  return (
    <div className="relative flex size-full items-end justify-center bg-emerald-100 pb-[18%] dark:bg-emerald-950/60">
      <div className="absolute bottom-[44%] left-1/2 h-[30%] w-[14%] -translate-x-[120%] -rotate-[28deg] rounded-[50%] bg-emerald-600" />
      <div className="absolute bottom-[46%] left-1/2 h-[36%] w-[15%] -translate-x-1/2 rounded-[50%] bg-emerald-500" />
      <div className="absolute bottom-[44%] left-1/2 h-[30%] w-[14%] translate-x-[20%] rotate-[28deg] rounded-[50%] bg-emerald-700" />
      <div className="relative h-[30%] w-[40%] rounded-b-[30%] bg-orange-700 [clip-path:polygon(0_0,100%_0,88%_100%,12%_100%)] dark:bg-orange-600" />
    </div>
  );
}

const CATALOG: (Omit<CartLine, "qty"> & { blurb: string })[] = [
  { id: "mug", name: "Tidewater Mug", variant: "Harbour blue · 350 ml", price: 28, art: <Mug />, blurb: "Stoneware" },
  { id: "candle", name: "Ember Candle", variant: "Fig & cedar · 220 g", price: 34, art: <Candle />, blurb: "Soy wax" },
  { id: "tote", name: "Market Tote", variant: "Natural canvas", price: 22, art: <Tote />, blurb: "Organic cotton" },
  { id: "planter", name: "Terra Planter", variant: "Small · with saucer", price: 39, art: <Planter />, blurb: "Hand thrown" },
];

export default function CartDrawerDemo() {
  const [items, setItems] = useState<CartLine[]>([
    { ...CATALOG[0], qty: 2 },
    { ...CATALOG[1], qty: 1 },
  ]);
  const [open, setOpen] = useState(true);

  const add = (id: string) => {
    const product = CATALOG.find((p) => p.id === id);
    if (!product) return;
    setItems((list) => (list.some((l) => l.id === id) ? list.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l)) : [...list, { ...product, qty: 1 }]));
    setOpen(true);
  };

  return (
    <CartDrawer
      className="h-[500px] w-[420px] max-w-full"
      freeShippingAt={120}
      items={items}
      onItemsChange={setItems}
      onOpenChange={setOpen}
      open={open}
    >
      {(cartButton) => (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="font-semibold text-sm tracking-tight">Oakmoss</span>
            <span className="hidden gap-4 text-muted-foreground text-xs sm:flex">
              <span>Kitchen</span>
              <span>Living</span>
              <span>Gifts</span>
            </span>
            {cartButton}
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-4">
            {CATALOG.map((p) => (
              <div className="flex flex-col" key={p.id}>
                <div className="relative aspect-square overflow-hidden rounded-xl">
                  {p.art}
                  <button
                    aria-label={`Add ${p.name} to bag`}
                    className="absolute right-2 bottom-2 flex size-8 cursor-pointer items-center justify-center rounded-full bg-background text-foreground shadow-sm/10 outline-none transition-[scale] duration-150 hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
                    onClick={() => add(p.id)}
                    type="button"
                  >
                    <PlusIcon className="size-4" />
                  </button>
                </div>
                <p className="mt-2 font-medium text-sm">{p.name}</p>
                <p className="text-muted-foreground text-xs">
                  {p.blurb} · <span className="tabular-nums">${p.price}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </CartDrawer>
  );
}
