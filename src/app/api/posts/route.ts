import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { normalizeTags } from "@/lib/hashtags";
import { createPostForUser, getPostListItemById } from "@/lib/data";

const tagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{2,32}$/);

const schema = z
  .object({
    categoryId: z.string().uuid(),
    postType: z.enum(["text", "link"]),
    title: z.string().trim().min(3).max(140),
    body: z.string().trim().max(600).optional().nullable(),
    externalUrl: z.url({ protocol: /^https?$/ }).optional().nullable(),
    tags: z.array(tagSchema).max(5).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.postType === "text") {
      return;
    }

    if (!value.externalUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["externalUrl"],
        message: "Link posts require an external URL.",
      });
    }

    if (value.body && value.body.trim().length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body"],
        message: "Link posts cannot include a body.",
      });
    }
  });

export async function POST(request: Request) {
  const viewer = await getSessionUser();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const postId = await createPostForUser({
      userId: viewer.id,
      categoryId: parsed.data.categoryId,
      postType: parsed.data.postType,
      title: parsed.data.title.trim(),
      body:
        parsed.data.postType === "text" && parsed.data.body?.trim()
          ? parsed.data.body.trim()
          : null,
      externalUrl:
        parsed.data.postType === "link" && parsed.data.externalUrl
          ? parsed.data.externalUrl
          : null,
      tags: normalizeTags(parsed.data.tags),
    });
    const post = await getPostListItemById(postId, viewer);

    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create post." },
      { status: 400 },
    );
  }
}
