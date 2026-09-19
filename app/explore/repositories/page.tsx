import Link from "next/link";

import { ProfileAvatar } from "@/components/profile-avatar";
import { RepositorySearchBox } from "@/components/repository-search-box";
import { AVATAR_BUCKET, type Profile } from "@/lib/profiles";
import type { Repository, RepositoryVisibility } from "@/lib/repositories";
import { createAdminClient } from "@/lib/supabase/admin";

type RepositorySearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

type RepositorySearchRow = Repository & {
  user_id: string;
};

function visibilityBadgeClasses(visibility: RepositoryVisibility) {
  return visibility === "public"
    ? "border border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
    : "border border-amber-300/30 bg-amber-300/10 text-amber-100";
}

export default async function RepositorySearchPage({
  searchParams,
}: RepositorySearchPageProps) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const supabase = createAdminClient();

  const repositoryQuery = supabase
    .from("repositories")
    .select("id, user_id, name, description, visibility, allowed_types, created_at")
    .order("created_at", { ascending: false });

  const { data: repositoryRows, error: repositoryError } = query
    ? await repositoryQuery.ilike("name", `%${query}%`)
    : await repositoryQuery;

  if (repositoryError) {
    throw new Error(repositoryError.message);
  }

  const repositories = (repositoryRows ?? []) as RepositorySearchRow[];
  const ownerIds = [...new Set(repositories.map((repository) => repository.user_id))];
  const repositoryIds = repositories.map((repository) => repository.id);

  const { data: profileRows, error: profileError } =
    ownerIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username, avatar_path, created_at")
          .in("id", ownerIds)
      : { data: [], error: null };

  if (profileError) {
    throw new Error(profileError.message);
  }

  const profileMap = new Map(
    ((profileRows ?? []) as Profile[]).map((profile) => [profile.id, profile]),
  );

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

  const itemCountMap = (itemRows ?? []).reduce<Record<number, number>>(
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
              Repository Search
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Search for repositories across Savr
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Search by repository name and see exactly who owns each match.
              Public repositories can be opened directly, while secret ones still
              route to the locked notice.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/explore"
              className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Search users
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Your dashboard
            </Link>
          </div>
        </div>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/30">
          <RepositorySearchBox initialQuery={query} />

          <p className="mt-4 text-sm text-slate-400">
            {repositories.length} repositor
            {repositories.length === 1 ? "y" : "ies"} found
            {query ? ` for "${query}"` : " across Savr"}.
          </p>
        </section>

        <section className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-slate-950/30">
          {repositories.length === 0 ? (
            <div className="p-8 text-center">
              <h2 className="text-2xl font-semibold text-white">
                No matching repositories yet
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Try a broader search term or switch to user search to browse
                profiles instead.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-left">
                <thead className="bg-slate-900/60">
                  <tr className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    <th className="px-6 py-4 font-medium">Repository</th>
                    <th className="px-6 py-4 font-medium">Owner</th>
                    <th className="px-6 py-4 font-medium">Visibility</th>
                    <th className="px-6 py-4 font-medium">Items</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {repositories.map((repository) => {
                    const ownerProfile = profileMap.get(repository.user_id);
                    const ownerAvatarUrl = ownerProfile?.avatar_path
                      ? supabase.storage
                          .from(AVATAR_BUCKET)
                          .getPublicUrl(ownerProfile.avatar_path).data.publicUrl
                      : null;

                    return (
                      <tr key={repository.id} className="align-top">
                        <td className="px-6 py-5">
                          <div>
                            <p className="text-base font-semibold text-white">
                              {repository.name}
                            </p>
                            <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">
                              {repository.description || "No description added yet."}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {ownerProfile ? (
                            <Link
                              href={`/u/${ownerProfile.username}`}
                              className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/40 px-3 py-2 transition hover:bg-slate-900/70"
                            >
                              <ProfileAvatar
                                username={ownerProfile.username}
                                avatarUrl={ownerAvatarUrl}
                                className="h-10 w-10"
                                textClassName="text-sm"
                              />
                              <span className="text-sm font-medium text-white">
                                @{ownerProfile.username}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-sm text-slate-400">Unknown owner</span>
                          )}
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
                            href={`/explore/${repository.id}`}
                            className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold transition ${
                              repository.visibility === "public"
                                ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                                : "border border-white/15 text-white hover:bg-white/10"
                            }`}
                          >
                            {repository.visibility === "public"
                              ? "Open repository"
                              : "View locked notice"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
