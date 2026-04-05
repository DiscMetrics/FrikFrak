import Link from "next/link";
import { loginAction } from "@/app/actions";
import { MessageBanner } from "@/components/message-banner";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { decodeMessage } from "@/lib/utils";

export default async function LoginPage({
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
          <h1 className="text-3xl font-semibold">Log in</h1>
          <p className="mt-2 text-sm muted">
            Your username is private. Only anonymous labels show up publicly.
          </p>
          {error ? (
            <div className="mt-4">
              <MessageBanner tone="error">{error}</MessageBanner>
            </div>
          ) : null}
          <form action={loginAction} className="mt-6 space-y-4">
            <input
              name="username"
              placeholder="Username"
              className="surface-input accent-ring w-full rounded-2xl px-4 py-3 text-sm outline-none"
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              className="surface-input accent-ring w-full rounded-2xl px-4 py-3 text-sm outline-none"
              required
            />
            <button className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white">
              Log in
            </button>
          </form>
          <p className="mt-4 text-sm muted">
            Need an account?{" "}
            <Link href="/signup" className="font-semibold text-[var(--accent)]">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
