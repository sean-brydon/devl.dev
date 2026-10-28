import type { MetadataRoute } from "next";
import { itemHref, items, kinds } from "@/lib/registry";

const site = "https://devl.dev";

const latest = (dates: (string | undefined)[]) => dates.filter((d): d is string => Boolean(d)).sort().at(-1);

export default function sitemap(): MetadataRoute.Sitemap {
  const newest = latest(items.map((item) => item.updated));
  const sections = kinds.map((kind) => ({
    url: `${site}${kind.href}`,
    lastModified: latest(items.filter((item) => item.kind === kind.value).map((item) => item.updated)),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const pages = items.map((item) => ({
    url: `${site}${itemHref(item)}`,
    lastModified: item.updated,
    changeFrequency: "monthly" as const,
    priority: item.isNew ? 0.7 : 0.6,
    images: [`${site}${item.og ? `/og/${item.slug}.jpg` : "/og.png"}`],
  }));
  return [
    { url: site, lastModified: newest, changeFrequency: "weekly", priority: 1 },
    ...sections,
    ...["", "/mcp", "/skill", "/claude", "/codex", "/cursor", "/vscode"].map((page) => ({ url: `${site}/docs${page}`, changeFrequency: "monthly" as const, priority: 0.5 })),
    { url: `${site}/advertise`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${site}/changelog`, lastModified: newest, changeFrequency: "weekly", priority: 0.6 },
    { url: `${site}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    ...pages,
  ];
}
