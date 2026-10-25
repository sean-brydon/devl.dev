import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "devl — components, shared", template: "%s · devl" },
  description: "Hand-built components on coss ui. Copy the source or install with the shadcn CLI.",
  metadataBase: new URL("https://devl.dev"),
  openGraph: {
    type: "website",
    siteName: "devl",
    title: "devl — components with a little goo in them",
    description: "Free, hand-built components, blocks, screens, motion and illustrations on coss ui. Copy the source or install with the shadcn CLI.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "devl — components with a little goo in them" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={fontVariables} lang="en" suppressHydrationWarning>
      <body className="min-h-svh bg-background">
        <ThemeProvider>
          <SiteHeader />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
