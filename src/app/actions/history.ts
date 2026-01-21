"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workoutSessions, workoutSet, exercises } from "@/lib/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { estimate1RM } from "@/lib/exercise-types";

export type ExerciseHistoryPoint = {
    date: string;
    weight: number;
    reps: number;
    volume: number;
    oneRM: number;
};

export async function getExerciseHistory(exerciseId: string): Promise<ExerciseHistoryPoint[]> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    // Fetch all sets for this exercise, belonging to the user
    // We join with workoutSessions to filter by user and get the date
    const data = await db
        .select({
            date: workoutSessions.createdAt,
            weight: workoutSet.weight,
            reps: workoutSet.reps,
            completed: workoutSet.completed,
        })
        .from(workoutSet)
        .innerJoin(workoutSessions, eq(workoutSet.workoutSessionId, workoutSessions.id))
        .where(
            and(
                eq(workoutSet.exerciseId, exerciseId),
                eq(workoutSessions.userId, session.user.id),
                eq(workoutSet.completed, true)
            )
        )
        .orderBy(desc(workoutSessions.createdAt));

    // Process data to find best performance per day
    // (Or we could return all sets, but charts might get messy. Let's do max 1RM per day for now)

    const dailyBest: Record<string, ExerciseHistoryPoint> = {};

    data.forEach((set) => {
        if (!set.date) return;
        const dateStr = set.date.toISOString(); // Keep full timestamp or just YYYY-MM-DD?
        // Let's use YYYY-MM-DD for grouping
        const dayStr = set.date.toISOString().split('T')[0];

        const current1RM = estimate1RM(set.weight, set.reps);
        const volume = set.weight * set.reps;

        if (!dailyBest[dayStr]) {
            dailyBest[dayStr] = {
                date: dayStr,
                weight: set.weight,
                reps: set.reps,
                volume: volume,
                oneRM: current1RM,
            };
        } else {
            // If this set is better 1RM, update
            if (current1RM > dailyBest[dayStr].oneRM) {
                dailyBest[dayStr] = {
                    date: dayStr,
                    weight: set.weight,
                    reps: set.reps,
                    volume: volume,
                    oneRM: current1RM,
                };
            }
        }
    });

    return Object.values(dailyBest).sort((a, b) => a.date.localeCompare(b.date));
}

export type FrequencyData = {
    period: string; // YYYY-MM
    count: number;
};

export async function getWorkoutFrequency(): Promise<FrequencyData[]> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    // Group by month for the last 12 months
    // Postgres specific date truncation
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await db
        .select({
            month: sql<string>`to_char(${workoutSessions.createdAt}, 'YYYY-MM')`,
            count: sql<number>`count(*)::int`,
        })
        .from(workoutSessions)
        .where(
            and(
                eq(workoutSessions.userId, session.user.id),
                gte(workoutSessions.createdAt, oneYearAgo)
            )
        )
        .groupBy(sql`to_char(${workoutSessions.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${workoutSessions.createdAt}, 'YYYY-MM')`);

    return result.map(row => ({
        period: row.month,
        count: row.count
    }));
}

export type ExerciseOption = {
    id: string;
    name: string;
};

export async function getUserExercises(query?: string): Promise<ExerciseOption[]> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    // Fetch exercises created by user OR default exercises (where userId is null)
    // And filter by query if provided
    // Note: userExerciseMetrics might tell us which exercises they actually USE, 
    // but for now let's just list compatible exercises.
    // Actually, better to list exercises they have history for?
    // Let's list all their available exercises for now.

    // Let's keep it simple: fetch all exercises they have access to.
    // (User's own exercises OR global exercises)

    // OPTIMIZATION: Only show exercises they have actually performed (have metrics for) 
    // coupled with 'userExerciseMetrics' might be good, but let's just return all for flexibility.

    const allExercises = await db
        .select({
            id: exercises.id,
            name: exercises.name,
        })
        .from(exercises)
        .where(
            // Access Logic: private exercises (userId = user.id) OR common (userId is null)
            sql`(${exercises.userId} = ${session.user.id} OR ${exercises.userId} IS NULL)`
        )
        .orderBy(exercises.name);

    if (query) {
        const lowerQuery = query.toLowerCase();
        return allExercises.filter(ex => ex.name.toLowerCase().includes(lowerQuery));
    }

    return allExercises;
}
