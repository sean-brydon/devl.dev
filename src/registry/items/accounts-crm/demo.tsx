import { AccountsCrm } from "@/registry/items/accounts-crm/accounts-crm";

export default function AccountsCrmDemo() {
  return (
    <AccountsCrm
      currentMonth="2026-10"
      currentUserId="o1"
      owners={[
        { id: "o1", name: "Maren Kole" },
        { id: "o2", name: "Jonah Ifeanyi" },
        { id: "o3", name: "Sofia Lindqvist" },
        { id: "o4", name: "Ravi Castellano" },
      ]}
      productName="Kestrel"
    />
  );
}
