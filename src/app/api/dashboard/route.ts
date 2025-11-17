import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { workouts, workoutExercises } from "@/lib/db/schema";
import type { WorkoutExercise } from "@/lib/types";
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

export async function PUT(request: Request){
  const session = await auth();

  if (!session?.user.id){
    return NextResponse.json({error: "Unauthorized"}, {status: 401})
  }

  try {
    const body = await request.json();
    const {id, name, description, notes, exercises: exercisesData} = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required for update" }, { status: 400 });
    }

    if (!name || typeof name !== "string"){
      return NextResponse.json( {error: "name is required"}, {status: 400})
    }

    if (!exercisesData || !Array.isArray(exercisesData)) {
      return NextResponse.json(
        { error: "Exercises must be an array" },
        { status: 400 }
      );
    }

    // Ensure the workout belongs to the user
    const existing = await db.query.workouts.findFirst({ where: eq(workouts.id, id) });
    if (!existing) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }
    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.update(workouts).set({ name, description: description || null }).where(eq(workouts.id, id));

    // Remove previous workoutExercises and re-insert the provided list
    await db.delete(workoutExercises).where(eq(workoutExercises.workoutId, id));

    type PayloadExercise = {
      id: string;
      order?: number;
      plannedSets?: number | null;
      plannedReps?: number | null;
      plannedWeight?: number | null;
      restTimeSeconds?: number | null;
      notes?: string | null;
      isSuperset?: boolean;
      supersetGroup?: number | null;
    };

    const WorkoutExercisesValues = exercisesData.map( (ex: PayloadExercise, index: number) => ({
      workoutId: id,
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

    if (WorkoutExercisesValues.length > 0) {
      await db.insert(workoutExercises).values(WorkoutExercisesValues);
    }

    const completeWorkout = await db.query.workouts.findFirst({
      where: eq(workouts.id, id),
      with : {
        workoutExercises: {
          with : {exercise: true},
          orderBy: (workoutExercises, {asc}) => [asc(workoutExercises.order)]
        }
      }
    })

    if (!completeWorkout){return NextResponse.json({error: "failed to fetch updated workout"}, {status: 500})}

    return NextResponse.json(completeWorkout, {status: 200})
  } catch(error){
    console.error("Error updating workout:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request){
  const session = await auth();

  if (!session?.user.id){
    return NextResponse.json({error: "Unauthorized"}, {status: 401})
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await db.query.workouts.findFirst({ where: eq(workouts.id, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }
    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // delete related workoutExercises then the workout
    await db.delete(workoutExercises).where(eq(workoutExercises.workoutId, id));
    await db.delete(workouts).where(eq(workouts.id, id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting workout:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}