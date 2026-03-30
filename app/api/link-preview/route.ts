import { NextResponse } from "next/server";

import { buildFallbackPreview, fetchLinkPreview } from "@/lib/link-preview";

export async function POST(request: Request) {
  let url = "";

  try {
    const body = (await request.json()) as { url?: unknown };

    if (typeof body.url === "string") {
      url = body.url.trim();
    }
  } catch {
    return NextResponse.json(
      { error: "Could not read the link preview request." },
      { status: 400 },
    );
  }

  if (!url) {
    return NextResponse.json(
      { error: "Please provide a URL to preview." },
      { status: 400 },
    );
  }

  try {
    const preview = await fetchLinkPreview(url);
    return NextResponse.json({ preview });
  } catch (error) {
    try {
      const fallbackPreview = buildFallbackPreview(url);

      return NextResponse.json({
        preview: fallbackPreview,
        warning:
          error instanceof Error
            ? error.message
            : "Could not fetch metadata, so a basic preview was created instead.",
      });
    } catch {
      return NextResponse.json(
        { error: "Please enter a valid URL that starts with http:// or https://." },
        { status: 400 },
      );
    }
  }
}
