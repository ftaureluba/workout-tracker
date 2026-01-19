import React from "react";
import WorkoutClient from "./WorkoutClient";

export default async function WorkoutPage(props: {
  params: Promise<{ workout_id: string }>;
  searchParams: Promise<{ resume?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  return <WorkoutClient workoutId={params.workout_id} resumeSessionId={searchParams?.resume} />;
}
