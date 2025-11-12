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
    }

    return NextResponse.json({ id: createdSession.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
