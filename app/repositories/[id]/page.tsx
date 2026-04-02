"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { XPostEmbed } from "@/components/x-post-embed";
import { getHostname, isXPostUrl, isYouTubeUrl } from "@/lib/link-preview";
import { createClient } from "@/lib/supabase/client";
import type { RepositoryItem } from "@/lib/items";
import type { Repository } from "@/lib/repositories";
import {
  buildStoragePath,
  detectUploadContentType,
  getAllowedUploadTypes,
  getUploadAcceptValue,
  getUploadLabels,
  getUploadTypeLabel,
  isAudioUpload,
  isImageUpload,
  isOfficeUpload,
  isPdfUpload,
  isVideoUpload,
  STORAGE_BUCKET,
} from "@/lib/uploads";

function formatFileSize(fileSizeBytes: number | null) {
  if (!fileSizeBytes) {
    return null;
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = fileSizeBytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const roundedValue = value >= 10 ? Math.round(value) : Number(value.toFixed(1));
  return `${roundedValue} ${units[unitIndex]}`;
}

function OfficeFilePreview({ itemType }: { itemType: RepositoryItem["item_type"] }) {
  const previewTheme = {
    DOCX: {
      badge: "W",
      badgeClass: "bg-blue-600",
      frameClass: "from-blue-950 via-slate-900 to-slate-950",
    },
    PPTX: {
      badge: "P",
      badgeClass: "bg-orange-500",
      frameClass: "from-orange-950 via-slate-900 to-slate-950",
    },
    XLSX: {
      badge: "X",
      badgeClass: "bg-emerald-600",
      frameClass: "from-emerald-950 via-slate-900 to-slate-950",
    },
  }[itemType as "DOCX" | "PPTX" | "XLSX"];

  if (!previewTheme) {
    return null;
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br px-6 py-10 ${previewTheme.frameClass}`}
    >
      <div className="relative h-36 w-28 rounded-[2rem] bg-white shadow-2xl shadow-black/30">
        <div className="absolute right-0 top-0 h-10 w-10 rounded-bl-3xl rounded-tr-[2rem] bg-slate-200" />
        <div className="absolute left-5 top-6 space-y-2">
          <div className="h-2 w-12 rounded-full bg-slate-200" />
          <div className="h-2 w-10 rounded-full bg-slate-200" />
          <div className="h-2 w-8 rounded-full bg-slate-200" />
        </div>
        <div
          className={`absolute -left-4 bottom-5 flex h-16 w-16 items-center justify-center rounded-3xl text-3xl font-black text-white shadow-xl ${previewTheme.badgeClass}`}
        >
          {previewTheme.badge}
        </div>
      </div>
    </div>
  );
}

export default function RepositoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const repositoryId = Number(params.id);

  const [repository, setRepository] = useState<Repository | null>(null);
  const [items, setItems] = useState<RepositoryItem[]>([]);
  const [assetUrls, setAssetUrls] = useState<Record<number, string>>({});
  const [assetUrlStatuses, setAssetUrlStatuses] = useState<
    Record<number, "idle" | "loading" | "ready" | "error">
  >({});
  const [linkInput, setLinkInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userId, setUserId] = useState("");
  const [linkErrorMessage, setLinkErrorMessage] = useState("");
  const [fileErrorMessage, setFileErrorMessage] = useState("");
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const [deleteNoticeMessage, setDeleteNoticeMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddItemPanelOpen, setIsAddItemPanelOpen] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const previewRepairAttemptedIds = useRef<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const supportsHyperlinks = useMemo(
    () => repository?.allowed_types.includes("Hyperlink") ?? false,
    [repository],
  );

  const allowedUploadTypes = useMemo(
    () => getAllowedUploadTypes(repository?.allowed_types ?? []),
    [repository],
  );

  const hasUploadTypes = allowedUploadTypes.length > 0;

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
          "id, repository_id, user_id, source_mode, item_type, original_url, storage_path, file_name, mime_type, file_size_bytes, preview_title, preview_description, preview_image_url, preview_site_name, created_at",
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

  async function loadSignedUrlForItem(item: RepositoryItem) {
    if (item.source_mode !== "upload" || !item.storage_path) {
      return;
    }

    setAssetUrlStatuses((currentStatuses) => ({
      ...currentStatuses,
      [item.id]: "loading",
    }));

    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(item.storage_path, 60 * 60);

      if (error || !data?.signedUrl) {
        throw error ?? new Error("Could not generate a file access link.");
      }

      setAssetUrls((currentUrls) => ({
        ...currentUrls,
        [item.id]: data.signedUrl,
      }));
      setAssetUrlStatuses((currentStatuses) => ({
        ...currentStatuses,
        [item.id]: "ready",
      }));
    } catch {
      setAssetUrlStatuses((currentStatuses) => ({
        ...currentStatuses,
        [item.id]: "error",
      }));
    }
  }

  useEffect(() => {
    const uploadItemsNeedingUrls = items.filter(
      (item) =>
        item.source_mode === "upload" &&
        !!item.storage_path &&
        !assetUrls[item.id] &&
        assetUrlStatuses[item.id] !== "loading" &&
        assetUrlStatuses[item.id] !== "error",
    );

    if (uploadItemsNeedingUrls.length === 0) {
      return;
    }

    for (const item of uploadItemsNeedingUrls) {
      void loadSignedUrlForItem(item);
    }
  }, [assetUrlStatuses, assetUrls, items]);

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

  async function handleDeleteItem(item: RepositoryItem) {
    const itemLabel =
      item.source_mode === "upload"
        ? item.file_name || `${item.item_type} file`
        : item.preview_title || item.original_url || "this link";

    const confirmed = window.confirm(
      `Delete "${itemLabel}" from this repository?`,
    );

    if (!confirmed) {
      return;
    }

    setDeleteErrorMessage("");
    setDeleteNoticeMessage("");
    setDeletingItemId(item.id);

    try {
      const supabase = createClient();
      const { error: deleteRowError } = await supabase
        .from("items")
        .delete()
        .eq("id", item.id);

      if (deleteRowError) {
        throw deleteRowError;
      }

      let storageCleanupFailed = false;

      if (item.source_mode === "upload" && item.storage_path) {
        const { error: storageDeleteError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([item.storage_path]);

        if (storageDeleteError) {
          storageCleanupFailed = true;
        }
      }

      setItems((currentItems) =>
        currentItems.filter((currentItem) => currentItem.id !== item.id),
      );
      setAssetUrls((currentUrls) => {
        const nextUrls = { ...currentUrls };
        delete nextUrls[item.id];
        return nextUrls;
      });
      setAssetUrlStatuses((currentStatuses) => {
        const nextStatuses = { ...currentStatuses };
        delete nextStatuses[item.id];
        return nextStatuses;
      });

      if (storageCleanupFailed) {
        setDeleteNoticeMessage(
          "The item was deleted from the repository, but its uploaded file could not be removed from storage.",
        );
      }
    } catch (error) {
      setDeleteErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not delete the item. Please try again.",
      );
    } finally {
      setDeletingItemId(null);
    }
  }

  async function handleAddFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFileErrorMessage("");

    if (!selectedFile) {
      setFileErrorMessage("Please choose a file to upload.");
      return;
    }

    const detectedType = detectUploadContentType(selectedFile);

    if (!detectedType) {
      setFileErrorMessage(
        "That file type is not supported yet. Please choose JPG, PNG, Word, PPTX, Excel, PDF, MP3, or MP4.",
      );
      return;
    }

    if (!allowedUploadTypes.includes(detectedType)) {
      setFileErrorMessage(
        `This repository does not allow ${detectedType} uploads. Choose one of the selected repository types instead.`,
      );
      return;
    }

    setIsSubmitting(true);

    const supabase = createClient();
    const storagePath = buildStoragePath({
      userId,
      repositoryId,
      fileName: selectedFile.name,
    });

    try {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, selectedFile, {
          contentType: selectedFile.type || undefined,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 60 * 60);

      if (signedUrlError) {
        throw signedUrlError;
      }

      const { data, error } = await supabase
        .from("items")
        .insert({
          repository_id: repositoryId,
          user_id: userId,
          source_mode: "upload",
          item_type: detectedType,
          storage_path: storagePath,
          file_name: selectedFile.name,
          mime_type: selectedFile.type || null,
          file_size_bytes: selectedFile.size,
        })
        .select(
          "id, repository_id, user_id, source_mode, item_type, original_url, storage_path, file_name, mime_type, file_size_bytes, preview_title, preview_description, preview_image_url, preview_site_name, created_at",
        )
        .single();

      if (error) {
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        throw error;
      }

      const nextItem = data as RepositoryItem;
      setItems((currentItems) => [nextItem, ...currentItems]);
      setAssetUrls((currentUrls) => ({
        ...currentUrls,
        [nextItem.id]: signedUrlData.signedUrl,
      }));
      setAssetUrlStatuses((currentStatuses) => ({
        ...currentStatuses,
        [nextItem.id]: "ready",
      }));
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsAddItemPanelOpen(false);
    } catch (error) {
      setFileErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not upload the file. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLinkErrorMessage("");

    if (!supportsHyperlinks) {
      setLinkErrorMessage("This repository does not allow hyperlinks.");
      return;
    }

    const trimmedLink = linkInput.trim();

    if (!trimmedLink) {
      setLinkErrorMessage("Please enter a link to save.");
      return;
    }

    try {
      new URL(trimmedLink);
    } catch {
      setLinkErrorMessage(
        "Please enter a valid URL that starts with http:// or https://.",
      );
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
      setLinkErrorMessage(
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
                  setLinkErrorMessage("");
                  setFileErrorMessage("");
                  setIsAddItemPanelOpen((currentState) => !currentState);
                }}
                aria-label="Add a new item"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400 text-2xl font-semibold text-slate-950 transition hover:bg-emerald-300"
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
                  setLinkErrorMessage("");
                  setFileErrorMessage("");
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

                  {linkErrorMessage ? (
                    <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                      {linkErrorMessage}
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
                This repository does not allow hyperlinks, so only file uploads
                are available here.
              </p>
            )}

            {hasUploadTypes ? (
              <>
                <div className="mt-8 border-t border-white/10 pt-8">
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
                    Upload File
                  </p>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight">
                    Store a file in this repository.
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                    Allowed file types here: {getUploadLabels(allowedUploadTypes).join(", ")}.
                  </p>

                  <form className="mt-6 space-y-4" onSubmit={handleAddFile}>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-100">
                        Choose a file
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={getUploadAcceptValue(repository.allowed_types)}
                        onChange={(event) =>
                          setSelectedFile(event.target.files?.[0] ?? null)
                        }
                        className="mt-3 block w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-400 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
                        required
                      />
                    </label>

                    {selectedFile ? (
                      <p className="text-sm text-slate-300">
                        Selected file:{" "}
                        <span className="font-medium text-white">
                          {selectedFile.name}
                        </span>
                      </p>
                    ) : null}

                    {fileErrorMessage ? (
                      <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                        {fileErrorMessage}
                      </p>
                    ) : null}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-200"
                      >
                        {isSubmitting ? "Uploading file..." : "Upload file"}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            ) : null}
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
            Links and uploaded files both appear here as preview cards.
          </p>

          {deleteErrorMessage ? (
            <p className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {deleteErrorMessage}
            </p>
          ) : null}

          {deleteNoticeMessage ? (
            <p className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              {deleteNoticeMessage}
            </p>
          ) : null}

          {items.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-white/15 bg-slate-900/40 p-8 text-center">
              <h3 className="text-2xl font-semibold text-white">
                No items saved yet
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Click the + button above to add your first item.
              </p>
            </div>
          ) : (
            <div className="mt-8 columns-1 gap-5 md:columns-2 xl:columns-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="mb-5 break-inside-avoid overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70"
                >
                  {item.source_mode === "upload" ? (
                    <>
                      {isImageUpload(item.item_type) && assetUrls[item.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={assetUrls[item.id]}
                          alt={item.file_name ?? "Uploaded image"}
                          className="w-full object-cover"
                        />
                      ) : null}

                      {isVideoUpload(item.item_type) && assetUrls[item.id] ? (
                        <video
                          controls
                          src={assetUrls[item.id]}
                          className="w-full bg-black"
                        />
                      ) : null}

                      {isPdfUpload(item.item_type) && assetUrls[item.id] ? (
                        <iframe
                          src={`${assetUrls[item.id]}#toolbar=0`}
                          title={item.file_name ?? "PDF preview"}
                          className="h-80 w-full bg-white"
                        />
                      ) : null}

                      {isAudioUpload(item.item_type) ? (
                        <div className="bg-gradient-to-br from-slate-800 to-slate-950 px-6 py-8">
                          <p className="text-sm font-medium text-emerald-200">
                            Audio Preview
                          </p>
                          <h3 className="mt-3 text-xl font-semibold text-white">
                            {item.file_name ?? "Untitled audio"}
                          </h3>
                          {assetUrls[item.id] ? (
                            <audio
                              controls
                              src={assetUrls[item.id]}
                              className="mt-5 w-full"
                            />
                          ) : (
                            <p className="mt-4 text-sm text-slate-300">
                              Preparing the audio player...
                            </p>
                          )}
                        </div>
                      ) : null}

                      {!isImageUpload(item.item_type) &&
                      !isVideoUpload(item.item_type) &&
                      !isPdfUpload(item.item_type) &&
                      !isAudioUpload(item.item_type) ? (
                        isOfficeUpload(item.item_type) ? (
                          <OfficeFilePreview itemType={item.item_type} />
                        ) : (
                          <div className="flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-10 text-center">
                            <div>
                              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
                                {item.item_type}
                              </p>
                            </div>
                          </div>
                        )
                      ) : null}
                    </>
                  ) : item.original_url && isXPostUrl(item.original_url) ? (
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
                      {item.source_mode === "upload"
                        ? getUploadTypeLabel(item.item_type)
                        : item.preview_site_name || item.item_type}
                    </p>
                    <h3 className="mt-3 break-all text-xl font-semibold text-white">
                      {item.source_mode === "upload"
                        ? item.file_name || `${item.item_type} file`
                        : item.original_url && isYouTubeUrl(item.original_url)
                        ? item.preview_title || "YouTube video"
                        : item.preview_title ||
                          getHostname(item.original_url ?? "")}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      {item.source_mode === "upload"
                        ? item.item_type === "DOCX"
                          ? "Word document stored in this repository."
                          : item.item_type === "PPTX"
                            ? "PowerPoint file stored in this repository."
                            : item.item_type === "XLSX"
                              ? "Excel file stored in this repository."
                              : item.item_type === "PDF"
                                ? "PDF file uploaded to this repository."
                                : item.item_type === "MP3"
                                  ? "Audio file uploaded to this repository."
                                  : item.item_type === "MP4"
                                    ? "Video file uploaded to this repository."
                                    : "Image file uploaded to this repository."
                        : item.preview_description ||
                        (item.original_url && isXPostUrl(item.original_url)
                          ? "This embedded post is being shown directly from X."
                          : "Preview details were not available for this link, but the original URL is saved below.")}
                    </p>

                    {item.source_mode === "upload" ? (
                      <>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                          {item.mime_type ? (
                            <span className="rounded-full border border-white/10 px-3 py-1">
                              {item.mime_type}
                            </span>
                          ) : null}
                          {formatFileSize(item.file_size_bytes) ? (
                            <span className="rounded-full border border-white/10 px-3 py-1">
                              {formatFileSize(item.file_size_bytes)}
                            </span>
                          ) : null}
                        </div>

                        {assetUrls[item.id] ? (
                          <div className="mt-5 flex flex-wrap gap-3">
                            <a
                              href={assetUrls[item.id]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                            >
                              Open file
                            </a>
                            <a
                              href={assetUrls[item.id]}
                              download={item.file_name ?? undefined}
                              className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                            >
                              Download
                            </a>
                            <button
                              type="button"
                              onClick={() => void handleDeleteItem(item)}
                              disabled={deletingItemId === item.id}
                              className="inline-flex rounded-full border border-rose-400/30 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingItemId === item.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        ) : assetUrlStatuses[item.id] === "error" ? (
                          <div className="mt-5 flex flex-wrap items-center gap-3">
                            <p className="text-sm text-rose-200">
                              Could not prepare the file access link.
                            </p>
                            <button
                              type="button"
                              onClick={() => void loadSignedUrlForItem(item)}
                              className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                            >
                              Retry link
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteItem(item)}
                              disabled={deletingItemId === item.id}
                              className="inline-flex rounded-full border border-rose-400/30 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingItemId === item.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        ) : (
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <p className="text-sm text-slate-400">
                              Preparing file access link...
                            </p>
                            <button
                              type="button"
                              onClick={() => void handleDeleteItem(item)}
                              disabled={deletingItemId === item.id}
                              className="inline-flex rounded-full border border-rose-400/30 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingItemId === item.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <a
                            href={item.original_url ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                          >
                            Open original link
                          </a>
                          <button
                            type="button"
                            onClick={() => void handleDeleteItem(item)}
                            disabled={deletingItemId === item.id}
                            className="inline-flex rounded-full border border-rose-400/30 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingItemId === item.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                        <p className="mt-4 break-all text-xs leading-6 text-slate-400">
                          {item.original_url}
                        </p>
                      </>
                    )}
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
