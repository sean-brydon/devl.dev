import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/sponsor-stats", "/advertise/checkout", "/advertise/success", "/advertise/cancelled"] },
    sitemap: "https://devl.dev/sitemap.xml",
    host: "https://devl.dev",
  };
}
