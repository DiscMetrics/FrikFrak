import { archiveCategoryAction, createCategoryAction } from "@/app/actions";
import { MessageBanner } from "@/components/message-banner";
import { SetupNotice } from "@/components/setup-notice";
import { SiteShell } from "@/components/site-shell";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { decodeMessage } from "@/lib/utils";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <SiteShell title="Categories" subtitle="Connect Supabase to manage categories." currentPath="/admin/categories">
        <SetupNotice />
      </SiteShell>
    );
  }

  await requireAdmin();
  const categories = await getCategories();
  const error = decodeMessage(params.error);

  return (
    <SiteShell
      title="Categories"
      subtitle="Admin-created spaces keep launch cleaner while still making future expansion easy."
      currentPath="/admin/categories"
    >
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <form action={createCategoryAction} className="card rounded-[2rem] p-5 space-y-4">
          <h2 className="text-lg font-semibold">Create category</h2>
          {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
          <input
            name="name"
            placeholder="Name"
            className="accent-ring w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            required
          />
          <input
            name="slug"
            placeholder="Optional slug override"
            className="accent-ring w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
          />
          <select
            name="categoryType"
            className="accent-ring w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            defaultValue="school"
          >
            <option value="school">School</option>
            <option value="tournament">Tournament</option>
            <option value="region">Region</option>
            <option value="general">General</option>
            <option value="tag">Tag</option>
          </select>
          <textarea
            name="description"
            rows={4}
            placeholder="Short description"
            className="accent-ring w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
          />
          <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
            Create category
          </button>
        </form>

        <div className="card rounded-[2rem] p-5">
          <h2 className="text-lg font-semibold">Active categories</h2>
          <div className="mt-4 space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{category.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] muted">
                      /c/{category.slug} • {category.category_type}
                    </div>
                    {category.description ? (
                      <p className="mt-2 text-sm muted">{category.description}</p>
                    ) : null}
                  </div>
                  {category.slug !== "general" ? (
                    <form action={archiveCategoryAction}>
                      <input type="hidden" name="categoryId" value={category.id} />
                      <button className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-medium">
                        Archive
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
