"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { AdCard, AdStrip, AdTile, AdvertiseHereLink, PlaceholderTile, TileSkeleton } from "@/components/sponsor/ad-creative";
import { cossUiAd, sponsorAd } from "@/components/sponsor/house-ads";
import { useImpression } from "@/components/sponsor/impressions";
import { campaignOf, formatPrice, type LiveSponsor, type PlacementId, placements } from "@/lib/sponsors";

const cache = new Map<PlacementId, { at: number; promise: Promise<LiveSponsor | null> }>();

function fetchSponsor(placement: PlacementId) {
  const hit = cache.get(placement);
  if (hit && Date.now() - hit.at < 60_000) return hit.promise;
  const promise = fetch(`/api/sponsors/${placement}`)
    .then((r) => (r.ok ? (r.json() as Promise<{ sponsor: LiveSponsor | null }>) : { sponsor: null }))
    .then((data) => data.sponsor)
    .catch(() => null);
  cache.set(placement, { at: Date.now(), promise });
  return promise;
}

function useSponsor(placement: PlacementId) {
  const [state, setState] = useState<{ loaded: boolean; sponsor: LiveSponsor | null }>({ loaded: false, sponsor: null });
  useEffect(() => {
    let live = true;
    fetchSponsor(placement).then((sponsor) => live && setState({ loaded: true, sponsor }));
    return () => {
      live = false;
    };
  }, [placement]);
  return state;
}

function FadeIn({ children, className, ref }: { children: ReactNode; className?: string; ref?: RefObject<HTMLDivElement | null> }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      className={className}
      initial={reduce ? false : { opacity: 0, y: 4, filter: "blur(4px)" }}
      transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SponsorSlot({ placement, variant, aspect = false }: { placement: PlacementId; variant: "tile" | "card" | "strip"; aspect?: boolean }) {
  const { loaded, sponsor } = useSponsor(placement);
  const pathname = usePathname();
  const content = placement === "item" ? (pathname.split("/").filter(Boolean).pop() ?? pathname) : pathname;
  const ref = useRef<HTMLDivElement>(null);
  useImpression(ref, sponsor ? { b: sponsor.bookingId, p: placement, c: content } : null);
  const paid = sponsor && {
    ...sponsorAd(sponsor),
    href: `/api/sponsors/click/${sponsor.bookingId}?p=${encodeURIComponent(placement)}&c=${encodeURIComponent(content)}`,
  };
  const house = { ...cossUiAd, utm: { campaign: campaignOf(placement), content } };

  if (variant === "tile") {
    if (!loaded) return <TileSkeleton aspect={aspect} />;
    return (
      <FadeIn className="flex min-w-0 flex-col" ref={ref}>
        {paid ? (
          <AdTile aspect={aspect} className="flex-1" creative={paid} />
        ) : (
          <PlaceholderTile aspect={aspect} className="flex-1" priceLabel={`${formatPrice(placements[placement].priceCents)} / 2 weeks`} />
        )}
      </FadeIn>
    );
  }

  if (variant === "strip") {
    if (!loaded) return <div aria-hidden className="h-[4.75rem] rounded-2xl border border-dashed border-border/60" />;
    return (
      <FadeIn ref={ref}>
        <AdStrip aside={<AdvertiseHereLink />} creative={paid || house} />
      </FadeIn>
    );
  }

  if (!loaded) return <div aria-hidden className="h-[9.5rem] rounded-2xl border border-dashed border-border/60" />;
  return (
    <FadeIn ref={ref}>
      <AdCard creative={paid || house} footer={<AdvertiseHereLink />} />
    </FadeIn>
  );
}
