import { createPostAction } from "@/app/actions";
import type { Category } from "@/lib/types";

export function PostComposer({
  category,
  returnPath,
}: {
  category: Category;
  returnPath: string;
}) {
  return (
    <form action={createPostAction} className="card rounded-[2rem] p-5 sm:p-6">
      <input type="hidden" name="categoryId" value={category.id} />
      <input type="hidden" name="redirectPath" value={returnPath} />
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Drop a post</h2>
          <p className="text-sm muted">
            Anonymous by default. Hashtags like #stanfordinvite get saved for tag pages later.
          </p>
        </div>
      </div>
      <textarea
        name="body"
        rows={5}
        maxLength={600}
        placeholder={`What is the ${category.name} chatter today?`}
        className="accent-ring w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
        required
      />
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs muted">No edits after posting. You can still delete it later.</p>
        <button className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
          Post anonymously
        </button>
      </div>
    </form>
  );
}
