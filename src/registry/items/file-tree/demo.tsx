import { type FileNode, FileTree } from "@/registry/items/file-tree/file-tree";

const files: FileNode[] = [
  {
    id: "app",
    name: "app",
    children: [
      { id: "layout", name: "layout.tsx" },
      { id: "page", name: "page.tsx", status: "modified" },
      {
        id: "billing",
        name: "billing",
        children: [
          { id: "billing-page", name: "page.tsx", status: "added" },
          { id: "invoice-row", name: "invoice-row.tsx", status: "added" },
        ],
      },
      { id: "globals", name: "globals.css" },
    ],
  },
  {
    id: "components",
    name: "components",
    children: [
      { id: "plan-card", name: "plan-card.tsx", status: "modified" },
      { id: "usage-bar", name: "usage-bar.tsx" },
    ],
  },
  {
    id: "public",
    name: "public",
    children: [
      { id: "logo", name: "logo.svg" },
      { id: "og", name: "og-image.png", status: "untracked" },
    ],
  },
  { id: "readme", name: "README.md" },
  { id: "pkg", name: "package.json", status: "modified" },
  { id: "env", name: ".env.example" },
  { id: "tsconfig", name: "tsconfig.json" },
];

export default function FileTreeDemo() {
  return (
    <FileTree
      branch="feat/usage-billing"
      data={files}
      defaultExpanded={["app", "billing", "components"]}
      defaultSelected="invoice-row"
      repo="halcyon-dashboard"
    />
  );
}
