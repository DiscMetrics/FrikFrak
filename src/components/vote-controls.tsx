import { voteAction } from "@/app/actions";
import { cn } from "@/lib/utils";

export function VoteControls({
  targetId,
  targetType,
  score,
  viewerVote,
  returnPath,
}: {
  targetId: string;
  targetType: "post" | "comment";
  score: number;
  viewerVote: 1 | -1 | 0;
  returnPath: string;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-white px-2 py-1">
      <VoteButton
        label="Upvote"
        value={1}
        active={viewerVote === 1}
        targetId={targetId}
        targetType={targetType}
        returnPath={returnPath}
      />
      <span className="min-w-8 text-center text-sm font-semibold">{score}</span>
      <VoteButton
        label="Downvote"
        value={-1}
        active={viewerVote === -1}
        targetId={targetId}
        targetType={targetType}
        returnPath={returnPath}
      />
    </div>
  );
}

function VoteButton({
  label,
  value,
  active,
  targetId,
  targetType,
  returnPath,
}: {
  label: string;
  value: 1 | -1;
  active: boolean;
  targetId: string;
  targetType: "post" | "comment";
  returnPath: string;
}) {
  return (
    <form action={voteAction}>
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="value" value={String(value)} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <button
        aria-label={label}
        className={cn(
          "h-8 w-8 rounded-full text-sm font-bold transition-colors",
          active ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--card-strong)]",
        )}
      >
        {value === 1 ? "▲" : "▼"}
      </button>
    </form>
  );
}
