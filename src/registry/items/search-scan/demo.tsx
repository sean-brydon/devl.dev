import { SearchScan } from "@/registry/items/search-scan/search-scan";

export default function SearchScanDemo() {
  return (
    <SearchScan
      description="Type a word and we'll find it in your notes, specs and files."
      hue="sky"
      query="roadmap"
      title="Search across every doc"
    />
  );
}
