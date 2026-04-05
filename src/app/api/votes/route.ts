import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { castVote } from "@/lib/data";

const schema = z.object({
  targetId: z.string().uuid(),
  targetType: z.enum(["post", "comment"]),
  value: z.union([z.literal(1), z.literal(-1)]),
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
    const result = await castVote({
      userId: viewer.id,
      targetId: parsed.data.targetId,
      targetType: parsed.data.targetType,
      value: parsed.data.value,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to cast vote." },
      { status: 400 },
    );
  }
}
