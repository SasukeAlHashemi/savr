export type LinkPreview = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  siteName: string;
  url: string;
};

type YouTubeOEmbedResponse = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
};

type GenericOEmbedResponse = {
  title?: string;
  author_name?: string;
  provider_name?: string;
  thumbnail_url?: string;
  description?: string;
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanText(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
  return normalized || null;
}

function extractMetaContent(html: string, attribute: string, key: string) {
  const patterns = [
    new RegExp(
      `<meta[^>]*${attribute}=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${key}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return cleanText(match[1]);
    }
  }

  return null;
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
  return cleanText(match?.[1] ?? null);
}

function getYouTubeVideoId(url: URL) {
  const hostname = url.hostname.replace(/^www\./, "");

  if (hostname === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }

  if (hostname === "youtube.com" || hostname === "m.youtube.com") {
    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }

    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.split("/").filter(Boolean)[1] ?? null;
    }
  }

  return null;
}

function isXStatusUrl(urlString: string) {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.replace(/^www\./, "");

    return (
      (hostname === "x.com" || hostname === "twitter.com") &&
      /\/[^/]+\/status\/\d+/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function isDailymotionUrl(urlString: string) {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.replace(/^www\./, "");

    return (
      hostname === "dailymotion.com" ||
      hostname.endsWith(".dailymotion.com") ||
      hostname === "dai.ly"
    );
  } catch {
    return false;
  }
}

function getDailymotionCanonicalUrl(url: URL) {
  const hostname = url.hostname.replace(/^www\./, "");

  if (hostname === "dai.ly") {
    const shortId = url.pathname.split("/").filter(Boolean)[0];
    return shortId
      ? `https://www.dailymotion.com/video/${shortId}`
      : url.toString();
  }

  return url.toString();
}

function extractOEmbedEndpoint(html: string, baseUrl: URL) {
  const patterns = [
    /<link[^>]*type=["']application\/json\+oembed["'][^>]*href=["']([^"']+)["'][^>]*>/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*type=["']application\/json\+oembed["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return new URL(match[1], baseUrl).toString();
    }
  }

  return null;
}

async function fetchOEmbedPreview(
  endpoint: string,
  fallbackUrl: string,
): Promise<LinkPreview | null> {
  try {
    const response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as GenericOEmbedResponse;
    const fallback = buildFallbackPreview(fallbackUrl);

    return {
      title: cleanText(data.title) ?? fallback.title,
      description:
        cleanText(data.description) ?? cleanText(data.author_name) ?? null,
      imageUrl: cleanText(data.thumbnail_url),
      siteName: cleanText(data.provider_name) ?? fallback.siteName,
      url: fallbackUrl,
    };
  } catch {
    return null;
  }
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase();

  if (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  ) {
    return true;
  }

  if (
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    normalized.startsWith("127.")
  ) {
    return true;
  }

  const private172Match = normalized.match(/^172\.(\d+)\./);

  if (private172Match) {
    const secondOctet = Number(private172Match[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}

export function getHostname(urlString: string) {
  try {
    return new URL(urlString).hostname.replace(/^www\./, "");
  } catch {
    return "Invalid URL";
  }
}

export function isYouTubeUrl(urlString: string) {
  try {
    return getYouTubeVideoId(new URL(urlString)) !== null;
  } catch {
    return false;
  }
}

export function isXPostUrl(urlString: string) {
  return isXStatusUrl(urlString);
}

export function buildFallbackPreview(urlString: string): LinkPreview {
  const url = new URL(urlString);
  const hostname = getHostname(urlString);
  const pathSegments = url.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment).replace(/[-_]/g, " "));
  const pathBasedTitle = pathSegments.at(-1);

  return {
    title: pathBasedTitle || hostname,
    description: null,
    imageUrl: null,
    siteName: hostname,
    url: urlString,
  };
}

export async function fetchLinkPreview(urlString: string): Promise<LinkPreview> {
  const url = new URL(urlString);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https links are supported.");
  }

  if (isBlockedHostname(url.hostname)) {
    throw new Error("Local network URLs are not allowed for previews.");
  }

  const youtubeVideoId = getYouTubeVideoId(url);

  if (youtubeVideoId) {
    try {
      const oEmbedResponse = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(urlString)}&format=json`,
        {
          headers: {
            accept: "application/json",
          },
          signal: AbortSignal.timeout(8000),
        },
      );

      if (oEmbedResponse.ok) {
        const oEmbedData =
          (await oEmbedResponse.json()) as YouTubeOEmbedResponse;

        return {
          title: cleanText(oEmbedData.title) ?? "YouTube video",
          description: cleanText(oEmbedData.author_name),
          imageUrl:
            cleanText(oEmbedData.thumbnail_url) ??
            `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
          siteName: "YouTube",
          url: urlString,
        };
      }
    } catch {
      // Fall back to a thumbnail-only preview if the oEmbed call fails.
    }

    return {
      title: "YouTube video",
      description: null,
      imageUrl: `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
      siteName: "YouTube",
      url: urlString,
    };
  }

  if (isDailymotionUrl(urlString)) {
    const canonicalDailymotionUrl = getDailymotionCanonicalUrl(url);
    const dailymotionPreview = await fetchOEmbedPreview(
      `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(canonicalDailymotionUrl)}`,
      canonicalDailymotionUrl,
    );

    if (dailymotionPreview) {
      return dailymotionPreview;
    }
  }

  const response = await fetch(urlString, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error("Could not fetch preview metadata from this URL.");
  }

  const html = await response.text();
  const fallback = buildFallbackPreview(urlString);
  const oEmbedEndpoint = extractOEmbedEndpoint(html, url);

  if (oEmbedEndpoint) {
    const oEmbedPreview = await fetchOEmbedPreview(oEmbedEndpoint, urlString);

    if (oEmbedPreview) {
      return oEmbedPreview;
    }
  }

  const ogTitle = extractMetaContent(html, "property", "og:title");
  const twitterTitle = extractMetaContent(html, "name", "twitter:title");
  const ogDescription = extractMetaContent(html, "property", "og:description");
  const metaDescription = extractMetaContent(html, "name", "description");
  const twitterDescription = extractMetaContent(
    html,
    "name",
    "twitter:description",
  );
  const ogSiteName = extractMetaContent(html, "property", "og:site_name");
  const ogImage = extractMetaContent(html, "property", "og:image");
  const twitterImage = extractMetaContent(html, "name", "twitter:image");
  const titleTag = extractTitle(html);

  let imageUrl: string | null = ogImage ?? twitterImage ?? null;

  if (imageUrl) {
    imageUrl = new URL(imageUrl, url).toString();
  }

  return {
    title: ogTitle ?? twitterTitle ?? titleTag ?? fallback.title,
    description:
      ogDescription ?? twitterDescription ?? metaDescription ?? fallback.description,
    imageUrl,
    siteName: ogSiteName ?? fallback.siteName,
    url: urlString,
  };
}
