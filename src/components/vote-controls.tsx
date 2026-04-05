"use client";

import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

export function VoteControls({
  targetId,
  targetType,
  score,
  viewerVote,
}: {
  targetId: string;
  targetType: "post" | "comment";
  score: number;
  viewerVote: 1 | -1 | 0;
}) {
  const [currentScore, setCurrentScore] = useState(score);
  const [currentVote, setCurrentVote] = useState(viewerVote);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCurrentScore(score);
    setCurrentVote(viewerVote);
  }, [score, viewerVote]);

  function applyOptimisticVote(value: 1 | -1) {
    const nextVote: 1 | -1 | 0 = currentVote === value ? 0 : value;
    const nextScore = currentScore - currentVote + nextVote;
    return { nextVote, nextScore };
  }

  function submitVote(value: 1 | -1) {
    const previousScore = currentScore;
    const previousVote = currentVote;
    const optimistic = applyOptimisticVote(value);
    setCurrentVote(optimistic.nextVote);
    setCurrentScore(optimistic.nextScore);

    startTransition(async () => {
      try {
        const response = await fetch("/api/votes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetId,
            targetType,
            value,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to cast vote.");
        }

        setCurrentScore(payload.score);
        setCurrentVote(payload.viewerVote);
      } catch {
        setCurrentScore(previousScore);
        setCurrentVote(previousVote);
      }
    });
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--control)] px-2 py-1">
      <VoteButton
        label="Upvote"
        value={1}
        active={currentVote === 1}
        disabled={isPending}
        onClick={() => submitVote(1)}
      />
      <span className="min-w-8 text-center text-sm font-semibold">{currentScore}</span>
      <VoteButton
        label="Downvote"
        value={-1}
        active={currentVote === -1}
        disabled={isPending}
        onClick={() => submitVote(-1)}
      />
    </div>
  );
}

function VoteButton({
  label,
  value,
  active,
  disabled,
  onClick,
}: {
  label: string;
  value: 1 | -1;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-8 w-8 rounded-full text-sm font-bold transition-colors disabled:opacity-60",
        active ? "bg-[var(--accent)] text-white" : "text-[var(--control-text)] hover:bg-[var(--control-hover)]",
      )}
    >
      {value === 1 ? "▲" : "▼"}
    </button>
  );
}
