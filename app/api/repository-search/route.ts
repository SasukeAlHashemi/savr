import { NextResponse } from "next/server";

import { AVATAR_BUCKET, type Profile } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RepositoryVisibility } from "@/lib/repositories";

type RepositorySuggestionRow = {
  id: number;
  user_id: string;
  name: string;
  visibility: RepositoryVisibility;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const limitParam = Number(searchParams.get("limit") ?? "6");
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 10)
    : 6;

  if (!query) {
    return NextResponse.json({ repositories: [] });
  }

  const supabase = createAdminClient();
  const { data: repositoryRows, error: repositoryError } = await supabase
    .from("repositories")
    .select("id, user_id, name, visibility")
    .ilike("name", `%${query}%`)
    .limit(Math.max(limit * 4, 12));

  if (repositoryError) {
    return NextResponse.json(
      { error: repositoryError.message },
      { status: 500 },
    );
  }

  const repositories = (repositoryRows ?? []) as RepositorySuggestionRow[];
  const ownerIds = [...new Set(repositories.map((repository) => repository.user_id))];

  const { data: profileRows, error: profileError } =
    ownerIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username, avatar_path, created_at")
          .in("id", ownerIds)
      : { data: [], error: null };

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 },
    );
  }

  const profileMap = new Map(
    ((profileRows ?? []) as Profile[]).map((profile) => [profile.id, profile]),
  );
  const normalizedQuery = query.toLowerCase();

  const suggestions = repositories
    .map((repository) => {
      const ownerProfile = profileMap.get(repository.user_id);

      return {
        id: repository.id,
        name: repository.name,
        visibility: repository.visibility,
        ownerUsername: ownerProfile?.username ?? "unknown",
        ownerAvatarUrl: ownerProfile?.avatar_path
          ? supabase.storage
              .from(AVATAR_BUCKET)
              .getPublicUrl(ownerProfile.avatar_path).data.publicUrl
          : null,
      };
    })
    .sort((left, right) => {
      const leftName = left.name.toLowerCase();
      const rightName = right.name.toLowerCase();
      const leftStartsWithQuery = leftName.startsWith(normalizedQuery) ? 0 : 1;
      const rightStartsWithQuery = rightName.startsWith(normalizedQuery) ? 0 : 1;

      if (leftStartsWithQuery !== rightStartsWithQuery) {
        return leftStartsWithQuery - rightStartsWithQuery;
      }

      if (leftName.length !== rightName.length) {
        return leftName.length - rightName.length;
      }

      return leftName.localeCompare(rightName);
    })
    .slice(0, limit);

  return NextResponse.json({ repositories: suggestions });
}
