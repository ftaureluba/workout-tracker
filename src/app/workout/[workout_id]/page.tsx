import React from "react";
import WorkoutClient from "./WorkoutClient";

export default function WorkoutPage(props: any) {
  const params = props?.params ?? {};
  return <WorkoutClient workoutId={params.workout_id} />;
}
