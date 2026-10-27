import type { Metadata } from "next";
import { Library } from "@/components/library";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return <Library kind="component" />;
}
