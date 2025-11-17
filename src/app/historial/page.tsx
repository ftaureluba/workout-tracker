import HistorialClient from "./HistorialClient";
import { db } from "@/lib/db";
import { workoutSessions } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export default async function HistorialPage() {
  // Server component: fetch latest 5 sessions and pass serialized data to client
  const sessions = await db.query.workoutSessions.findMany({
    orderBy: [desc(workoutSessions.createdAt)],
    with: { workout: true, sessionExercises: true },
    limit: 5,
  });

  const serialized = sessions.map((s) => ({
    id: s.id,
    workoutName: s.workout?.name ?? null,
    createdAt: s.createdAt ? s.createdAt.toISOString() : null,
    exercisesCount: s.sessionExercises?.length ?? 0,
  }));

  return <HistorialClient sessions={serialized} />;
}

