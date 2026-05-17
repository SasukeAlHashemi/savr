import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { OfficeDocumentViewer } from "@/components/office-document-viewer";
import { createAdminClient } from "@/lib/supabase/admin";
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

type SharePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SharePage({ params }: SharePageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: item, error } = await supabase
    .from("items")
    .select(
      "id, source_mode, item_type, share_slug, original_url, storage_path, file_name, mime_type, file_size_bytes",
    )
    .eq("share_slug", slug)
    .single();

  if (error || !item) {
    notFound();
  }

  if (item.source_mode === "link" && item.original_url) {
    redirect(item.original_url);
  }

  if (item.source_mode !== "upload" || !item.storage_path) {
    notFound();
  }

  const { data: previewUrlData, error: previewUrlError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(item.storage_path, 60 * 60);

  const { data: downloadUrlData, error: downloadUrlError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(item.storage_path, 60 * 60, {
      download: item.file_name || true,
    });

  if (
    previewUrlError ||
    !previewUrlData?.signedUrl ||
    downloadUrlError ||
    !downloadUrlData?.signedUrl
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-rose-400/30 bg-rose-400/10 p-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-rose-200">
            Share Link
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            This shared file is temporarily unavailable.
          </h1>
          <p className="mt-4 text-sm leading-7 text-rose-100">
            Savr could not prepare secure access to this uploaded file right now.
          </p>
        </div>
      </main>
    );
  }

  const assetUrl = previewUrlData.signedUrl;
  const downloadUrl = downloadUrlData.signedUrl;
  const fileSizeLabel = formatFileSize(item.file_size_bytes);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
              Shared From Savr
            </p>
            <h1 className="mt-4 break-all text-4xl font-semibold tracking-tight">
              {item.file_name || `${item.item_type} file`}
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              This file was shared from a Savr repository. You can preview it
              here and download the latest uploaded version.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={assetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Open file
            </a>
            <a
              href={downloadUrl}
              download={item.file_name ?? undefined}
              className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
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
              assetUrl={assetUrl}
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
              src={assetUrl}
              alt={item.file_name ?? "Shared image"}
              className="w-full object-cover"
            />
          ) : null}

          {isVideoUpload(item.item_type) ? (
            <video controls src={assetUrl} className="w-full bg-black" />
          ) : null}

          {isPdfUpload(item.item_type) ? (
            <iframe
              src={`${assetUrl}#toolbar=0`}
              title={item.file_name ?? "Shared PDF"}
              className="h-[70vh] w-full bg-white"
            />
          ) : null}

          {isAudioUpload(item.item_type) ? (
            <div className="bg-gradient-to-br from-slate-800 to-slate-950 px-8 py-10">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
                Audio Preview
              </p>
              <h2 className="mt-4 break-all text-2xl font-semibold text-white">
                {item.file_name ?? "Shared audio"}
              </h2>
              <audio controls src={assetUrl} className="mt-6 w-full" />
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
              This file type is available for secure download.
            </h2>
          </div>
        ) : null}

        <p className="mt-8 text-center text-sm text-slate-400">
          Shared using Savr.{" "}
          <Link href="/" className="font-medium text-emerald-200">
            Open Savr
          </Link>
        </p>
      </section>
    </main>
  );
}
