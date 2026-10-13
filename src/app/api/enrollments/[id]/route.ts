import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPlanEnrollments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updateEnrollmentStatus } from "@/app/actions/plans";

/** PATCH /api/enrollments/[id] — pause / resume / abandon */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await req.json();

    if (!["active", "paused", "abandoned"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await updateEnrollmentStatus(id, status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/enrollments/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
