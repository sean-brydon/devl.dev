import { QuoteWall } from "@/registry/items/quote-wall/quote-wall";

export default function QuoteWallDemo() {
  return (
    <div className="px-4 py-12 sm:px-8">
      <QuoteWall
        rating={{ score: 4.9, count: "2,300" }}
        quotes={[
          {
            quote: "We replaced three tools with this in a week. Our standups got shorter and nobody misses the old setup.",
            highlight: "replaced three tools",
            name: "Maya Okafor",
            role: "Head of Product",
            company: "Fernway",
          },
          {
            quote: "The onboarding is so calm. I invited my team on a Friday and by Monday everyone was already using it.",
            name: "Jonas Lindqvist",
            role: "Engineering Manager",
            company: "Basalt",
          },
          {
            quote: "It feels fast in a way that's hard to describe. Things just happen the moment you think of them.",
            highlight: "Things just happen",
            name: "Priya Raman",
            role: "Designer",
            company: "Halcyon",
          },
          {
            quote: "Support answered in four minutes on a Sunday. I've never had that from anyone, ever.",
            name: "Tomás Herrera",
            role: "Founder",
            company: "Emberline",
          },
          {
            quote: "Our release notes write themselves now. The changelog alone was worth switching for.",
            highlight: "write themselves",
            name: "Aiko Tanaka",
            role: "Staff Engineer",
            company: "Orbitly",
          },
          {
            quote: "I was sceptical about yet another workspace app. Two months in, it's the first tab I open.",
            name: "Elliot Brandt",
            role: "COO",
            company: "Quillstone",
          },
          {
            quote: "The keyboard shortcuts are thoughtful. You can tell the team actually uses the thing every day.",
            name: "Sofia Marchetti",
            role: "Product Engineer",
            company: "Cumulo",
          },
          {
            quote: "Planning used to take an afternoon. Now it's a twenty minute call and we're done.",
            highlight: "twenty minute call",
            name: "Kwame Asante",
            role: "Team Lead",
            company: "Harbor",
          },
          {
            quote: "Every small detail is considered. Even the empty states made me smile.",
            name: "Lena Vogel",
            role: "Brand Designer",
            company: "Lumen Labs",
          },
          {
            quote: "We onboarded forty people across four time zones without a single training session.",
            highlight: "without a single training session",
            name: "Rafael Costa",
            role: "VP Operations",
            company: "Northwind",
          },
          {
            quote: "Honestly the nicest piece of software our team pays for. Renewal was a two-second decision.",
            name: "Hannah Brooks",
            role: "Finance Lead",
            company: "Hexcel",
          },
          {
            quote: "The API is clean and the docs are short. I had our integration running before lunch.",
            name: "Dev Patel",
            role: "Backend Engineer",
            company: "Quarkbox",
          },
        ]}
      />
    </div>
  );
}
