"use client";

import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { PlantProgress } from "@/registry/items/plant-progress/plant-progress";

const steps = [20, 40, 60, 80, 100];

export default function PlantProgressDemo() {
  const [value, setValue] = useState(20);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (touched) return;
    const t = setTimeout(
      () => setValue((v) => steps[(steps.indexOf(v) + 1) % steps.length] ?? 20),
      value === 100 ? 3200 : 1600,
    );
    return () => clearTimeout(t);
  }, [value, touched]);

  return (
    <PlantProgress hue="orange" label="Workspace setup" value={value}>
      <Slider
        getAriaLabel={() => "Setup progress"}
        onValueChange={(v) => {
          setTouched(true);
          setValue(Array.isArray(v) ? v[0] : v);
        }}
        value={value}
      />
    </PlantProgress>
  );
}
