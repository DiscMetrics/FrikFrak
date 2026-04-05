"use client";

import { useMemo, useState, useTransition } from "react";
import { CommentThread } from "@/components/comment-thread";
import { MessageBanner } from "@/components/message-banner";
import { PostCard } from "@/components/post-card";
import type { CommentNode, PostListItem, SessionUser } from "@/lib/types";

function walkComments(comments: CommentNode[], fn: (comment: CommentNode) => void) {
  for (const comment of comments) {
    fn(comment);
    walkComments(comment.children, fn);
  }
}

function insertComment(
  comments: CommentNode[],
  parentId: string | null,
  newComment: CommentNode,
): CommentNode[] {
  if (!parentId) {
    return [...comments, newComment];
  }

  return comments.map((comment) => {
    if (comment.id === parentId) {
      return {
        ...comment,
        children: [...comment.children, newComment],
      };
    }

    if (comment.children.length === 0) {
      return comment;
    }

    return {
      ...comment,
      children: insertComment(comment.children, parentId, newComment),
    };
  });
}

function replaceComment(
  comments: CommentNode[],
  targetId: string,
  replacement: CommentNode,
): CommentNode[] {
  return comments.map((comment) => {
    if (comment.id === targetId) {
      return replacement;
    }

    if (comment.children.length === 0) {
      return comment;
    }

    return {
      ...comment,
      children: replaceComment(comment.children, targetId, replacement),
    };
  });
}

function removeComment(comments: CommentNode[], targetId: string): CommentNode[] {
  return comments
    .filter((comment) => comment.id !== targetId)
    .map((comment) => ({
      ...comment,
      children: removeComment(comment.children, targetId),
    }));
}

export function ThreadClient({
  post,
  initialComments,
  viewer,
}: {
  post: PostListItem;
  initialComments: CommentNode[];
  viewer: SessionUser | null;
}) {
  const [comments, setComments] = useState(initialComments);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const currentUserLabel = useMemo(() => {
    if (!viewer) return null;
    if (viewer.id === post.author_user_id) return "OP";

    let existingLabel: string | null = null;
    let maxNumber = 0;
    walkComments(initialComments, (comment) => {
      if (comment.author_user_id === viewer.id) {
        existingLabel = comment.author_label;
      }
      if (comment.author_label.startsWith("#")) {
        maxNumber = Math.max(maxNumber, Number(comment.author_label.slice(1)) || 0);
      }
    });

    return existingLabel ?? `#${maxNumber + 1}`;
  }, [initialComments, post.author_user_id, viewer]);

  async function createComment(bodyValue: string, parentCommentId: string | null) {
    if (!viewer || !currentUserLabel) {
      throw new Error("You must be logged in to comment.");
    }

    const optimisticId = `temp-${crypto.randomUUID()}`;
    const optimisticComment: CommentNode = {
      id: optimisticId,
      post_id: post.id,
      parent_comment_id: parentCommentId,
      author_user_id: viewer.id,
      body: bodyValue,
      score: 0,
      is_deleted: false,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      moderation_status: "active",
      author_label: currentUserLabel,
      viewer_vote: 0,
      children: [],
    };

    setComments((current) => insertComment(current, parentCommentId, optimisticComment));

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId: post.id,
          parentCommentId,
          body: bodyValue,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create comment.");
      }

      setComments((current) =>
        replaceComment(current, optimisticId, payload.comment as CommentNode),
      );
    } catch (submissionError) {
      setComments((current) => removeComment(current, optimisticId));
      throw submissionError;
    }
  }

  return (
    <div className="space-y-5">
      {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
      <PostCard post={post} viewer={viewer} returnPath={`/p/${post.id}`} view="thread" />
      {viewer ? (
        <form
          className="card rounded-[2rem] p-5 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            startTransition(async () => {
              try {
                await createComment(body.trim(), null);
                setBody("");
              } catch (submissionError) {
                setError(
                  submissionError instanceof Error
                    ? submissionError.message
                    : "Unable to add comment.",
                );
              }
            });
          }}
        >
          <h2 className="text-lg font-semibold">Add a comment</h2>
          <p className="mt-1 text-sm muted">
            Comments can be deleted later, but not edited. Replies stay visible if a parent is deleted.
          </p>
          <textarea
            name="body"
            rows={4}
            maxLength={400}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Reply anonymously"
            className="surface-input accent-ring mt-4 w-full rounded-2xl px-4 py-3 text-sm outline-none"
            required
          />
          <button
            disabled={isPending || body.trim().length === 0}
            className="mt-4 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Adding..." : "Add comment"}
          </button>
        </form>
      ) : null}
      <CommentThread
        comments={comments}
        postId={post.id}
        viewer={viewer}
        onReply={createComment}
      />
    </div>
  );
}
