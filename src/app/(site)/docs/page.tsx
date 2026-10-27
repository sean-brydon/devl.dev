import type { Metadata } from "next";
import Link from "next/link";
import { Code, DocsPage, Step, Steps } from "@/components/docs";

export const metadata: Metadata = {
  title: "Getting started",
  description: "Install devl components with the shadcn CLI, copy the raw source, or hand devl to your AI editor through the MCP server and agent skill.",
  alternates: { canonical: "/docs" },
};

export default function GettingStarted() {
  return (
    <DocsPage lead="Every devl piece is one TypeScript file built on coss ui. Add it with the shadcn CLI and it's yours to change." title="Getting started">
      <section>
        <Steps>
          <Step n={1} title="Set up coss ui">
            <p>devl builds on coss ui (Base UI and Tailwind CSS v4). Add it to your project once:</p>
            <Code>npx shadcn@latest init @coss/style</Code>
          </Step>
          <Step n={2} title="Add a piece">
            <p>Every item page has its install command. It copies one file into your components folder, with the coss ui parts it needs:</p>
            <Code>npx shadcn@latest add https://devl.dev/r/liquid-slider.json</Code>
          </Step>
          <Step n={3} title="Use it">
            <p>Import the named export and render it. Every prop has a typed default, so it works straight away; pass your own data when you're ready.</p>
            <Code label="app/page.tsx">{`import { LiquidSlider } from "@/components/liquid-slider";

export default function Page() {
  return <LiquidSlider />;
}`}</Code>
          </Step>
        </Steps>
      </section>

      <section>
        <h2>Shorter installs with a namespace</h2>
        <p>
          Add devl to the <code>registries</code> in your <code>components.json</code> and you can install by name, search with{" "}
          <code>npx shadcn search @devl</code>, and browse devl from shadcn's own MCP server.
        </p>
        <Code label="components.json">{`{
  "registries": {
    "@devl": "https://devl.dev/r/{name}.json"
  }
}`}</Code>
        <Code>npx shadcn@latest add @devl/liquid-slider</Code>
      </section>

      <section>
        <h2>With your AI editor</h2>
        <p>
          Connect the <Link className="text-foreground underline underline-offset-4" href="/docs/mcp">devl MCP server</Link> so your agent can search
          devl and read any piece's source, and install the <Link className="text-foreground underline underline-offset-4" href="/docs/skill">agent skill</Link>{" "}
          so it knows how to use what it finds. Every item page also has a Copy prompt button, and{" "}
          <a className="text-foreground underline underline-offset-4" href="/llms.txt">llms.txt</a> lists the whole catalogue in one file.
        </p>
      </section>

      <section>
        <h2>Without shadcn</h2>
        <p>
          Every piece's source is at <code>https://devl.dev/raw/&lt;slug&gt;.tsx</code>. Save it as <code>components/&lt;slug&gt;.tsx</code>, install the npm
          packages its page lists, and add the coss ui components it imports from coss.com/ui.
        </p>
      </section>
    </DocsPage>
  );
}
