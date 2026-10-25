import { Checkout } from "@/registry/items/checkout/checkout";

export default function CheckoutDemo() {
  return <Checkout promoCodes={{ HEARTH10: 0.1 }} storeName="Hearth Goods" taxRate={0.0825} />;
}
