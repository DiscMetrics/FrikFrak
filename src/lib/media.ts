export type MediaPreview =
  | {
      kind: "image";
      src: string;
      alt: string;
      hostname: string;
    }
  | {
      kind: "video";
      src: string;
      hostname: string;
    }
  | {
      kind: "embed";
      src: string;
      title: string;
      hostname: string;
    }
  | {
      kind: "link";
      src: string;
      hostname: string;
    };

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"] as const;
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg", ".mov", ".m4v"] as const;

function hasKnownExtension(pathname: string, extensions: readonly string[]) {
  const normalized = pathname.toLowerCase();
  return extensions.some((extension) => normalized.endsWith(extension));
}

function getYouTubeEmbed(url: URL) {
  if (url.hostname === "youtu.be") {
    const videoId = url.pathname.slice(1);
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  }

  if (
    url.hostname === "youtube.com" ||
    url.hostname === "www.youtube.com" ||
    url.hostname === "m.youtube.com"
  ) {
    if (url.pathname === "/watch") {
      const videoId = url.searchParams.get("v");
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (url.pathname.startsWith("/shorts/")) {
      const videoId = url.pathname.split("/")[2];
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (url.pathname.startsWith("/embed/")) {
      return url.toString();
    }
  }

  return null;
}

function getVimeoEmbed(url: URL) {
  if (
    url.hostname === "vimeo.com" ||
    url.hostname === "www.vimeo.com" ||
    url.hostname === "player.vimeo.com"
  ) {
    const segments = url.pathname.split("/").filter(Boolean);
    const videoId = segments[segments.length - 1];
    if (!videoId) return null;
    return `https://player.vimeo.com/video/${videoId}`;
  }

  return null;
}

export function getMediaPreview(urlValue: string, title: string): MediaPreview {
  try {
    const url = new URL(urlValue);
    const hostname = url.hostname.replace(/^www\./, "");
    const pathname = url.pathname.toLowerCase();

    if (hasKnownExtension(pathname, IMAGE_EXTENSIONS)) {
      return {
        kind: "image",
        src: url.toString(),
        alt: title,
        hostname,
      };
    }

    if (hasKnownExtension(pathname, VIDEO_EXTENSIONS)) {
      return {
        kind: "video",
        src: url.toString(),
        hostname,
      };
    }

    const youtubeEmbed = getYouTubeEmbed(url);
    if (youtubeEmbed) {
      return {
        kind: "embed",
        src: youtubeEmbed,
        title: "Embedded YouTube video",
        hostname,
      };
    }

    const vimeoEmbed = getVimeoEmbed(url);
    if (vimeoEmbed) {
      return {
        kind: "embed",
        src: vimeoEmbed,
        title: "Embedded Vimeo video",
        hostname,
      };
    }

    return {
      kind: "link",
      src: url.toString(),
      hostname,
    };
  } catch {
    return {
      kind: "link",
      src: urlValue,
      hostname: urlValue,
    };
  }
}
