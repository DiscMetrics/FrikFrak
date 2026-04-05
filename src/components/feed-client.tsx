"use client";

import { useState } from "react";
import { MessageBanner } from "@/components/message-banner";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import type { Category, PostListItem, SessionUser } from "@/lib/types";

type CreatePostInput = {
  postType: "text" | "link";
  title: string;
  body: string | null;
  externalUrl: string | null;
  tags: string[];
};

export function FeedClient({
  category,
  initialPosts,
  viewer,
  returnPath,
  suggestedTags,
}: {
  category: Category;
  initialPosts: PostListItem[];
  viewer: SessionUser | null;
  returnPath: string;
  suggestedTags: string[];
}) {
  const [posts, setPosts] = useState(initialPosts);

  async function createOptimisticPost(input: CreatePostInput) {
    if (!viewer) {
      throw new Error("You must be logged in to post.");
    }

    const optimisticId = `temp-${crypto.randomUUID()}`;
    const optimisticPost: PostListItem = {
      id: optimisticId,
      category_id: category.id,
      category,
      author_user_id: viewer.id,
      post_type: input.postType,
      title: input.title,
      body: input.body,
      external_url: input.externalUrl,
      score: 0,
      comment_count: 0,
      report_count: 0,
      tag_list: input.tags,
      hashtag_list: [],
      is_deleted: false,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      moderation_status: "active",
      author_label: "OP",
      viewer_vote: 0,
    };

    setPosts((current) => [optimisticPost, ...current]);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId: category.id,
          postType: input.postType,
          title: input.title,
          body: input.body,
          externalUrl: input.externalUrl,
          tags: input.tags,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create post.");
      }

      setPosts((current) =>
        current.map((post) => (post.id === optimisticId ? payload.post : post)),
      );

      return payload.post as PostListItem;
    } catch (error) {
      setPosts((current) => current.filter((post) => post.id !== optimisticId));
      throw error;
    }
  }

  return (
    <div className="space-y-5">
      {viewer ? (
        <PostComposer
          category={category}
          onCreatePost={createOptimisticPost}
          suggestedTags={suggestedTags}
        />
      ) : (
        <MessageBanner tone="info">
          Log in to post, vote, report, or join the thread.
        </MessageBanner>
      )}
      {posts.length ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} viewer={viewer} returnPath={returnPath} />
          ))}
        </div>
      ) : (
        <div className="card rounded-[2rem] p-6 text-sm muted">
          Nothing here yet. The first anonymous post sets the tone.
        </div>
      )}
    </div>
  );
}
