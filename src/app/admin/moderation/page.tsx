import { adminRemoveCommentAction, adminRemovePostAction } from "@/app/actions";
import { SiteShell } from "@/components/site-shell";
import { SetupNotice } from "@/components/setup-notice";
import { requireAdmin } from "@/lib/auth";
import { getModerationQueue } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { formatRelativeDate } from "@/lib/utils";

export default async function AdminModerationPage() {
  if (!isSupabaseConfigured()) {
    return (
      <SiteShell title="Moderation" subtitle="Connect Supabase to use moderation tools." currentPath="/admin/moderation">
        <SetupNotice />
      </SiteShell>
    );
  }

  await requireAdmin();
  const queue = await getModerationQueue();

  return (
    <SiteShell
      title="Moderation"
      subtitle="Soft-delete content directly when you need to clean up the board."
      currentPath="/admin/moderation"
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card rounded-[2rem] p-5">
          <h2 className="text-lg font-semibold">Posts</h2>
          <div className="mt-4 space-y-3">
            {queue.posts.map((post) => (
              <div key={post.id} className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] p-4">
                <div className="text-sm muted">{formatRelativeDate(post.created_at)}</div>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {post.body ?? <span className="italic text-stone-400">deleted</span>}
                </p>
                <form action={adminRemovePostAction} className="mt-3">
                  <input type="hidden" name="postId" value={post.id} />
                  <button className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-medium text-[var(--danger)]">
                    Remove post
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>

        <section className="card rounded-[2rem] p-5">
          <h2 className="text-lg font-semibold">Comments</h2>
          <div className="mt-4 space-y-3">
            {queue.comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] p-4"
              >
                <div className="text-sm muted">{formatRelativeDate(comment.created_at)}</div>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {comment.body ?? <span className="italic text-stone-400">deleted</span>}
                </p>
                <form action={adminRemoveCommentAction} className="mt-3">
                  <input type="hidden" name="commentId" value={comment.id} />
                  <button className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-medium text-[var(--danger)]">
                    Remove comment
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
