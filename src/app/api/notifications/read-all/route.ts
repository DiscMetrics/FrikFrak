import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { markAllNotificationsRead } from "@/lib/data";

export async function POST() {
  const viewer = await getSessionUser();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await markAllNotificationsRead(viewer.id);
  return NextResponse.json({ ok: true });
}
