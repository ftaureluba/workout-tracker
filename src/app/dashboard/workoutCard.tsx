"use client";

import {type Workout } from "@/lib/types"

interface WorkoutCardProps {
  workout: Workout;
  onStart: (workoutId: string) => void;
}

export function WorkoutCard({ workout, onStart }: WorkoutCardProps) {
  const exerciseCount = workout.workoutExercises.length;
  const totalSets = workout.workoutExercises.reduce(
    (sum, we) => sum + (we.plannedSets || 0),
    0
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow">
      <div className="mb-3">
        <h3 className="text-xl font-bold text-gray-900">{workout.name}</h3>
        {workout.description && (
          <p className="text-gray-600 text-sm mt-1">{workout.description}</p>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        <div className="flex items-center gap-1">
          <span className="font-semibold">{exerciseCount}</span>
          <span>exercise{exerciseCount !== 1 ? "s" : ""}</span>
        </div>
        {totalSets > 0 && (
          <>
            <span>•</span>
            <div className="flex items-center gap-1">
              <span className="font-semibold">{totalSets}</span>
              <span>total sets</span>
            </div>
          </>
        )}
      </div>

      {/* Exercise Preview */}
      <div className="mb-4 space-y-1">
        {workout.workoutExercises.slice(0, 3).map((we) => (
          <div key={we.id} className="text-sm text-gray-700 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            <span>{we.exercise.name}</span>
            {we.plannedSets && (
              <span className="text-gray-500">
                ({we.plannedSets} × {we.plannedReps || "?"})
              </span>
            )}
          </div>
        ))}
        {workout.workoutExercises.length > 3 && (
          <div className="text-sm text-gray-500 pl-4">
            +{workout.workoutExercises.length - 3} more
          </div>
        )}
      </div>

      <button
        onClick={() => onStart(workout.id)}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
      >
        Start Workout
      </button>
    </div>
  );
}
