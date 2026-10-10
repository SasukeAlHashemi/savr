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

export function isContentType(value: string): value is ContentType {
  return CONTENT_TYPES.includes(value as ContentType);
}

export type Repository = {
  id: number;
  name: string;
  description: string | null;
  allowed_types: ContentType[];
  created_at: string;
};
