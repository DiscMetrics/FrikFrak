import { cache } from "react";
import { getSessionUser, hashPassword, shouldUserBeAdmin } from "@/lib/auth";
import { normalizeTags } from "@/lib/hashtags";
import { calculateHotScore } from "@/lib/ranking";
import { getServiceSupabase } from "@/lib/supabase";
import type {
  Category,
  CommentNode,
  CommentRecord,
  FeedDirectoryItem,
  FeedbackSubmission,
  InboxItem,
  NotificationRecord,
  PostListItem,
  PostType,
  PostWithCategory,
  ReportRecord,
  ReportReviewItem,
  SessionUser,
  TagDirectoryItem,
  ThreadParticipant,
  UserRole,
  VoteTargetType,
} from "@/lib/types";

type VoteTarget = {
  score: number;
  viewerVote: 1 | -1 | 0;
};

const POST_RATE_LIMIT_SECONDS = 20;
const COMMENT_RATE_LIMIT_SECONDS = 10;
const BANNED_TERMS: string[] = [];

function getDb() {
  return getServiceSupabase();
}

function normalizeViewerVote(value: number | null | undefined): 1 | -1 | 0 {
  return value === 1 || value === -1 ? value : 0;
}

function sortCategories<T extends { slug: string; name: string }>(categories: T[]) {
  return [...categories].sort((a, b) => {
    if (a.slug === "general") return -1;
    if (b.slug === "general") return 1;
    return a.name.localeCompare(b.name);
  });
}

function containsBannedTerm(body: string) {
  const normalized = body.toLowerCase();
  return BANNED_TERMS.some((term) => normalized.includes(term));
}

function containsBannedTerms(values: Array<string | null | undefined>) {
  return values.some((value) => value && containsBannedTerm(value));
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
  return sortCategories((data ?? []) as Category[]);
});

export async function getUnreadNotificationCount(userId: string) {
  const supabase = getDb();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return count ?? 0;
}

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
  const normalizedTag = tag.toLowerCase();
  const { data, error } = await supabase
    .from("posts")
    .select("*, category:categories(*)")
    .contains("tag_list", [normalizedTag])
    .eq("is_deleted", false)
    .eq("moderation_status", "active")
    .order("created_at", { ascending: false })
    .limit(75);

  if (error) throw error;
  return enrichPosts((data ?? []) as PostWithCategory[], viewer);
});

export const getPopularTags = cache(async (limit = 20) => {
  const supabase = getDb();
  const { data, error } = await supabase
    .from("hashtags")
    .select("tag, usage_count, last_used_at")
    .order("usage_count", { ascending: false })
    .order("last_used_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as TagDirectoryItem[];
});

export async function searchTags(query: string, limit = 20) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return getPopularTags(limit);
  }

  const supabase = getDb();
  const { data, error } = await supabase
    .from("hashtags")
    .select("tag, usage_count, last_used_at")
    .ilike("tag", `${normalizedQuery}%`)
    .order("usage_count", { ascending: false })
    .order("last_used_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as TagDirectoryItem[];
}

export async function getPostListItemById(postId: string, viewer: SessionUser | null) {
  const supabase = getDb();
  const { data, error } = await supabase
    .from("posts")
    .select("*, category:categories(*)")
    .eq("id", postId)
    .single();

  if (error) throw error;

  const posts = await enrichPosts([data as PostWithCategory], viewer);
  return posts[0];
}

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

export async function getCommentNodeById(commentId: string, viewer: SessionUser | null) {
  const supabase = getDb();
  const { data: comment, error } = await supabase
    .from("comments")
    .select("*")
    .eq("id", commentId)
    .single();

  if (error) throw error;

  const [{ data: post }, { data: participants }, votesResponse] = await Promise.all([
    supabase
      .from("posts")
      .select("author_user_id")
      .eq("id", comment.post_id)
      .single(),
    supabase
      .from("thread_participants")
      .select("*")
      .eq("post_id", comment.post_id)
      .order("participant_number", { ascending: true }),
    viewer
      ? supabase
          .from("votes")
          .select("target_id, vote_value")
          .eq("user_id", viewer.id)
          .eq("target_type", "comment")
          .eq("target_id", commentId)
      : Promise.resolve({ data: [] as Array<{ target_id: string; vote_value: 1 | -1 }>, error: null }),
  ]);

  const voteMap = new Map<string, 1 | -1>();
  for (const vote of votesResponse.data ?? []) {
    voteMap.set(vote.target_id, vote.vote_value);
  }

  const [node] = buildCommentTree(
    [comment as CommentRecord],
    (participants ?? []) as ThreadParticipant[],
    post!.author_user_id,
    voteMap,
  );

  return node;
}

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

