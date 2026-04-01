"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  archiveCategory,
  castVote,
  createCategory,
  createCommentForUser,
  createPostForUser,
  registerUser,
  reportTarget,
  resolveReport,
  softDeleteComment,
  softDeletePost,
} from "@/lib/data";
import {
  authenticateWithUsername,
  clearSession,
  createSession,
  requireAdmin,
  requireUser,
} from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { encodeMessage, slugify } from "@/lib/utils";

const authSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(24, "Username must be 24 characters or less.")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores are allowed."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const postSchema = z.object({
  categoryId: z.string().uuid(),
  body: z.string().min(4, "Posts must be at least 4 characters.").max(600),
});

const commentSchema = z.object({
  postId: z.string().uuid(),
  parentCommentId: z.string().uuid().nullable(),
  body: z.string().min(1, "Comments cannot be empty.").max(400),
});

function ensureConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error("Configure Supabase before using FrikFrak.");
  }
}

export async function signupAction(formData: FormData) {
  ensureConfigured();
  const parsed = authSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/signup?error=${encodeMessage(parsed.error.issues[0].message)}`);
  }

  try {
    const user = await registerUser(parsed.data.username, parsed.data.password);
    await createSession(user);
  } catch {
    redirect("/signup?error=That%20username%20is%20already%20taken.");
  }

  redirect("/feed");
}

export async function loginAction(formData: FormData) {
  ensureConfigured();
  const parsed = authSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/login?error=${encodeMessage(parsed.error.issues[0].message)}`);
  }

  const user = await authenticateWithUsername(
    parsed.data.username,
    parsed.data.password,
  );
  if (!user) {
    redirect("/login?error=Invalid%20username%20or%20password.");
  }

  await createSession(user);
  redirect("/feed");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function createPostAction(formData: FormData) {
  const user = await requireUser();
  const redirectPath = String(formData.get("redirectPath") || "/feed");
  const parsed = postSchema.safeParse({
    categoryId: formData.get("categoryId"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    redirect(`${redirectPath}?error=${encodeMessage(parsed.error.issues[0].message)}`);
  }

  try {
    await createPostForUser(user.id, parsed.data.categoryId, parsed.data.body.trim());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create post.";
    redirect(`${redirectPath}?error=${encodeMessage(message)}`);
  }

  revalidatePath(redirectPath);
  redirect(redirectPath);
}

export async function createCommentAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId"));
  const parsed = commentSchema.safeParse({
    postId,
    parentCommentId: formData.get("parentCommentId")
      ? String(formData.get("parentCommentId"))
      : null,
    body: formData.get("body"),
  });

  if (!parsed.success) {
    redirect(`/p/${postId}?error=${encodeMessage(parsed.error.issues[0].message)}`);
  }

  try {
    await createCommentForUser({
      postId: parsed.data.postId,
      parentCommentId: parsed.data.parentCommentId,
      userId: user.id,
      body: parsed.data.body.trim(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add comment.";
    redirect(`/p/${postId}?error=${encodeMessage(message)}`);
  }

  revalidatePath(`/p/${postId}`);
  redirect(`/p/${postId}`);
}

export async function voteAction(formData: FormData) {
  const user = await requireUser();
  const returnPath = String(formData.get("returnPath") || "/feed");

  await castVote({
    userId: user.id,
    targetId: String(formData.get("targetId")),
    targetType: String(formData.get("targetType")) as "post" | "comment",
    value: Number(formData.get("value")) as 1 | -1,
  });

  revalidatePath(returnPath);
  redirect(returnPath);
}

export async function reportAction(formData: FormData) {
  const user = await requireUser();
  const returnPath = String(formData.get("returnPath") || "/feed");

  await reportTarget({
    userId: user.id,
    targetType: String(formData.get("targetType")) as "post" | "comment",
    targetId: String(formData.get("targetId")),
    reason: String(formData.get("reason")),
  });

  revalidatePath(returnPath);
  redirect(`${returnPath}?message=Report%20submitted.`);
}

export async function deletePostAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId"));
  await softDeletePost(postId, user.id);
  revalidatePath(`/p/${postId}`);
  redirect(`/p/${postId}?message=${encodeMessage("Post deleted. Comments remain visible.")}`);
}

export async function deleteCommentAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId"));
  await softDeleteComment(String(formData.get("commentId")), user.id);
  revalidatePath(`/p/${postId}`);
  redirect(`/p/${postId}?message=Comment%20deleted.`);
}

export async function createCategoryAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const slug = slugify(String(formData.get("slug") || name));

  if (!name || !slug) {
    redirect("/admin/categories?error=Provide%20a%20valid%20category%20name.");
  }

  try {
    await createCategory({
      name,
      slug,
      description: String(formData.get("description") || "").trim(),
      categoryType: String(formData.get("categoryType") || "school"),
    });
  } catch {
    redirect("/admin/categories?error=Unable%20to%20create%20category.");
  }

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function archiveCategoryAction(formData: FormData) {
  await requireAdmin();
  await archiveCategory(String(formData.get("categoryId")));
  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function resolveReportAction(formData: FormData) {
  await requireAdmin();
  await resolveReport(String(formData.get("reportId")));
  revalidatePath("/admin/reports");
  redirect("/admin/reports");
}

export async function adminRemovePostAction(formData: FormData) {
  const admin = await requireAdmin();
  await softDeletePost(String(formData.get("postId")), admin.id, true);
  revalidatePath("/admin/moderation");
  redirect("/admin/moderation");
}

export async function adminRemoveCommentAction(formData: FormData) {
  const admin = await requireAdmin();
  await softDeleteComment(String(formData.get("commentId")), admin.id, true);
  revalidatePath("/admin/moderation");
  redirect("/admin/moderation");
}
