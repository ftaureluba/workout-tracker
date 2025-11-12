import React from "react";
import WorkoutClient from "./WorkoutClient";

export default async function WorkoutPage({ params }: { params: { workout_id: string } }) {
  // Next.js may pass a Promise-like `params` in some dynamic scenarios — await before using.
  const awaitedParams = await params;
  return <WorkoutClient workoutId={awaitedParams.workout_id} />;
}
