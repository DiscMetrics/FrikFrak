import { reportAction } from "@/app/actions";
import { REPORT_REASONS } from "@/lib/data";

export function ReportForm({
  targetId,
  targetType,
  returnPath,
}: {
  targetId: string;
  targetType: "post" | "comment";
  returnPath: string;
}) {
  return (
    <details className="group">
      <summary className="cursor-pointer text-xs font-medium muted hover:text-[var(--accent)]">
        Report
      </summary>
      <form action={reportAction} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="returnPath" value={returnPath} />
        <select
          name="reason"
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs"
          defaultValue="harassment"
        >
          {REPORT_REASONS.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label}
            </option>
          ))}
        </select>
        <button className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-medium">
          Submit
        </button>
      </form>
    </details>
  );
}
