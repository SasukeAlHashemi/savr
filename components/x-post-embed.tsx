"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        createTweet: (
          tweetId: string,
          element: HTMLElement,
          options?: Record<string, unknown>,
        ) => Promise<HTMLElement>;
      };
    };
  }
}

let twitterScriptPromise: Promise<void> | null = null;

function loadTwitterScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.twttr?.widgets) {
    return Promise.resolve();
  }

  if (twitterScriptPromise) {
    return twitterScriptPromise;
  }

  twitterScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://platform.twitter.com/widgets.js"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Could not load the X embed script.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the X embed script."));
    document.body.appendChild(script);
  });

  return twitterScriptPromise;
}

function getTweetId(urlString: string) {
  try {
    const url = new URL(urlString);
    const match = url.pathname.match(/\/status\/(\d+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function XPostEmbed({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasEmbedError, setHasEmbedError] = useState(false);
  const tweetId = getTweetId(url);

  useEffect(() => {
    const container = containerRef.current;

    if (!tweetId || !container) {
      return;
    }

    let isActive = true;
    container.innerHTML = "";

    async function renderTweet() {
      try {
        await loadTwitterScript();

        if (!isActive || !container || !window.twttr?.widgets?.createTweet) {
          return;
        }

        await window.twttr.widgets.createTweet(tweetId, container, {
          theme: "dark",
          align: "center",
          conversation: "none",
          dnt: true,
        });
      } catch {
        if (isActive) {
          setHasEmbedError(true);
        }
      }
    }

    void renderTweet();

    return () => {
      isActive = false;
    };
  }, [tweetId]);

  if (!tweetId || hasEmbedError) {
    return (
      <div className="rounded-t-3xl bg-slate-900 px-6 py-8 text-center text-sm text-slate-300">
        We couldn&apos;t embed this X post, but the original link is still saved
        below.
      </div>
    );
  }

  return (
    <div className="rounded-t-3xl bg-slate-950 px-4 py-4">
      <div ref={containerRef} className="mx-auto min-h-24" />
    </div>
  );
}
