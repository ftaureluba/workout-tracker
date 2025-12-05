import React from "react";
import WorkoutClient from "./WorkoutClient";

export default async function WorkoutPage(props: any) {
  const params = await props?.params;
  return <WorkoutClient workoutId={params?.workout_id} />;
}
