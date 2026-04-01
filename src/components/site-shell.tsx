import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { getSessionUser } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

export async function SiteShell({
  title,
  subtitle,
  children,
  currentPath,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  currentPath?: string;
}) {
  const configured = isSupabaseConfigured();
  const [viewer, categories] = configured
    ? await Promise.all([getSessionUser(), getCategories()])
    : [null, []];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:px-8">
      <aside className="card hidden w-72 shrink-0 rounded-[2rem] p-5 lg:block">
        <Link href="/" className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-lg font-semibold text-white">
            FF
          </div>
          <div>
            <div className="text-lg font-semibold">FrikFrak</div>
            <div className="text-sm muted">College frisbee chatter</div>
          </div>
        </Link>

        <nav className="space-y-2">
          <NavLink href="/feed" active={currentPath === "/feed"}>
            Feed
          </NavLink>
          <NavLink
            href="/c/general"
            active={currentPath === "/c/general" || currentPath === "/feed"}
          >
            General
          </NavLink>
          {categories
            .filter((category) => category.slug !== "general")
            .map((category) => (
              <NavLink
                key={category.id}
                href={`/c/${category.slug}`}
                active={currentPath === `/c/${category.slug}`}
              >
                {category.name}
              </NavLink>
            ))}
          {viewer?.role === "admin" ? (
            <NavLink href="/admin" active={currentPath?.startsWith("/admin")}>
              Admin
            </NavLink>
          ) : null}
        </nav>

        <div className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] p-4">
          {viewer ? (
            <div className="space-y-3">
              <div className="text-sm font-medium">Signed in as @{viewer.username}</div>
              <div className="text-xs muted">
                Your username stays private. Public posts are anonymous.
              </div>
              <form action={logoutAction}>
                <button className="w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-medium hover:bg-white">
                  Log out
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium">No account yet?</div>
              <Link
                href="/signup"
                className="block rounded-xl bg-[var(--accent)] px-3 py-2 text-center text-sm font-semibold text-white"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="block rounded-xl border border-[var(--line)] px-3 py-2 text-center text-sm font-medium"
              >
                Log in
              </Link>
            </div>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="card mb-6 rounded-[2rem] px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                FrikFrak MVP
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
              {subtitle ? <p className="mt-2 max-w-2xl text-sm muted">{subtitle}</p> : null}
            </div>
            <div className="lg:hidden">
              <Link
                href="/feed"
                className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-medium"
              >
                Categories
              </Link>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--accent)] text-white"
          : "text-stone-700 hover:bg-[var(--card-strong)]",
      )}
    >
      {children}
    </Link>
  );
}
