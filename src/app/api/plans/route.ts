import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  plans,
  planWeeks,
  planSessions,
  planSessionExercises,
} from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { getPlans } from "@/app/actions/plans";

/** GET /api/plans — list all visible plans */
export async function GET() {
  try {
    const rows = await getPlans();
    return NextResponse.json(rows);
  } catch (err) {
    console.error("[GET /api/plans]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/plans — create a new plan with full week/session/exercise structure */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, durationWeeks, sessionsPerWeek, isPublic, weeks } = body;

    if (!name || !durationWeeks || !weeks) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Insert plan
    const [plan] = await db
      .insert(plans)
      .values({
        name,
        description: description ?? null,
        durationWeeks,
        sessionsPerWeek: sessionsPerWeek ?? 3,
        isPublic: isPublic ?? false,
        userId: session.user.id,
      })
      .returning();

    // Insert weeks → sessions → exercises
    for (const week of weeks) {
      const [planWeek] = await db
        .insert(planWeeks)
        .values({ planId: plan.id, weekNumber: week.weekNumber })
        .returning();

      for (const s of week.sessions ?? []) {
        const [planSession] = await db
          .insert(planSessions)
          .values({
            planWeekId: planWeek.id,
            sessionLabel: s.sessionLabel,
            dayOfWeek: s.dayOfWeek ?? null,
            order: s.order ?? 0,
          })
          .returning();

        for (const ex of s.exercises ?? []) {
          await db.insert(planSessionExercises).values({
            planSessionId: planSession.id,
            exerciseId: ex.exerciseId,
            order: ex.order ?? 0,
            prescribedSets: ex.prescribedSets,
            prescribedReps: ex.prescribedReps,
            prescribedWeightPct: ex.prescribedWeightPct ?? null,
            prescribedWeightAbs: ex.prescribedWeightAbs ?? null,
            restTimeSeconds: ex.restTimeSeconds ?? null,
            notes: ex.notes ?? null,
          });
        }
      }
    }

    return NextResponse.json({ id: plan.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/plans]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
