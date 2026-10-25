import { NewsletterCta } from "@/registry/items/newsletter-cta/newsletter-cta";

export default function NewsletterCtaDemo() {
  return (
    <div className="px-4 py-12 sm:px-8 sm:py-16">
      <NewsletterCta
        description="A five-minute read from the Hearth team on pricing, onboarding and the small decisions that make products feel good."
        eyebrow="The Thursday Brief"
        issues={[
          { number: 140, title: "Onboarding is a promise, not a tour", date: "Oct 9", minutes: 5 },
          { number: 141, title: "The case for fewer settings", date: "Oct 16", minutes: 4 },
          { number: 142, title: "Pricing pages that don't make you do maths", date: "Oct 23", minutes: 6 },
        ]}
        readers={["MO", "JL", "SA", "TK"]}
        subscribers={12480}
        title="One good idea about building products, every Thursday."
      />
    </div>
  );
}
