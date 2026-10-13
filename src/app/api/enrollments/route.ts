import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPlanEnrollments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { enrollInPlan, getActiveEnrollments } from "@/app/actions/plans";

/** GET /api/enrollments — user's active enrollments with progress */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = await getActiveEnrollments();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/enrollments]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/enrollments — enroll in a plan.
 * Body: { planId: string, exerciseMaxes: { exerciseId, weightKg, reps, e1rm }[] }
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { planId, exerciseMaxes } = body;

    if (!planId) {
      return NextResponse.json({ error: "planId is required" }, { status: 400 });
    }

    const result = await enrollInPlan({ planId, exerciseMaxes: exerciseMaxes ?? [] });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[POST /api/enrollments]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
