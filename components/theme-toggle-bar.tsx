"use client";

import { useEffect, useSyncExternalStore } from "react";

const THEMES = ["white", "black", "dim"] as const;

type ThemeName = (typeof THEMES)[number];

type ThemeOption = {
  value: ThemeName;
  label: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
  { value: "dim", label: "Dim" },
];

function isThemeName(value: string | null): value is ThemeName {
  return THEMES.includes(value as ThemeName);
}

function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
}

function getStoredTheme(): ThemeName {
  if (typeof window === "undefined") {
    return "dim";
  }

  const savedTheme = window.localStorage.getItem("savr-theme");
  return isThemeName(savedTheme) ? savedTheme : "dim";
}

function subscribeToThemeChange(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("savr-theme-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("savr-theme-change", onStoreChange);
  };
}

function subscribeToClientReady(onStoreChange: () => void) {
  const timeoutId = window.setTimeout(onStoreChange, 0);

  return () => {
    window.clearTimeout(timeoutId);
  };
}

export function ThemeToggleBar() {
  const isClientReady = useSyncExternalStore(
    subscribeToClientReady,
    () => true,
    () => false,
  );
  const activeTheme = useSyncExternalStore(
    subscribeToThemeChange,
    getStoredTheme,
    () => "dim",
  );

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  function handleThemeSelect(theme: ThemeName) {
    window.localStorage.setItem("savr-theme", theme);
    applyTheme(theme);
    window.dispatchEvent(new Event("savr-theme-change"));
  }

  if (!isClientReady) {
    return null;
  }

  return (
    <div className="fixed left-6 top-6 z-50 rounded-full border border-white/15 bg-slate-950/90 p-1 shadow-lg shadow-slate-950/40 backdrop-blur">
      <div className="flex items-center gap-1">
        {THEME_OPTIONS.map((themeOption) => {
          const isActive = activeTheme === themeOption.value;

          return (
            <button
              key={themeOption.value}
              type="button"
              onClick={() => handleThemeSelect(themeOption.value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                isActive
                  ? "bg-emerald-400 text-slate-950"
                  : "text-white hover:bg-white/10"
              }`}
            >
              {themeOption.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
