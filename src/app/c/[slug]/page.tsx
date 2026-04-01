import { MessageBanner } from "@/components/message-banner";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { getSessionUser } from "@/lib/auth";
import { getFeedForCategory } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { decodeMessage } from "@/lib/utils";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <SiteShell
        title="Configure FrikFrak"
        subtitle="The app shell is ready. Add Supabase credentials to start using live data."
        currentPath={`/c/${slug}`}
      >
        <SetupNotice />
      </SiteShell>
    );
  }

  const [{ category, posts }, viewer] = await Promise.all([
    getFeedForCategory(slug),
    getSessionUser(),
  ]);

  if (!category) {
    return (
      <SiteShell
        title="Category not found"
        subtitle="Create the category from the admin panel once you have an admin account."
        currentPath={`/c/${slug}`}
      >
        <MessageBanner tone="error">That category does not exist yet.</MessageBanner>
      </SiteShell>
    );
  }

  const error = decodeMessage(query.error);
  const message = decodeMessage(query.message);

  return (
    <SiteShell
      title={category.name}
      subtitle={category.description ?? "Anonymous posts, sorted hot by default."}
      currentPath={`/c/${slug}`}
    >
      <div className="space-y-5">
        {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
        {message ? <MessageBanner tone="success">{message}</MessageBanner> : null}
        {viewer ? (
          <PostComposer category={category} returnPath={`/c/${slug}`} />
        ) : (
          <MessageBanner tone="info">
            Log in to post, vote, report, or join the thread.
          </MessageBanner>
        )}
        {posts.length ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                viewer={viewer}
                returnPath={`/c/${slug}`}
              />
            ))}
          </div>
        ) : (
          <div className="card rounded-[2rem] p-6 text-sm muted">
            Nothing here yet. The first anonymous post sets the tone.
          </div>
        )}
      </div>
    </SiteShell>
  );
}
