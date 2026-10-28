import type { Metadata } from "next";
import { DocsPage } from "@/components/docs";
import { devl } from "@/lib/registry";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What devl.dev, its MCP server and its agent files collect: no accounts, no cookies, no IP addresses.",
  alternates: { canonical: "/privacy" },
};

const link = "text-foreground underline underline-offset-4";

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-8 pb-24 md:px-8 md:pt-14">
      <DocsPage lead="devl has no accounts, sets no cookies and never stores your IP address. This page lists everything it does keep." title="Privacy">
        <p className="text-muted-foreground text-sm">Last updated October 28, 2026.</p>

        <section>
          <h2>The website</h2>
          <p>
            Page views are counted with Cloudflare Web Analytics, which is cookieless and doesn't fingerprint visitors. It reports pages, referrers,
            countries and page speed in aggregate.
          </p>
          <p>
            Your theme, sound and preview theme choices are saved in your browser's local storage so they stick between visits. They never leave
            your device.
          </p>
        </section>

        <section>
          <h2>Installs, agent files and the MCP server</h2>
          <p>
            When the shadcn CLI, an agent or a browser fetches a registry file, raw source, <code>llms.txt</code>, a Markdown page, the skill or
            the MCP server at <code>https://devl.dev/mcp</code>, devl counts it in Cloudflare Workers Analytics Engine. Each count holds only:
          </p>
          <ul className="flex list-disc flex-col gap-1.5 ps-5">
            <li>what was fetched (an item slug, a file name, or an MCP method or tool name)</li>
            <li>a coarse client family from the user agent, such as shadcn, cursor or browser, never the full string</li>
            <li>the two-letter country, the referrer's host name and the HTTP status</li>
          </ul>
          <p>
            For MCP, devl keeps the tool name, the item slug passed to <code>get_item</code>, and the client name your editor sends when it connects.
            Search queries and briefs you or your agent send are used to answer the request and then discarded, never logged. The MCP server needs no
            sign-in and has no user data to read or change.
          </p>
          <p>
            When a search in the site's search box finds nothing, devl counts the search phrase, lowercased and cut to 48 characters, so it knows what
            to build next. Phrases that look like an email address or a long number are dropped.
          </p>
          <p>Analytics Engine keeps these counts for three months.</p>
        </section>

        <section>
          <h2>Email updates</h2>
          <p>
            If you sign up for updates on the changelog, devl stores your email address, when you signed up and which form you used. It's used only to
            email you when new pieces land. To be removed,{" "}
            <a className={link} href={`${devl.repo}/issues`}>
              ask on GitHub
            </a>{" "}
            or reply to any update.
          </p>
        </section>

        <section>
          <h2>Sponsors</h2>
          <p>
            If you book a sponsor slot, devl stores what you submit (product name, pitch, link, accent colour and email) and a snapshot of your
            link's preview image, so the ad can run and you can be contacted about it. Payment is handled by Stripe; devl never sees card details.
            Impressions and clicks on ads are counted per day as plain totals, with nothing about who saw or clicked them.
          </p>
        </section>

        <section>
          <h2>Hosting and contact</h2>
          <p>
            devl runs on Cloudflare, which processes requests to deliver the site and keeps short-lived operational logs. devl doesn't sell or share
            data with anyone else.
          </p>
          <p>
            Questions or requests:{" "}
            <a className={link} href={`${devl.repo}/issues`}>
              open an issue on GitHub
            </a>
            .
          </p>
        </section>
      </DocsPage>
    </div>
  );
}
