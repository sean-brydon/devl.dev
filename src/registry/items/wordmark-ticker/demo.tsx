import {
  AnchorIcon,
  AtomIcon,
  BirdIcon,
  BoxesIcon,
  CloudyIcon,
  CompassIcon,
  FeatherIcon,
  FlameIcon,
  HexagonIcon,
  LeafIcon,
  MountainIcon,
  OrbitIcon,
} from "lucide-react";
import { WordmarkTicker } from "@/registry/items/wordmark-ticker/wordmark-ticker";

export default function WordmarkTickerDemo() {
  return (
    <div className="flex min-h-[360px] items-center px-4 py-12 sm:px-8">
      <WordmarkTicker
        logos={[
          { name: "Northwind", icon: CompassIcon, style: "sans" },
          { name: "Halcyon", icon: BirdIcon, style: "serif" },
          { name: "orbitly", icon: OrbitIcon, style: "mono" },
          { name: "Basalt", icon: MountainIcon, style: "caps" },
          { name: "Emberline", icon: FlameIcon, style: "heavy" },
          { name: "Quillstone", icon: FeatherIcon, style: "light" },
          { name: "Hexcel", icon: HexagonIcon, style: "heavy" },
          { name: "Fernway", icon: LeafIcon, style: "serif" },
          { name: "Cumulo", icon: CloudyIcon, style: "sans" },
          { name: "Harbor", icon: AnchorIcon, style: "caps" },
          { name: "quarkbox", icon: BoxesIcon, style: "mono" },
          { name: "Lumen Labs", icon: AtomIcon, style: "light" },
        ]}
        rows={2}
        title="Trusted by 4,000+ teams at"
      />
    </div>
  );
}
