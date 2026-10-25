import { useId } from "react";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  const id = `logo-goo-${useId().replace(/:/g, "")}`;
  return (
    <svg aria-hidden className={cn("size-7", className)} viewBox="0 0 28 28">
      <filter colorInterpolationFilters="sRGB" id={id}>
        <feGaussianBlur stdDeviation="1.6" />
        <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" />
      </filter>
      <g className="fill-brand" filter={`url(#${id})`}>
        <circle cx="11.5" cy="15.5" r="9" />
        <circle cx="21" cy="7.5" r="4.5" />
        <circle cx="22.5" cy="19.5" r="2.4" />
      </g>
      <path
        className="stroke-brand-foreground"
        d="M9.5 12.5 7 15.5l2.5 3M13.5 12.5l2.5 3-2.5 3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold text-[15px] text-foreground tracking-tight", className)}>
      <LogoMark />
      devl
    </span>
  );
}
