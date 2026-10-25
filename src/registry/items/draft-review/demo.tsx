import { DraftReview } from "@/registry/items/draft-review/draft-review";

export default function DraftReviewDemo() {
  return (
    <DraftReview
      attachment={{ name: "Q3-renewal.pdf", size: "184 KB" }}
      bodies={{
        friendly:
          "Hi {name},\n\nHope your week's off to a good start! Your Fieldnote plan renews on 12 Nov, and I've attached the quote with the 10% loyalty discount we talked about.\n\nHappy to jump on a call if anything looks off.\n\nCheers,\nSam",
        direct:
          "Hi {name},\n\nYour Fieldnote plan renews on 12 Nov. The attached quote includes the 10% loyalty discount.\n\nReply to confirm, or tell me what to change.\n\nSam",
        formal:
          "Dear {name},\n\nI am writing to let you know that your Fieldnote subscription is due for renewal on 12 November. Please find attached a quotation reflecting the agreed 10% loyalty discount.\n\nKind regards,\nSam Ortega",
      }}
      recipients={[
        { name: "Hana Becker", email: "hana@lumenlabs.io" },
        { name: "Rafael Duarte", email: "rafael@northpine.co" },
        { name: "Grace Whitfield", email: "g.whitfield@orbitworks.dev", firstName: "Ms Whitfield" },
      ]}
      subject="Your renewal quote for November"
    />
  );
}
