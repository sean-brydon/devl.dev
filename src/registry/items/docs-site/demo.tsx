import { DocsSite } from "@/registry/items/docs-site/docs-site";

export default function DocsSiteDemo() {
  return (
    <DocsSite
      dashboardHref="https://kestrel.example/dashboard"
      editHref={(page) => `https://kestrel.example/docs/edit/${page}.mdx`}
    />
  );
}
