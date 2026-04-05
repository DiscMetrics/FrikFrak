export const TAG_PATTERN = /^[a-z0-9_]{2,32}$/;

export function normalizeTagInput(value: string) {
  return value.trim().replace(/^#+/, "").toLowerCase();
}

export function isValidTag(value: string) {
  return TAG_PATTERN.test(value);
}

export function normalizeTags(values: string[]) {
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = normalizeTagInput(value);
    if (!normalized || !isValidTag(normalized)) continue;
    seen.add(normalized);
    if (seen.size === 5) break;
  }

  return Array.from(seen);
}
