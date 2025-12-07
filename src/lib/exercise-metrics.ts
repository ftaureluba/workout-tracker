import { db } from "./db";
import { exercises, workoutSet } from "./db/schema";
import { eq } from "drizzle-orm";
import { estimate1RM } from "./exercise-types";

/**
 * Update exercise metrics after a workout set is completed
 * This should be called whenever a new set is logged
 */
export async function updateExerciseMetrics(exerciseId: string) {
  try {
    // Get all completed sets for this exercise
    const allSets = await db
      .select()
      .from(workoutSet)
      .where(eq(workoutSet.exerciseId, exerciseId));

    const completedSets = allSets.filter((set) => set.completed);

    if (completedSets.length === 0) {
      return;
    }

    // Calculate metrics
    let bestWeight = 0;
    let bestVolume = 0;
    let best1RM = 0;

    completedSets.forEach((set) => {
      // Best weight (single rep)
      if (set.weight > bestWeight) {
        bestWeight = set.weight;
      }

      // Best volume (reps * weight)
      const volume = set.reps * set.weight;
      if (volume > bestVolume) {
        bestVolume = volume;
      }

      // Estimated 1RM
      const estimated1RM = estimate1RM(set.weight, set.reps);
      if (estimated1RM > best1RM) {
        best1RM = estimated1RM;
      }
    });

    // Get most recent performance date
    const lastPerformedAt = new Date(
      Math.max(...completedSets.map((set) => set.createdAt?.getTime() || 0))
    );

    // Update exercise record
    await db
      .update(exercises)
      .set({
        bestWeight,
        bestVolume,
        best1RM,
        lastPerformedAt,
        updatedAt: new Date(),
      })
      .where(eq(exercises.id, exerciseId));
  } catch (error) {
    console.error("Error updating exercise metrics:", error);
    throw error;
  }
}
