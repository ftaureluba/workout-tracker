"use client";

import React, { useEffect, useState } from "react";
import { getWorkoutFromCache, saveActiveSession, queueSync, deleteActiveSession } from "@/lib/indexdb";
import ExercisePicker from '@/app/components/exercise-picker';
import RestTimer from '@/app/components/rest-timer';
import { useToast } from '@/app/ui/use-toast';
import PushStatus from '@/app/components/push-status';
import { subscribeToPush, getExistingSubscription, unsubscribePush, requestNotificationPermission } from '@/lib/push';
import { Button } from '@/app/ui/button';
import { Menu } from 'lucide-react';
import { useSidebar } from '@/lib/sidebar';
import { useRouter } from "next/navigation";
import type { Workout, WorkoutExercise, ActiveSession } from "@/lib/types";

interface Props {
  workoutId: string;
}

type WorkoutLike =
  | (Workout & { exercises?: undefined })
  | ({ name: string; exercises: { name: string; sets?: { reps: number; weight: number }[] }[] });

export default function WorkoutClient({ workoutId }: Props) {
  const { toggle: toggleSidebar } = useSidebar();
  const [workout, setWorkout] = useState<WorkoutLike | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track when the workout started so we can store it in the session
  const [startedAt] = useState(() => new Date().toISOString());

  const router = useRouter();

  // persistent session id used for autosave and final save
  const sessionIdRef = React.useRef<string>(((): string => {
    try {
      const maybeCrypto = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
      return typeof maybeCrypto?.randomUUID === 'function' ? maybeCrypto.randomUUID() : String(Date.now());
    } catch {
      return String(Date.now());
    }
  })());

  // Performed values (user inputs) shaped like exercises -> sets -> { reps, weight }
  type PerformedVal = number | "";
  const [performed, setPerformed] = useState<{ reps?: PerformedVal; weight?: PerformedVal }[][]>([]);

  // Type guards (moved up so hooks can run unconditionally)
  function hasExercisesArray(x: unknown): x is { name: string; exercises: { name: string; sets?: { reps: number; weight: number }[] }[] } {
    return typeof x === "object" && x !== null && Array.isArray((x as Record<string, unknown>)['exercises']);
  }

  function hasWorkoutExercises(x: unknown): x is Workout {
    return typeof x === "object" && x !== null && Array.isArray((x as Record<string, unknown>)['workoutExercises']);
  }

  // Normalize exercises: either workout.exercises (client shape) or workout.workoutExercises
  const normalizedExercises: { name: string; sets?: { reps?: number; weight?: number }[]; exerciseId?: string; order?: number }[] =
    hasExercisesArray(workout)
      ? workout.exercises
      : hasWorkoutExercises(workout)
      ? workout.workoutExercises.map((we: WorkoutExercise) => {
          // determine number of sets from plannedSets (if present) else default to 3
          const setsCount = typeof we.plannedSets === "number" && we.plannedSets > 0 ? we.plannedSets : 3;
          const sets = Array.from({ length: setsCount }).map(() => ({
            reps: typeof we.plannedReps === "number" ? we.plannedReps : undefined,
            weight: typeof we.plannedWeight === "number" ? we.plannedWeight : undefined,
          }));

          return { name: we.exercise?.name ?? "Unnamed exercise", sets, exerciseId: we.exerciseId, order: we.order };
        })
      : [];

  // Editable exercises state: allows adding/removing sets/exercises on the fly
  type EditExercise = { name: string; sets?: { reps?: number; weight?: number }[]; exerciseId?: string; order?: number };
  const [editableExercises, setEditableExercises] = useState<EditExercise[]>([]);

  // Exercise picker modal open state
  const [pickerOpen, setPickerOpen] = useState(false);
  const { toast } = useToast();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [testTimerRunning, setTestTimerRunning] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sub = await getExistingSubscription();
        if (mounted) setPushEnabled(!!sub);
      } catch (e) {
        console.debug('Failed to check subscription', e);
      }
    })();
    return () => { mounted = false };
  }, []);

  // Initialize editableExercises when workout (normalizedExercises) changes
  useEffect(() => {
    setEditableExercises(normalizedExercises.map((e) => ({ ...e })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // Try IndexedDB first
        const cached = await getWorkoutFromCache(workoutId);
        if (mounted && cached) {
          setWorkout(cached as WorkoutLike);
        }

        // If we have a cached workout, skip the network fetch to avoid
        // unnecessary /api/workouts requests. The cache is the primary
        // source of truth for offline-resilience. Only fetch from the
        // network when we're online and there's no cached copy.
        if (navigator.onLine) {
          if (!cached) {
            try {
              const res = await fetch(`/api/workouts/${workoutId}`);
              if (res.ok) {
                const data = await res.json();
                if (mounted) setWorkout(data as WorkoutLike);
              }
            } catch (e) {
              // network fetch failed, keep cached value if any
              console.debug("Network fetch failed for workout", e);
            }
          } else {
            // cached present -> intentionally skip network call
          }
        } else {
          // offline and no cached workout
          if (!cached) {
            setError("Offline and no cached workout available.");
          }
        }
      } catch (err: unknown) {
        console.error(err);
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [workoutId]);

  // Initialize performed state when editableExercises changes
  useEffect(() => {
    type PerformedVal = number | "";
    if (!editableExercises || editableExercises.length === 0) {
      setPerformed([]);
      return;
    }

    const initial = editableExercises.map((ex) => (ex.sets || []).map(() => ({ reps: "" as PerformedVal, weight: "" as PerformedVal })));
    setPerformed(initial);
  }, [editableExercises]);

    // Handlers to add/remove sets and exercises (moved above the render/returns so hooks are unconditional)
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
      const newEx: EditExercise = { name, exerciseId: exerciseId || undefined, sets: Array.from({ length: 3 }).map(() => ({ reps: undefined, weight: undefined })) };
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

    // exercise picker modal will fetch exercises itself; open/close controlled by pickerOpen

  // Autosave performed values (debounced) to IndexedDB so data persists if user closes the app
  useEffect(() => {
    if (!workout) return;

    const id = setTimeout(async () => {
      const now = new Date().toISOString();
      const session = {
        sessionId: sessionIdRef.current,
        workoutId: ((workout as Record<string, unknown>)['id'] as string) ?? workoutId,
        workoutName: ((workout as Record<string, unknown>)['name'] as string) ?? (workout as Workout).name,
        startedAt,
        lastSaved: now,
        exercises: editableExercises.map((ex, exIdx) => ({
          exerciseId: ex.exerciseId ?? "",
          exerciseName: ex.name,
          order: ex.order ?? exIdx,
          sets: (ex.sets || []).map((planned, sIdx) => {
            const perf = performed[exIdx] && performed[exIdx][sIdx] ? performed[exIdx][sIdx] : {} as { reps?: number | ""; weight?: number | "" };
            const reps = typeof perf.reps === 'number' && !Number.isNaN(perf.reps) ? perf.reps : (planned?.reps ?? 0);
            const weight = typeof perf.weight === 'number' && !Number.isNaN(perf.weight) ? perf.weight : (planned?.weight ?? 0);
            return { reps, weight, completed: reps > 0 };
          })
        }))
      } as ActiveSession;

      try {
        await saveActiveSession(session);
      } catch (e) {
        console.error('Autosave failed', e);
      }
    }, 800);

    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performed, editableExercises, workout]);

  // Best-effort save on pagehide/visibilitychange/beforeunload
  useEffect(() => {
    if (!workout) return;

    const saveNow = () => {
      const now = new Date().toISOString();
      const session = {
        sessionId: sessionIdRef.current,
        workoutId: ((workout as Record<string, unknown>)['id'] as string) ?? workoutId,
        workoutName: ((workout as Record<string, unknown>)['name'] as string) ?? (workout as Workout).name,
        startedAt,
        lastSaved: now,
  exercises: editableExercises.map((ex, exIdx) => ({
          exerciseId: ex.exerciseId ?? "",
          exerciseName: ex.name,
          order: ex.order ?? exIdx,
          sets: (ex.sets || []).map((planned, sIdx) => {
            const perf = performed[exIdx] && performed[exIdx][sIdx] ? performed[exIdx][sIdx] : {} as { reps?: number | ""; weight?: number | "" };
            const reps = typeof perf.reps === 'number' && !Number.isNaN(perf.reps) ? perf.reps : (planned?.reps ?? 0);
            const weight = typeof perf.weight === 'number' && !Number.isNaN(perf.weight) ? perf.weight : (planned?.weight ?? 0);
            return { reps, weight, completed: reps > 0 };
          })
        }))
      } as ActiveSession;

      // fire and forget
      saveActiveSession(session).catch(() => {});
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };

    window.addEventListener('pagehide', saveNow);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', saveNow);

    return () => {
      window.removeEventListener('pagehide', saveNow);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', saveNow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performed, editableExercises, workout]);

  if (loading) {
    return <div className="p-4">Loading workout…</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  if (!workout) {
    return <div className="p-4">Workout not found.</div>;
  }

  // (performed state initialized earlier from the raw `workout` object)

  const updatePerformed = (exIndex: number, setIndex: number, field: "reps" | "weight", value: string) => {
    setPerformed((prev) => {
      const copy = prev.map((arr) => arr.slice());
      const parsed = value === "" ? "" : Number(value);
      if (!copy[exIndex]) copy[exIndex] = [];
      copy[exIndex][setIndex] = { ...copy[exIndex][setIndex], [field]: parsed };
      return copy;
    });
  };



  const handleEndWorkout = async () => {
    try {
  // Reuse the persistent session id (generated when the component mounted)
  // to avoid creating a new one here and to ensure autosave/final save use
  // the same id. Also avoids 'Illegal invocation' when extracting
  // crypto.randomUUID out of the crypto object and calling it unbound.
  const sessionId = sessionIdRef.current;
      const now = new Date().toISOString();

      const session: ActiveSession = {
        sessionId,
        workoutId: ((workout as Record<string, unknown>)['id'] as string) ?? workoutId,
        workoutName: ((workout as Record<string, unknown>)['name'] as string) ?? (workout as Workout).name,
        startedAt,
        lastSaved: now,
  exercises: editableExercises.map((ex, exIdx) => ({
          exerciseId: ex.exerciseId ?? "",
          exerciseName: ex.name,
          order: ex.order ?? exIdx,
          sets: (ex.sets || []).map((planned, sIdx) => {
            const perf = performed[exIdx] && performed[exIdx][sIdx] ? performed[exIdx][sIdx] : {} as { reps?: number | ""; weight?: number | "" };
            const reps = typeof perf.reps === 'number' && !Number.isNaN(perf.reps) ? perf.reps : (planned?.reps ?? 0);
            const weight = typeof perf.weight === 'number' && !Number.isNaN(perf.weight) ? perf.weight : (planned?.weight ?? 0);
            return { reps, weight, completed: reps > 0 };
          })
        }))
      };

      // Save locally
      await saveActiveSession(session);

      // Try to sync to server; if it fails, queue for later
      if (navigator.onLine) {
        try {
          const res = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(session),
          });

          if (!res.ok) {
            await queueSync(session);
          }
        } catch (e) {
          console.error(e);
          await queueSync(session);
        }
      } else {
        await queueSync(session);
      }

      // Remove the active session entry now that the workout is finished
      try {
        await deleteActiveSession(session.sessionId);
      } catch (e) {
        console.debug('Failed to delete active session locally', e);
      }

      // navigate back to dashboard after finishing
      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to end workout', err);
      alert('Failed to save workout session.');
    }
  };

  return (
    <>
    <header className="w-full border-b bg-card/30 backdrop-blur-sm">
      <div className="flex items-center justify-between p-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={() => toggleSidebar()}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold mb-4 text-center">{((workout as Record<string, unknown>)['name'] as string) ?? (workout as Workout).name}</h1>
      

        <div />
      </div>
    </header>
    <main className="p-4 max-w-md mx-auto w-full">
      <div className="flex justify-end mb-3">
        <button onClick={() => setPickerOpen(true)} className="px-3 py-1 bg-blue-600 text-white rounded mr-2">+ Add exercise</button>
        <button
          onClick={async () => {
            try {
              // request permission
              if ('Notification' in window) {
                const perm = await Notification.requestPermission();
                if (perm !== 'granted') {
                  toast({ title: 'Notifications blocked', description: 'Permission not granted' });
                  return;
                }
              }
              toast({ title: 'Demo timer started', description: 'Will notify in 5 seconds' });
              setTestTimerRunning(true);

              // schedule demo notification in 5s
              setTimeout(async () => {
                try {
                  // Try to show via service worker (better when backgrounded)
                  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    const reg = await navigator.serviceWorker.ready;
                    await reg.showNotification('Demo timer', { body: '5 seconds are up', icon: '/icons/icon-192x192.png' });
                  } else if ('Notification' in window) {
                    new Notification('Demo timer', { body: '5 seconds are up', icon: '/icons/icon-192x192.png' });
                  }
                  toast({ title: 'Demo timer finished', description: 'Notification sent' });
                  setTestTimerRunning(false);
                } catch (err) {
                  console.error('Demo notify failed', err);
                  toast({ title: 'Demo failed', description: String(err) });
                  setTestTimerRunning(false);
                }
              }, 5000);
            } catch (err) {
              console.error('Test timer failed', err);
              toast({ title: 'Error', description: 'Failed to start demo timer' });
            }
          }}
          className={"px-3 py-1 text-white rounded " + (testTimerRunning ? 'bg-green-600' : 'bg-indigo-600')}
        >
          Test timer
        </button>
        <div className="ml-4">
          <PushStatus />
        </div>
        <button
          onClick={async () => {
            try {
              if (!pushEnabled) {
                // enable: request permission then subscribe
                const perm = await requestNotificationPermission();
                if (perm !== 'granted') {
                  toast({ title: 'Notifications blocked', description: 'Permission not granted' });
                  return;
                }
                const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string | undefined;
                if (!vapidKey) {
                  toast({ title: 'VAPID missing', description: 'Set NEXT_PUBLIC_VAPID_PUBLIC_KEY in env' });
                  return;
                }
                const sub = await subscribeToPush(vapidKey);
                if (sub) {
                  // Send subscription to server for debugging/persistence
                  try {
                    await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub }) });
                    toast({ title: 'Subscribed to push', description: 'Push enabled and sent to server' });
                  } catch (e) {
                    console.error('Failed to send subscription to server', e);
                    toast({ title: 'Subscribed locally', description: 'Subscription obtained but failed to POST to server' });
                  }
                  setPushEnabled(true);
                } else {
                  toast({ title: 'Subscribe failed', description: 'Service worker not available or registration failed. In development this is expected — run a production build (`npm run build && npm run start`) or test the deployed site and check the browser console for details.' });
                }
              } else {
                const ok = await unsubscribePush();
                if (ok) {
                  toast({ title: 'Unsubscribed', description: 'Push disabled' });
                  setPushEnabled(false);
                } else {
                  toast({ title: 'Unsubscribe failed', description: 'Could not unsubscribe' });
                }
              }
            } catch (err) {
              console.error('Toggle push failed', err);
              toast({ title: 'Error', description: 'Failed to toggle push' });
            }
          }}
          className="ml-3 px-3 py-1 bg-gray-800 text-white rounded"
        >
          {pushEnabled ? 'Disable push' : 'Enable push'}
        </button>
      </div>
     <div className="space-y-6">
        {editableExercises.map((exercise, idx) => (
          <section key={idx} className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 font-semibold">{exercise.name}</div>
              <button onClick={() => removeExercise(idx)} className="text-sm text-red-500 ml-2">Remove Exercise</button>
            </div>
            <div className="space-y-2">
                {exercise.sets && exercise.sets.length > 0 ? (
                exercise.sets.map((set, setIdx) => (
                  <div
                    key={setIdx}
                    className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Set {setIdx + 1}</span>
                      <button onClick={() => removeSet(idx, setIdx)} className="text-sm text-red-500">–</button>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        className="w-14 px-2 py-1 rounded border text-center text-base"
                        value={performed?.[idx]?.[setIdx]?.reps ?? ""}
                        onChange={(e) => updatePerformed(idx, setIdx, 'reps', e.target.value)}
                        min={0}
                        aria-label="Reps"
                        placeholder={typeof set.reps === 'number' ? String(set.reps) : ''}
                      />
                      <span className="text-sm text-muted-foreground">reps</span>

                      <input
                        type="number"
                        className="w-16 px-2 py-1 rounded border text-center text-base"
                        value={performed?.[idx]?.[setIdx]?.weight ?? ""}
                        onChange={(e) => updatePerformed(idx, setIdx, 'weight', e.target.value)}
                        min={0}
                        aria-label="Weight"
                        placeholder={typeof set.weight === 'number' ? String(set.weight) : ''}
                      />
                      <span className="text-sm text-muted-foreground">kg</span>
                    
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-background rounded-lg border text-sm text-muted-foreground">No sets available</div>
              )}
              <div className="mt-2">
                <button onClick={() => addSet(idx)} className="text-sm text-blue-600">+ Add set</button>
              </div>
            </div>
          </section>
        ))}
        <div className="pt-2">
          <button onClick={() => addExercise()} className="text-sm text-green-600">+ Add exercise</button>
        </div>
      </div>
    </main>
    {/* Fixed End Workout button */}
    {/* Exercise picker modal */}
    <ExercisePicker
      isOpen={pickerOpen}
      onClose={() => setPickerOpen(false)}
  onSelect={(ex: { id: string; name: string }) => { addExercise(ex.id, ex.name); setPickerOpen(false); }}
    />

    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
      <button onClick={handleEndWorkout} 
      style={{'backgroundColor' : "#1C6E8C"}}
      className="w-full h-12 text-white font-semibold rounded-lg">End Workout</button>
    </div>
    </>
  );
}
