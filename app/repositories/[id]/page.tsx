"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { XPostEmbed } from "@/components/x-post-embed";
import { getHostname, isXPostUrl, isYouTubeUrl } from "@/lib/link-preview";
import { createClient } from "@/lib/supabase/client";
import type { RepositoryItem } from "@/lib/items";
import type { Repository } from "@/lib/repositories";

export default function RepositoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const repositoryId = Number(params.id);

  const [repository, setRepository] = useState<Repository | null>(null);
  const [items, setItems] = useState<RepositoryItem[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [userId, setUserId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddItemPanelOpen, setIsAddItemPanelOpen] = useState(false);
  const previewRepairAttemptedIds = useRef<Set<number>>(new Set());

  const supportsHyperlinks = useMemo(
    () => repository?.allowed_types.includes("Hyperlink") ?? false,
    [repository],
  );

  const hasUploadTypes = useMemo(
    () =>
      repository?.allowed_types.some((type) => type !== "Hyperlink") ?? false,
    [repository],
  );

  useEffect(() => {
    let isActive = true;

    async function loadRepositoryPage() {
      if (!Number.isFinite(repositoryId)) {
        setLoadError("This repository ID is invalid.");
        setIsLoadingPage(false);
        return;
      }

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

      const { data: repositoryRow, error: repositoryError } = await supabase
        .from("repositories")
        .select("id, name, description, allowed_types, created_at")
        .eq("id", repositoryId)
        .single();

      if (!isActive) {
        return;
      }

      if (repositoryError || !repositoryRow) {
        setLoadError("We could not find that repository.");
        setIsLoadingPage(false);
        return;
      }

      const { data: itemRows, error: itemError } = await supabase
        .from("items")
        .select(
          "id, repository_id, user_id, source_mode, item_type, original_url, preview_title, preview_description, preview_image_url, preview_site_name, created_at",
        )
        .eq("repository_id", repositoryId)
        .order("created_at", { ascending: false });

      if (!isActive) {
        return;
      }

      if (itemError) {
        setLoadError(
          "The items table is not set up yet. Run the SQL file for items in Supabase, then refresh this page.",
        );
        setIsLoadingPage(false);
        return;
      }

      setUserId(user.id);
      setRepository(repositoryRow as Repository);
      setItems((itemRows ?? []) as RepositoryItem[]);
      setLoadError("");
      setIsLoadingPage(false);
    }

    void loadRepositoryPage();

    return () => {
      isActive = false;
    };
  }, [repositoryId, router]);

  useEffect(() => {
    const missingPreviewItems = items.filter(
      (item) =>
        item.source_mode === "link" &&
        !!item.original_url &&
        !isXPostUrl(item.original_url) &&
        (!item.preview_title || !item.preview_image_url) &&
        !previewRepairAttemptedIds.current.has(item.id),
    );

    if (missingPreviewItems.length === 0) {
      return;
    }

    let isActive = true;

    async function repairMissingPreviews() {
      const supabase = createClient();

      for (const item of missingPreviewItems) {
        if (!item.original_url) {
          continue;
        }

        previewRepairAttemptedIds.current.add(item.id);

        try {
          const previewResponse = await fetch("/api/link-preview", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: item.original_url }),
          });

          const previewPayload = (await previewResponse.json()) as {
            error?: string;
            preview?: {
              title?: string;
              description?: string | null;
              imageUrl?: string | null;
              siteName?: string | null;
            };
          };

          if (!isActive || !previewResponse.ok || !previewPayload.preview) {
            continue;
          }

          const nextPreview = {
            preview_title: previewPayload.preview.title ?? null,
            preview_description: previewPayload.preview.description ?? null,
            preview_image_url: previewPayload.preview.imageUrl ?? null,
            preview_site_name: previewPayload.preview.siteName ?? null,
          };

          const { error } = await supabase
            .from("items")
            .update(nextPreview)
            .eq("id", item.id);

          if (error || !isActive) {
            continue;
          }

          setItems((currentItems) =>
            currentItems.map((currentItem) =>
              currentItem.id === item.id
                ? {
                    ...currentItem,
                    ...nextPreview,
                  }
                : currentItem,
            ),
          );
        } catch {
          // Keep the existing fallback card if preview repair fails.
        }
      }
    }

    void repairMissingPreviews();

    return () => {
      isActive = false;
    };
  }, [items]);

  async function handleAddLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!supportsHyperlinks) {
      setErrorMessage("This repository does not allow hyperlinks.");
      return;
    }

    const trimmedLink = linkInput.trim();

    if (!trimmedLink) {
      setErrorMessage("Please enter a link to save.");
      return;
    }

    try {
      new URL(trimmedLink);
    } catch {
      setErrorMessage("Please enter a valid URL that starts with http:// or https://.");
      return;
    }

    setIsSubmitting(true);

    try {
      const previewResponse = await fetch("/api/link-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmedLink }),
      });

      const previewPayload = (await previewResponse.json()) as {
        error?: string;
        preview?: {
          title?: string;
          description?: string | null;
          imageUrl?: string | null;
          siteName?: string | null;
        };
      };

      if (!previewResponse.ok || !previewPayload.preview) {
        throw new Error(previewPayload.error || "Could not prepare the link preview.");
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("items")
        .insert({
          repository_id: repositoryId,
          user_id: userId,
          source_mode: "link",
          item_type: "Hyperlink",
          original_url: trimmedLink,
          preview_title: previewPayload.preview.title ?? null,
          preview_description: previewPayload.preview.description ?? null,
          preview_image_url: previewPayload.preview.imageUrl ?? null,
          preview_site_name: previewPayload.preview.siteName ?? null,
        })
        .select(
          "id, repository_id, user_id, source_mode, item_type, original_url, preview_title, preview_description, preview_image_url, preview_site_name, created_at",
        )
        .single();

      if (error) {
        throw error;
      }

      setItems((currentItems) => [data as RepositoryItem, ...currentItems]);
      setLinkInput("");
      setIsAddItemPanelOpen(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not save the link. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingPage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
        <p className="text-sm text-slate-300">Loading repository...</p>
      </main>
    );
  }

  if (loadError || !repository) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
        <div className="max-w-xl rounded-3xl border border-rose-400/30 bg-rose-400/10 p-6 text-center">
          <p className="text-sm text-rose-200">
            {loadError || "We could not load this repository."}
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
                Repository
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">
                {repository.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                {repository.description || "No description added yet."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setIsAddItemPanelOpen((currentState) => !currentState);
                }}
                disabled={!supportsHyperlinks}
                aria-label="Add a new item"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400 text-2xl font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:text-slate-600"
              >
                +
              </button>
              <Link
                href="/dashboard"
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Back to dashboard
              </Link>
              <Link
                href={`/repositories/${repository.id}/edit`}
                className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Edit repository
              </Link>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-400">
            {items.length} saved item{items.length === 1 ? "" : "s"}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {repository.allowed_types.map((type) => (
              <span
                key={`${repository.id}-${type}`}
                className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-200"
              >
                {type}
              </span>
            ))}
          </div>
        </div>

        {isAddItemPanelOpen ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/30">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
                  Add Item
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                  Save a new item in this repository.
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setIsAddItemPanelOpen(false);
                }}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Cancel
              </button>
            </div>

            {supportsHyperlinks ? (
              <>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                  {hasUploadTypes
                    ? "You can add hyperlinks now. File upload support for the other selected types will be added next."
                    : "This repository only supports hyperlinks right now, so you only need to paste the link you want to save."}
                </p>

                <form className="mt-6 space-y-4" onSubmit={handleAddLink}>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-100">
                      Link URL
                    </span>
                    <input
                      type="url"
                      value={linkInput}
                      onChange={(event) => setLinkInput(event.target.value)}
                      placeholder="https://x.com/... or https://youtube.com/..."
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300"
                      required
                    />
                  </label>

                  {errorMessage ? (
                    <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                      {errorMessage}
                    </p>
                  ) : null}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-200"
                    >
                      {isSubmitting ? "Saving link..." : "Save link"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                This repository only supports file types right now. Link saving
                is not enabled here, and file upload support is the next feature
                we&apos;ll add.
              </p>
            )}
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/30">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
            Saved Items
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Items in this repository
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Link items are shown as cards for now. We&apos;ll add richer previews
            next.
          </p>

          {items.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-white/15 bg-slate-900/40 p-8 text-center">
              <h3 className="text-2xl font-semibold text-white">
                No items saved yet
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Click the + button above to add your first link.
              </p>
            </div>
          ) : (
            <div className="mt-8 columns-1 gap-5 md:columns-2 xl:columns-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="mb-5 break-inside-avoid overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70"
                >
                  {item.original_url && isXPostUrl(item.original_url) ? (
                    <XPostEmbed url={item.original_url} />
                  ) : item.preview_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.preview_image_url}
                      alt={item.preview_title ?? "Link preview image"}
                      className="w-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-10 text-center">
                      <p className="text-lg font-semibold text-slate-200">
                        {item.preview_site_name || getHostname(item.original_url ?? "")}
                      </p>
                    </div>
                  )}

                  <div className="p-6">
                    <p className="text-sm font-medium text-emerald-200">
                      {item.preview_site_name || item.item_type}
                    </p>
                    <h3 className="mt-3 text-xl font-semibold text-white">
                      {item.original_url && isYouTubeUrl(item.original_url)
                        ? item.preview_title || "YouTube video"
                        : item.preview_title ||
                          getHostname(item.original_url ?? "")}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      {item.preview_description ||
                        (item.original_url && isXPostUrl(item.original_url)
                          ? "This embedded post is being shown directly from X."
                          : "Preview details were not available for this link, but the original URL is saved below.")}
                    </p>
                    <a
                      href={item.original_url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      Open original link
                    </a>
                    <p className="mt-4 break-all text-xs leading-6 text-slate-400">
                      {item.original_url}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
