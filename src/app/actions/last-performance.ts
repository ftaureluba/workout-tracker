"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
    workoutSessions,
    sessionExercises,
    workoutSet,
} from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export type LastPerformanceSet = {
    reps: number;
    weight: number;
};

export type LastPerformance = {
    exerciseId: string;
    date: string;
    sets: LastPerformanceSet[];
};

/**
 * Fetches the most recent performance for each exercise ID.
 * Returns a map of exerciseId -> last performance data.
 */
export async function getLastPerformance(
    exerciseIds: string[]
): Promise<Record<string, LastPerformance>> {
    const session = await auth();
    if (!session?.user?.id) {
        return {};
    }

    if (exerciseIds.length === 0) return {};

    // Deduplicate
    const uniqueIds = [...new Set(exerciseIds)];

    const result: Record<string, LastPerformance> = {};

    // For each exercise, find the most recent session that includes it,
    // then fetch the sets from that session for that exercise.
    // We batch this with a single query to get all relevant data.
    const data = await db
        .select({
            exerciseId: sessionExercises.exerciseId,
            sessionDate: workoutSessions.createdAt,
            sessionId: workoutSessions.id,
            sessionExerciseId: sessionExercises.id,
            reps: workoutSet.reps,
            weight: workoutSet.weight,
            completed: workoutSet.completed,
        })
        .from(workoutSet)
        .innerJoin(
            sessionExercises,
            eq(workoutSet.sessionExerciseId, sessionExercises.id)
        )
        .innerJoin(
            workoutSessions,
            eq(workoutSet.workoutSessionId, workoutSessions.id)
        )
        .where(
            and(
                eq(workoutSessions.userId, session.user.id),
                inArray(sessionExercises.exerciseId, uniqueIds),
                eq(workoutSet.completed, true)
            )
        )
        .orderBy(desc(workoutSessions.createdAt));

    // Group by exerciseId, then pick the most recent session's sets
    const byExercise: Record<
        string,
        { sessionId: string; date: Date; sets: LastPerformanceSet[] }
    > = {};

    for (const row of data) {
        if (!row.exerciseId || !row.sessionDate) continue;
        const exId = row.exerciseId;

        if (!byExercise[exId]) {
            // First row for this exercise = most recent (ordered desc)
            byExercise[exId] = {
                sessionId: row.sessionId,
                date: row.sessionDate,
                sets: [],
            };
        }

        // Only include sets from the same (most recent) session
        if (byExercise[exId].sessionId === row.sessionId) {
            byExercise[exId].sets.push({
                reps: row.reps,
                weight: row.weight,
            });
        }
    }

    for (const [exId, entry] of Object.entries(byExercise)) {
        result[exId] = {
            exerciseId: exId,
            date: entry.date.toISOString().split("T")[0],
            sets: entry.sets,
        };
    }

    return result;
}
