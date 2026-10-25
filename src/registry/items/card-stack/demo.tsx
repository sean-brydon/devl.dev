import { CardStack } from "@/registry/items/card-stack/card-stack";

export default function CardStackDemo() {
  return (
    <CardStack
      cards={[
        { issuer: "Northwind", type: "Debit", last4: "4821", holder: "Mara Lind", expires: "09/28", hue: "violet", cvc: "382" },
        { issuer: "Tally", type: "Credit", last4: "1907", holder: "Mara Lind", expires: "03/27", hue: "emerald", cvc: "614" },
        { issuer: "Mintpay", type: "Virtual", last4: "6650", holder: "Mara Lind", expires: "12/29", hue: "orange", cvc: "250" },
      ]}
    />
  );
}
