import type { Metadata } from "next";
import { CustomThemeProvider } from "@/components/custom-theme";
import { SiteHeader } from "@/components/site-header";
import { ThemeCustomiser } from "@/components/theme-customiser";
import { ThemeProvider } from "@/components/theme-provider";
import { bootScript } from "@/lib/custom-theme";
import { fontVariables } from "@/lib/fonts";
import { items } from "@/lib/registry";
import "../globals.css";

// Cloudflare Web Analytics (cookieless) for the devl.dev site. The token is public: it ships in every page. See ANALYTICS.md.
const webAnalyticsToken = "7b83599f04bd40b9afb112cfcbac20b2";

export const metadata: Metadata = {
  title: { default: "devl — free React components, blocks and screens for shadcn", template: "%s · devl" },
  description: `${items.length} free, open-source React components, blocks, screens, motion and illustrations on coss ui (Base UI and Tailwind). Copy the source or install with the shadcn CLI.`,
  metadataBase: new URL("https://devl.dev"),
  openGraph: {
    type: "website",
    siteName: "devl",
    title: "devl — components with a little goo in them",
    description: "Free, taste-tested components, blocks, screens, motion and illustrations on coss ui. Copy the source or install with the shadcn CLI.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "devl — components with a little goo in them" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={fontVariables} lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-svh bg-background">
        <ThemeProvider>
          <CustomThemeProvider>
            <SiteHeader />
            <main>{children}</main>
            <ThemeCustomiser />
          </CustomThemeProvider>
        </ThemeProvider>
        <script data-cf-beacon={JSON.stringify({ token: webAnalyticsToken })} defer src="https://static.cloudflareinsights.com/beacon.min.js" />
      </body>
    </html>
  );
}
