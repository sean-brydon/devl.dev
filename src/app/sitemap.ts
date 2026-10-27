import type { MetadataRoute } from "next";
import { itemHref, items, kinds } from "@/lib/registry";

const site = "https://devl.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const sections = kinds.map((kind) => ({ url: `${site}${kind.href}`, changeFrequency: "weekly" as const, priority: 0.8 }));
  const pages = items.map((item) => ({
    url: `${site}${itemHref(item)}`,
    changeFrequency: "monthly" as const,
    priority: item.isNew ? 0.7 : 0.6,
    images: [`${site}${item.og ? `/og/${item.slug}.jpg` : "/og.png"}`],
  }));
  return [
    { url: site, changeFrequency: "weekly", priority: 1 },
    ...sections,
    { url: `${site}/docs`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${site}/advertise`, changeFrequency: "monthly", priority: 0.3 },
    ...pages,
  ];
}
