import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { reportTarget } from "@/lib/data";

const schema = z.object({
  targetId: z.string().uuid(),
  targetType: z.enum(["post", "comment"]),
  reason: z.string().min(1),
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
    await reportTarget({
      userId: viewer.id,
      targetId: parsed.data.targetId,
      targetType: parsed.data.targetType,
      reason: parsed.data.reason,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit report." },
      { status: 400 },
    );
  }
}
