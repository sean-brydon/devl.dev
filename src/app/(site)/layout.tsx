import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "devl — components, shared", template: "%s · devl" },
  description: "Hand-built components on coss ui. Copy the source or install with the shadcn CLI.",
  metadataBase: new URL("https://devl.dev"),
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
