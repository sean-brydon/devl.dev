import { ThemeStudio } from "@/registry/items/theme-studio/theme-studio";

export default function ThemeStudioDemo() {
  return <ThemeStudio defaultValue={{ hue: 268, radius: 10, density: "cozy" }} />;
}
