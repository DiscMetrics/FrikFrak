import Link from "next/link";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { getFeedDirectory } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { formatRelativeDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  if (!isSupabaseConfigured()) {
    return (
      <SiteShell
        title="Feeds"
        subtitle="Browse the places people are posting. General stays pinned at the top."
        currentPath="/feed"
      >
        <SetupNotice />
      </SiteShell>
    );
  }

  const feeds = await getFeedDirectory();

  return (
    <SiteShell
      title="Feeds"
      subtitle="Browse the most active posting spaces. General always appears first."
      currentPath="/feed"
    >
      <div className="space-y-4">
        {feeds.map((feed) => (
          <Link
            key={feed.id}
            href={`/c/${feed.slug}`}
            className="card block rounded-[2rem] p-5 transition-transform hover:-translate-y-0.5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{feed.name}</h2>
                <p className="mt-2 text-sm muted">
                  {feed.description || "No description yet."}
                </p>
              </div>
              <div className="text-right text-sm muted">
                <div>{feed.post_count} posts</div>
                <div className="mt-1">
                  {feed.recent_activity_at
                    ? `Last activity ${formatRelativeDate(feed.recent_activity_at)}`
                    : "No activity yet"}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </SiteShell>
  );
}
