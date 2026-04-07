"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function MobileMenu({
  currentPath,
  unreadCount,
  viewer,
}: {
  currentPath?: string;
  unreadCount: number;
  viewer: { role?: string } | null;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className="secondary-button flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium lg:hidden"
      >
        <span className="flex h-4 w-4 flex-col justify-between" aria-hidden="true">
          <span className={cn("block h-0.5 rounded-full bg-current transition-transform", open && "translate-y-[7px] rotate-45")} />
          <span className={cn("block h-0.5 rounded-full bg-current transition-opacity", open && "opacity-0")} />
          <span className={cn("block h-0.5 rounded-full bg-current transition-transform", open && "-translate-y-[7px] -rotate-45")} />
        </span>
        Menu
      </button>

      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/45 transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
        />

        <div
          id="mobile-navigation"
          className={cn(
            "relative flex h-full w-[min(20rem,calc(100vw-2rem))] flex-col border-r border-[var(--line)] bg-[var(--card)] px-4 py-5 shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="mb-6 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] text-base font-semibold text-white">
                FF
              </div>
              <div>
                <div className="text-base font-semibold">FrikFrak</div>
                <div className="text-sm muted">College frisbee chatter</div>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="secondary-button rounded-xl px-3 py-2 text-sm font-medium"
            >
              Close
            </button>
          </div>

          <nav className="space-y-2">
            <MobileNavLink href="/feed" active={currentPath === "/feed"} onNavigate={() => setOpen(false)}>
              Feeds
            </MobileNavLink>
            <MobileNavLink href="/tags" active={currentPath === "/tags"} onNavigate={() => setOpen(false)}>
              Tags
            </MobileNavLink>
            {viewer ? (
              <MobileNavLink
                href="/inbox"
                active={currentPath === "/inbox"}
                onNavigate={() => setOpen(false)}
              >
                Inbox{unreadCount > 0 ? ` (${unreadCount})` : ""}
              </MobileNavLink>
            ) : null}
            {viewer?.role === "admin" ? (
              <MobileNavLink
                href="/admin"
                active={currentPath?.startsWith("/admin")}
                onNavigate={() => setOpen(false)}
              >
                Admin
              </MobileNavLink>
            ) : null}
          </nav>

          <div className="mt-6 border-t border-[var(--line)] pt-4">
            <ThemeToggle compact />
          </div>
        </div>
      </div>
    </>
  );
}

function MobileNavLink({
  href,
  active,
  onNavigate,
  children,
}: {
  href: string;
  active?: boolean;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
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
