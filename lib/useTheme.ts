"use client";

import { useSyncExternalStore } from "react";
import { themeMap, type ThemeMode, type Theme } from "@/lib/theme";

const STORAGE_KEY = "theme";
const EVENT = "hg-theme-change";

function subscribe(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback); // 別タブからの変更を反映
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "dark" || saved === "light" ? saved : "light";
}

// SSR・ハイドレーション時は常に既定（light）。マウント後に getSnapshot へ切り替わる
function getServerSnapshot(): ThemeMode {
  return "light";
}

export function useTheme(): { mode: ThemeMode; t: Theme; toggleTheme: () => void } {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = () => {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(EVENT));
  };

  return { mode, t: themeMap[mode], toggleTheme };
}
