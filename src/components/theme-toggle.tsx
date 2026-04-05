"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const saved = window.localStorage.getItem("frikfrak-theme");
  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("frikfrak-theme", theme);
  window.dispatchEvent(new Event("frikfrak-theme-change"));
}

function subscribe(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  window.addEventListener("storage", onStoreChange);
  window.addEventListener("frikfrak-theme-change", onStoreChange);
  mediaQuery.addEventListener("change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("frikfrak-theme-change", onStoreChange);
    mediaQuery.removeEventListener("change", onStoreChange);
  };
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(
    subscribe,
    getPreferredTheme,
    () => null,
  );

  return (
    <button
      type="button"
      onClick={() => {
        const currentTheme = theme ?? getPreferredTheme();
        const nextTheme = currentTheme === "light" ? "dark" : "light";
        applyTheme(nextTheme);
      }}
      className={
        compact
          ? "secondary-button w-full rounded-xl px-3 py-2 text-left text-sm font-medium"
          : "secondary-button mt-4 w-full rounded-xl px-3 py-2 text-sm font-medium"
      }
    >
      {theme === null
        ? "Toggle theme"
        : theme === "light"
          ? "Switch to dark mode"
          : "Switch to light mode"}
    </button>
  );
}
