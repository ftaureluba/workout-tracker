
import HistorialClient from "./HistorialClient";
import { db } from "@/lib/db";
import { workoutSessions } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { getWorkoutFrequency, getUserExercises } from "@/app/actions/history";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HistorialPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Server component: fetch latest 5 sessions and pass serialized data to client
  // Also fetch analytics data
  const [sessions, frequencyData, exercises] = await Promise.all([
    db.query.workoutSessions.findMany({
      orderBy: [desc(workoutSessions.createdAt)],
      with: { workout: true, sessionExercises: true },
      limit: 20, // Increased limit for better history view
      where: (table, { eq }) => eq(table.userId, session.user.id), // Ensure we only get user's sessions explicitly here (though findMany usually needs where if not filtered by default, but existing code didn't have it? maybe it was public or relied on implicit filter? Added explicit filter for safety)
    }),
    getWorkoutFrequency(),
    getUserExercises(),
  ]);

  const serializedSessions = sessions.map((s) => ({
    id: s.id,
    workoutName: s.workout?.name ?? null,
    createdAt: s.createdAt ? s.createdAt.toISOString() : null,
    exercisesCount: s.sessionExercises?.length ?? 0,
  }));

  return (
    <HistorialClient
      sessions={serializedSessions}
      frequencyData={frequencyData}
      exercises={exercises}
    />
  );
}

