import { archiveFeedbackAction, resolveFeedbackAction } from "@/app/actions";
import { SiteShell } from "@/components/site-shell";
import { SetupNotice } from "@/components/setup-notice";
import { requireAdmin } from "@/lib/auth";
import { getFeedbackSubmissions } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { formatRelativeDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  if (!isSupabaseConfigured()) {
    return (
      <SiteShell
        title="Feedback"
        subtitle="Connect Supabase to review user feedback."
        currentPath="/admin/feedback"
      >
        <SetupNotice />
      </SiteShell>
    );
  }

  await requireAdmin();
  const submissions = await getFeedbackSubmissions();

  return (
    <SiteShell
      title="Feedback"
      subtitle="Temporary development-phase feedback inbox."
      currentPath="/admin/feedback"
      backHref="/admin"
      backLabel="Admin"
    >
      <div className="space-y-3">
        {submissions.length === 0 ? (
          <div className="card rounded-[2rem] p-5 text-sm muted">No feedback yet.</div>
        ) : (
          submissions.map((submission) => (
            <div key={submission.id} className="card rounded-[2rem] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">
                    {submission.optional_name?.trim() || "Account-linked feedback"}
                  </div>
                  <div className="mt-1 text-sm muted">
                    {formatRelativeDate(submission.created_at)} • {submission.status}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                    {submission.body}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {submission.status !== "resolved" ? (
                    <form action={resolveFeedbackAction}>
                      <input type="hidden" name="feedbackId" value={submission.id} />
                      <button className="rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white">
                        Resolve
                      </button>
                    </form>
                  ) : null}
                  {submission.status !== "archived" ? (
                    <form action={archiveFeedbackAction}>
                      <input type="hidden" name="feedbackId" value={submission.id} />
                      <button className="secondary-button rounded-xl px-3 py-2 text-xs font-medium">
                        Archive
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </SiteShell>
  );
}
