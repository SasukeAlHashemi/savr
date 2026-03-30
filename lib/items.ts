import type { ContentType } from "@/lib/repositories";

export type SourceMode = "link" | "upload";

export type RepositoryItem = {
  id: number;
  repository_id: number;
  user_id: string;
  source_mode: SourceMode;
  item_type: ContentType;
  original_url: string | null;
  preview_title: string | null;
  preview_description: string | null;
  preview_image_url: string | null;
  preview_site_name: string | null;
  created_at: string;
};
