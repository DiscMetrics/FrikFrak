import { cache } from "react";
import { getSessionUser, hashPassword, shouldUserBeAdmin } from "@/lib/auth";
import { extractHashtags } from "@/lib/hashtags";
import { calculateHotScore } from "@/lib/ranking";
import { getServiceSupabase } from "@/lib/supabase";
import type {
  Category,
  CommentNode,
  CommentRecord,
  PostListItem,
  PostWithCategory,
  ReportRecord,
  SessionUser,
  ThreadParticipant,
  UserRole,
  VoteTargetType,
} from "@/lib/types";

export const REPORT_REASONS = [
  { value: "harassment", label: "Harassment" },
  { value: "spam", label: "Spam" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "explicit_content", label: "Explicit content" },
  { value: "other", label: "Other" },
] as const;

const POST_RATE_LIMIT_SECONDS = 20;
const COMMENT_RATE_LIMIT_SECONDS = 10;
const BANNED_TERMS = ["kill yourself"];

function getDb() {
  return getServiceSupabase();
}

function normalizeViewerVote(value: number | null | undefined): 1 | -1 | 0 {
  return value === 1 || value === -1 ? value : 0;
}

function containsBannedTerm(body: string) {
  const normalized = body.toLowerCase();
  return BANNED_TERMS.some((term) => normalized.includes(term));
}

async function enforceRateLimit(
  userId: string,
  target: "post" | "comment",
  table: "posts" | "comments",
) {
  const supabase = getDb();
  const seconds =
    target === "post" ? POST_RATE_LIMIT_SECONDS : COMMENT_RATE_LIMIT_SECONDS;
  const threshold = new Date(Date.now() - seconds * 1000).toISOString();

  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("author_user_id", userId)
    .gte("created_at", threshold);

  if (error) throw error;
  if ((count ?? 0) > 0) {
    throw new Error(`Slow down a little. Wait ${seconds} seconds between ${target}s.`);
  }
}

export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = getDb();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return (data ?? []) as Category[];
});

export const getCategoryBySlug = cache(async (slug: string) => {
  const supabase = getDb();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Category | null;
});

async function enrichPosts(posts: PostWithCategory[], viewer: SessionUser | null) {
  if (posts.length === 0) return [] as PostListItem[];

  const supabase = getDb();
  const ids = posts.map((post) => post.id);
  const voteMap = new Map<string, 1 | -1>();

  if (viewer) {
    const { data } = await supabase
      .from("votes")
      .select("target_id, vote_value")
      .eq("user_id", viewer.id)
      .eq("target_type", "post")
      .in("target_id", ids);

    for (const vote of data ?? []) {
      voteMap.set(vote.target_id, vote.vote_value);
    }
  }

  return [...posts]
    .sort((a, b) => calculateHotScore(b) - calculateHotScore(a))
    .map((post) => ({
      ...post,
      author_label: "OP",
      viewer_vote: normalizeViewerVote(voteMap.get(post.id)),
    }));
}

export const getFeedForCategory = cache(async (slug: string) => {
  const [category, viewer] = await Promise.all([getCategoryBySlug(slug), getSessionUser()]);
  if (!category) return { category: null, posts: [] as PostListItem[] };

  const supabase = getDb();
  const { data, error } = await supabase
    .from("posts")
    .select("*, category:categories(*)")
    .eq("category_id", category.id)
    .eq("is_deleted", false)
    .eq("moderation_status", "active")
    .order("created_at", { ascending: false })
    .limit(75);

  if (error) throw error;

  return {
    category,
    posts: await enrichPosts((data ?? []) as PostWithCategory[], viewer),
  };
});

export const getTagFeed = cache(async (tag: string) => {
  const [viewer, supabase] = await Promise.all([getSessionUser(), Promise.resolve(getDb())]);
  const { data, error } = await supabase
    .from("posts")
    .select("*, category:categories(*)")
    .contains("hashtag_list", [tag.toLowerCase()])
    .eq("is_deleted", false)
    .eq("moderation_status", "active")
    .order("created_at", { ascending: false })
    .limit(75);

  if (error) throw error;
  return enrichPosts((data ?? []) as PostWithCategory[], viewer);
});

