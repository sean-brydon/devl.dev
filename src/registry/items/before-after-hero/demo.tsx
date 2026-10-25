import { BeforeAfterHero } from "@/registry/items/before-after-hero/before-after-hero";

export default function BeforeAfterHeroDemo() {
  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10">
      <BeforeAfterHero
        after={{ product: "Sortwell", title: "October close", company: "Larkspur Studio", status: "Closed in 3h 12m" }}
        before={{
          label: "Spreadsheet",
          file: "expenses_OCT_final_v3 (2).xlsx",
          editedBy: "Edited by Dana, 11:48 pm",
          formula: "=SUM(D1:D6)+#REF!",
          status: "Day 4 of close",
          sticky: "Dana, where is the Parcelpost receipt?? Need it by Fri.",
        }}
        cta={{ label: "Start your first close", href: "#" }}
        description="Sortwell reads every card line, finds its receipt and files it under the right category, so closing the month is a quick review, not a rescue."
        eyebrow="Expense close for teams of 5 to 50"
        headline={{ lead: "Month-end takes", before: "a week.", after: "an afternoon." }}
        lines={[
          {
            id: "kettle",
            date: "Oct 2",
            merchant: "Blue Kettle Café",
            spender: "Dana Ito",
            category: "Meals",
            amount: 48.2,
            receipt: "matched",
            sheet: { date: "10/02", description: "SQ *BLUE KETTLE 4471", category: "food??", amount: "48.2", marks: { category: "highlight" } },
          },
          {
            id: "halcyon",
            date: "Oct 3",
            merchant: "Halcyon Air",
            spender: "Maya Ruiz",
            category: "Travel",
            amount: 1240,
            receipt: "matched",
            sheet: { date: "10/03", description: "HALCYON AIR 0062214", category: "Travel", amount: "1,240", note: "offsite flights" },
          },
          {
            id: "halcyon-again",
            date: "Oct 3",
            merchant: "Halcyon Air",
            spender: "Maya Ruiz",
            category: "Travel",
            amount: 1240,
            receipt: "duplicate",
            sheet: {
              date: "3 Oct",
              description: "HALCYON AIR 0062214",
              category: "travel",
              amount: "1240.00",
              note: "dup?? check w/ bank",
              marks: { amount: "highlight", note: "highlight" },
            },
          },
          {
            id: "cloudnest",
            date: "Oct 9",
            merchant: "Cloudnest Hosting",
            spender: "Priya Shah",
            category: "Software",
            amount: 312,
            receipt: "matched",
            sheet: { date: "10/9", description: "CLOUDNEST*HOSTING INV", category: "", amount: "$ 312.00", note: "who owns this?", marks: { category: "error" } },
          },
          {
            id: "parcelpost",
            date: "Oct 14",
            merchant: "Parcelpost",
            spender: "Dana Ito",
            category: "Shipping",
            amount: 26.4,
            receipt: "found",
            sheet: { date: "10/14", description: "PARCELPOST 8813 LDN", category: "postage/misc", amount: "–", note: "receipt in Dana's bag", marks: { amount: "error" } },
          },
          {
            id: "officebox",
            date: "Oct 21",
            merchant: "Officebox",
            spender: "Tom Akers",
            category: "Office",
            amount: 86.5,
            receipt: "matched",
            sheet: { date: "10/21", description: "OFFICEBOX STORE 112", category: "office", amount: "86.5" },
          },
        ]}
        note="Free for 30 days. Bring last month's export."
      />
    </div>
  );
}