export async function getReportReviewItems() {
  const reports = await getReports();
  if (reports.length === 0) {
    return [] as ReportReviewItem[];
  }

  const supabase = getDb();
  const postIds = Array.from(
    new Set(reports.filter((report) => report.target_type === "post").map((report) => report.target_id)),
  );
  const commentIds = Array.from(
    new Set(reports.filter((report) => report.target_type === "comment").map((report) => report.target_id)),
  );

  const [posts, comments] = await Promise.all([
    postIds.length
      ? supabase.from("posts").select("id, title, body, is_deleted").in("id", postIds)
      : Promise.resolve({ data: [], error: null }),
    commentIds.length
      ? supabase
          .from("comments")
          .select("id, post_id, body, is_deleted")
          .in("id", commentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (posts.error || comments.error) {
    throw posts.error ?? comments.error;
  }

  const postMap = new Map(
    (posts.data ?? []).map((post) => [
      post.id,
      {
        preview: post.title,
        deleted: post.is_deleted,
        path: `/p/${post.id}`,
      },
    ]),
  );
  const commentMap = new Map(
    (comments.data ?? []).map((comment) => [
      comment.id,
      {
        preview: comment.body,
        deleted: comment.is_deleted,
        path: `/p/${comment.post_id}#comment-${comment.id}`,
      },
    ]),
  );

  return reports.map((report) => {
    const target =
      report.target_type === "post"
        ? postMap.get(report.target_id)
        : commentMap.get(report.target_id);

    return {
      ...report,
      target_preview: target?.preview ?? null,
      target_deleted: target?.deleted ?? false,
      target_path: target?.path ?? null,
    } satisfies ReportReviewItem;
  });
}

export async function getFeedDirectory() {
  const categories = await getCategories();
  if (categories.length === 0) {
    return [] as FeedDirectoryItem[];
  }

  const supabase = getDb();
  const { data, error } = await supabase
    .from("posts")
    .select("category_id, created_at")
    .eq("is_deleted", false)
    .eq("moderation_status", "active");

  if (error) throw error;

  const postMap = new Map<string, { count: number; recentActivityAt: string | null }>();

  for (const post of data ?? []) {
    const current = postMap.get(post.category_id) ?? {
      count: 0,
      recentActivityAt: null,
    };
    current.count += 1;
    if (!current.recentActivityAt || post.created_at > current.recentActivityAt) {
      current.recentActivityAt = post.created_at;
    }
    postMap.set(post.category_id, current);
  }

  return categories
    .map((category) => ({
      ...category,
      post_count: postMap.get(category.id)?.count ?? 0,
      recent_activity_at: postMap.get(category.id)?.recentActivityAt ?? null,
    }))
    .sort((a, b) => {
      if (a.slug === "general") return -1;
      if (b.slug === "general") return 1;
      if (b.post_count !== a.post_count) return b.post_count - a.post_count;
      return a.name.localeCompare(b.name);
    });
}

export async function getInboxItems(userId: string) {
  const supabase = getDb();
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  const commentIds = Array.from(
    new Set(
      (notifications ?? [])
        .map((notification) => notification.comment_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const { data: comments, error: commentsError } = commentIds.length
    ? await supabase
        .from("comments")
        .select("id, body, post_id")
        .in("id", commentIds)
    : { data: [], error: null };

  if (commentsError) throw commentsError;

  const commentMap = new Map(
    (comments ?? []).map((comment) => [comment.id, comment]),
  );

  return ((notifications ?? []) as NotificationRecord[]).map((notification) => {
    const reply = notification.comment_id
      ? commentMap.get(notification.comment_id)
      : null;

    return {
      ...notification,
      reply_preview: reply?.body ?? null,
      link_path: notification.comment_id
        ? `/p/${notification.post_id}#comment-${notification.comment_id}`
        : `/p/${notification.post_id}`,
    } satisfies InboxItem;
  });
}

export async function getFeedbackSubmissions() {
  const supabase = getDb();
  const { data, error } = await supabase
    .from("feedback_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as FeedbackSubmission[];
}

export async function getModerationQueue() {
  const supabase = getDb();
  const [posts, comments] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, body, is_deleted, moderation_status, created_at")
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

async function syncHashtagsForPost(previousTags: string[], nextTags: string[]) {
  const removedTags = previousTags.filter((tag) => !nextTags.includes(tag));
  const supabase = getDb();

  if (removedTags.length) {
    for (const tag of removedTags) {
      const { data: existing } = await supabase
        .from("hashtags")
        .select("id, usage_count")
        .eq("tag", tag)
        .maybeSingle();

      if (!existing) continue;

      if ((existing.usage_count ?? 0) <= 1) {
        await supabase.from("hashtags").delete().eq("id", existing.id);
      } else {
        await supabase
          .from("hashtags")
          .update({ usage_count: existing.usage_count - 1 })
          .eq("id", existing.id);
      }
    }
  }

  const addedTags = nextTags.filter((tag) => !previousTags.includes(tag));
  await upsertHashtags(addedTags);
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

async function createNotification(input: {
  recipientUserId: string;
  actorUserId: string;
  postId: string;
  commentId: string;
  parentCommentId: string | null;
  notificationType: "post_reply" | "comment_reply";
}) {
  if (input.recipientUserId === input.actorUserId) {
    return;
  }

  const supabase = getDb();
  const { error } = await supabase.from("notifications").insert({
    recipient_user_id: input.recipientUserId,
    actor_user_id: input.actorUserId,
    post_id: input.postId,
    comment_id: input.commentId,
    parent_comment_id: input.parentCommentId,
    notification_type: input.notificationType,
  });

  if (error) throw error;
}

export async function createPostForUser(input: {
  userId: string;
  categoryId: string;
  postType: PostType;
  title: string;
  body: string | null;
  externalUrl: string | null;
  tags: string[];
}) {
  if (containsBannedTerms([input.title, input.body, input.externalUrl])) {
    throw new Error("That post includes a banned phrase.");
  }
  await enforceRateLimit(input.userId, "post", "posts");

  const supabase = getDb();
  const tags = normalizeTags(input.tags);
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_user_id: input.userId,
      category_id: input.categoryId,
      post_type: input.postType,
      title: input.title,
      body: input.body,
      external_url: input.externalUrl,
      tag_list: tags,
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

  const parentComment =
    input.parentCommentId
      ? await supabase
          .from("comments")
          .select("id, author_user_id")
          .eq("id", input.parentCommentId)
          .single()
      : null;

  if (parentComment?.error) throw parentComment.error;
  const { data: createdComment, error } = await supabase
    .from("comments")
    .insert({
      post_id: input.postId,
      parent_comment_id: input.parentCommentId,
      author_user_id: input.userId,
      body: input.body,
      hashtag_list: [],
    })
    .select("id")
    .single();

  if (error) throw error;
  await syncPostCommentCount(input.postId);

  if (input.userId !== post.author_user_id) {
    await ensureThreadParticipant(input.postId, input.userId);
  }

  if (input.parentCommentId && parentComment?.data) {
    await createNotification({
      recipientUserId: parentComment.data.author_user_id,
      actorUserId: input.userId,
      postId: input.postId,
      commentId: createdComment.id,
      parentCommentId: input.parentCommentId,
      notificationType: "comment_reply",
    });
  } else {
    await createNotification({
      recipientUserId: post.author_user_id,
      actorUserId: input.userId,
      postId: input.postId,
      commentId: createdComment.id,
      parentCommentId: null,
      notificationType: "post_reply",
    });
  }

  return createdComment.id as string;
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
  return score;
}

export async function castVote(input: {
  userId: string;
  targetType: VoteTargetType;
  targetId: string;
  value: 1 | -1;
}): Promise<VoteTarget> {
  const supabase = getDb();
  const { data: existing, error } = await supabase
    .from("votes")
    .select("id, vote_value")
    .eq("user_id", input.userId)
    .eq("target_type", input.targetType)
    .eq("target_id", input.targetId)
    .maybeSingle();

  if (error) throw error;

  let viewerVote: 1 | -1 | 0 = input.value;
  if (existing && existing.vote_value === input.value) {
    await supabase.from("votes").delete().eq("id", existing.id);
    viewerVote = 0;
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

  const score = await syncTargetScore(input.targetType, input.targetId);
  return {
    score,
    viewerVote,
  };
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

export async function markNotificationRead(notificationId: string, userId: string) {
  const supabase = getDb();
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("recipient_user_id", userId);

  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = getDb();
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("recipient_user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
}

export async function createFeedbackSubmission(input: {
  userId: string | null;
  optionalName: string | null;
  body: string;
}) {
  const supabase = getDb();
  const { data, error } = await supabase
    .from("feedback_submissions")
    .insert({
      submitter_user_id: input.userId,
      optional_name: input.optionalName,
      body: input.body,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as FeedbackSubmission;
}

export async function softDeletePost(postId: string, actorId: string, admin = false) {
  const supabase = getDb();
  let query = supabase
    .from("posts")
    .select("id, author_user_id, tag_list")
    .eq("id", postId);
  if (!admin) query = query.eq("author_user_id", actorId);
  const { data, error } = await query.single();

  if (error || !data) throw new Error("Post not found or not allowed.");

  await syncHashtagsForPost(data.tag_list ?? [], []);
  await supabase
    .from("posts")
    .update({
      title: "[deleted]",
      body: null,
      external_url: null,
      tag_list: [],
      hashtag_list: [],
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

export async function updateFeedbackStatus(
  id: string,
  status: "resolved" | "archived",
) {
  const supabase = getDb();
  const payload =
    status === "resolved"
      ? { status, resolved_at: new Date().toISOString() }
      : { status };

  const { error } = await supabase
    .from("feedback_submissions")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}
