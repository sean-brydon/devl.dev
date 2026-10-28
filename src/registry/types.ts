export type ItemKind = "component" | "block" | "screen" | "motion" | "illustration";

export interface RegistryItem {
  slug: string;
  name: string;
  description: string;
  kind: ItemKind;
  category: string;
  isNew?: boolean;
  featured?: boolean;
  /** Permanent catalogue number, shown as 001. */
  no?: number;
  /** Extra search terms (common names for the pattern). */
  keywords?: string[];
  source?: "bklit";
  upstream?: string;
  poweredBy?: "qnot";
  shoutout?: "coss-calendar";
  /** First exported component in the item's source, used for the usage snippet. */
  component?: string;
  /** Has its own Open Graph card at /og/<slug>.jpg (scripts/og-cards.mjs). */
  og?: true;
  /** Date (YYYY-MM-DD) of the last commit that touched the item, for the sitemap. */
  updated?: string;
  dependencies?: string[];
  uiDependencies?: string[];
}
