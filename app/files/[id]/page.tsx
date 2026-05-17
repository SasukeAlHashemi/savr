"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { OfficeDocumentViewer } from "@/components/office-document-viewer";
import type { RepositoryItem } from "@/lib/items";
import { createClient } from "@/lib/supabase/client";
import {
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

export default function FilePreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const itemId = Number(params.id);

  const [item, setItem] = useState<RepositoryItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadFilePreview() {
      if (!Number.isFinite(itemId)) {
        setLoadError("This file ID is invalid.");
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

      const { data: itemRow, error: itemError } = await supabase
        .from("items")
        .select(
          "id, repository_id, user_id, source_mode, item_type, share_slug, original_url, storage_path, file_name, mime_type, file_size_bytes, preview_title, preview_description, preview_image_url, preview_site_name, created_at",
        )
        .eq("id", itemId)
        .single();

      if (!isActive) {
        return;
      }

      if (itemError || !itemRow) {
        setLoadError("We could not find that file.");
        setIsLoadingPage(false);
        return;
      }

      const nextItem = itemRow as RepositoryItem;

      if (nextItem.source_mode !== "upload" || !nextItem.storage_path) {
        setLoadError("This saved item does not have a file preview.");
        setIsLoadingPage(false);
        return;
      }

      const { data: previewUrlData, error: previewUrlError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(nextItem.storage_path, 60 * 60);

      const { data: downloadUrlData, error: downloadUrlError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(nextItem.storage_path, 60 * 60, {
          download: nextItem.file_name || true,
        });

      if (!isActive) {
        return;
      }

      if (
        previewUrlError ||
        !previewUrlData?.signedUrl ||
        downloadUrlError ||
        !downloadUrlData?.signedUrl
      ) {
        setLoadError("Savr could not prepare this file preview right now.");
        setIsLoadingPage(false);
        return;
      }

      setItem(nextItem);
      setPreviewUrl(previewUrlData.signedUrl);
      setDownloadUrl(downloadUrlData.signedUrl);
      setLoadError("");
      setIsLoadingPage(false);
    }

    void loadFilePreview();

    return () => {
      isActive = false;
    };
  }, [itemId, router]);

  if (isLoadingPage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
        <p className="text-sm text-slate-300">Preparing file preview...</p>
      </main>
    );
  }

  if (!item || loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-rose-400/30 bg-rose-400/10 p-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-rose-200">
            File Preview
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            This file is unavailable.
          </h1>
          <p className="mt-4 text-sm leading-7 text-rose-100">
            {loadError || "We could not load this file."}
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

  const fileSizeLabel = formatFileSize(item.file_size_bytes);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
              File Preview
            </p>
            <h1 className="mt-4 break-all text-4xl font-semibold tracking-tight">
              {item.file_name || `${item.item_type} file`}
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              This is Savr&apos;s read-only preview page. Download the file if you
              want to open it in its native app and edit it there.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/repositories/${item.repository_id}`}
              className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Back to repository
            </Link>
            <a
              href={downloadUrl}
              download={item.file_name ?? undefined}
              className="inline-flex rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Download
            </a>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-200">
            {getUploadTypeLabel(item.item_type)}
          </span>
          {item.mime_type ? (
            <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-200">
              {item.mime_type}
            </span>
          ) : null}
          {fileSizeLabel ? (
            <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-200">
              {fileSizeLabel}
            </span>
          ) : null}
        </div>

        {isOfficeUpload(item.item_type) ? (
          <div className="mt-8">
            <OfficeDocumentViewer
              assetUrl={previewUrl}
              fileName={item.file_name || `${item.item_type} file`}
              itemType={item.item_type}
            />
          </div>
        ) : null}

        {!isOfficeUpload(item.item_type) ? (
          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70">
          {isImageUpload(item.item_type) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={item.file_name ?? "Saved image"}
              className="w-full object-cover"
            />
          ) : null}

          {isVideoUpload(item.item_type) ? (
            <video controls src={previewUrl} className="w-full bg-black" />
          ) : null}

          {isPdfUpload(item.item_type) ? (
            <iframe
              src={`${previewUrl}#toolbar=0`}
              title={item.file_name ?? "Saved PDF"}
              className="h-[70vh] w-full bg-white"
            />
          ) : null}

          {isAudioUpload(item.item_type) ? (
            <div className="bg-gradient-to-br from-slate-800 to-slate-950 px-8 py-10">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
                Audio Preview
              </p>
              <h2 className="mt-4 break-all text-2xl font-semibold text-white">
                {item.file_name ?? "Saved audio"}
              </h2>
              <audio controls src={previewUrl} className="mt-6 w-full" />
            </div>
          ) : null}

          </div>
        ) : null}

        {!isImageUpload(item.item_type) &&
        !isVideoUpload(item.item_type) &&
        !isPdfUpload(item.item_type) &&
        !isAudioUpload(item.item_type) &&
        !isOfficeUpload(item.item_type) ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
              File Preview
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-white">
              This file is available for safe download from Savr.
            </h2>
          </div>
        ) : null}

        {isOfficeUpload(item.item_type) ? (
          <p className="mt-8 text-sm leading-7 text-slate-300">
            If the Office viewer loads successfully, this acts as your read-only
            Savr preview. Editing still happens after download in Word,
            PowerPoint, or Excel.
          </p>
        ) : null}
      </section>
    </main>
  );
}
