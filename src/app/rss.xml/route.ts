import { itemHref, items, kindOf } from "@/lib/registry";

const site = "https://devl.dev";
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The 50 newest pieces, one entry each, dated by the commit that added them.
export function GET() {
  const latest = items
    .filter((item) => item.added)
    .sort((a, b) => (b.added ?? "").localeCompare(a.added ?? "") || (b.no ?? 0) - (a.no ?? 0))
    .slice(0, 50);
  const entries = latest.map((item) => {
    const url = `${site}${itemHref(item)}`;
    return `    <item>
      <title>${escape(item.name)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(`${item.added}T12:00:00Z`).toUTCString()}</pubDate>
      <category>${escape(kindOf(item).label)}</category>
      <description>${escape(item.description)}</description>
    </item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>devl: new this week</title>
    <link>${site}/changelog</link>
    <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml" />
    <description>New free React components, blocks and screens on devl.</description>
    <language>en</language>
${entries.join("\n")}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
