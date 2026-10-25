import { Terminal, type TerminalStep } from "@/registry/items/terminal/terminal";

const green = (s: string) => `\x1b[32m${s}\x1b[39m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[22m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[39m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[22m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[39m`;

const session: TerminalStep[] = [
  { type: "command", text: "pnpm install" },
  {
    type: "output",
    text: [
      dim("Lockfile is up to date, resolution step is skipped"),
      `Packages: ${green("+418")}`,
      green("++++++++++++++++++++++++++++++++++++++++"),
      `Progress: resolved ${bold("418")}, reused 415, downloaded 3, added 418, ${green("done")}`,
      "",
      bold("dependencies:"),
      `${green("+")} @northwind/ui ${dim("3.2.1")}`,
      `${green("+")} next ${dim("16.4.3")}`,
      `${green("+")} react ${dim("19.3.0")}`,
      "",
      dim("Done in 2.1s"),
    ].join("\n"),
  },
  { type: "command", text: "pnpm test --run" },
  { type: "spinner", text: "Running 48 tests across 12 files", duration: 1600, done: `${bold("48 passed")} ${dim("(12 files) in 3.4s")}` },
  {
    type: "output",
    pace: 60,
    text: [
      ` ${green("✓")} src/lib/money.test.ts ${dim("(9)")}`,
      ` ${green("✓")} src/lib/invoice.test.ts ${dim("(14)")}`,
      ` ${green("✓")} src/app/api/checkout.test.ts ${dim("(6)")} ${yellow("412ms")}`,
    ].join("\n"),
  },
  { type: "command", text: "pnpm build" },
  { type: "output", text: `  ${bold("Next.js 16.4.3")} ${dim("· production build")}` },
  { type: "spinner", text: "Compiling", duration: 1500, done: `Compiled successfully ${dim("in 4.2s")}` },
  { type: "spinner", text: "Generating static pages (0/14)", duration: 900, done: "Generated static pages (14/14)" },
  {
    type: "output",
    pace: 55,
    text: [
      "",
      `${bold("Route (app)")}              ${dim("Size     First Load")}`,
      `○ /                      5.4 kB   ${green("118 kB")}`,
      `○ /pricing               2.2 kB   ${green("109 kB")}`,
      `ƒ /api/invoices            0 B      0 B`,
      `○ /dashboard             8.9 kB   ${yellow("164 kB")}`,
      "",
      dim(`○ static   ƒ dynamic`),
      "",
      `${green("✓")} Build ready ${dim("→")} ${cyan(".next/")}`,
    ].join("\n"),
  },
];

export default function TerminalDemo() {
  return <Terminal steps={session} title="zsh" />;
}
