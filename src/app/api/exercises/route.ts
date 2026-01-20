import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exercises, userExerciseMetrics } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { or, isNull, eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await db
      .select({
        exercise: exercises,
        metrics: userExerciseMetrics,
      })
      .from(exercises)
      .leftJoin(
        userExerciseMetrics,
        and(
          eq(userExerciseMetrics.exerciseId, exercises.id),
          eq(userExerciseMetrics.userId, session.user.id)
        )
      )
      .where(or(isNull(exercises.userId), eq(exercises.userId, session.user.id)));

    // Merge metrics into the exercise object
    const allExercises = rows.map(({ exercise, metrics }) => ({
      ...exercise,
      bestWeight: metrics?.bestWeight ?? null,
      bestVolume: metrics?.bestVolume ?? null,
      best1RM: metrics?.best1RM ?? null,
      lastPerformedAt: metrics?.lastPerformedAt ?? null,
    }));

    return NextResponse.json(allExercises);
  } catch (error) {
    console.error("Error fetching exercises:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, notes } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const [newExercise] = await db
      .insert(exercises)
      .values({
        name,
        description: description || null,
        notes: notes || null,
        userId: session.user.id,
      })
      .returning();

    return NextResponse.json(newExercise, { status: 201 });
  } catch (error) {
    console.error("Error creating exercise:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
