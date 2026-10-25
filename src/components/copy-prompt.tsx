"use client";

import { CheckIcon, ChevronDownIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";

interface Target {
  label: string;
  prompt: string;
}

function agentPrompt({
  name,
  slug,
  description,
  install,
  raw,
  source,
  dependencies,
  uiDependencies,
}: {
  name: string;
  slug: string;
  description: string;
  install: string;
  raw: string;
  source?: string;
  dependencies: string[];
  uiDependencies: string[];
}) {
  if (source === "bklit") {
    return [
      `Add the "${name}" chart from bklit (https://ui.bklit.com, by uixmat, showcased on devl.dev) to this project.`,
      description,
      `If the project has a components.json (shadcn), install it from the registry:\n${install}`,
      `Otherwise fetch the registry item at ${raw}, write each entry in its "files" array to the path it names, and install the packages listed in its "dependencies".`,
      "Then show me a good place to use it.",
    ].join("\n\n");
  }
  const steps = [
    `Add the "${name}" component from devl.dev to this project.`,
    description,
    `1. If the project has a components.json (shadcn), install it from the registry. This pulls in every dependency:\n${install}`,
    `2. If there's no components.json or that command fails, use the raw source instead. Fetch ${raw} and save it as components/${slug}.tsx.${
      dependencies.length ? ` Install these npm packages: ${dependencies.join(" ")}.` : ""
    }${
      uiDependencies.length
        ? ` It imports these coss ui components from @/components/ui/*: ${uiDependencies.join(", ")}. Add them with \`npx shadcn@latest add ${uiDependencies.map((d) => `@coss/${d}`).join(" ")}\`, or point those imports at the project's own equivalents.`
        : ""
    } It expects a \`cn\` helper at @/lib/utils (clsx + tailwind-merge) and Tailwind v4.`,
    "Then show me a good place to use it.",
  ];
  return steps.join("\n\n");
}

export function CopyPrompt({
  name,
  slug,
  description,
  install,
  url,
  raw,
  source,
  dependencies = [],
  uiDependencies = [],
}: {
  name: string;
  slug: string;
  description: string;
  install: string;
  url: string;
  raw: string;
  source?: string;
  dependencies?: string[];
  uiDependencies?: string[];
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const agent = agentPrompt({ name, slug, description, install, raw, source, dependencies, uiDependencies });
  const targets: Target[] = [
    { label: "Claude Code", prompt: agent },
    { label: "Cursor", prompt: agent },
    { label: "v0", prompt: `Use the "${name}" component from ${url} in this project. ${description}` },
  ];
  const links: Target[] = [
    { label: "Install command", prompt: install },
    { label: source === "bklit" ? "Registry JSON URL" : "Raw code URL", prompt: raw },
  ];

  async function copy(target: Target) {
    await navigator.clipboard.writeText(target.prompt);
    setCopied(target.label);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <Menu>
      <MenuTrigger render={<Button className="rounded-full" size="sm" variant="outline" />}>
        {copied ? <CheckIcon /> : <SparklesIcon />}
        {copied ? "Copied" : "Copy prompt"}
        <ChevronDownIcon className="opacity-60" />
      </MenuTrigger>
      <MenuPopup align="end">
        {targets.map((target) => (
          <MenuItem key={target.label} onClick={() => copy(target)}>
            {target.label}
          </MenuItem>
        ))}
        <MenuSeparator />
        {links.map((target) => (
          <MenuItem key={target.label} onClick={() => copy(target)}>
            {target.label}
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  );
}
