"use client";

import { useEffect, useRef, useState } from "react";
import { GooGroup } from "@/components/goo-group";

interface RailCategory {
  name: string;
  slug: string;
  count: number;
}

/** Sticky jump list under the header; the active chip follows whichever section is in view. */
export function CategoryRail({ categories }: { categories: RailCategory[] }) {
  const [active, setActive] = useState(categories[0]?.slug ?? null);
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const scroller = rail.current;
    if (!scroller) return;
    const measure = () => {
      const max = scroller.scrollWidth - scroller.clientWidth;
      setEdges({ start: scroller.scrollLeft > 1, end: scroller.scrollLeft < max - 1 });
    };
    measure();
    scroller.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    return () => {
      scroller.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const sections = categories
      .map((c) => document.getElementById(c.slug))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [categories]);

  useEffect(() => {
    const scroller = rail.current;
    const chip = scroller?.querySelector<HTMLElement>(`[data-goo-value="${active}"]`);
    if (!scroller || !chip) return;
    const left = chip.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft;
    const right = left + chip.offsetWidth;
    if (left < scroller.scrollLeft) scroller.scrollTo({ left: left - 16 });
    else if (right > scroller.scrollLeft + scroller.clientWidth) scroller.scrollTo({ left: right - scroller.clientWidth + 16 });
  }, [active]);

  if (categories.length < 2) return null;

  return (
    <div className="sticky top-16 z-30 -mx-4 border-b bg-background/85 px-4 py-2.5 backdrop-blur-md md:-mx-8 md:px-8 max-md:top-[6.75rem]">
      <div
        className="overflow-x-auto [scrollbar-width:none]"
        ref={rail}
        style={{
          maskImage: `linear-gradient(to right, ${edges.start ? "transparent, black 2.5rem" : "black, black"}, ${edges.end ? "black calc(100% - 2.5rem), transparent" : "black, black"})`,
        }}
      >
        <GooGroup
          items={categories.map((c) => ({
            value: c.slug,
            href: `#${c.slug}`,
            label: (
              <>
                {c.name}
                <span className="font-mono text-[10px] opacity-60 tabular-nums">{c.count}</span>
              </>
            ),
          }))}
          className="bg-transparent p-0"
          label="Categories"
          size="sm"
          value={active}
        />
      </div>
    </div>
  );
}
