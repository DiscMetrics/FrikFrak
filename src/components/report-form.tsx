"use client";

import { useState, useTransition } from "react";
import { REPORT_REASONS } from "@/lib/constants";

export function ReportForm({
  targetId,
  targetType,
}: {
  targetId: string;
  targetType: "post" | "comment";
}) {
  const [reason, setReason] = useState("harassment");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <details className="group">
      <summary className="cursor-pointer text-xs font-medium muted hover:text-[var(--accent)]">
        Report
      </summary>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="surface-input rounded-xl px-3 py-2 text-xs"
        >
          {REPORT_REASONS.map((reportReason) => (
            <option key={reportReason.value} value={reportReason.value}>
              {reportReason.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setMessage(null);
              const response = await fetch("/api/reports", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  targetId,
                  targetType,
                  reason,
                }),
              });

              const payload = await response.json();
              setMessage(
                response.ok ? "Reported" : payload.error ?? "Unable to report.",
              );
            })
          }
          className="secondary-button rounded-xl px-3 py-2 text-xs font-medium disabled:opacity-60"
        >
          {isPending ? "Sending..." : "Submit"}
        </button>
        {message ? <span className="text-xs muted">{message}</span> : null}
      </div>
    </details>
  );
}
