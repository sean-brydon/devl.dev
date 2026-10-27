import { generatedItems } from "@/registry/__generated__/index";
import type { ItemKind, RegistryItem } from "@/registry/types";

export type { ItemKind, RegistryItem };

export const kinds: { value: ItemKind; label: string; href: string }[] = [
  { value: "component", label: "Components", href: "/components" },
  { value: "block", label: "Blocks", href: "/blocks" },
  { value: "screen", label: "Screens", href: "/screens" },
  { value: "motion", label: "Motion", href: "/motion" },
  { value: "illustration", label: "Illustrations", href: "/illustrations" },
];

/** Display order of categories per kind; unknown categories sort after these. */
export const categoryOrder: Record<ItemKind, string[]> = {
    component: ["Liquid", "Conversation", "Mission Control", "Trust & Control", "Writing", "Forms", "Filters", "Status", "Numbers", "Charts", "Together", "Workspace", "Dev Tools", "Commerce", "Getting Started"],
    block: ["Heroes", "Marketing", "Content", "Auth", "Dashboards", "Apps", "Filters"],
    screen: ["Shells", "AI", "Product", "Auth", "Settings", "Comms", "Dev", "Commerce", "Personal"],
    motion: ["Liquid", "Text", "Surfaces", "Cursor", "Loading", "Celebration"],
    illustration: ["Connections", "Empty States", "Characters", "Objects", "Celebrations"],
};

export const items: RegistryItem[] = [...generatedItems].sort(
  (a, b) => (a.no ?? Number.MAX_SAFE_INTEGER) - (b.no ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name),
);

export function itemsOfKind(kind: ItemKind) {
  return items.filter((item) => item.kind === kind);
}

export function getItem(slug: string) {
  return items.find((item) => item.slug === slug);
}

export function kindOf(item: RegistryItem) {
  return kinds.find((k) => k.value === item.kind)!;
}

export function itemHref(item: RegistryItem) {
  return `${kindOf(item).href}/${item.slug}`;
}

export function itemNumber(item: RegistryItem) {
  return String(item.no ?? generatedItems.findIndex((i) => i.slug === item.slug) + 1).padStart(3, "0");
}

export const bklit = {
  name: "bklit",
  site: "https://ui.bklit.com",
  repo: "https://github.com/bklit/bklit-ui",
  sponsor: "https://github.com/sponsors/uixmat",
  author: "uixmat",
  docs: (name: string) => `https://bklit.com/docs/components/${name}`,
  registry: (name: string) => `https://ui.bklit.com/r/${name}.json`,
};

export const qnot = {
  name: "Qnot",
  site: "https://coss.com/qnot",
  repo: "https://github.com/cosscom/qnot",
  packages: ["@qnot/core", "@qnot/react"],
};

export const devl = { repo: "https://github.com/sean-brydon/devl.dev", cut: 35 };

export const cossUi = { name: "coss ui", site: "https://coss.com/ui" };

export const cossCalendar = { name: "coss calendar", site: "https://coss.com/calendar" };

export function registryUrl(item: RegistryItem) {
  return item.source === "bklit" ? bklit.registry(item.upstream ?? item.slug) : `https://devl.dev/r/${item.slug}.json`;
}

export function rawUrl(item: RegistryItem) {
  return item.source === "bklit" ? registryUrl(item) : `https://devl.dev/raw/${item.slug}.tsx`;
}

export function installCommand(item: RegistryItem) {
  return `npx shadcn@latest add ${registryUrl(item)}`;
}

export function categorySlug(category: string) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function categoriesOf(kind: ItemKind) {
  const counts = new Map<string, number>();
  for (const item of itemsOfKind(kind)) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  const order = categoryOrder[kind];
  const rank = (name: string) => (order.includes(name) ? order.indexOf(name) : Number.MAX_SAFE_INTEGER);
  return [...counts]
    .map(([name, count]) => ({ name, count, slug: categorySlug(name) }))
    .sort((a, b) => rank(a.name) - rank(b.name) || b.count - a.count || a.name.localeCompare(b.name));
}
