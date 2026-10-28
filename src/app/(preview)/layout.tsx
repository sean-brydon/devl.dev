import { bootScript } from "@/lib/custom-theme";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

// Bare root for /preview/<slug>: the detail page frames it in an iframe, agents and tests hit it directly.
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={fontVariables} data-theme-scope="" lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-svh bg-background">{children}</body>
    </html>
  );
}
