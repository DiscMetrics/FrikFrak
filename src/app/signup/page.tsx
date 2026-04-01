import Link from "next/link";
import { signupAction } from "@/app/actions";
import { MessageBanner } from "@/components/message-banner";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { decodeMessage } from "@/lib/utils";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = decodeMessage(params.error);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <div className="w-full space-y-5">
        {!isSupabaseConfigured() ? <SetupNotice /> : null}
        <div className="card rounded-[2rem] p-6 sm:p-8">
          <h1 className="text-3xl font-semibold">Create account</h1>
          <p className="mt-2 text-sm muted">
            Honor-system accounts for now. No public profiles, no visible usernames.
          </p>
          {error ? (
            <div className="mt-4">
              <MessageBanner tone="error">{error}</MessageBanner>
            </div>
          ) : null}
          <form action={signupAction} className="mt-6 space-y-4">
            <input
              name="username"
              placeholder="Username"
              className="accent-ring w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              className="accent-ring w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              required
            />
            <button className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white">
              Create account
            </button>
          </form>
          <p className="mt-4 text-sm muted">
            Already in?{" "}
            <Link href="/login" className="font-semibold text-[var(--accent)]">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
