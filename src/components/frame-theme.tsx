"use client";

import { useEffect } from "react";
import { decodeTheme, storageKey, themeCss, writeThemeStyle } from "@/lib/custom-theme";

// Theme for the preview iframe: starts from ?theme= (or the system), then follows messages from the parent page.
// The custom theme comes from ?custom= when given, otherwise from the visitor's saved theme, kept in sync across frames.
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
    const params = new URLSearchParams(location.search);
    apply(params.get("theme"));
    const pinned = decodeTheme(params.get("custom"));
    if (pinned) writeThemeStyle(themeCss(pinned));
    const onMessage = (event: MessageEvent) => {
      if (event.origin === location.origin && event.data?.type === "devl:theme") apply(event.data.theme);
    };
    const onStorage = (event: StorageEvent) => {
      if (!pinned && event.key === `${storageKey}:css`) writeThemeStyle(event.newValue ?? "");
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return null;
}
