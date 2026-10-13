import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { advancePlanEnrollment } from "@/app/actions/plans";

/**
 * POST /api/enrollments/[id]/advance
 * Body: { planSessionId: string, workoutSessionId?: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { planSessionId, workoutSessionId } = await req.json();

    if (!planSessionId) {
      return NextResponse.json({ error: "planSessionId required" }, { status: 400 });
    }

    await advancePlanEnrollment({
      enrollmentId: id,
      planSessionId,
      workoutSessionId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/enrollments/[id]/advance]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
