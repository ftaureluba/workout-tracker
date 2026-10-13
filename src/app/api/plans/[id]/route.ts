import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getPlanDetail } from "@/app/actions/plans";

/** GET /api/plans/[id] — full plan detail */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plan = await getPlanDetail(id);
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(plan);
  } catch (err) {
    console.error("[GET /api/plans/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/plans/[id] — delete own plan */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await db
      .delete(plans)
      .where(and(eq(plans.id, id), eq(plans.userId, session.user.id)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/plans/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
