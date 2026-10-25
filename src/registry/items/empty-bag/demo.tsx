"use client";

import { useEffect, useState } from "react";
import { EmptyBag } from "@/registry/items/empty-bag/empty-bag";

export default function EmptyBagDemo() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (count === 0) return;
    const t = setTimeout(() => setCount(0), 4000);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <EmptyBag
      count={count}
      description="Nothing in here yet. Find something you love and it'll wait for you."
      filledDescription="Held for 48 hours. Shipping is free over $50 and returns are on us."
      hue="violet"
      onAdd={() => setCount((n) => n + 1)}
      price="$48"
      title="Your bag is empty"
    />
  );
}
