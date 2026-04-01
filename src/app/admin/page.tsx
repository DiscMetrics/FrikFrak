import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { SetupNotice } from "@/components/setup-notice";
import { requireAdmin } from "@/lib/auth";
import { getAdminOverview } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";

export default async function AdminPage() {
  if (!isSupabaseConfigured()) {
    return (
      <SiteShell title="Admin" subtitle="Connect Supabase to use moderation and category tools." currentPath="/admin">
        <SetupNotice />
      </SiteShell>
    );
  }

  await requireAdmin();
  const stats = await getAdminOverview();

  return (
    <SiteShell
      title="Admin"
      subtitle="Utilitarian tooling for categories, reports, and moderation."
      currentPath="/admin"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Posts" value={stats.postCount} />
        <StatCard label="Comments" value={stats.commentCount} />
        <StatCard label="Open reports" value={stats.openReportCount} />
        <StatCard label="Categories" value={stats.categoryCount} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <AdminLink href="/admin/categories" title="Categories" body="Create, review, and archive posting spaces." />
        <AdminLink href="/admin/reports" title="Reports" body="Review flagged posts and comments." />
        <AdminLink href="/admin/moderation" title="Moderation" body="Soft-remove posts or comments directly." />
      </div>
    </SiteShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card rounded-[2rem] p-5">
      <div className="text-sm muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function AdminLink({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link href={href} className="card rounded-[2rem] p-5 transition-transform hover:-translate-y-0.5">
      <div className="text-lg font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-6 muted">{body}</p>
    </Link>
  );
}
