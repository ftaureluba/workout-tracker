import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workoutSessions, sessionExercises, workoutSet } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import type { ActiveSession } from "@/lib/types";

export async function POST(request: Request) {
  const sessionUser = await auth();
  if (!sessionUser?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: ActiveSession = await request.json();

    if (!body || !Array.isArray(body.exercises)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Insert workout session
    const [createdSession] = await db.insert(workoutSessions).values({
      userId: sessionUser.user.id,
      workoutId: body.workoutId ?? null,
      startedAt: body.startedAt ? new Date(body.startedAt) : null,
      endedAt: body.endedAt ? new Date(body.endedAt) : null,
      notes: null,
    }).returning();

    // Insert session exercises
    const sessionExercisesValues = body.exercises.map((ex) => ({
      workoutSessionId: createdSession.id,
      exerciseId: ex.exerciseId || null,
      order: ex.order ?? 0,
      isSuperset: false,
      supersetGroup: null,
      name: ex.exerciseName || null,
    }));

    const insertedSessionExercises = await db.insert(sessionExercises).values(sessionExercisesValues).returning();

    // Insert sets
    type InsertSet = {
      sessionExerciseId: string;
      exerciseId: string;
      workoutSessionId: string;
      reps: number;
      weight: number;
      completed: boolean;
      notes: string | null;
    };

    const setsToInsert: InsertSet[] = [];
    for (let i = 0; i < body.exercises.length; i++) {
      const ex = body.exercises[i];
      const insertedEx = insertedSessionExercises[i];
      if (!insertedEx) continue;
      for (const s of ex.sets || []) {
        const exId = ex.exerciseId ?? insertedEx.exerciseId;
        // workout_set.exerciseId is NOT NULL in schema — skip sets when we don't have an exercise id
        if (!exId) continue;

        setsToInsert.push({
          sessionExerciseId: insertedEx.id,
          exerciseId: exId,
          workoutSessionId: createdSession.id,
          reps: s.reps ?? 0,
          weight: s.weight ?? 0,
          completed: !!s.completed,
          notes: s.notes || null,
        });
      }
    }

    if (setsToInsert.length > 0) {
      await db.insert(workoutSet).values(setsToInsert);

      // Trigger metric updates asynchronously (fire and forget or await if critical)
      // Here we await to ensure data consistency, but wrap in try-catch to not fail the response
      try {
        const uniqueExerciseIds = new Set(setsToInsert.map(s => s.exerciseId));
        const { updateExerciseMetrics } = await import('@/lib/exercise-metrics');

        await Promise.all(
          Array.from(uniqueExerciseIds).map(exId =>
            updateExerciseMetrics(exId, sessionUser.user.id!)
          )
        );
      } catch (metricsErr) {
        console.error("Failed to update exercise metrics:", metricsErr);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ id: createdSession.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
