"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { ProfileAvatar } from "@/components/profile-avatar";

type RepositorySuggestion = {
  id: number;
  name: string;
  ownerUsername: string;
  ownerAvatarUrl: string | null;
  visibility: "public" | "secret";
};

type RepositorySearchBoxProps = {
  initialQuery: string;
};

function FolderIcon() {
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
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
    </svg>
  );
}

export function RepositorySearchBox({
  initialQuery,
}: RepositorySearchBoxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<RepositorySuggestion[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      const nextUrl = trimmedQuery
        ? `${pathname}?q=${encodeURIComponent(trimmedQuery)}`
        : pathname;

      startTransition(() => {
        router.replace(nextUrl);
      });

      if (!trimmedQuery) {
        setSuggestions([]);
        setIsSuggestionsOpen(false);
        setIsLoadingSuggestions(false);
        return;
      }

      setIsLoadingSuggestions(true);

      void fetch(
        `/api/repository-search?q=${encodeURIComponent(trimmedQuery)}&limit=6`,
        {
          signal: controller.signal,
        },
      )
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Could not load repository suggestions.");
          }

          return (await response.json()) as {
            repositories?: RepositorySuggestion[];
          };
        })
        .then((payload) => {
          setSuggestions(payload.repositories ?? []);
          setIsSuggestionsOpen(true);
        })
        .catch((error: unknown) => {
          if (
            error instanceof DOMException &&
            error.name === "AbortError"
          ) {
            return;
          }

          setSuggestions([]);
          setIsSuggestionsOpen(true);
        })
        .finally(() => {
          setIsLoadingSuggestions(false);
        });
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [pathname, query, router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    const nextUrl = trimmedQuery
      ? `${pathname}?q=${encodeURIComponent(trimmedQuery)}`
      : pathname;

    router.push(nextUrl);
    setIsSuggestionsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <form
        className="flex flex-col gap-4 lg:flex-row lg:items-end"
        onSubmit={handleSubmit}
      >
        <label className="block flex-1">
          <span className="text-sm font-medium text-slate-100">
            Search by repository name
          </span>
          <input
            type="text"
            name="q"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsSuggestionsOpen(true);
            }}
            onFocus={() => {
              if (query.trim()) {
                setIsSuggestionsOpen(true);
              }
            }}
            placeholder="anime x posts"
            autoComplete="off"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            <FolderIcon />
            Search repositories
          </button>
          {query.trim() ? (
            <Link
              href={pathname}
              className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Clear search
            </Link>
          ) : null}
        </div>
      </form>

      {isSuggestionsOpen && query.trim() ? (
        <div className="absolute left-0 right-0 z-20 mt-3 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-slate-950/60 backdrop-blur">
          {isLoadingSuggestions ? (
            <p className="px-5 py-4 text-sm text-slate-300">
              Searching repositories...
            </p>
          ) : suggestions.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-300">
              No repository suggestions yet.
            </p>
          ) : (
            <div className="divide-y divide-white/10">
              {suggestions.map((suggestion) => (
                <Link
                  key={suggestion.id}
                  href={`/explore/${suggestion.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-white/5"
                  onClick={() => {
                    setIsSuggestionsOpen(false);
                  }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {suggestion.name}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <ProfileAvatar
                          username={suggestion.ownerUsername}
                          avatarUrl={suggestion.ownerAvatarUrl}
                          className="h-6 w-6"
                          textClassName="text-[10px]"
                        />
                        <span>@{suggestion.ownerUsername}</span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 uppercase tracking-[0.18em] ${
                          suggestion.visibility === "public"
                            ? "border border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                            : "border border-amber-300/30 bg-amber-300/10 text-amber-100"
                        }`}
                      >
                        {suggestion.visibility}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-medium text-emerald-200">
                    Open
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
