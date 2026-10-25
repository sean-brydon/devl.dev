"use client";

import { useEffect } from "react";

// Theme for the preview iframe: starts from ?theme= (or the system), then follows messages from the parent page.
export function FrameTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = (theme: string | null) => {
      const dark = theme === "dark" || (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
      if (root.classList.contains("dark") === dark) return;
      const freeze = document.createElement("style");
      freeze.textContent = "*,*::before,*::after{transition:none!important}";
      document.head.appendChild(freeze);
      root.classList.toggle("dark", dark);
      root.style.colorScheme = dark ? "dark" : "light";
      window.getComputedStyle(document.body).opacity;
      requestAnimationFrame(() => requestAnimationFrame(() => freeze.remove()));
    };
    apply(new URLSearchParams(location.search).get("theme"));
    const onMessage = (event: MessageEvent) => {
      if (event.origin === location.origin && event.data?.type === "devl:theme") apply(event.data.theme);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return null;
}
