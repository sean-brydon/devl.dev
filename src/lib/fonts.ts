import { DM_Sans, Geist, Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const interHeading = Inter({ subsets: ["latin"], variable: "--font-heading" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", preload: false });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", preload: false });

export const fontVariables = cn(
  "antialiased",
  inter.variable,
  interHeading.variable,
  geistMono.variable,
  geist.variable,
  dmSans.variable,
  spaceGrotesk.variable,
);
