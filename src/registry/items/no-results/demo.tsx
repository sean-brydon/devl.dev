import { NoResults, type SearchFilter, type SearchItem } from "@/registry/items/no-results/no-results";

const items: SearchItem[] = [
  { id: "q3", title: "Q3 roadmap", kind: "Doc", owner: "Mara Okafor", updated: "2 days ago", days: 2, tags: ["planning"] },
  { id: "review", title: "Roadmap review notes", kind: "Doc", owner: "Ada Lindqvist", updated: "12 days ago", days: 12 },
  { id: "mobile", title: "Mobile app roadmap", kind: "Spec", owner: "Theo Brandt", updated: "3 weeks ago", days: 21, tags: ["ios", "android"] },
  { id: "checklist", title: "Onboarding checklist", kind: "Doc", owner: "Ada Lindqvist", updated: "Yesterday", days: 1 },
  { id: "flow", title: "Onboarding flow", kind: "Spec", owner: "Priya Nair", updated: "4 days ago", days: 4, tags: ["signup"] },
  { id: "copy", title: "Pricing page copy", kind: "Doc", owner: "June Park", updated: "6 days ago", days: 6, tags: ["marketing"] },
  { id: "experiments", title: "Pricing experiments", kind: "Sheet", owner: "Theo Brandt", updated: "9 days ago", days: 9 },
  { id: "release", title: "Release notes 4.2", kind: "Doc", owner: "Mara Okafor", updated: "Yesterday", days: 1, tags: ["changelog"] },
  { id: "ranking", title: "Search ranking", kind: "Spec", owner: "Ada Lindqvist", updated: "5 days ago", days: 5 },
  { id: "billing", title: "Billing migration plan", kind: "Spec", owner: "Priya Nair", updated: "2 weeks ago", days: 14 },
  { id: "hiring", title: "Q3 hiring plan", kind: "Sheet", owner: "Mara Okafor", updated: "3 days ago", days: 3, tags: ["planning"] },
  { id: "settings", title: "Design review: Settings", kind: "Doc", owner: "June Park", updated: "8 days ago", days: 8 },
];

const filters: SearchFilter[] = [
  { id: "spec", label: "Type: Spec", test: (i) => i.kind === "Spec" },
  { id: "week", label: "Updated: Past 7 days", test: (i) => i.days <= 7 },
  { id: "mine", label: "Owner: Ada", test: (i) => i.owner === "Ada Lindqvist" },
];

export default function NoResultsDemo() {
  return (
    <NoResults
      defaultFilters={["spec", "week"]}
      defaultQuery="rodmap"
      filters={filters}
      items={items}
      popular={["Q3 roadmap", "Onboarding", "Pricing", "Release notes"]}
    />
  );
}
