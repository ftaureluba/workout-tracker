"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import ExercisePicker from "@/app/components/exercise-picker";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useWorkoutData } from "../hooks/useWorkoutData";
import { useWorkoutSession } from "../hooks/useWorkoutSession";
import { SortableExercise } from "../components/SortableExercise";
import { WorkoutHeader } from "../components/WorkoutHeader";
import { WorkoutCompleteModal } from "../components/WorkoutCompleteModal";
import type { Workout, WorkoutExercise } from "@/lib/types";
import { getLastPerformance, type LastPerformance } from "@/app/actions/last-performance";

interface Props {
  workoutId: string;
  resumeSessionId?: string;
}

// Type guards
function hasExercisesArray(
  x: unknown
): x is { name: string; exercises: { name: string; sets?: { reps: number; weight: number }[] }[] } {
  return typeof x === "object" && x !== null && Array.isArray((x as Record<string, unknown>)["exercises"]);
}

function hasWorkoutExercises(x: unknown): x is Workout {
  return typeof x === "object" && x !== null && Array.isArray((x as Record<string, unknown>)["workoutExercises"]);
}

export default function WorkoutClient({ workoutId, resumeSessionId }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { workout, loading, error } = useWorkoutData(workoutId);

  // Last performance state — managed here so it reacts to editableExercises from useWorkoutSession
  const [lastPerformanceData, setLastPerformanceData] = useState<Record<string, LastPerformance>>({});
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  const normalizedExercises = useMemo(() => {
    return hasExercisesArray(workout)
      ? workout.exercises
      : hasWorkoutExercises(workout)
        ? workout.workoutExercises.map((we: WorkoutExercise) => {
          const setsCount = typeof we.plannedSets === "number" && we.plannedSets > 0 ? we.plannedSets : 3;
          const sets = Array.from({ length: setsCount }).map(() => ({
            reps: typeof we.plannedReps === "number" ? we.plannedReps : undefined,
            weight: typeof we.plannedWeight === "number" ? we.plannedWeight : undefined,
          }));

          return {
            name: we.exercise?.name ?? "Unnamed exercise",
            sets,
            exerciseId: we.exerciseId,
            order: we.order,
            restTimeSeconds: we.restTimeSeconds ?? undefined,
          };
        })
        : [];
  }, [workout]);

  const {
    editableExercises,
    performed,
    updatePerformed,
    addSet,
    removeSet,
    addExercise,
    removeExercise,
    handleDragEnd,
    handleEndWorkout,
    finishing,
    completionData,
    clearCompletion,
  } = useWorkoutSession(workoutId, workout, resumeSessionId, normalizedExercises);

  // Reactively fetch last performance whenever editableExercises changes
  const exerciseIds = useMemo(
    () => editableExercises.map((e) => e.exerciseId).filter((id): id is string => !!id),
    [editableExercises]
  );

  useEffect(() => {
    const newIds = exerciseIds.filter((id) => !fetchedIdsRef.current.has(id));
    if (newIds.length === 0) return;

    let mounted = true;
    getLastPerformance(newIds)
      .then((data) => {
        if (mounted) {
          newIds.forEach((id) => fetchedIdsRef.current.add(id));
          setLastPerformanceData((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(console.error);
    return () => {
      mounted = false;
    };
  }, [exerciseIds]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  if (loading) return <div className="p-4">Loading workout…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!workout) return <div className="p-4">Workout not found.</div>;

  const workoutName =
    ((workout as Record<string, unknown>)["name"] as string) ?? (workout as Workout).name ?? "Workout";

  return (
    <>
      <WorkoutHeader workoutName={workoutName} />

      <main className="p-4 max-w-md mx-auto w-full pb-24">
        <div className="flex justify-end mb-3">
          <button onClick={() => setPickerOpen(true)} className="px-3 py-1 bg-blue-600 text-white rounded mr-2">
            + Add exercise
          </button>
        </div>

        <div className="space-y-6">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={editableExercises.map((e) => e.exerciseId ?? e.name)}
              strategy={verticalListSortingStrategy}
            >
              {editableExercises.map((exercise, idx) => (
                <SortableExercise
                  key={exercise.exerciseId ?? exercise.name}
                  id={exercise.exerciseId ?? exercise.name}
                  exercise={exercise}
                  idx={idx}
                  removeExercise={removeExercise}
                  performed={performed}
                  updatePerformed={updatePerformed}
                  removeSet={removeSet}
                  addSet={addSet}
                  lastPerformance={exercise.exerciseId ? lastPerformanceData[exercise.exerciseId] : undefined}
                  restTimeSeconds={exercise.restTimeSeconds}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </main>

      <ExercisePicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAddExercise={(ex: { id: string; name: string }) => {
          addExercise(ex.id, ex.name);
          setPickerOpen(false);
        }}
      />

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <button
          onClick={handleEndWorkout}
          disabled={finishing}
          style={{ backgroundColor: finishing ? "#94a3b8" : "#1C6E8C" }}
          className="w-full h-12 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:cursor-not-allowed"
        >
          {finishing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Saving...
            </>
          ) : (
            "End Workout"
          )}
        </button>
      </div>
      {completionData && (
        <WorkoutCompleteModal
          prs={completionData.prs}
          onClose={() => clearCompletion()}
        />
      )}
    </>
  );
}
