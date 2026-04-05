"use client";

import Link from "next/link";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ReportForm } from "@/components/report-form";
import { VoteControls } from "@/components/vote-controls";
import { getMediaPreview } from "@/lib/media";
import type { PostListItem, SessionUser } from "@/lib/types";
import { cn, formatRelativeDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function PostCard({
  post,
  viewer,
  returnPath,
  view = "feed",
}: {
  post: PostListItem;
  viewer: SessionUser | null;
  returnPath: string;
  view?: "feed" | "thread";
}) {
  const router = useRouter();
  const [isDeleting, startTransition] = useTransition();
  const isThreadView = view === "thread";
  const mediaPreview =
    post.post_type === "link" && post.external_url
      ? getMediaPreview(post.external_url, post.title)
      : null;

  return (
    <article className="card rounded-[2rem] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] muted">
            <span>{post.category.name}</span>
            <span>•</span>
            <span>{formatRelativeDate(post.created_at)}</span>
            {post.is_deleted ? (
              <>
                <span>•</span>
                <span className="text-[var(--danger)]">Deleted post</span>
              </>
            ) : null}
          </div>

          <Link href={`/p/${post.id}`} className="block space-y-3">
            <h2 className="max-w-3xl text-xl font-semibold tracking-tight sm:text-2xl">
              {post.is_deleted ? "Deleted post" : post.title}
            </h2>
            {mediaPreview ? (
              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--control-muted)]">
                {mediaPreview.kind === "image" ? (
                  <img
                    src={mediaPreview.src}
                    alt={mediaPreview.alt}
                    loading="lazy"
                    className={cn(
                      "w-full object-cover",
                      isThreadView ? "max-h-[38rem]" : "max-h-80",
                    )}
                  />
                ) : null}
                {mediaPreview.kind === "video" ? (
                  <video
                    controls
                    preload="metadata"
                    className={cn(
                      "w-full bg-black",
                      isThreadView ? "max-h-[38rem]" : "max-h-80",
                    )}
                  >
                    <source src={mediaPreview.src} />
                  </video>
                ) : null}
                {mediaPreview.kind === "embed" ? (
                  <div className="aspect-video w-full bg-black">
                    <iframe
                      src={mediaPreview.src}
                      title={mediaPreview.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  </div>
                ) : null}
                <div className="px-4 py-3">
                  <p className="text-sm font-medium text-[var(--accent)]">{mediaPreview.hostname}</p>
                  <p className="mt-1 truncate text-sm muted">{post.external_url}</p>
                </div>
              </div>
            ) : null}
            {post.body ? (
              <p
                className={cn(
                  "max-w-3xl whitespace-pre-wrap text-[15px] leading-7 sm:text-base",
                  !isThreadView && "line-clamp-4",
                )}
              >
                {post.body}
              </p>
            ) : null}
            {post.is_deleted && !post.body ? (
              <p className="italic text-stone-400">deleted</p>
            ) : null}
          </Link>

          {post.tag_list.length ? (
            <div className="flex flex-wrap gap-2">
              {post.tag_list.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${tag}`}
                  className="tag-chip rounded-full px-3 py-1 text-xs font-medium"
                >
                  {tag}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <VoteControls
          targetId={post.id}
          targetType="post"
          score={post.score}
          viewerVote={post.viewer_vote}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm muted">
        <Link href={`/p/${post.id}`} className="font-medium hover:text-[var(--accent)]">
          {post.comment_count} comments
        </Link>
        {post.external_url ? (
          <a
            href={post.external_url}
            target="_blank"
            rel="noreferrer"
            className="font-medium hover:text-[var(--accent)]"
          >
            Open link
          </a>
        ) : null}
        <ReportForm targetId={post.id} targetType="post" />
        {viewer?.id === post.author_user_id && !post.is_deleted ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const response = await fetch(`/api/posts/${post.id}`, {
                  method: "DELETE",
                });

                if (!response.ok) {
                  return;
                }

                const separator = returnPath.includes("?") ? "&" : "?";
                router.push(
                  `${returnPath}${separator}message=${encodeURIComponent(
                    "Post deleted. Comments remain visible.",
                  )}`,
                );
                router.refresh();
              });
            }}
          >
            <ConfirmSubmitButton
              confirmMessage="Delete this post? It will disappear from feeds, but comments on the thread will stay visible unless they are separately deleted."
              className="text-xs font-medium text-[var(--danger)] disabled:opacity-60"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete post"}
            </ConfirmSubmitButton>
          </form>
        ) : null}
      </div>
    </article>
  );
}
