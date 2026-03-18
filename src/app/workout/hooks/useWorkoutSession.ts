import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveActiveSession, queueSync, deleteActiveSession, getActiveSession } from "@/lib/indexdb";
import type { Workout, ActiveSession } from "@/lib/types";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import type { EditExercise, WorkoutLike } from "./useWorkoutData";
import type { PRResult } from "@/lib/exercise-metrics";

export type CompletionData = {
  sessionId: string;
  prs: PRResult[];
};

export type PerformedVal = number | "";

export function useWorkoutSession(
    workoutId: string,
    workout: WorkoutLike | null,
    resumeSessionId?: string,
    initialEditableExercises: EditExercise[] = []
) {
    const router = useRouter();
    const [startedAt] = useState(() => new Date().toISOString());

    const sessionIdRef = useRef<string>(
        (() => {
            try {
                const maybeCrypto = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
                return typeof maybeCrypto?.randomUUID === "function" ? maybeCrypto.randomUUID() : String(Date.now());
            } catch {
                return String(Date.now());
            }
        })()
    );

    const [editableExercises, setEditableExercises] = useState<EditExercise[]>(initialEditableExercises);
    const [performed, setPerformed] = useState<{ reps?: PerformedVal; weight?: PerformedVal }[][]>([]);
    const [resumeLoaded, setResumeLoaded] = useState(!resumeSessionId);
    const [finishing, setFinishing] = useState(false);
    const [completionData, setCompletionData] = useState<CompletionData | null>(null);

    // Initialize editableExercises and performed when workout changes
    useEffect(() => {
        if (!resumeLoaded || (resumeSessionId && editableExercises.length > 0)) return;

        if (workout && initialEditableExercises.length > 0 && editableExercises.length === 0) {
            const exercises = initialEditableExercises.map((e) => ({ ...e }));
            setEditableExercises(exercises);

            const initialPerformed = exercises.map((ex) => (ex.sets || []).map(() => ({ reps: "" as PerformedVal, weight: "" as PerformedVal })));
            setPerformed(initialPerformed);
        }
    }, [workout, resumeLoaded, resumeSessionId, initialEditableExercises, editableExercises.length]);

    // Restore session state
    useEffect(() => {
        if (!resumeSessionId || resumeLoaded) return;

        (async () => {
            try {
                const session = await getActiveSession(resumeSessionId);
                if (session) {
                    sessionIdRef.current = session.sessionId;

                    const restoredExercises: EditExercise[] = session.exercises.map((ex) => ({
                        name: ex.exerciseName,
                        exerciseId: ex.exerciseId || undefined,
                        order: ex.order,
                        sets: ex.sets.map((s) => ({ reps: s.reps, weight: s.weight })),
                    }));
                    setEditableExercises(restoredExercises);

                    const restoredPerformed = session.exercises.map((ex) =>
                        ex.sets.map((s) => ({
                            reps: (s.reps > 0 ? s.reps : "") as PerformedVal,
                            weight: (s.weight > 0 ? s.weight : "") as PerformedVal,
                        }))
                    );
                    setPerformed(restoredPerformed);
                }
            } catch (err) {
                console.error("Failed to restore session:", err);
            } finally {
                setResumeLoaded(true);
            }
        })();
    }, [resumeSessionId, resumeLoaded]);

    const addSet = (exIndex: number) => {
        setEditableExercises((prev) => {
            const copy = prev.map((e) => ({ ...e, sets: e.sets ? [...e.sets] : [] }));
            const target = copy[exIndex];
            if (!target) return prev;
            target.sets = target.sets || [];
            target.sets.push({ reps: undefined, weight: undefined });
            return copy;
        });

        setPerformed((prev) => {
            const copy = prev.map((arr) => arr.slice());
            if (!copy[exIndex]) copy[exIndex] = [];
            copy[exIndex].push({ reps: "", weight: "" });
            return copy;
        });
    };

    const removeSet = (exIndex: number, setIndex: number) => {
        setEditableExercises((prev) => {
            const copy = prev.map((e) => ({ ...e, sets: e.sets ? [...e.sets] : [] }));
            const target = copy[exIndex];
            if (!target || !target.sets) return prev;
            target.sets.splice(setIndex, 1);
            return copy;
        });

        setPerformed((prev) => {
            const copy = prev.map((arr) => arr.slice());
            if (!copy[exIndex]) return copy;
            copy[exIndex].splice(setIndex, 1);
            return copy;
        });
    };

    const addExercise = (exerciseId?: string, exerciseName?: string) => {
        const name = exerciseName ?? exerciseId ?? "New Exercise";
        const newEx: EditExercise = {
            name,
            exerciseId: exerciseId || undefined,
            sets: Array.from({ length: 3 }).map(() => ({ reps: undefined, weight: undefined })),
        };
        setEditableExercises((prev) => [...prev, newEx]);
        setPerformed((prev) => [...prev, (newEx.sets || []).map(() => ({ reps: "", weight: "" }))]);
    };

    const removeExercise = (exIndex: number) => {
        setEditableExercises((prev) => {
            const copy = prev.map((e) => ({ ...e, sets: e.sets ? [...e.sets] : [] }));
            copy.splice(exIndex, 1);
            return copy;
        });
        setPerformed((prev) => {
            const copy = prev.map((arr) => arr.slice());
            copy.splice(exIndex, 1);
            return copy;
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setEditableExercises((items) => {
                const oldIndex = items.findIndex((item) => (item.exerciseId ?? item.name) === active.id);
                const newIndex = items.findIndex((item) => (item.exerciseId ?? item.name) === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });

            setPerformed((prev) => {
                const performedCopy = [...prev];
                const oldIndex = editableExercises.findIndex((item) => (item.exerciseId ?? item.name) === active.id);
                const newIndex = editableExercises.findIndex((item) => (item.exerciseId ?? item.name) === over?.id);
                return arrayMove(performedCopy, oldIndex, newIndex);
            });
        }
    };

    const updatePerformed = (exIndex: number, setIndex: number, field: "reps" | "weight", value: string) => {
        setPerformed((prev) => {
            const copy = prev.map((arr) => arr.slice());
            const parsed = value === "" ? "" : Number(value);
            if (!copy[exIndex]) copy[exIndex] = [];
            copy[exIndex][setIndex] = { ...copy[exIndex][setIndex], [field]: parsed };
            return copy;
        });
    };

    const _createSessionObject = (ended?: boolean) => {
        if (!workout) return null;
        const now = new Date().toISOString();
        return {
            sessionId: sessionIdRef.current,
            workoutId: (workout as any).id ?? workoutId,
            workoutName: (workout as any).name ?? (workout as Workout).name,
            startedAt,
            ...(ended && { endedAt: now }),
            lastSaved: now,
            exercises: editableExercises.map((ex, exIdx) => ({
                exerciseId: ex.exerciseId ?? "",
                exerciseName: ex.name,
                order: ex.order ?? exIdx,
                sets: (ex.sets || []).map((planned, sIdx) => {
                    const perf = performed[exIdx] && performed[exIdx][sIdx] ? performed[exIdx][sIdx] : ({} as { reps?: number | ""; weight?: number | "" });
                    const reps = typeof perf.reps === "number" && !Number.isNaN(perf.reps) ? perf.reps : 0;
                    const weight = typeof perf.weight === "number" && !Number.isNaN(perf.weight) ? perf.weight : 0;
                    return { reps, weight, completed: reps > 0 };
                }),
            })),
        } as ActiveSession;
    };

    // Autosave
    useEffect(() => {
        if (!workout || editableExercises.length === 0) return;

        const id = setTimeout(async () => {
            const session = _createSessionObject();
            if (!session) return;
            try {
                await saveActiveSession(session);
            } catch (e) {
                console.error("Autosave failed", e);
            }
        }, 800);

        return () => clearTimeout(id);
    }, [performed, editableExercises, workout]);

    // Save on page leave
    useEffect(() => {
        if (!workout) return;

        const saveNow = () => {
            const session = _createSessionObject();
            if (session) saveActiveSession(session).catch(() => { });
        };

        const onVisibility = () => {
            if (document.visibilityState === "hidden") saveNow();
        };

        window.addEventListener("pagehide", saveNow);
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("beforeunload", saveNow);

        return () => {
            window.removeEventListener("pagehide", saveNow);
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("beforeunload", saveNow);
        };
    }, [performed, editableExercises, workout]);

    const handleEndWorkout = async () => {
        if (finishing) return;
        setFinishing(true);
        try {
            const session = _createSessionObject(true);
            if (!session) return;

            await saveActiveSession(session);

            if (navigator.onLine) {
                try {
                    const res = await fetch("/api/sessions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(session),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setCompletionData({ sessionId: data.id, prs: data.prs ?? [] });
                        return; // modal will handle navigation
                    } else {
                        await queueSync(session);
                    }
                } catch {
                    await queueSync(session);
                }
            } else {
                await queueSync(session);
            }

            // Offline path: no PR detection, go straight to dashboard
            try { await deleteActiveSession(session.sessionId); } catch { }
            router.push("/dashboard");
        } catch (err) {
            console.error("Failed to end workout", err);
            alert("Failed to save workout session.");
            setFinishing(false);
        }
    };

    const clearCompletion = async () => {
        // Always use the client-side session ID (sessionIdRef) to delete from IndexedDB,
        // since that's the key the session was stored under — NOT the server-side DB id.
        try { await deleteActiveSession(sessionIdRef.current); } catch { }
        router.push("/dashboard");
    };

    return {
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
    };
}
