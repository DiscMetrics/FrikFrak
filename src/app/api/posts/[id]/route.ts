import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { softDeletePost } from "@/lib/data";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await getSessionUser();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    await softDeletePost(id, viewer.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete post." },
      { status: 400 },
    );
  }
}
