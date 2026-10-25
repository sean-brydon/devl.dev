"use client";

import { useEffect, useRef, useState } from "react";
import { MorphIcon, type MorphIconName } from "@/registry/items/morph-icons/morph-icons";

const pairs: { name: MorphIconName; labels: [string, string]; actions: [string, string] }[] = [
  { name: "menu", labels: ["Menu", "Close"], actions: ["Open menu", "Close menu"] },
  { name: "play", labels: ["Play", "Pause"], actions: ["Play", "Pause"] },
  { name: "plus", labels: ["Add", "Added"], actions: ["Add to list", "Remove from list"] },
  { name: "theme", labels: ["Light", "Dark"], actions: ["Switch to dark", "Switch to light"] },
];

export default function MorphIconsDemo() {
  const [on, setOn] = useState([false, false, false, false]);
  const [auto, setAuto] = useState(true);
  const [onScreen, setOnScreen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!auto || !onScreen) return;
    let step = 0;
    const id = setInterval(() => {
      const i = step % pairs.length;
      setOn((prev) => prev.map((v, j) => (j === i ? !v : v)));
      step++;
    }, 900);
    return () => clearInterval(id);
  }, [auto, onScreen]);

  return (
    <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:grid-cols-4" ref={ref}>
      {pairs.map((pair, i) => (
        <button
          aria-label={pair.actions[on[i] ? 1 : 0]}
          aria-pressed={on[i]}
          className="group flex cursor-pointer flex-col items-center gap-3 rounded-2xl border bg-card px-3 pt-5 pb-4 shadow-xs/5 outline-none transition-[scale,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] [@media(hover:hover)]:hover:bg-[color-mix(in_srgb,var(--color-foreground)_3%,var(--color-card))]"
          key={pair.name}
          onClick={() => {
            setAuto(false);
            setOn((prev) => prev.map((v, j) => (j === i ? !v : v)));
          }}
          type="button"
        >
          <MorphIcon className="size-7" morphed={on[i]} name={pair.name} />
          <span className="text-muted-foreground text-xs">{pair.labels[on[i] ? 1 : 0]}</span>
        </button>
      ))}
    </div>
  );
}
