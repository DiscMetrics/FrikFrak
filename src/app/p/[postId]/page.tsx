import { MessageBanner } from "@/components/message-banner";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { ThreadClient } from "@/components/thread-client";
import { getSessionUser } from "@/lib/auth";
import { getPostThread } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { decodeMessage } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
      backHref={`/c/${thread.post.category.slug}`}
      backLabel={thread.post.category.name}
    >
      <div className="space-y-5">
        {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
        {message ? <MessageBanner tone="success">{message}</MessageBanner> : null}
        <ThreadClient
          post={thread.post}
          initialComments={thread.comments}
          viewer={viewer}
        />
      </div>
    </SiteShell>
  );
}
