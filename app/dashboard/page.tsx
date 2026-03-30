"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import type { Repository } from "@/lib/repositories";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<number, number>>({});
  const [loadError, setLoadError] = useState("");
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
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

      const { data: repositoryRows, error: repositoryError } = await supabase
        .from("repositories")
        .select("id, name, description, allowed_types, created_at")
        .order("created_at", { ascending: false });

      if (!isActive) {
        return;
      }

      if (repositoryError) {
        setLoadError(
          "The repositories table is not set up yet. Run the SQL file in Supabase, then refresh this page.",
        );
        setRepositories([]);
        setItemCounts({});
      } else {
        const { data: itemRows } = await supabase
          .from("items")
          .select("repository_id");

        const nextItemCounts = (itemRows ?? []).reduce<Record<number, number>>(
          (counts, item) => {
            const repositoryId = Number(item.repository_id);
            counts[repositoryId] = (counts[repositoryId] ?? 0) + 1;
            return counts;
          },
          {},
        );

        setLoadError("");
        setRepositories((repositoryRows ?? []) as Repository[]);
        setItemCounts(nextItemCounts);
      }

      setEmail(user.email ?? "Signed-in user");
      setIsLoadingPage(false);
    }

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [router]);

  async function handleLogout() {
    setIsLoggingOut(true);

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (isLoadingPage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
        <p className="text-sm text-slate-300">Loading your dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
              Dashboard
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Your repositories will live here.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              This page now loads repositories from Supabase for the currently
              logged-in user.
            </p>
            <p className="mt-4 text-sm text-slate-400">
              Signed in as{" "}
              <span className="font-medium text-emerald-200">{email}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/repositories/new"
              className="inline-flex rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              New repository
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </div>

        {loadError ? (
          <div className="mt-10 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-6 text-sm text-amber-100">
            {loadError}
          </div>
        ) : null}

        {!loadError && repositories.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
            <h2 className="text-2xl font-semibold text-white">
              No repositories yet
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Create your first repository to start organizing links, files,
              and previews in one place.
            </p>
            <Link
              href="/repositories/new"
              className="mt-6 inline-flex rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Create your first repository
            </Link>
          </div>
        ) : null}

        {!loadError && repositories.length > 0 ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {repositories.map((repository) => (
              <article
                key={repository.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/30"
              >
                <p className="text-sm font-medium text-emerald-200">
                  {itemCounts[repository.id] ?? 0} item
                  {itemCounts[repository.id] === 1 ? "" : "s"}
                </p>
                <h2 className="mt-3 text-2xl font-semibold">
                  {repository.name}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {repository.description || "No description added yet."}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                  {repository.allowed_types.length} content type
                  {repository.allowed_types.length === 1 ? "" : "s"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {repository.allowed_types.map((type) => (
                    <span
                      key={`${repository.id}-${type}`}
                      className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-200"
                    >
                      {type}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/repositories/${repository.id}`}
                    className="inline-flex rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                  >
                    Open repository
                  </Link>
                  <Link
                    href={`/repositories/${repository.id}/edit`}
                    className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Edit repository
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
