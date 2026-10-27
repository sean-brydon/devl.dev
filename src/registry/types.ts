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
  /** Has its own Open Graph card at /og/<slug>.jpg (scripts/og-cards.mjs). */
  og?: true;
  dependencies?: string[];
  uiDependencies?: string[];
}
