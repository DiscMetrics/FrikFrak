import { resolveReportAction } from "@/app/actions";
import { SiteShell } from "@/components/site-shell";
import { SetupNotice } from "@/components/setup-notice";
import { requireAdmin } from "@/lib/auth";
import { getReports } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { formatRelativeDate } from "@/lib/utils";

export default async function AdminReportsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <SiteShell title="Reports" subtitle="Connect Supabase to review reports." currentPath="/admin/reports">
        <SetupNotice />
      </SiteShell>
    );
  }

  await requireAdmin();
  const reports = await getReports();

  return (
    <SiteShell title="Reports" subtitle="Preset reasons with a simple admin queue." currentPath="/admin/reports">
      <div className="card rounded-[2rem] p-5">
        <div className="space-y-3">
          {reports.length === 0 ? (
            <p className="text-sm muted">No reports yet.</p>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold">
                      {report.target_type} • {report.reason.replace("_", " ")}
                    </div>
                    <div className="mt-1 text-sm muted">
                      {formatRelativeDate(report.created_at)} • target {report.target_id}
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-[0.14em] muted">
                      Status: {report.status}
                    </div>
                  </div>
                  {report.status === "open" ? (
                    <form action={resolveReportAction}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <button className="rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white">
                        Resolve
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </SiteShell>
  );
}
