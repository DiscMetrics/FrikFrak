"use client";

import { useState, useTransition } from "react";

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [optionalName, setOptionalName] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="fixed bottom-6 right-6 z-20">
      {isOpen ? (
        <div className="card w-[min(92vw,24rem)] rounded-[1.75rem] p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Send feedback</h2>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setError(null);
                setSuccess(null);
              }}
              className="secondary-button rounded-full px-2 py-1 text-xs font-semibold"
            >
              Close
            </button>
          </div>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              setSuccess(null);
              startTransition(async () => {
                try {
                  const response = await fetch("/api/feedback", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      optionalName,
                      body,
                    }),
                  });
                  const payload = await response.json();
                  if (!response.ok) {
                    throw new Error(payload.error ?? "Unable to send feedback.");
                  }

                  setOptionalName("");
                  setBody("");
                  setSuccess("Feedback sent.");
                } catch (submissionError) {
                  setError(
                    submissionError instanceof Error
                      ? submissionError.message
                      : "Unable to send feedback.",
                  );
                }
              });
            }}
          >
            <input
              value={optionalName}
              onChange={(event) => setOptionalName(event.target.value)}
              placeholder="Optional name"
              maxLength={80}
              className="surface-input accent-ring w-full rounded-2xl px-4 py-3 text-sm outline-none"
            />
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              maxLength={1200}
              placeholder="What should be improved?"
              className="surface-input accent-ring w-full rounded-2xl px-4 py-3 text-sm outline-none"
              required
            />
            {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
            {success ? <p className="text-xs text-[var(--success)]">{success}</p> : null}
            <button
              disabled={isPending || body.trim().length < 4}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? "Sending..." : "Send feedback"}
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-lg"
        >
          Feedback
        </button>
      )}
    </div>
  );
}
