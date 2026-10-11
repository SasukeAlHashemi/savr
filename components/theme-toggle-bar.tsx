"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

const THEMES = ["white", "black", "dim"] as const;

type ThemeName = (typeof THEMES)[number];

type ThemeOption = {
  value: ThemeName;
  label: string;
  icon: "sun" | "moon" | "contrast";
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: "white", label: "White", icon: "sun" },
  { value: "black", label: "Black", icon: "moon" },
  { value: "dim", label: "Dim", icon: "contrast" },
];

function ThemeIcon({ icon }: { icon: ThemeOption["icon"] }) {
  if (icon === "sun") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
      </svg>
    );
  }

  if (icon === "moon") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" />
    </svg>
  );
}

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
    (): ThemeName => "dim",
  );

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  function handleThemeSelect(theme: ThemeName) {
    window.localStorage.setItem("savr-theme", theme);
    applyTheme(theme);
    window.dispatchEvent(new Event("savr-theme-change"));
  }

  return (
    <>
      <header
        className="sticky top-0 z-50 flex h-16 w-full shrink-0 items-center px-4 sm:px-6"
        style={{ backgroundColor: "var(--theme-page-bg)" }}
      >
        <Link href="/dashboard" aria-label="Savr home" className="flex h-12 items-center">
          <Image
            src="/logo/savr-logo-light.png"
            alt="Savr"
            width={931}
            height={360}
            priority
            sizes="(max-width: 639px) 30vw, 124px"
            className="savr-logo-light h-auto w-[clamp(64px,30vw,112px)] sm:w-[124px]"
          />
          <Image
            src="/logo/savr-logo-dark.png"
            alt="Savr"
            width={931}
            height={360}
            priority
            sizes="(max-width: 639px) 30vw, 124px"
            className="savr-logo-dark h-auto w-[clamp(64px,30vw,112px)] sm:w-[124px]"
          />
        </Link>
      </header>
      {isClientReady && (
        <div
          role="group"
          aria-label="Choose theme"
          className="fixed right-[calc(1rem+3rem+0.5rem)] top-2 z-50 h-12 w-[clamp(76px,32vw,116px)] rounded-full border border-white/15 bg-slate-950/90 p-1 shadow-lg shadow-slate-950/40 backdrop-blur sm:right-[calc(1.5rem+3rem+0.75rem)] sm:top-2 sm:w-[116px]"
        >
          <div className="relative flex h-full w-full items-center">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-full bg-emerald-400 shadow-sm transition-transform duration-200 ease-out"
              style={{
                transform: `translateX(${THEMES.indexOf(activeTheme) * 100}%)`,
              }}
            />
            {THEME_OPTIONS.map((themeOption) => {
              const isActive = activeTheme === themeOption.value;

              return (
                <button
                  key={themeOption.value}
                  type="button"
                  onClick={() => handleThemeSelect(themeOption.value)}
                  aria-label={`Use ${themeOption.label.toLowerCase()} theme`}
                  aria-pressed={isActive}
                  title={`${themeOption.label} theme`}
                  className={`relative z-10 inline-flex h-full flex-1 items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                    isActive
                      ? "text-slate-950"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  <ThemeIcon icon={themeOption.icon} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
