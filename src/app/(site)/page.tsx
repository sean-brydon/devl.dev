import type { Metadata } from "next";
import { Landing } from "@/components/landing";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return <Landing />;
}
