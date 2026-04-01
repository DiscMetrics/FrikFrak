import Link from "next/link";
import { createCommentAction } from "@/app/actions";
import { CommentThread } from "@/components/comment-thread";
import { MessageBanner } from "@/components/message-banner";
import { PostCard } from "@/components/post-card";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { getSessionUser } from "@/lib/auth";
import { getPostThread } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { decodeMessage } from "@/lib/utils";

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { postId } = await params;
  const query = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <SiteShell
        title="Configure FrikFrak"
        subtitle="The thread experience is ready once Supabase is connected."
      >
        <SetupNotice />
      </SiteShell>
    );
  }

  const [thread, viewer] = await Promise.all([getPostThread(postId), getSessionUser()]);
  if (!thread) {
    return (
      <SiteShell title="Post not found" subtitle="This thread may have been removed or never existed.">
        <MessageBanner tone="error">Thread not found.</MessageBanner>
      </SiteShell>
    );
  }

  const error = decodeMessage(query.error);
  const message = decodeMessage(query.message);

  return (
    <SiteShell
      title="Thread"
      subtitle={
        thread.post.is_deleted
          ? "This post has been deleted and removed from feeds, but the thread stays accessible by direct link."
          : `Back in ${thread.post.category.name}`
      }
      currentPath={`/c/${thread.post.category.slug}`}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 text-sm muted">
          <Link href={`/c/${thread.post.category.slug}`} className="font-medium hover:text-[var(--accent)]">
            Back to {thread.post.category.name}
          </Link>
        </div>
        {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
        {message ? <MessageBanner tone="success">{message}</MessageBanner> : null}
        <PostCard post={thread.post} viewer={viewer} returnPath={`/p/${thread.post.id}`} />
        {viewer ? (
          <form action={createCommentAction} className="card rounded-[2rem] p-5 sm:p-6">
            <input type="hidden" name="postId" value={thread.post.id} />
            <h2 className="text-lg font-semibold">Add a comment</h2>
            <p className="mt-1 text-sm muted">
              Comments can be deleted later, but not edited. Replies stay visible if a parent is deleted.
            </p>
            <textarea
              name="body"
              rows={4}
              maxLength={400}
              placeholder="Reply anonymously"
              className="accent-ring mt-4 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              required
            />
            <button className="mt-4 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
              Add comment
            </button>
          </form>
        ) : null}
        <CommentThread comments={thread.comments} postId={thread.post.id} viewer={viewer} />
      </div>
    </SiteShell>
  );
}
