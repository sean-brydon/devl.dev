"use client";

import { ArrowRightIcon, CalendarDaysIcon, HouseIcon, InboxIcon, SearchIcon, Settings2Icon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Magnetic, MagneticField } from "@/registry/items/magnetic/magnetic";

const dock = [
  { label: "Home", hint: "Back to your overview", icon: HouseIcon },
  { label: "Search", hint: "Find anything ⌘K", icon: SearchIcon },
  { label: "Inbox", hint: "3 unread from Marta", icon: InboxIcon },
  { label: "Calendar", hint: "Standup in 12 min", icon: CalendarDaysIcon },
  { label: "Settings", hint: "Workspace and billing", icon: Settings2Icon },
];

export default function MagneticDemo() {
  const [hovered, setHovered] = useState<number | null>(null);
  const current = hovered === null ? null : dock[hovered];

  return (
    <MagneticField className="flex w-full max-w-sm flex-col items-center gap-12 px-6 py-10">
      <Magnetic max={8} radius={64} strength={0.3}>
        <Button className="h-11 gap-2.5 rounded-full px-5 text-sm transition-[box-shadow,scale] active:scale-[0.97] sm:h-11">
          <Magnetic max={3} radius={48} strength={0.18}>
            Book a demo
          </Magnetic>
          <Magnetic max={5} radius={48} strength={0.3}>
            <ArrowRightIcon />
          </Magnetic>
        </Button>
      </Magnetic>

      <div className="flex flex-col items-center gap-3">
        <nav
          aria-label="App"
          className="flex items-center gap-1 rounded-full border bg-card p-1.5 shadow-xs/5"
          onPointerLeave={() => setHovered(null)}
        >
          {dock.map((item, i) => (
            <Magnetic group="dock" key={item.label} max={6} radius={28} strength={0.4}>
              <button
                aria-label={item.label}
                className="relative grid size-10 cursor-pointer place-items-center rounded-full text-muted-foreground outline-none transition-[color,background-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.94] data-[active]:bg-accent data-[active]:text-foreground"
                data-active={hovered === i ? "" : undefined}
                onBlur={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(i)}
                type="button"
              >
                <Magnetic max={3} radius={16} strength={0.2}>
                  <item.icon className="size-[18px]" />
                </Magnetic>
                {item.label === "Inbox" && (
                  <span className="absolute top-2 right-2 size-1.5 rounded-full bg-destructive ring-2 ring-card" />
                )}
              </button>
            </Magnetic>
          ))}
        </nav>
        <div className="relative h-4 w-full text-center text-muted-foreground text-xs">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-x-0 whitespace-nowrap"
              exit={{ opacity: 0, y: -3, transition: { duration: 0.12 } }}
              initial={{ opacity: 0, y: 3 }}
              key={current?.label ?? "idle"}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            >
              {current ? (
                <>
                  <span className="font-medium text-foreground">{current.label}</span> · {current.hint}
                </>
              ) : (
                <span className="pointer-coarse:invisible">Bring your pointer close</span>
              )}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </MagneticField>
  );
}
