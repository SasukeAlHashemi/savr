import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Repository } from "@/lib/repositories";

export default async function ExploreRepositoriesPage() {
  const supabase = createAdminClient();

  const { data: repositoryRows, error: repositoryError } = await supabase
    .from("repositories")
    .select("id, name, description, visibility, allowed_types, created_at")
    .order("created_at", { ascending: false });

  if (repositoryError) {
    throw new Error(repositoryError.message);
  }

  const repositories = (repositoryRows ?? []) as Repository[];
  const repositoryIds = repositories.map((repository) => repository.id);

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

  const itemCounts = (itemRows ?? []).reduce<Record<number, number>>(
    (counts, item) => {
      const repositoryId = Number(item.repository_id);
      counts[repositoryId] = (counts[repositoryId] ?? 0) + 1;
      return counts;
    },
    {},
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
              Explore Savr
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Repository cards created by the Savr community
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Public and secret repositories both appear here now. Public
              repositories are marked clearly, while secret repositories stay
              visible only as locked cards for this phase.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Your dashboard
            </Link>
          </div>
        </div>

        {repositories.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
            <h2 className="text-2xl font-semibold text-white">
              No repositories yet
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              As soon as users create repositories, their cards will show up
              here.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {repositories.map((repository) => (
              <article
                key={repository.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] ${
                      repository.visibility === "public"
                        ? "border border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                        : "border border-amber-300/30 bg-amber-300/10 text-amber-100"
                    }`}
                  >
                    {repository.visibility === "secret" ? (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path d="M8 11V8a4 4 0 1 1 8 0v3" />
                      </svg>
                    ) : null}
                    {repository.visibility}
                  </span>
                  <span className="text-sm font-medium text-emerald-200">
                    {itemCounts[repository.id] ?? 0} item
                    {(itemCounts[repository.id] ?? 0) === 1 ? "" : "s"}
                  </span>
                </div>

                <h2 className="mt-4 text-2xl font-semibold text-white">
                  {repository.name}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {repository.description || "No description added yet."}
                </p>

                <p className="mt-4 text-sm leading-7 text-slate-400">
                  {repository.visibility === "public"
                    ? "Visible in the community list."
                    : "Secret repository: visible as a locked card for now."}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {repository.allowed_types.map((type) => (
                    <span
                      key={`${repository.id}-${type}`}
                      className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-200"
                    >
                      {type}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/explore/${repository.id}`}
                  className={`mt-6 inline-flex rounded-full px-4 py-2 text-sm font-semibold transition ${
                    repository.visibility === "public"
                      ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                      : "border border-white/15 text-white hover:bg-white/10"
                  }`}
                >
                  {repository.visibility === "public"
                    ? "Open repository"
                    : "View locked notice"}
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
