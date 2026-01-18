import { db } from "./db";
import { workouts, workoutExercises, exercises } from "./db/schema";
import { eq, or, isNull } from "drizzle-orm";

export async function seedUserWorkouts(userId: string) {
    try {
        console.log(`[seedUserWorkouts] Starting seed for user ${userId}`);

        // Fetch system exercises we need for the default plans
        const neededExerciseNames = [
            "Bench Press",
            "Squat",
            "Deadlift",
            "Overhead Press",
            "Barbell Row",
            "Pull-ups",
            "Dips",
            "Bicep Curls",
            "Tricep Extensions",
            "Leg Press",
            "Lateral Raise",
            "Lunges"
        ];

        const systemExercises = await db
            .select()
            .from(exercises)
            .where(or(isNull(exercises.userId)));

        // Create a map for quick lookup: Name -> ID
        const exerciseMap = new Map<string, string>();
        systemExercises.forEach((ex) => {
            if (ex.name) exerciseMap.set(ex.name, ex.id);
        });

        const getExId = (name: string) => exerciseMap.get(name);

        // 1. Push Day
        const [pushWorkout] = await db.insert(workouts).values({
            name: "Push Day",
            description: "Chest, Shoulders, Triceps",
            userId: userId
        }).returning();

        const pushExercises = [
            { name: "Bench Press", sets: 3, reps: 8, weight: 135 },
            { name: "Overhead Press", sets: 3, reps: 10, weight: 95 },
            { name: "Dips", sets: 3, reps: 12, weight: 0 },
            { name: "Tricep Extensions", sets: 3, reps: 12, weight: 40 },
            { name: "Lateral Raise", sets: 3, reps: 15, weight: 15 },
        ];

        const pushExercisesValues = pushExercises
            .map((item, index) => ({
                workoutId: pushWorkout.id,
                exerciseId: getExId(item.name),
                order: index + 1,
                plannedSets: item.sets,
                plannedReps: item.reps,
                plannedWeight: item.weight,
            }))
            .filter(item => item.exerciseId !== undefined) as any[]; // Filter out missing exercises if system DB is incomplete

        if (pushExercisesValues.length > 0) {
            await db.insert(workoutExercises).values(pushExercisesValues);
        }


        // 2. Pull Day
        const [pullWorkout] = await db.insert(workouts).values({
            name: "Pull Day",
            description: "Back, Biceps, Rear Delts",
            userId: userId
        }).returning();

        const pullExercises = [
            { name: "Deadlift", sets: 1, reps: 5, weight: 225 },
            { name: "Pull-ups", sets: 3, reps: 8, weight: 0 },
            { name: "Barbell Row", sets: 3, reps: 10, weight: 135 },
            { name: "Bicep Curls", sets: 3, reps: 12, weight: 30 },
        ];

        const pullExercisesValues = pullExercises
            .map((item, index) => ({
                workoutId: pullWorkout.id,
                exerciseId: getExId(item.name),
                order: index + 1,
                plannedSets: item.sets,
                plannedReps: item.reps,
                plannedWeight: item.weight,
            }))
            .filter(item => item.exerciseId !== undefined) as any[];

        if (pullExercisesValues.length > 0) {
            await db.insert(workoutExercises).values(pullExercisesValues);
        }

        // 3. Leg Day
        const [legWorkout] = await db.insert(workouts).values({
            name: "Leg Day",
            description: "Quads, Hamstrings, Glutes, Calves",
            userId: userId
        }).returning();

        const legExercises = [
            { name: "Squat", sets: 3, reps: 5, weight: 185 },
            { name: "Leg Press", sets: 3, reps: 10, weight: 300 },
            { name: "Lunges", sets: 3, reps: 12, weight: 40 },
        ];

        const legExercisesValues = legExercises
            .map((item, index) => ({
                workoutId: legWorkout.id,
                exerciseId: getExId(item.name),
                order: index + 1,
                plannedSets: item.sets,
                plannedReps: item.reps,
                plannedWeight: item.weight,
            }))
            .filter(item => item.exerciseId !== undefined) as any[];

        if (legExercisesValues.length > 0) {
            await db.insert(workoutExercises).values(legExercisesValues);
        }

        console.log(`[seedUserWorkouts] Successfully seeded workouts for user ${userId}`);

    } catch (error) {
        console.error("[seedUserWorkouts] Error seeding workouts:", error);
        // We don't throw here to avoid failing the entire signup if seeding fails
    }
}
