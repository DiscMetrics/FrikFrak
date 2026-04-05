import Link from "next/link";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { getPopularTags, searchTags } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";

  if (!isSupabaseConfigured()) {
    return (
      <SiteShell
        title="Tags"
        subtitle="Browse recurring topics once Supabase is configured."
        currentPath="/tags"
      >
        <SetupNotice />
      </SiteShell>
    );
  }

  const [results, popularTags] = await Promise.all([
    searchTags(query, 30),
    getPopularTags(24),
  ]);

  return (
    <SiteShell
      title="Tags"
      subtitle="Search and browse the topics people are explicitly attaching to posts."
      currentPath="/tags"
    >
      <div className="space-y-5">
        <form className="card rounded-[2rem] p-5 sm:p-6">
          <label htmlFor="tag-search" className="text-sm font-medium">
            Find a tag
          </label>
          <div className="mt-3 flex gap-2">
            <input
              id="tag-search"
              name="q"
              defaultValue={query}
              placeholder="Search tags like stanfordinvite"
              className="surface-input accent-ring min-w-0 flex-1 rounded-2xl px-4 py-3 text-sm outline-none"
            />
            <button className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white">
              Search
            </button>
          </div>
        </form>

        <section className="card rounded-[2rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">{query ? `Results for "${query}"` : "Popular tags"}</h2>
            <p className="text-sm muted">{results.length} found</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {results.length ? (
              results.map((tag) => (
                <Link
                  key={tag.tag}
                  href={`/tags/${tag.tag}`}
                  className="tag-chip rounded-full px-3 py-1.5 text-sm font-medium"
                >
                  {tag.tag} <span className="muted">({tag.usage_count})</span>
                </Link>
              ))
            ) : (
              <p className="text-sm muted">No matching tags yet.</p>
            )}
          </div>
        </section>

        <section className="card rounded-[2rem] p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Suggested tags</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <Link
                key={tag.tag}
                href={`/tags/${tag.tag}`}
                className="tag-chip rounded-full px-3 py-1.5 text-sm font-medium"
              >
                {tag.tag}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
