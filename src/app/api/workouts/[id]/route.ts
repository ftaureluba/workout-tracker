import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workouts } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import type { Workout } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionUser = await auth();
  
  if (!sessionUser?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const workoutId = params.id;
    if (!workoutId) {
      return NextResponse.json({ error: "Workout ID is required" }, { status: 400 });
    }

    const workout = await db.query.workouts.findFirst({
      where: eq(workouts.id, workoutId),
      with: {
        workoutExercises: {
          with: {
            exercise: true,
          },
          orderBy: (workoutExercises, { asc }) => [asc(workoutExercises.order)],
        },
      },
    });

    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    // Verify ownership
    if (workout.userId !== sessionUser.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Convert Date objects to ISO strings
    const response: Workout = {
      ...workout,
      userId: workout.userId ?? "",
      createdAt: workout.createdAt?.toISOString() ?? null,
      updatedAt: workout.updatedAt?.toISOString() ?? null,
      workoutExercises: workout.workoutExercises.map((we) => ({
        ...we,
        id: we.exerciseId,
        isSuperset: we.isSuperset ?? undefined,
        supersetGroup: we.supersetGroup ?? undefined,
        exercise: {
          ...we.exercise,
          createdAt: we.exercise.createdAt?.toISOString() ?? null,
          updatedAt: we.exercise.updatedAt?.toISOString() ?? null,
        },
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching workout:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout" },
      { status: 500 }
    );
  }
}
