import { db } from "./db";
import { workoutSet, userExerciseMetrics } from "./db/schema";
import { eq, and } from "drizzle-orm";
import { estimate1RM } from "./exercise-types";

export type PRResult = {
  exerciseName: string;
  exerciseId: string;
  newBestWeight?: number;   // set when weight PR beaten
  oldBestWeight?: number;
  newBestVolume?: number;   // set when single-set volume PR beaten (covers same-weight more-reps)
  oldBestVolume?: number;
};

/**
 * Update exercise metrics after a workout set is completed
 * This should be called whenever a new set is logged
 */
export async function updateExerciseMetrics(
  exerciseId: string,
  userId: string,
  exerciseName: string = "Unknown exercise"
): Promise<PRResult | null> {
  try {
    // Get all completed sets for this exercise
    const allSets = await db
      .select()
      .from(workoutSet)
      .where(eq(workoutSet.exerciseId, exerciseId));

    const completedSets = allSets.filter((set) => set.completed);

    if (completedSets.length === 0) {
      return null;
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

    // Read existing metrics BEFORE upserting so we can detect PRs
    const [existing] = await db
      .select()
      .from(userExerciseMetrics)
      .where(
        and(
          eq(userExerciseMetrics.userId, userId),
          eq(userExerciseMetrics.exerciseId, exerciseId)
        )
      )
      .limit(1);

    // Upsert new bests
    await db
      .insert(userExerciseMetrics)
      .values({
        userId,
        exerciseId,
        bestWeight,
        bestVolume,
        best1RM,
        lastPerformedAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userExerciseMetrics.userId, userExerciseMetrics.exerciseId],
        set: { bestWeight, bestVolume, best1RM, lastPerformedAt, updatedAt: new Date() },
      });

    // Determine if any PRs were broken
    const pr: PRResult = { exerciseName, exerciseId };
    let hasPR = false;

    const oldWeight = existing?.bestWeight ?? 0;
    const oldVolume = existing?.bestVolume ?? 0;

    if (bestWeight > oldWeight) {
      pr.newBestWeight = bestWeight;
      pr.oldBestWeight = oldWeight;
      hasPR = true;
    }
    if (bestVolume > oldVolume) {
      pr.newBestVolume = bestVolume;
      pr.oldBestVolume = oldVolume;
      hasPR = true;
    }

    return hasPR ? pr : null;
  } catch (error) {
    console.error("Error updating exercise metrics:", error);
    throw error;
  }
}
