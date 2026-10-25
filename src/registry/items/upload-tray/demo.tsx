"use client";

import { UploadTray } from "@/registry/items/upload-tray/upload-tray";

const MB = 1024 ** 2;

export default function UploadTrayDemo() {
  return (
    <UploadTray
      initialFiles={[
        { name: "brand-guidelines.pdf", size: 4.2 * MB },
        { name: "hero-shot@2x.png", size: 2.8 * MB },
        { name: "launch-teaser.mp4", size: 18.5 * MB },
        { name: "q3-forecast.xlsx", size: 0.9 * MB },
      ]}
      shouldFail={(file, attempt) => file.name.endsWith(".mp4") && attempt === 0}
    />
  );
}
