import { TallyHero } from "@/registry/items/tally-hero/tally-hero";

export default function TallyHeroDemo() {
  return (
    <TallyHero
      cta={{ label: "Run a free audit", href: "#audit" }}
      defaultPeriod="year"
      description="Ferrow reads the invoices, contracts and cloud bills you already have and claws back what you were never meant to pay. Every dollar is itemised, so finance can check the sum."
      eyebrow="Ferrow · money back, itemised"
      note="Connect your inbox and card feeds in ten minutes. We only charge a share of what comes back."
      periods={[
        {
          id: "month",
          label: "Month",
          range: "Sep 1 – Sep 30, 2026",
          caption: "won back for 287 finance teams in September.",
          lines: [
            { label: "Duplicate invoices", detail: "×126", amount: 118_942 },
            { label: "Unused seats", detail: "×604", amount: 84_317 },
            { label: "Idle cloud spend", detail: "×19", amount: 79_628 },
            { label: "Renewals stopped", detail: "×33", amount: 52_886 },
            { label: "Price rises refused", detail: "×14", amount: 41_637 },
          ],
        },
        {
          id: "quarter",
          label: "Quarter",
          range: "Jul 1 – Sep 30, 2026",
          caption: "won back for 298 finance teams this quarter.",
          lines: [
            { label: "Duplicate invoices", detail: "×371", amount: 341_286 },
            { label: "Unused seats", detail: "×1,822", amount: 252_964 },
            { label: "Idle cloud spend", detail: "×57", amount: 228_413 },
            { label: "Renewals stopped", detail: "×104", amount: 166_059 },
            { label: "Price rises refused", detail: "×41", amount: 118_702 },
          ],
        },
        {
          id: "year",
          label: "Year",
          range: "Jan 1 – Oct 24, 2026",
          caption: "won back for 312 finance teams so far this year.",
          lines: [
            { label: "Duplicate invoices", detail: "×1,412", amount: 1_284_316 },
            { label: "Unused seats", detail: "×6,930", amount: 962_451 },
            { label: "Idle cloud spend", detail: "×214", amount: 871_928 },
            { label: "Renewals stopped", detail: "×388", amount: 640_307 },
            { label: "Price rises refused", detail: "×151", amount: 459_638 },
          ],
        },
      ]}
      reference="Ref. FRW-2026-0412"
      totalLabel="Total recovered"
    />
  );
}
