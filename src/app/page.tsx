import Link from "next/link";
import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/setup-notice";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export default async function HomePage() {
  const viewer = await getSessionUser();
  if (viewer) redirect("/feed");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="card rounded-[2.5rem] p-8 sm:p-10">
          <div className="inline-flex rounded-full bg-[var(--accent-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
            Anonymous frisbee chatter
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">
            FrikFrak keeps college ultimate talk quick, weird, and low-stakes.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 muted">
            Honor-system accounts. Anonymous posts. Curated school and tournament
            spaces. A default General feed so nobody lands in an empty room.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="rounded-2xl border border-[var(--line)] px-5 py-3 text-sm font-semibold"
            >
              Log in
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <InfoCard title="Anonymous threads" body="Public labels stay thread-local: OP, #1, #2, and so on." />
            <InfoCard title="Category based" body="General first, then schools, regions, and tournaments when you add them." />
            <InfoCard title="Moderation ready" body="Reports, admin removal tools, and clear soft-delete behavior are built in." />
          </div>
        </section>

        <section className="space-y-6">
          {!isSupabaseConfigured() ? <SetupNotice /> : null}
          <div className="card rounded-[2.5rem] p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">Temporary launch setup</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 muted">
              <li>Deploy to Vercel first and use the temporary domain.</li>
              <li>Run `supabase/schema.sql`, then `supabase/seed.sql`.</li>
              <li>Create the first account. It becomes admin unless `FIRST_ADMIN_USERNAME` is set.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 muted">{body}</p>
    </div>
  );
}
