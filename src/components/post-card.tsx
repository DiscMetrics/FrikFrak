import Link from "next/link";
import { deletePostAction } from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ReportForm } from "@/components/report-form";
import { VoteControls } from "@/components/vote-controls";
import type { PostListItem, SessionUser } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";

export function PostCard({
  post,
  viewer,
  returnPath,
}: {
  post: PostListItem;
  viewer: SessionUser | null;
  returnPath: string;
}) {
  return (
    <article className="card rounded-[2rem] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] muted">
            <span>{post.category.name}</span>
            <span>•</span>
            <span>{formatRelativeDate(post.created_at)}</span>
            <span>•</span>
            <span>{post.author_label}</span>
            {post.is_deleted ? (
              <>
                <span>•</span>
                <span className="text-[var(--danger)]">Deleted post</span>
              </>
            ) : null}
          </div>

          <Link href={`/p/${post.id}`} className="block">
            <p className="max-w-3xl whitespace-pre-wrap text-[15px] leading-7 sm:text-base">
              {post.body ?? <span className="italic text-stone-400">deleted</span>}
            </p>
          </Link>

          {post.hashtag_list.length ? (
            <div className="flex flex-wrap gap-2">
              {post.hashtag_list.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${tag}`}
                  className="rounded-full bg-[var(--card-strong)] px-3 py-1 text-xs font-medium text-[var(--accent)]"
                >
                  #{tag}
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
          returnPath={returnPath}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm muted">
        <Link href={`/p/${post.id}`} className="font-medium hover:text-[var(--accent)]">
          {post.comment_count} comments
        </Link>
        <ReportForm targetId={post.id} targetType="post" returnPath={returnPath} />
        {viewer?.id === post.author_user_id && !post.is_deleted ? (
          <form action={deletePostAction}>
            <input type="hidden" name="postId" value={post.id} />
            <ConfirmSubmitButton
              confirmMessage="Delete this post? It will disappear from feeds, but comments on the thread will stay visible unless they are separately deleted."
              className="text-xs font-medium text-[var(--danger)]"
            >
              Delete post
            </ConfirmSubmitButton>
          </form>
        ) : null}
      </div>
    </article>
  );
}
