import { createCommentAction, deleteCommentAction } from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ReportForm } from "@/components/report-form";
import { VoteControls } from "@/components/vote-controls";
import type { CommentNode, SessionUser } from "@/lib/types";
import { cn, formatRelativeDate } from "@/lib/utils";

export function CommentThread({
  comments,
  postId,
  viewer,
}: {
  comments: CommentNode[];
  postId: string;
  viewer: SessionUser | null;
}) {
  if (comments.length === 0) {
    return (
      <div className="card rounded-[2rem] p-5 text-sm muted">
        No comments yet. Be the first one in the thread.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentBranch
          key={comment.id}
          comment={comment}
          postId={postId}
          viewer={viewer}
          depth={0}
        />
      ))}
    </div>
  );
}

function CommentBranch({
  comment,
  postId,
  viewer,
  depth,
}: {
  comment: CommentNode;
  postId: string;
  viewer: SessionUser | null;
  depth: number;
}) {
  return (
    <div className={cn("relative", depth > 0 && "ml-4 border-l border-[var(--line)] pl-4 sm:ml-6 sm:pl-6")}>
      <div className="card rounded-[1.5rem] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] muted">
              <span>{comment.author_label}</span>
              <span>•</span>
              <span>{formatRelativeDate(comment.created_at)}</span>
            </div>
            <p
              className={cn(
                "whitespace-pre-wrap text-sm leading-7 sm:text-[15px]",
                comment.is_deleted && "italic text-stone-400",
              )}
            >
              {comment.body ?? "deleted"}
            </p>
          </div>

          <VoteControls
            targetId={comment.id}
            targetType="comment"
            score={comment.score}
            viewerVote={comment.viewer_vote}
            returnPath={`/p/${postId}`}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs muted">
          <details>
            <summary className="cursor-pointer font-medium hover:text-[var(--accent)]">
              Reply
            </summary>
            <form action={createCommentAction} className="mt-3 space-y-3">
              <input type="hidden" name="postId" value={postId} />
              <input type="hidden" name="parentCommentId" value={comment.id} />
              <textarea
                name="body"
                rows={3}
                maxLength={400}
                className="accent-ring w-full rounded-2xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none"
                placeholder="Reply anonymously"
                required
              />
              <button className="rounded-xl bg-[var(--accent)] px-3 py-2 font-medium text-white">
                Reply
              </button>
            </form>
          </details>
          <ReportForm targetId={comment.id} targetType="comment" returnPath={`/p/${postId}`} />
          {viewer?.id === comment.author_user_id && !comment.is_deleted ? (
            <form action={deleteCommentAction}>
              <input type="hidden" name="commentId" value={comment.id} />
              <input type="hidden" name="postId" value={postId} />
              <ConfirmSubmitButton
                confirmMessage="Delete this comment? The text will be replaced with a deleted placeholder, but child replies will remain visible."
                className="font-medium text-[var(--danger)]"
              >
                Delete
              </ConfirmSubmitButton>
            </form>
          ) : null}
        </div>
      </div>

      {comment.children.length ? (
        <div className="mt-4 space-y-4">
          {comment.children.map((child) => (
            <CommentBranch
              key={child.id}
              comment={child}
              postId={postId}
              viewer={viewer}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
