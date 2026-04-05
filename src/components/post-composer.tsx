"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Category, PostListItem } from "@/lib/types";

type ComposerPostInput = {
  postType: "text" | "link";
  title: string;
  body: string | null;
  externalUrl: string | null;
  tags: string[];
};

export function PostComposer({
  category,
  onCreatePost,
  suggestedTags,
}: {
  category: Category;
  onCreatePost?: (input: ComposerPostInput) => Promise<PostListItem>;
  suggestedTags: string[];
}) {
  const router = useRouter();
  const [postType, setPostType] = useState<"text" | "link">("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredTagInput = useDeferredValue(tagInput);

  const filteredSuggestions = suggestedTags.filter(
    (tag) =>
      (!deferredTagInput || tag.includes(deferredTagInput.trim().toLowerCase())) &&
      !tags.includes(tag),
  );

  function normalizeTag(value: string) {
    return value.trim().replace(/^#+/, "").toLowerCase();
  }

  function addTag(rawValue: string) {
    const normalized = normalizeTag(rawValue);
    if (!normalized) return;
    if (!/^[a-z0-9_]{2,32}$/.test(normalized)) {
      setError("Tags must be 2-32 characters using letters, numbers, or underscores.");
      return;
    }
    if (tags.includes(normalized)) {
      setTagInput("");
      return;
    }
    if (tags.length >= 5) {
      setError("Use up to 5 tags per post.");
      return;
    }

    setError(null);
    setTags((current) => [...current, normalized]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((value) => value !== tag));
  }

  async function submit() {
    setError(null);
    try {
      const submission = {
        postType,
        title: title.trim(),
        body: postType === "text" && body.trim() ? body.trim() : null,
        externalUrl: postType === "link" && externalUrl.trim() ? externalUrl.trim() : null,
        tags,
      } satisfies ComposerPostInput;

      if (onCreatePost) {
        await onCreatePost(submission);
      } else {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ categoryId: category.id, ...submission }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error ?? "Unable to create post.");
        }

        router.refresh();
      }

      setPostType("text");
      setTitle("");
      setBody("");
      setExternalUrl("");
      setTagInput("");
      setTags([]);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create post.",
      );
    }
  }

  return (
    <form
      className="card rounded-[2rem] p-5 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(() => {
          void submit();
        });
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Drop a post</h2>
          <p className="text-sm muted">
            Anonymous by default. Pick a post type, add a clear title, and attach tags separately.
          </p>
        </div>
      </div>
      <div className="mb-4 flex gap-2 rounded-2xl border border-[var(--line)] bg-[var(--control-muted)] p-1">
        {[
          { value: "text", label: "Text" },
          { value: "link", label: "Link (Images and Videos)" },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setError(null);
              setPostType(tab.value as "text" | "link");
            }}
            className={
              postType === tab.value
                ? "flex-1 rounded-[1rem] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                : "flex-1 rounded-[1rem] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--control-hover)]"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        <input
          name="title"
          maxLength={140}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={`Title your ${postType === "text" ? "post" : "link"} for ${category.name}`}
          className="surface-input accent-ring w-full rounded-2xl px-4 py-3 text-sm outline-none"
          required
        />
        {postType === "text" ? (
          <textarea
            name="body"
            rows={5}
            maxLength={600}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={`Add optional context for ${category.name}`}
            className="surface-input accent-ring w-full rounded-2xl px-4 py-3 text-sm outline-none"
          />
        ) : (
          <input
            name="externalUrl"
            type="url"
            value={externalUrl}
            onChange={(event) => setExternalUrl(event.target.value)}
            placeholder="https://example.com/highlight"
            className="surface-input accent-ring w-full rounded-2xl px-4 py-3 text-sm outline-none"
            required
          />
        )}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--control-muted)] p-4">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => removeTag(tag)}
                className="tag-chip rounded-full px-3 py-1 text-xs font-medium"
              >
                {tag} ×
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              name="tags"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  addTag(tagInput);
                }
              }}
              placeholder="Add tags like stanfordinvite"
              className="surface-input accent-ring min-w-0 flex-1 rounded-2xl px-4 py-3 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => addTag(tagInput)}
              className="secondary-button rounded-2xl px-4 py-3 text-sm font-medium"
            >
              Add tag
            </button>
          </div>
          {filteredSuggestions.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {filteredSuggestions.slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="tag-chip rounded-full px-3 py-1 text-xs font-medium"
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : null}
          <p className="mt-3 text-xs muted">Up to 5 tags. Use plain words without `#`.</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs muted">No edits after posting. You can still delete it later.</p>
          {error ? <p className="mt-2 text-xs text-[var(--danger)]">{error}</p> : null}
        </div>
        <button
          disabled={
            isPending ||
            title.trim().length < 3 ||
            (postType === "link" && externalUrl.trim().length === 0)
          }
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isPending ? "Posting..." : "Post anonymously"}
        </button>
      </div>
    </form>
  );
}
