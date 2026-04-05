import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createCommentForUser, getCommentNodeById } from "@/lib/data";

const schema = z.object({
  postId: z.string().uuid(),
  parentCommentId: z.string().uuid().nullable(),
  body: z.string().min(1).max(400),
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
    const commentId = await createCommentForUser({
      postId: parsed.data.postId,
      parentCommentId: parsed.data.parentCommentId,
      userId: viewer.id,
      body: parsed.data.body.trim(),
    });
    const comment = await getCommentNodeById(commentId, viewer);

    return NextResponse.json({ comment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create comment." },
      { status: 400 },
    );
  }
}
