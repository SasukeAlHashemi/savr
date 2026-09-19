import Link from "next/link";
import { notFound } from "next/navigation";

import { OfficeFilePreview } from "@/components/office-file-preview";
import { ProfileAvatar } from "@/components/profile-avatar";
import { XPostEmbed } from "@/components/x-post-embed";
import type { RepositoryItem } from "@/lib/items";
import { getHostname, isXPostUrl, isYouTubeUrl } from "@/lib/link-preview";
import { AVATAR_BUCKET, type Profile } from "@/lib/profiles";
import type { Repository } from "@/lib/repositories";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getUploadTypeLabel,
  isAudioUpload,
  isImageUpload,
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

type ExploreRepositoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type UploadAssetUrls = Record<
  number,
  {
    previewUrl: string;
    downloadUrl: string;
  }
>;

export default async function ExploreRepositoryPage({
  params,
}: ExploreRepositoryPageProps) {
  const { id } = await params;
  const repositoryId = Number(id);

  if (!Number.isFinite(repositoryId)) {
    notFound();
  }

  const supabase = createAdminClient();
  const { data: repositoryRow, error: repositoryError } = await supabase
    .from("repositories")
    .select("id, user_id, name, description, visibility, allowed_types, created_at")
    .eq("id", repositoryId)
    .single();

  if (repositoryError || !repositoryRow) {
    notFound();
  }

  const repository = repositoryRow as Repository & {
    user_id: string;
  };
  const { data: ownerProfileRow, error: ownerProfileError } = await supabase
    .from("profiles")
    .select("id, username, avatar_path, created_at")
    .eq("id", repository.user_id)
    .single();

  if (ownerProfileError || !ownerProfileRow) {
    throw new Error(ownerProfileError?.message || "Repository owner not found.");
  }

  const ownerProfile = ownerProfileRow as Profile;
  const ownerAvatarUrl = ownerProfile.avatar_path
    ? supabase.storage.from(AVATAR_BUCKET).getPublicUrl(ownerProfile.avatar_path).data
        .publicUrl
    : null;

  if (repository.visibility === "secret") {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-amber-100">
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
              Secret
            </span>
          </div>

          <Link
            href={`/u/${ownerProfile.username}`}
            className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 transition hover:bg-slate-900/80"
          >
            <ProfileAvatar
              username={ownerProfile.username}
              avatarUrl={ownerAvatarUrl}
              className="h-12 w-12"
              textClassName="text-base"
            />
            <div className="text-left">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Owner
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                @{ownerProfile.username}
              </p>
            </div>
          </Link>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight">
            {repository.name}
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            This repository belongs to another user and is currently marked as
            secret. For now, Savr only shows the locked card and hides the
            contents from other users.
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            {repository.description || "No description added yet."}
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

          <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/explore"
                className="inline-flex rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Back to users
              </Link>
            <Link
              href="/dashboard"
              className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Your dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { data: itemRows, error: itemError } = await supabase
    .from("items")
    .select(
      "id, repository_id, user_id, source_mode, item_type, share_slug, original_url, storage_path, file_name, mime_type, file_size_bytes, preview_title, preview_description, preview_image_url, preview_site_name, created_at",
    )
    .eq("repository_id", repository.id)
    .order("created_at", { ascending: false });

  if (itemError) {
    throw new Error(itemError.message);
  }

  const items = (itemRows ?? []) as RepositoryItem[];
  const uploadItems = items.filter(
    (item) => item.source_mode === "upload" && !!item.storage_path,
  );

  const uploadAssetEntries = await Promise.all(
    uploadItems.map(async (item) => {
      if (!item.storage_path) {
        return null;
      }

      const { data: previewUrlData } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(item.storage_path, 60 * 60);
      const { data: downloadUrlData } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(item.storage_path, 60 * 60, {
          download: item.file_name || true,
        });

      if (!previewUrlData?.signedUrl || !downloadUrlData?.signedUrl) {
        return null;
      }

      return [
        item.id,
        {
          previewUrl: previewUrlData.signedUrl,
          downloadUrl: downloadUrlData.signedUrl,
        },
      ] as const;
    }),
  );

  const uploadAssetUrls = Object.fromEntries(
    uploadAssetEntries.filter(
      (entry): entry is readonly [number, { previewUrl: string; downloadUrl: string }] =>
        entry !== null,
    ),
  ) as UploadAssetUrls;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
                Public Repository
              </p>
              <Link
                href={`/u/${ownerProfile.username}`}
                className="mt-4 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 transition hover:bg-slate-900/80"
              >
                <ProfileAvatar
                  username={ownerProfile.username}
                  avatarUrl={ownerAvatarUrl}
                  className="h-12 w-12"
                  textClassName="text-base"
                />
                <div className="text-left">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Owner
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    @{ownerProfile.username}
                  </p>
                </div>
              </Link>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">
                {repository.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                {repository.description || "No description added yet."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/explore"
                className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Back to users
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Your dashboard
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

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/30">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">
            Saved Items
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Public items in this repository
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            These items are visible because the repository owner marked this
            repository as public.
          </p>

          {items.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-white/15 bg-slate-900/40 p-8 text-center">
              <h3 className="text-2xl font-semibold text-white">
                No items saved yet
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                This public repository does not have any saved items yet.
              </p>
            </div>
          ) : (
            <div className="mt-8 columns-1 gap-5 md:columns-2 xl:columns-3">
              {items.map((item) => {
                const uploadAsset = uploadAssetUrls[item.id];

                return (
                  <article
                    key={item.id}
                    className="mb-5 break-inside-avoid overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70"
                  >
                    {item.source_mode === "upload" ? (
                      <>
                        {isImageUpload(item.item_type) && uploadAsset?.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={uploadAsset.previewUrl}
                            alt={item.file_name ?? "Uploaded image"}
                            className="w-full object-cover"
                          />
                        ) : null}

                        {isVideoUpload(item.item_type) && uploadAsset?.previewUrl ? (
                          <video
                            controls
                            src={uploadAsset.previewUrl}
                            className="w-full bg-black"
                          />
                        ) : null}

                        {isPdfUpload(item.item_type) && uploadAsset?.previewUrl ? (
                          <iframe
                            src={`${uploadAsset.previewUrl}#toolbar=0`}
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
                            {uploadAsset?.previewUrl ? (
                              <audio
                                controls
                                src={uploadAsset.previewUrl}
                                className="mt-5 w-full"
                              />
                            ) : (
                              <p className="mt-4 text-sm text-slate-300">
                                Preview could not be prepared for this file.
                              </p>
                            )}
                          </div>
                        ) : null}

                        {!isImageUpload(item.item_type) &&
                        !isVideoUpload(item.item_type) &&
                        !isPdfUpload(item.item_type) &&
                        !isAudioUpload(item.item_type) ? (
                          <OfficeFilePreview itemType={item.item_type} />
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
                          {item.preview_site_name ||
                            getHostname(item.original_url ?? "")}
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
                            ? "Word document shared through this public repository."
                            : item.item_type === "PPTX"
                              ? "PowerPoint file shared through this public repository."
                              : item.item_type === "XLSX"
                                ? "Excel file shared through this public repository."
                                : item.item_type === "PDF"
                                  ? "PDF file shared through this public repository."
                                  : item.item_type === "MP3"
                                    ? "Audio file shared through this public repository."
                                    : item.item_type === "MP4"
                                      ? "Video file shared through this public repository."
                                      : "Image file shared through this public repository."
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

                          {uploadAsset ? (
                            <div className="mt-5 flex flex-wrap gap-3">
                              <a
                                href={
                                  item.share_slug
                                    ? `/share/${item.share_slug}`
                                    : uploadAsset.previewUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                              >
                                Open file
                              </a>
                              <a
                                href={uploadAsset.downloadUrl}
                                download={item.file_name ?? undefined}
                                className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                              >
                                Download
                              </a>
                            </div>
                          ) : (
                            <p className="mt-5 text-sm text-slate-400">
                              Savr could not prepare secure access links for this
                              file right now.
                            </p>
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
                          </div>
                          <p className="mt-4 break-all text-xs leading-6 text-slate-400">
                            {item.original_url}
                          </p>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
