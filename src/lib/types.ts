export type UserRole = "user" | "admin";
export type CategoryType = "general" | "school" | "tournament" | "region" | "tag";
export type ModerationStatus = "active" | "removed";
export type VoteTargetType = "post" | "comment";
export type NotificationType = "post_reply" | "comment_reply";
export type FeedbackStatus = "open" | "resolved" | "archived";
export type PostType = "text" | "link";
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
  post_type: PostType;
  title: string;
  body: string | null;
  external_url: string | null;
  score: number;
  comment_count: number;
  report_count: number;
  tag_list: string[];
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

export interface FeedDirectoryItem extends Category {
  post_count: number;
  recent_activity_at: string | null;
}

export interface TagDirectoryItem {
  tag: string;
  usage_count: number;
  last_used_at: string | null;
}

export interface NotificationRecord {
  id: string;
  recipient_user_id: string;
  actor_user_id: string;
  post_id: string;
  comment_id: string | null;
  parent_comment_id: string | null;
  notification_type: NotificationType;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface InboxItem extends NotificationRecord {
  reply_preview: string | null;
  link_path: string;
}

export interface FeedbackSubmission {
  id: string;
  submitter_user_id: string | null;
  optional_name: string | null;
  body: string;
  status: FeedbackStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface ReportReviewItem extends ReportRecord {
  target_preview: string | null;
  target_deleted: boolean;
  target_path: string | null;
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
