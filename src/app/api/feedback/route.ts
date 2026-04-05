import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createFeedbackSubmission } from "@/lib/data";

const schema = z.object({
  optionalName: z.string().max(80).optional().nullable(),
  body: z.string().min(4).max(1200),
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
    const feedback = await createFeedbackSubmission({
      userId: viewer.id,
      optionalName: parsed.data.optionalName?.trim() || null,
      body: parsed.data.body.trim(),
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send feedback." },
      { status: 400 },
    );
  }
}
