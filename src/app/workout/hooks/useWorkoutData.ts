import { useEffect, useState } from "react";
import { getWorkoutFromCache } from "@/lib/indexdb";
import type { Workout, WorkoutExercise } from "@/lib/types";
import { getLastPerformance, type LastPerformance } from "@/app/actions/last-performance";

export type WorkoutLike =
    | (Workout & { exercises?: undefined })
    | { name: string; exercises: { name: string; sets?: { reps: number; weight: number }[] }[] };

export type EditExercise = {
    name: string;
    sets?: { reps?: number; weight?: number }[];
    exerciseId?: string;
    order?: number;
    restTimeSeconds?: number;
};

export function useWorkoutData(workoutId: string) {
    const [workout, setWorkout] = useState<WorkoutLike | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Editable exercises state
    const [editableExercises, setEditableExercises] = useState<EditExercise[]>([]);
    const [lastPerformanceData, setLastPerformanceData] = useState<Record<string, LastPerformance>>({});

    useEffect(() => {
        let mounted = true;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const cached = await getWorkoutFromCache(workoutId);
                if (mounted && cached) {
                    setWorkout(cached as WorkoutLike);
                }

                if (navigator.onLine) {
                    if (!cached) {
                        try {
                            const res = await fetch(`/api/workouts/${workoutId}`);
                            if (res.ok) {
                                const data = await res.json();
                                if (mounted) setWorkout(data as WorkoutLike);
                            }
                        } catch {
                            // keep cached
                        }
                    }
                } else if (!cached) {
                    setError("Offline and no cached workout available.");
                }
            } catch (err: unknown) {
                console.error(err);
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, [workoutId]);

    // Fetch last performance data for the loaded exercises
    useEffect(() => {
        const exerciseIds = editableExercises
            .map((e) => e.exerciseId)
            .filter((id): id is string => !!id);
        if (exerciseIds.length === 0) return;

        let mounted = true;
        getLastPerformance(exerciseIds)
            .then((data) => {
                if (mounted) setLastPerformanceData(data);
            })
            .catch(console.error);
        return () => {
            mounted = false;
        };
    }, [editableExercises]);

    return {
        workout,
        loading,
        error,
        editableExercises,
        setEditableExercises,
        lastPerformanceData,
    };
}
