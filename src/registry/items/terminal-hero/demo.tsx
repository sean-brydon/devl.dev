import { TerminalHero } from "@/registry/items/terminal-hero/terminal-hero";

export default function TerminalHeroDemo() {
  return (
    <div className="px-4 py-12 sm:px-8 sm:py-16">
      <TerminalHero
        description="Wick builds every pull request into a live URL on the edge, so reviewers click a link instead of pulling a branch."
        docs={{ label: "Read the docs", href: "#docs" }}
        eyebrow="v4.2 · edge previews"
        features={["Previews in under ten seconds", "Zero config, 30+ stacks", "Runs in CI or on your laptop", "Free for open source"]}
        installers={[
          { id: "npm", label: "npm", command: "npm i -g @wick/cli", done: "added 14 packages in 1.8s" },
          { id: "pnpm", label: "pnpm", command: "pnpm add -g @wick/cli", done: "+ @wick/cli 4.2.0  Done in 1.4s" },
          { id: "bun", label: "bun", command: "bun add -g @wick/cli", done: "installed @wick/cli@4.2.0 [612ms]" },
          { id: "brew", label: "brew", command: "brew install wick", done: "🍺  wick 4.2.0 was installed" },
        ]}
        output={[
          { kind: "step", text: "Detected Next.js 16", meta: "· pnpm · node 22" },
          { kind: "progress", text: "Building" },
          { kind: "success", text: "Built in 8.4s", meta: "· 142 files · 2.1 MB" },
          { kind: "success", text: "Pushed to 3 regions", meta: "· fra · iad · sfo" },
          { kind: "result", text: "https://feat-checkout-7f2a.wick.run", href: "#preview" },
        ]}
        run="wick deploy --preview"
        title="Preview every branch"
        titleQuiet="before it hits main."
      />
    </div>
  );
}
