import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { markNotificationRead } from "@/lib/data";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await getSessionUser();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  await markNotificationRead(id, viewer.id);
  return NextResponse.json({ ok: true });
}
