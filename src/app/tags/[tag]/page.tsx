import { MessageBanner } from "@/components/message-banner";
import { PostCard } from "@/components/post-card";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { getSessionUser } from "@/lib/auth";
import { getTagFeed } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <SiteShell title={tag} subtitle="Tag pages unlock once Supabase is configured." currentPath="/tags">
        <SetupNotice />
      </SiteShell>
    );
  }

  const [posts, viewer] = await Promise.all([getTagFeed(tag), getSessionUser()]);

  return (
    <SiteShell
      title={tag}
      subtitle="Browse posts connected by explicit post tags."
      currentPath="/tags"
      backHref="/tags"
      backLabel="Tags"
    >
      <div className="space-y-5">
        {posts.length ? (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              viewer={viewer}
              returnPath={`/tags/${tag}`}
            />
          ))
        ) : (
          <MessageBanner tone="info">No posts tagged #{tag} yet.</MessageBanner>
        )}
      </div>
    </SiteShell>
  );
}
