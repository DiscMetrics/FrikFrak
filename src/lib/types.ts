export type UserRole = "user" | "admin";
export type CategoryType = "general" | "school" | "tournament" | "region" | "tag";
export type ModerationStatus = "active" | "removed";
export type VoteTargetType = "post" | "comment";
export type ReportReason =
  | "harassment"
  | "spam"
  | "hate_speech"
  | "explicit_content"
  | "other";

export interface SessionUser {
  id: string;
  username: string;
  role: UserRole;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category_type: CategoryType;
  is_active: boolean;
  created_at: string;
}

export interface PostRecord {
  id: string;
  category_id: string;
  author_user_id: string;
  body: string | null;
  score: number;
  comment_count: number;
  report_count: number;
  hashtag_list: string[];
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  moderation_status: ModerationStatus;
}

export interface CommentRecord {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  author_user_id: string;
  body: string | null;
  score: number;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  moderation_status: ModerationStatus;
}

export interface ReportRecord {
  id: string;
  reporter_user_id: string;
  target_type: VoteTargetType;
  target_id: string;
  reason: ReportReason;
  status: "open" | "resolved";
  notes: string | null;
  created_at: string;
}

export interface ThreadParticipant {
  id: string;
  post_id: string;
  user_id: string;
  participant_number: number;
}

export interface PostWithCategory extends PostRecord {
  category: Category;
}

export interface PostListItem extends PostWithCategory {
  author_label: string;
  viewer_vote: 1 | -1 | 0;
}

export interface CommentNode extends CommentRecord {
  author_label: string;
  viewer_vote: 1 | -1 | 0;
  children: CommentNode[];
}
