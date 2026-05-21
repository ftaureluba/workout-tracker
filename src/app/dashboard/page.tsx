import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboardClient";
import { db } from "@/lib/db";
import { workouts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getLastPerformedDates } from "@/app/actions/last-performance";
import type { Workout } from "@/lib/types";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Query DB directly instead of self-fetching /api/dashboard
  const dbWorkouts = await db.query.workouts.findMany({
    where: eq(workouts.userId, session.user.id),
    with: {
      workoutExercises: {
        with: {
          exercise: true,
        },
        orderBy: (workoutExercises, { asc }) => [asc(workoutExercises.order)],
      },
    },
    orderBy: [desc(workouts.updatedAt)],
  });

  // Convert Date objects to ISO strings to match the Workout type
  // (the previous self-fetch did this implicitly via JSON serialization)
  const userWorkouts: Workout[] = dbWorkouts.map((w) => ({
    ...w,
    userId: w.userId ?? "",
    createdAt: w.createdAt?.toISOString() ?? null,
    updatedAt: w.updatedAt?.toISOString() ?? null,
    workoutExercises: w.workoutExercises.map((we) => ({
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
  }));

  // Fetch "last performed" dates, passing userId to skip redundant auth()
  const workoutIds = userWorkouts.map((w) => w.id);
  const lastPerformedMap = await getLastPerformedDates(workoutIds, session.user.id);

  return <DashboardClient workouts={userWorkouts} userId={session.user.id} lastPerformedMap={lastPerformedMap} />;
}