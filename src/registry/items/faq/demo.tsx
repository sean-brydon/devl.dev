import { Faq } from "@/registry/items/faq/faq";

export default function FaqDemo() {
  return (
    <div className="px-4 py-12 sm:px-8 sm:py-16">
      <Faq
        categories={["Getting started", "Billing", "Security", "Integrations"]}
        contact={{
          title: "Still stuck?",
          text: "Write to the team that builds Paperlane. Most replies land within three hours.",
          label: "Contact support",
          href: "#support",
        }}
        description="Everything people ask before and after they move their team over. Search, or browse by topic."
        items={[
          {
            id: "import",
            category: "Getting started",
            question: "Can I import docs from my current tools?",
            answer:
              "Yes. Drop in Markdown, Word or HTML files, or connect a workspace and we'll bring pages, comments and history across. Big imports run in the background and email you when they're done.",
          },
          {
            id: "invite",
            category: "Getting started",
            question: "How do I invite my team?",
            answer:
              "Open Settings → Members and paste a list of emails, or share an invite link that only works for your company domain. People you invite land straight in the spaces you pick.",
          },
          {
            id: "offline",
            category: "Getting started",
            question: "Does Paperlane work offline?",
            answer:
              "The desktop and mobile apps keep your recent pages on the device. Edit on a plane and everything syncs, with conflicts merged paragraph by paragraph, when you're back online.",
          },
          {
            id: "trial",
            category: "Billing",
            question: "What happens when my free trial ends?",
            answer:
              "Nothing disappears. Your workspace drops to the Free plan, pages stay readable and editable, and you can upgrade whenever the limits start to pinch.",
          },
          {
            id: "seats",
            category: "Billing",
            question: "Do guests count as paid seats?",
            answer: "No. Guests can view and comment on pages you share with them for free. Only members who can create pages count toward your bill.",
          },
          {
            id: "refund",
            category: "Billing",
            question: "Can I get a refund if we switch plans?",
            answer:
              "Downgrades and cancellations are prorated to the day and credited to your next invoice. If you're on a yearly plan and cancel in the first 30 days, we refund the rest in full.",
          },
          {
            id: "sso",
            category: "Security",
            question: "Do you support SSO and SCIM?",
            answer: "Yes, on every paid plan. Connect any SAML 2.0 provider and provision or remove members automatically with SCIM.",
          },
          {
            id: "data",
            category: "Security",
            question: "Where is my data stored?",
            answer:
              "In the EU (Frankfurt) or the US (Virginia), your choice at sign-up. Everything is encrypted at rest and in transit, and we never train models on your content.",
          },
          {
            id: "api",
            category: "Integrations",
            question: "Is there an API?",
            answer: "There's a REST API and webhooks for pages, comments and members. Rate limits are generous, and every key can be scoped to a single space.",
          },
          {
            id: "slack",
            category: "Integrations",
            question: "Can I get updates in my chat app?",
            answer: "Connect a channel per space and Paperlane posts new pages, decisions and @mentions there, with a one-click link back to the paragraph.",
          },
        ]}
        title="Questions, answered"
      />
    </div>
  );
}
