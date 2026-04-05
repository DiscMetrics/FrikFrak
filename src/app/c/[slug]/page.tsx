import { FeedClient } from "@/components/feed-client";
import { MessageBanner } from "@/components/message-banner";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { getSessionUser } from "@/lib/auth";
import { getFeedForCategory, getPopularTags } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { decodeMessage } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

  const [{ category, posts }, viewer, tags] = await Promise.all([
    getFeedForCategory(slug),
    getSessionUser(),
    getPopularTags(24),
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
        <FeedClient
          category={category}
          initialPosts={posts}
          viewer={viewer}
          returnPath={`/c/${slug}`}
          suggestedTags={tags.map((entry) => entry.tag)}
        />
      </div>
    </SiteShell>
  );
}
