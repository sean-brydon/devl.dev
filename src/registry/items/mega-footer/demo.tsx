import { MailIcon, MessagesSquareIcon, RssIcon } from "lucide-react";
import { MegaFooter } from "@/registry/items/mega-footer/mega-footer";

function Mark() {
  return (
    <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <svg aria-hidden className="size-4" fill="none" viewBox="0 0 16 16">
        <path d="M3 3h7l3 3v7H3z" fill="currentColor" opacity=".35" />
        <path d="M3 3h7v3h3v7H3z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </span>
  );
}

function XMark() {
  return (
    <svg aria-hidden fill="none" viewBox="0 0 16 16">
      <path d="M3 2.5h3l7 11h-3z" fill="currentColor" />
      <path d="M13 2.5 3.5 13.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

export default function MegaFooterDemo() {
  return (
    <div className="px-4 pt-12 sm:px-8 sm:pt-16">
      <MegaFooter
        brand={{ name: "Paperlane", mark: <Mark />, tagline: "The calm workspace for teams who write things down." }}
        columns={[
          {
            title: "Product",
            links: [
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
              { label: "Changelog", href: "#changelog", badge: "New" },
              { label: "Integrations", href: "#integrations" },
              { label: "Desktop app", href: "#desktop" },
            ],
          },
          {
            title: "Resources",
            links: [
              { label: "Docs", href: "#docs" },
              { label: "Guides", href: "#guides" },
              { label: "API reference", href: "#api" },
              { label: "Templates", href: "#templates" },
              { label: "Community", href: "#community" },
            ],
          },
          {
            title: "Company",
            links: [
              { label: "About", href: "#about" },
              { label: "Careers", href: "#careers", badge: "6 open" },
              { label: "Customers", href: "#customers" },
              { label: "Press kit", href: "#press" },
              { label: "Contact", href: "#contact" },
            ],
          },
          {
            title: "Use cases",
            links: [
              { label: "Product teams", href: "#product" },
              { label: "Agencies", href: "#agencies" },
              { label: "Support", href: "#support" },
              { label: "Startups", href: "#startups" },
            ],
          },
        ]}
        copyright="© 2026 Paperlane Labs, Inc."
        legal={[
          { label: "Privacy", href: "#privacy" },
          { label: "Terms", href: "#terms" },
          { label: "Cookies", href: "#cookies" },
          { label: "DPA", href: "#dpa" },
        ]}
        locales={[
          { value: "en-US", label: "English (US)" },
          { value: "en-GB", label: "English (UK)" },
          { value: "de", label: "Deutsch" },
          { value: "fr", label: "Français" },
          { value: "es", label: "Español" },
          { value: "ja", label: "日本語" },
        ]}
        newsletter={{ title: "The monthly digest" }}
        socials={[
          { label: "Paperlane on X", href: "#x", icon: <XMark /> },
          { label: "Community forum", href: "#forum", icon: <MessagesSquareIcon /> },
          { label: "RSS feed", href: "#rss", icon: <RssIcon /> },
          { label: "Email us", href: "#mail", icon: <MailIcon /> },
        ]}
        status={{ state: "operational", href: "#status" }}
      />
    </div>
  );
}
