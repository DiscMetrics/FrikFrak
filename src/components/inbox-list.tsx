"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { InboxItem } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";

export function InboxList({ initialItems }: { initialItems: InboxItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
    });
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", {
      method: "POST",
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm muted">
          {items.filter((item) => !item.is_read).length} unread
        </div>
        <button
          type="button"
          disabled={isPending || items.every((item) => item.is_read)}
          onClick={() =>
                    startTransition(async () => {
                      await markAllRead();
                      setItems((current) =>
                        current.map((item) => ({
                          ...item,
                  is_read: true,
                          read_at: item.read_at ?? new Date().toISOString(),
                        })),
                      );
                      router.refresh();
                    })
                  }
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-medium disabled:opacity-60"
        >
          Mark all as read
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="card rounded-[2rem] p-5 text-sm muted">
            No notifications yet.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="card rounded-[2rem] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">
                    {item.notification_type === "post_reply"
                      ? "New reply to your post"
                      : "New direct reply to your comment"}
                  </div>
                  <div className="mt-1 text-xs muted">
                    {formatRelativeDate(item.created_at)}
                  </div>
                  <div className="mt-3 text-sm leading-6">
                    {item.reply_preview ?? (
                      <span className="italic text-stone-400">
                        Reply preview unavailable
                      </span>
                    )}
                  </div>
                  <Link
                    href={item.link_path}
                    onClick={() => {
                      if (item.is_read) return;
                      setItems((current) =>
                        current.map((entry) =>
                          entry.id === item.id
                            ? { ...entry, is_read: true, read_at: new Date().toISOString() }
                            : entry,
                        ),
                      );
                      void markRead(item.id);
                      router.refresh();
                    }}
                    className="mt-3 inline-block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]"
                  >
                    Open thread
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  {!item.is_read ? (
                    <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                      Unread
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled={isPending || item.is_read}
                    onClick={() =>
                      startTransition(async () => {
                        await markRead(item.id);
                        setItems((current) =>
                          current.map((entry) =>
                            entry.id === item.id
                              ? {
                                  ...entry,
                                  is_read: true,
                                  read_at: new Date().toISOString(),
                                }
                              : entry,
                          ),
                        );
                        router.refresh();
                      })
                    }
                    className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-medium disabled:opacity-60"
                  >
                    Mark read
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
