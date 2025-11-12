import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { workouts, workoutExercises, exercises, users } from "@/lib/db/schema";
import type { Workout, WorkoutExercise } from "@/lib/types";
import { auth } from "@/lib/auth"; // Import the auth function

export async function GET() {
  const session = await auth();
  console.log("coso de session: ", session);
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const userWorkouts = await db.query.workouts.findMany({
      where: eq(workouts.userId, userId),
      with: {
        workoutExercises: {
          with: {
            exercise:true
          },
          orderBy: (workoutExercises, {asc}) => [asc(workoutExercises.order)]
        }
      },
      orderBy: [desc(workouts.updatedAt)]
    })
    return NextResponse.json(userWorkouts, {status: 200});
  } catch (error) {
    console.error("Error fetching workouts:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request){
  const session = await auth()

  if (!session?.user.id){
    return NextResponse.json({error: "Unauthorized"}, {status: 401})
  }

  try {
    const body = await request.json();
    const {name, description, notes, exercises: exercisesData} = body;

    if (!name || typeof name !== "string"){
      return NextResponse.json( {error: "name is required"}, {status: 400})
    }

    if (!exercisesData || !Array.isArray(exercisesData)) {
      return NextResponse.json(
        { error: "Exercises must be an array" },
        { status: 400 }
      );
    }

    if (exercisesData.length === 0) {
      return NextResponse.json(
        { error: "Workout must have at least one exercise" },
        { status: 400 }
      );
    }
    const [newWorkout] = await db.insert(workouts).values({
      name, description: description || null, notes: notes || null, userId: session.user.id,
    }).returning()

    const WorkoutExercisesValues = exercisesData.map( (ex: WorkoutExercise, index: number) => ({
      workoutId: newWorkout.id,
      exerciseId: ex.id,
      order: ex.order ?? index,
      plannedSets: ex.plannedSets || null,
      plannedReps: ex.plannedReps || null,
      plannedWeight: ex.plannedWeight || null,
      restTimeSeconds: ex.restTimeSeconds || null,
      notes: ex.notes  || null,
      isSuperSet: ex.isSuperset || false, 
      supersetGroup: ex.supersetGroup  || null
    }))

    await db.insert(workoutExercises).values(WorkoutExercisesValues);

    const completeWorkout = await db.query.workouts.findFirst({
      where: eq(workouts.id, newWorkout.id),
      with : {
        workoutExercises: {
          with : {exercise: true},
          orderBy: (workoutExercises, {asc}) => [asc(workoutExercises.order)]
        }
      }
    })

    if (!completeWorkout){return NextResponse.json({error: "failed to fetch created workout"}, {status: 500})}


    
    return NextResponse.json(completeWorkout, {status: 201})
  } catch(error){
    console.error("Error creating workout:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}