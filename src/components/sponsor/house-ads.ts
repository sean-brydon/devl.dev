import type { AdCreative } from "@/components/sponsor/ad-creative";
import { bklit } from "@/lib/registry";
import type { LiveSponsor } from "@/lib/sponsors";

export const cossUiAd: AdCreative = {
  name: "coss ui",
  pitch: "The kit every devl component is built on — Base UI + Tailwind, copy-paste, open source.",
  url: "https://coss.com/ui",
  accent: "ink",
  monogram: "co",
  image: "/api/sponsors/house/coss-ui",
  cta: "Explore coss ui",
  label: "Built with",
  rel: "noopener",
};

export const bklitAd: AdCreative = {
  name: "bklit",
  title: "bklit — open-source charts for React",
  pitch: "Every chart on this page is bklit. Built on visx + motion, MIT.",
  url: bklit.site,
  accent: "teal",
  monogram: "bk",
  image: "/api/sponsors/house/bklit",
  cta: "Visit bklit",
  label: "Featured",
  rel: "noopener",
  secondary: { label: "Star on GitHub", url: bklit.repo },
};

export function sponsorAd(sponsor: Pick<LiveSponsor, "productName" | "pitch" | "url" | "accent" | "monogram" | "image">): AdCreative {
  return {
    name: sponsor.productName,
    pitch: sponsor.pitch,
    url: sponsor.url,
    accent: sponsor.accent,
    monogram: sponsor.monogram,
    image: sponsor.image,
    label: "Sponsored",
    rel: "sponsored noopener",
  };
}
