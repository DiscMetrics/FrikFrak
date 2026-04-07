import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { FeedbackButton } from "@/components/feedback-button";
import { MobileMenu } from "@/components/mobile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSessionUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

export async function SiteShell({
  title,
  subtitle,
  children,
  currentPath,
  backHref,
  backLabel,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  currentPath?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const configured = isSupabaseConfigured();
  const viewer = configured ? await getSessionUser() : null;
  const unreadCount = viewer ? await getUnreadNotificationCount(viewer.id) : 0;

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

        <SidebarNav
          currentPath={currentPath}
          unreadCount={unreadCount}
          viewer={viewer}
        />

        <div className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] p-4">
          {viewer ? (
            <div className="space-y-3">
              <div className="text-sm font-medium">Signed in as @{viewer.username}</div>
              <div className="text-xs muted">
                Your username stays private. Public posts are anonymous.
              </div>
              <form action={logoutAction}>
                <button className="secondary-button w-full rounded-xl px-3 py-2 text-sm font-medium">
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
                className="secondary-button block rounded-xl px-3 py-2 text-center text-sm font-medium"
              >
                Log in
              </Link>
            </div>
          )}
        </div>
        <ThemeToggle />
      </aside>

      <main className="min-w-0 flex-1">
        <header className="card mb-6 rounded-[2rem] px-5 py-4 sm:px-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 lg:hidden">
              <MobileMenu
                currentPath={currentPath}
                unreadCount={unreadCount}
                viewer={viewer}
              />
              {viewer ? (
                <Link
                  href="/inbox"
                  className="secondary-button rounded-xl px-3 py-2 text-sm font-medium"
                >
                  Inbox{unreadCount > 0 ? ` (${unreadCount})` : ""}
                </Link>
              ) : (
                <Link
                  href="/"
                  className="secondary-button rounded-xl px-3 py-2 text-sm font-medium"
                >
                  Home
                </Link>
              )}
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                {backHref ? (
                  <Link
                    href={backHref}
                    className="secondary-button mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                  >
                    <span aria-hidden="true">←</span>
                    {backLabel ?? "Back"}
                  </Link>
                ) : null}
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                  FrikFrak MVP
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
                {subtitle ? <p className="mt-2 max-w-2xl text-sm muted">{subtitle}</p> : null}
              </div>
              <div className="hidden items-start gap-3 lg:flex">
                {viewer ? (
                  <Link
                    href="/inbox"
                    className="secondary-button rounded-xl px-3 py-2 text-sm font-medium"
                  >
                    Inbox{unreadCount > 0 ? ` (${unreadCount})` : ""}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
      {viewer && !currentPath?.startsWith("/admin") ? <FeedbackButton /> : null}
    </div>
  );
}

function SidebarNav({
  currentPath,
  unreadCount,
  viewer,
}: {
  currentPath?: string;
  unreadCount: number;
  viewer: { role?: string } | null;
}) {
  return (
    <nav className="space-y-2">
      <NavLink href="/feed" active={currentPath === "/feed"}>
        Feeds
      </NavLink>
      <NavLink href="/tags" active={currentPath === "/tags"}>
        Tags
      </NavLink>
      {viewer ? (
        <NavLink href="/inbox" active={currentPath === "/inbox"}>
          Inbox{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </NavLink>
      ) : null}
      {viewer?.role === "admin" ? (
        <NavLink href="/admin" active={currentPath?.startsWith("/admin")}>
          Admin
        </NavLink>
      ) : null}
    </nav>
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
          : "text-[var(--control-text)] hover:bg-[var(--control-hover)]",
      )}
    >
      {children}
    </Link>
  );
}
