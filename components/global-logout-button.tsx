"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

function LogoutIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function GlobalLogoutButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let isActive = true;

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!isActive) {
        return;
      }

      setIsVisible(!error && !!data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsVisible(!!session?.user);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setIsLoggingOut(false);
      return;
    }

    setIsVisible(false);
    window.location.replace("/login");
  }

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={isLoggingOut}
      title={isLoggingOut ? "Logging out" : "Log out"}
      aria-label={isLoggingOut ? "Logging out" : "Log out"}
      className="fixed right-6 top-6 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-slate-950/90 text-white shadow-lg shadow-slate-950/40 backdrop-blur transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogoutIcon />
    </button>
  );
}
