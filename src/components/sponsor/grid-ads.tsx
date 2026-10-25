import type { ReactNode } from "react";
import { AdTile } from "@/components/sponsor/ad-creative";
import { bklitAd, cossUiAd } from "@/components/sponsor/house-ads";
import { SponsorSlot } from "@/components/sponsor/sponsor-slot";
import { campaignOf, gridPlacement } from "@/lib/sponsors";

const HOUSE_CATEGORY = "Charts";

type Ad = { at: number; node: ReactNode };

/**
 * Where ads go in a section grid: the paid slot is the 3rd tile of the first category, coss ui the 3rd tile of
 * the second (or further down the first when there is only one), and the Charts category always carries bklit.
 */
export function planGridAds(kind: string, categoryNames: string[], aspect: boolean) {
  const plan = new Map<string, Ad[]>();
  const add = (category: string | undefined, ad: Ad) => category && plan.set(category, [...(plan.get(category) ?? []), ad]);
  const regular = categoryNames.filter((name) => name !== HOUSE_CATEGORY);
  const placement = gridPlacement(kind);
  const utm = { campaign: placement ? campaignOf(placement) : `grid-${kind}` };

  if (placement) add(regular[0], { at: 2, node: <SponsorSlot aspect={aspect} key="sponsor" placement={placement} variant="tile" /> });
  add(regular[1] ?? regular[0], { at: regular[1] ? 2 : 5, node: <AdTile aspect={aspect} creative={{ ...cossUiAd, utm }} key="coss-ui" /> });
  if (categoryNames.includes(HOUSE_CATEGORY)) add(HOUSE_CATEGORY, { at: 2, node: <AdTile aspect={aspect} creative={{ ...bklitAd, utm }} key="bklit" /> });

  return (category: string, tiles: ReactNode[]) => {
    const out = [...tiles];
    for (const ad of (plan.get(category) ?? []).sort((a, b) => a.at - b.at)) out.splice(Math.min(ad.at, out.length), 0, ad.node);
    return out;
  };
}
