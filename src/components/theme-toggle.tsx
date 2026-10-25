"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { GooGroup } from "@/components/goo-group";

const options = [
  { value: "light", ariaLabel: "Light theme", label: <SunIcon /> },
  { value: "dark", ariaLabel: "Dark theme", label: <MoonIcon /> },
  { value: "system", ariaLabel: "System theme", label: <MonitorIcon /> },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <GooGroup
      items={options}
      label="Theme"
      onValueChange={setTheme}
      size="sm"
      value={mounted ? (theme ?? "system") : null}
    />
  );
}
