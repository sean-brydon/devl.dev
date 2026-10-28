"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  type CustomTheme,
  decodeTheme,
  defaultTheme,
  encodeTheme,
  storageKey,
  themeCss,
  writeThemeStyle,
} from "@/lib/custom-theme";

interface CustomThemeContext {
  theme: CustomTheme;
  setTheme: (theme: CustomTheme) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const Context = createContext<CustomThemeContext | null>(null);

function save(theme: CustomTheme) {
  const css = themeCss(theme);
  writeThemeStyle(css);
  try {
    if (css) {
      localStorage.setItem(storageKey, encodeTheme(theme));
      localStorage.setItem(`${storageKey}:css`, css);
    } else {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}:css`);
    }
  } catch {}
}

/** Holds the visitor's preview theme, writes it as CSS variables for every [data-theme-scope] and saves it per browser. */
export function CustomThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<CustomTheme>(defaultTheme);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(storageKey);
    } catch {}
    const restored = decodeTheme(stored);
    if (restored) {
      setThemeState(restored);
      writeThemeStyle(themeCss(restored));
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const next = decodeTheme(event.newValue) ?? defaultTheme;
      setThemeState(next);
      writeThemeStyle(themeCss(next));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next: CustomTheme) => {
    setThemeState(next);
    save(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, open, setOpen }), [theme, setTheme, open]);
  return <Context value={value}>{children}</Context>;
}

export function useCustomTheme() {
  const context = useContext(Context);
  if (!context) throw new Error("useCustomTheme needs a CustomThemeProvider");
  return context;
}
