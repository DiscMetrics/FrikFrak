import type { PostRecord } from "@/lib/types";

export function calculateHotScore(post: Pick<PostRecord, "score" | "created_at">) {
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
  return (post.score + 1) / Math.pow(ageHours + 2, 1.6);
}
