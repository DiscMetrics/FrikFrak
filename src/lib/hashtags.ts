const hashtagPattern = /(^|\s)#([a-z0-9_]{2,32})/gi;

export function extractHashtags(body: string) {
  const seen = new Set<string>();

  for (const match of body.matchAll(hashtagPattern)) {
    seen.add(match[2].toLowerCase());
  }

  return Array.from(seen);
}
