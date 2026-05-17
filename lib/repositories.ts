export const CONTENT_TYPES = [
  "Hyperlink",
  "JPG",
  "PNG",
  "PDF",
  "DOCX",
  "PPTX",
  "XLSX",
  "MP3",
  "MP4",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const REPOSITORY_VISIBILITIES = ["public", "secret"] as const;

export type RepositoryVisibility = (typeof REPOSITORY_VISIBILITIES)[number];

export function isContentType(value: string): value is ContentType {
  return CONTENT_TYPES.includes(value as ContentType);
}

export function isRepositoryVisibility(
  value: string,
): value is RepositoryVisibility {
  return REPOSITORY_VISIBILITIES.includes(value as RepositoryVisibility);
}

export type Repository = {
  id: number;
  name: string;
  description: string | null;
  visibility: RepositoryVisibility;
  allowed_types: ContentType[];
  created_at: string;
};
