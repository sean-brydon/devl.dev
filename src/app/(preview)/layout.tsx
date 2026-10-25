import { fontVariables } from "@/lib/fonts";
import "../globals.css";

// Bare root for /preview/<slug>: the detail page frames it in an iframe, agents and tests hit it directly.
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={fontVariables} lang="en" suppressHydrationWarning>
      <body className="min-h-svh bg-background">{children}</body>
    </html>
  );
}
