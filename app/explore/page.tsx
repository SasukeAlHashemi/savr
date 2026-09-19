import Link from "next/link";

import { ProfileAvatar } from "@/components/profile-avatar";
import { AVATAR_BUCKET, normalizeUsername, type Profile } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RepositoryVisibility } from "@/lib/repositories";

type ExploreUsersPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

type RepositorySummary = {
  id: number;
  user_id: string;
  visibility: RepositoryVisibility;
};

export default async function ExploreUsersPage({
  searchParams,
}: ExploreUsersPageProps) {
  const { q = "" } = await searchParams;
  const normalizedQuery = normalizeUsername(q);
  const supabase = createAdminClient();

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, avatar_path, created_at")
    .order("username", { ascending: true });

  if (profileError) {
    throw new Error(profileError.message);
  }

  const matchingProfiles = ((profileRows ?? []) as Profile[]).filter((profile) =>
    normalizedQuery ? profile.username.includes(normalizedQuery) : true,
  );

  const profileIds = matchingProfiles.map((profile) => profile.id);
  const { data: repositoryRows, error: repositoryError } =
    profileIds.length > 0
      ? await supabase
          .from("repositories")
          .select("id, user_id, visibility")
          .in("user_id", profileIds)
      : { data: [], error: null };

  if (repositoryError) {
    throw new Error(repositoryError.message);
  }

  const repositories = (repositoryRows ?? []) as RepositorySummary[];
  const repositoryIds = repositories.map((repository) => repository.id);
  const repositoryOwnerMap = new Map(
    repositories.map((repository) => [repository.id, repository.user_id]),
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

  const repositoryCountMap = new Map<string, number>();
  const publicRepositoryCountMap = new Map<string, number>();
  const secretRepositoryCountMap = new Map<string, number>();

  for (const repository of repositories) {
    repositoryCountMap.set(
      repository.user_id,
      (repositoryCountMap.get(repository.user_id) ?? 0) + 1,
    );

    if (repository.visibility === "public") {
      publicRepositoryCountMap.set(
        repository.user_id,
        (publicRepositoryCountMap.get(repository.user_id) ?? 0) + 1,
      );
    } else {
      secretRepositoryCountMap.set(
        repository.user_id,
        (secretRepositoryCountMap.get(repository.user_id) ?? 0) + 1,
      );
    }
  }

  const totalItemCountMap = new Map<string, number>();

  for (const item of itemRows ?? []) {
    const ownerId = repositoryOwnerMap.get(Number(item.repository_id));

    if (!ownerId) {
      continue;
    }

    totalItemCountMap.set(ownerId, (totalItemCountMap.get(ownerId) ?? 0) + 1);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
              Explore Savr
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Search for users and browse their profiles
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Savr discovery now starts with people. Search by username, open a
              public profile, and then explore that user&apos;s repositories from
              there.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/explore/repositories"
              className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Search repositories
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
          <form className="flex flex-col gap-4 lg:flex-row lg:items-end" action="/explore">
            <label className="block flex-1">
              <span className="text-sm font-medium text-slate-100">
                Search by username
              </span>
              <input
                type="text"
                name="q"
                defaultValue={normalizedQuery}
                placeholder="anime.archives"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Search users
              </button>
              {normalizedQuery ? (
                <Link
                  href="/explore"
                  className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Clear search
                </Link>
              ) : null}
            </div>
          </form>

          <p className="mt-4 text-sm text-slate-400">
            {matchingProfiles.length} user
            {matchingProfiles.length === 1 ? "" : "s"} found
            {normalizedQuery ? ` for "${normalizedQuery}"` : " on Savr"}.
          </p>
        </section>

        {matchingProfiles.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
            <h2 className="text-2xl font-semibold text-white">
              No matching users yet
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Try another username search, or ask that user to finish setting up
              their Savr profile first.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {matchingProfiles.map((profile) => {
              const avatarUrl = profile.avatar_path
                ? supabase.storage.from(AVATAR_BUCKET).getPublicUrl(profile.avatar_path)
                    .data.publicUrl
                : null;
              const repositoryCount = repositoryCountMap.get(profile.id) ?? 0;
              const publicRepositoryCount = publicRepositoryCountMap.get(profile.id) ?? 0;
              const secretRepositoryCount = secretRepositoryCountMap.get(profile.id) ?? 0;
              const totalItemCount = totalItemCountMap.get(profile.id) ?? 0;

              return (
                <article
                  key={profile.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/30"
                >
                  <div className="flex items-center gap-4">
                    <ProfileAvatar
                      username={profile.username}
                      avatarUrl={avatarUrl}
                      className="h-14 w-14"
                      textClassName="text-lg"
                    />
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
                        Savr User
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        @{profile.username}
                      </h2>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-slate-300">
                    Visit this profile to browse their repositories. Public
                    repositories open normally, while secret ones remain visible
                    as locked cards.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-200">
                    <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1">
                      {repositoryCount} repositor
                      {repositoryCount === 1 ? "y" : "ies"}
                    </span>
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-emerald-100">
                      {publicRepositoryCount} public
                    </span>
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-amber-100">
                      {secretRepositoryCount} secret
                    </span>
                    <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1">
                      {totalItemCount} item{totalItemCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <Link
                    href={`/u/${profile.username}`}
                    className="mt-6 inline-flex rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                  >
                    View profile
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
