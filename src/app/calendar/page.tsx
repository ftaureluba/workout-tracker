import type { Metadata } from "next";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import CalendarClient from "./CalendarClient";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workoutSessions } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "Workout Calendar | Workout Tracker",
};

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sessions = await db.query.workoutSessions.findMany({
    where: and(
      eq(workoutSessions.userId, session.user.id),
      isNotNull(workoutSessions.endedAt)
    ),
    with: { workout: true, sets: true },
    orderBy: [asc(workoutSessions.endedAt), asc(workoutSessions.createdAt)],
  });

  const bestsByExercise = new Map<string, { weight: number; volume: number }>();
  const workouts = sessions.flatMap((workoutSession) => {
    const completedSets = workoutSession.sets.filter(
      (set) => set.completed && set.exerciseId
    );
    let hasPR = false;

    for (const set of completedSets) {
      const previousBest = bestsByExercise.get(set.exerciseId) ?? {
        weight: 0,
        volume: 0,
      };
      if (
        set.weight > previousBest.weight ||
        set.weight * set.reps > previousBest.volume
      ) {
        hasPR = true;
      }
    }

    for (const set of completedSets) {
      const previousBest = bestsByExercise.get(set.exerciseId) ?? {
        weight: 0,
        volume: 0,
      };
      bestsByExercise.set(set.exerciseId, {
        weight: Math.max(previousBest.weight, set.weight),
        volume: Math.max(previousBest.volume, set.weight * set.reps),
      });
    }

    if (!workoutSession.endedAt) return [];

    return [{
      id: workoutSession.id,
      name: workoutSession.workout?.name ?? "Ad-hoc workout",
      completedAt: workoutSession.endedAt.toISOString(),
      hasPR,
    }];
  });

  return <CalendarClient workouts={workouts} />;
}