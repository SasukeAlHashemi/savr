"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { RepositorySearchBox } from "@/components/repository-search-box";
import type { Repository } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/client";

type RepositorySearchPageProps = {
  initialQuery: string;
};

function visibilityBadgeClasses(visibility: Repository["visibility"]) {
  return visibility === "public"
    ? "border border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
    : "border border-amber-300/30 bg-amber-300/10 text-amber-100";
}

export function RepositorySearchPage({
  initialQuery,
}: RepositorySearchPageProps) {
  const router = useRouter();
  const query = initialQuery.trim();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [itemCountMap, setItemCountMap] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadRepositories() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!isActive) {
          return;
        }

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        let repositoryQuery = supabase
          .from("repositories")
          .select("id, name, description, visibility, allowed_types, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (query) {
          repositoryQuery = repositoryQuery.ilike("name", `%${query}%`);
        }

        const { data: repositoryRows, error: repositoryError } =
          await repositoryQuery;

        if (repositoryError) {
          throw new Error(repositoryError.message);
        }

        const ownRepositories = (repositoryRows ?? []) as Repository[];
        const repositoryIds = ownRepositories.map((repository) => repository.id);
        const { data: itemRows, error: itemError } =
          repositoryIds.length > 0
            ? await supabase
                .from("items")
                .select("repository_id")
                .in("repository_id", repositoryIds)
            : { data: [], error: null };

        if (itemError) {
          throw new Error(itemError.message);
        }

        const nextItemCountMap = (itemRows ?? []).reduce<
          Record<number, number>
        >((counts, item) => {
          const repositoryId = Number(item.repository_id);
          counts[repositoryId] = (counts[repositoryId] ?? 0) + 1;
          return counts;
        }, {});

        if (isActive) {
          setRepositories(ownRepositories);
          setItemCountMap(nextItemCountMap);
          setLoadError("");
        }
      } catch (error) {
        if (isActive) {
          setRepositories([]);
          setItemCountMap({});
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load your repositories.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    setIsLoading(true);
    void loadRepositories();

    return () => {
      isActive = false;
    };
  }, [query, router]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
              Repository Search
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Search your repositories
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Search your repositories by name.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Your dashboard
          </Link>
        </div>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/30">
          <RepositorySearchBox initialQuery={query} />

          <p className="mt-4 text-sm text-slate-400">
            {repositories.length} repositor
            {repositories.length === 1 ? "y" : "ies"} found
            {query ? ` for "${query}"` : " in your account"}.
          </p>
        </section>

        {loadError ? (
          <div className="mt-10 rounded-3xl border border-rose-400/30 bg-rose-400/10 p-6 text-sm text-rose-100">
            {loadError}
          </div>
        ) : null}

        <section className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-slate-950/30">
          {isLoading ? (
            <p className="p-8 text-center text-sm text-slate-300">
              Loading your repositories...
            </p>
          ) : loadError ? null : repositories.length === 0 ? (
            <div className="p-8 text-center">
              <h2 className="text-2xl font-semibold text-white">
                No matching repositories yet
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Try a different name or create a repository from your dashboard.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-left">
                <thead className="bg-slate-900/60">
                  <tr className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    <th className="px-6 py-4 font-medium">Repository</th>
                    <th className="px-6 py-4 font-medium">Visibility</th>
                    <th className="px-6 py-4 font-medium">Items</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {repositories.map((repository) => (
                    <tr key={repository.id} className="align-top">
                      <td className="px-6 py-5">
                        <p className="text-base font-semibold text-white">
                          {repository.name}
                        </p>
                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">
                          {repository.description || "No description added yet."}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] ${visibilityBadgeClasses(repository.visibility)}`}
                        >
                          {repository.visibility}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-200">
                        {itemCountMap[repository.id] ?? 0}
                      </td>
                      <td className="px-6 py-5">
                        <Link
                          href={`/repositories/${repository.id}`}
                          className="inline-flex rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                        >
                          Open repository
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
