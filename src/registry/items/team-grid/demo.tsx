import { TeamGrid } from "@/registry/items/team-grid/team-grid";

export default function TeamGridDemo() {
  return (
    <div className="px-4 py-12 sm:px-8 sm:py-16">
      <TeamGrid
        description="Seven people across six time zones. Hover or tap anyone to say hello."
        hiring={{ title: "Your seat?", text: "We're hiring across engineering, design and support.", href: "#careers", count: 6 }}
        members={[
          {
            name: "Maya Okafor",
            role: "Co-founder, CEO",
            team: "Leadership",
            location: "Lisbon",
            timeZone: "Europe/Lisbon",
            tone: "violet",
            bio: "Ran product at two document startups before deciding the third should be calm. Still answers every support email from a founder.",
            links: { email: "maya@paperlane.dev", handle: "mayaok" },
          },
          {
            name: "Jonas Lindqvist",
            role: "Co-founder, CTO",
            team: "Leadership",
            location: "Stockholm",
            timeZone: "Europe/Stockholm",
            tone: "sky",
            bio: "Wrote the sync engine on a long train ride and has been apologising for the variable names since. Loves CRDTs, hates meetings.",
            links: { email: "jonas@paperlane.dev", website: "#jonas", handle: "jlq" },
          },
          {
            name: "Priya Raman",
            role: "Staff engineer",
            team: "Engineering",
            location: "Bengaluru",
            timeZone: "Asia/Kolkata",
            tone: "emerald",
            bio: "Owns search, which is why it's fast. Previously built indexing at a large email company. Runs the Friday demo hour.",
            links: { email: "priya@paperlane.dev", handle: "priyar" },
          },
          {
            name: "Theo Marchetti",
            role: "Product designer",
            team: "Design",
            location: "Milan",
            timeZone: "Europe/Rome",
            tone: "amber",
            bio: "Draws every screen on paper first. Responsible for the command menu, the empty states and most of the arguments about spacing.",
            links: { website: "#theo", handle: "theom" },
          },
          {
            name: "Sasha Kim",
            role: "Engineer, desktop",
            team: "Engineering",
            location: "Toronto",
            timeZone: "America/Toronto",
            tone: "rose",
            bio: "Made offline mode actually work. Keeps a spreadsheet of every bug she's fixed, sorted by how much it annoyed her.",
            links: { email: "sasha@paperlane.dev", handle: "sashak" },
          },
          {
            name: "Diego Alvarez",
            role: "Head of support",
            team: "Customers",
            location: "Mexico City",
            timeZone: "America/Mexico_City",
            tone: "teal",
            bio: "Median first reply under three hours, and he'd like you to know it. Turns the best tickets into help articles the same day.",
            links: { email: "diego@paperlane.dev" },
          },
          {
            name: "Hana Sato",
            role: "Lifecycle marketing",
            team: "Customers",
            location: "Tokyo",
            timeZone: "Asia/Tokyo",
            tone: "indigo",
            bio: "Writes the Thursday Brief and every onboarding email. Believes a good subject line is a promise you keep in the first sentence.",
            links: { email: "hana@paperlane.dev", website: "#hana" },
          },
        ]}
        title="The people behind Paperlane"
      />
    </div>
  );
}