function buildCommentTree(
  comments: CommentRecord[],
  participants: ThreadParticipant[],
  opUserId: string,
  voteMap: Map<string, 1 | -1>,
) {
  const participantMap = new Map(
    participants.map((participant) => [
      participant.user_id,
      `#${participant.participant_number}`,
    ]),
  );
  const nodes = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    nodes.set(comment.id, {
      ...comment,
      author_label:
        comment.author_user_id === opUserId
          ? "OP"
          : participantMap.get(comment.author_user_id) ?? "#?",
      viewer_vote: normalizeViewerVote(voteMap.get(comment.id)),
      children: [],
    });
  }

  for (const comment of comments) {
    const node = nodes.get(comment.id)!;
    if (comment.parent_comment_id && nodes.has(comment.parent_comment_id)) {
      nodes.get(comment.parent_comment_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export const getPostThread = cache(async (postId: string) => {
  const supabase = getDb();
  const viewer = await getSessionUser();

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("*, category:categories(*)")
    .eq("id", postId)
    .maybeSingle();

  if (postError) throw postError;
  if (!post) return null;

  const [commentsResponse, participantsResponse, postVoteResponse, viewerCommentVotes] =
    await Promise.all([
      supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true }),
      supabase
        .from("thread_participants")
        .select("*")
        .eq("post_id", postId)
        .order("participant_number", { ascending: true }),
      viewer
        ? supabase
            .from("votes")
            .select("vote_value")
            .eq("user_id", viewer.id)
            .eq("target_type", "post")
            .eq("target_id", postId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      viewer
        ? supabase
            .from("votes")
            .select("target_id, vote_value")
            .eq("user_id", viewer.id)
            .eq("target_type", "comment")
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (
    commentsResponse.error ||
    participantsResponse.error ||
    postVoteResponse.error ||
    viewerCommentVotes.error
  ) {
    throw (
      commentsResponse.error ??
      participantsResponse.error ??
      postVoteResponse.error ??
      viewerCommentVotes.error
    );
  }

  const commentVoteMap = new Map<string, 1 | -1>();
  for (const vote of viewerCommentVotes.data ?? []) {
    commentVoteMap.set(vote.target_id, vote.vote_value);
  }

  return {
    post: {
      ...(post as PostWithCategory),
      author_label: "OP",
      viewer_vote: normalizeViewerVote(postVoteResponse.data?.vote_value),
    } satisfies PostListItem,
    comments: buildCommentTree(
      (commentsResponse.data ?? []) as CommentRecord[],
      (participantsResponse.data ?? []) as ThreadParticipant[],
      (post as PostWithCategory).author_user_id,
      commentVoteMap,
    ),
  };
});

export async function getAdminOverview() {
  const supabase = getDb();
  const [posts, comments, reports, categories] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("comments").select("id", { count: "exact", head: true }),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase.from("categories").select("id", { count: "exact", head: true }),
  ]);

  return {
    postCount: posts.count ?? 0,
    commentCount: comments.count ?? 0,
    openReportCount: reports.count ?? 0,
    categoryCount: categories.count ?? 0,
  };
}

export async function getReports() {
  const supabase = getDb();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as ReportRecord[];
}

export async function getModerationQueue() {
  const supabase = getDb();
  const [posts, comments] = await Promise.all([
    supabase
      .from("posts")
      .select("id, body, is_deleted, moderation_status, created_at")
      .order("report_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("comments")
      .select("id, body, is_deleted, moderation_status, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  if (posts.error || comments.error) throw posts.error ?? comments.error;
  return {
    posts: posts.data ?? [],
    comments: comments.data ?? [],
  };
}

export async function registerUser(username: string, password: string) {
  const supabase = getDb();
  const passwordHash = await hashPassword(password);
  const role: UserRole = (await shouldUserBeAdmin(username)) ? "admin" : "user";

  const { data, error } = await supabase
    .from("users")
    .insert({
      username,
      username_lower: username.toLowerCase(),
      password_hash: passwordHash,
      role,
    })
    .select("id, username, role")
    .single();

  if (error) throw error;
  return data as SessionUser;
}

async function upsertHashtags(tags: string[]) {
  if (!tags.length) return;

  const supabase = getDb();
  for (const tag of tags) {
    const { data: existing } = await supabase
      .from("hashtags")
      .select("id, usage_count")
      .eq("tag", tag)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("hashtags")
        .update({
          usage_count: (existing.usage_count ?? 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("hashtags").insert({
        tag,
        usage_count: 1,
        last_used_at: new Date().toISOString(),
      });
    }
  }
}

async function syncPostCommentCount(postId: string) {
  const supabase = getDb();
  const { count, error } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);

  if (error) throw error;
  await supabase.from("posts").update({ comment_count: count ?? 0 }).eq("id", postId);
}

async function ensureThreadParticipant(postId: string, userId: string) {
  const supabase = getDb();
  const { data: existing } = await supabase
    .from("thread_participants")
    .select("*")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data: latest } = await supabase
    .from("thread_participants")
    .select("participant_number")
    .eq("post_id", postId)
    .order("participant_number", { ascending: false })
    .limit(1);

  const nextNumber = (latest?.[0]?.participant_number ?? 0) + 1;
  const { error } = await supabase.from("thread_participants").insert({
    post_id: postId,
    user_id: userId,
    participant_number: nextNumber,
  });

  if (error) throw error;
}

export async function createPostForUser(userId: string, categoryId: string, body: string) {
  if (containsBannedTerm(body)) throw new Error("That post includes a banned phrase.");
  await enforceRateLimit(userId, "post", "posts");

  const supabase = getDb();
  const tags = extractHashtags(body);
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_user_id: userId,
      category_id: categoryId,
      body,
      hashtag_list: tags,
    })
    .select("id")
    .single();

  if (error) throw error;
  await upsertHashtags(tags);
  return data.id as string;
}

export async function createCommentForUser(input: {
  postId: string;
  parentCommentId: string | null;
  userId: string;
  body: string;
}) {
  if (containsBannedTerm(input.body)) {
    throw new Error("That comment includes a banned phrase.");
  }
  await enforceRateLimit(input.userId, "comment", "comments");

  const supabase = getDb();
  const { data: post } = await supabase
    .from("posts")
    .select("author_user_id")
    .eq("id", input.postId)
    .single();

  if (!post) throw new Error("Post not found.");

  const tags = extractHashtags(input.body);
  const { error } = await supabase.from("comments").insert({
    post_id: input.postId,
    parent_comment_id: input.parentCommentId,
    author_user_id: input.userId,
    body: input.body,
    hashtag_list: tags,
  });

  if (error) throw error;
  await syncPostCommentCount(input.postId);
  await upsertHashtags(tags);

  if (input.userId !== post.author_user_id) {
    await ensureThreadParticipant(input.postId, input.userId);
  }
}

async function syncTargetScore(targetType: VoteTargetType, targetId: string) {
  const supabase = getDb();
  const table = targetType === "post" ? "posts" : "comments";
  const { data, error } = await supabase
    .from("votes")
    .select("vote_value")
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  if (error) throw error;
  const score = (data ?? []).reduce((sum, vote) => sum + vote.vote_value, 0);
  await supabase.from(table).update({ score }).eq("id", targetId);
}

export async function castVote(input: {
  userId: string;
  targetType: VoteTargetType;
  targetId: string;
  value: 1 | -1;
}) {
  const supabase = getDb();
  const { data: existing, error } = await supabase
    .from("votes")
    .select("id, vote_value")
    .eq("user_id", input.userId)
    .eq("target_type", input.targetType)
    .eq("target_id", input.targetId)
    .maybeSingle();

  if (error) throw error;

  if (existing && existing.vote_value === input.value) {
    await supabase.from("votes").delete().eq("id", existing.id);
  } else if (existing) {
    await supabase.from("votes").update({ vote_value: input.value }).eq("id", existing.id);
  } else {
    await supabase.from("votes").insert({
      user_id: input.userId,
      target_type: input.targetType,
      target_id: input.targetId,
      vote_value: input.value,
    });
  }

  await syncTargetScore(input.targetType, input.targetId);
}

export async function reportTarget(input: {
  userId: string;
  targetType: VoteTargetType;
  targetId: string;
  reason: string;
}) {
  const supabase = getDb();
  const { error } = await supabase.from("reports").insert({
    reporter_user_id: input.userId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
  });

  if (error) throw error;

  if (input.targetType === "post") {
    const { data } = await supabase
      .from("posts")
      .select("report_count")
      .eq("id", input.targetId)
      .single();

    await supabase
      .from("posts")
      .update({ report_count: (data?.report_count ?? 0) + 1 })
      .eq("id", input.targetId);
  }
}

export async function softDeletePost(postId: string, actorId: string, admin = false) {
  const supabase = getDb();
  let query = supabase.from("posts").select("id, author_user_id").eq("id", postId);
  if (!admin) query = query.eq("author_user_id", actorId);
  const { data, error } = await query.single();

  if (error || !data) throw new Error("Post not found or not allowed.");

  await supabase
    .from("posts")
    .update({
      body: null,
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      moderation_status: admin ? "removed" : "active",
    })
    .eq("id", postId);
}

export async function softDeleteComment(commentId: string, actorId: string, admin = false) {
  const supabase = getDb();
  let query = supabase.from("comments").select("id, author_user_id").eq("id", commentId);
  if (!admin) query = query.eq("author_user_id", actorId);
  const { data, error } = await query.single();

  if (error || !data) throw new Error("Comment not found or not allowed.");

  await supabase
    .from("comments")
    .update({
      body: null,
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      moderation_status: admin ? "removed" : "active",
    })
    .eq("id", commentId);
}

export async function createCategory(input: {
  name: string;
  slug: string;
  description: string;
  categoryType: string;
}) {
  const supabase = getDb();
  const { error } = await supabase.from("categories").insert({
    name: input.name,
    slug: input.slug,
    description: input.description,
    category_type: input.categoryType,
  });

  if (error) throw error;
}

export async function archiveCategory(id: string) {
  const supabase = getDb();
  const { error } = await supabase
    .from("categories")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}

export async function resolveReport(id: string) {
  const supabase = getDb();
  const { error } = await supabase
    .from("reports")
    .update({ status: "resolved" })
    .eq("id", id);

  if (error) throw error;
}
