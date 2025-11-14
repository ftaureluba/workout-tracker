"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveWorkoutsToCache, getAllWorkoutsFromCache, getAllActiveSessions, deleteActiveSession, } from "@/lib/indexdb";
import type { Workout, ActiveSession } from "@/lib/types";
import { ResumeSessionCard } from "./resumeSessionCard";
import RoutineEditor from "@/app/components/routine-editor";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/app/ui/card";
import { Menu, User, Plus, Dumbbell, Edit3 } from "lucide-react";

interface DashboardClientProps {
  workouts: Workout[];
  userId: string;
}

export function DashboardClient({ workouts: serverWorkouts }: DashboardClientProps) {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>(serverWorkouts);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isCaching, setIsCaching] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | undefined>();

  const handleWorkoutClick = (routine: Workout) => {
    // Open the start-workout confirmation modal
    setStartWorkout(routine);
    setStartModalOpen(true);
  };

  const [startModalOpen, setStartModalOpen] = useState(false);
  const [startWorkout, setStartWorkout] = useState<Workout | null>(null);

  const openEditorFor = (routine: Workout) => {
    // stop the start modal and open the editor instead
    setSelectedWorkout(routine);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedWorkout(undefined);
  };

  useEffect(() => {
    const cacheData = async () => {
      try {
        await saveWorkoutsToCache(serverWorkouts);
        console.log("✅ Workouts cached to IndexedDB");
      } catch (error) {
        console.error("❌ Failed to cache workouts:", error);
      } finally {
        setIsCaching(false);
      }
    };

    cacheData();
  }, [serverWorkouts]);

  // Check for unfinished workouts
  useEffect(() => {
    const loadActiveSessions = async () => {
      try {
        const sessions = await getAllActiveSessions();
        setActiveSessions(sessions);

        if (sessions.length > 0) {
          console.log(`📋 Found ${sessions.length} unfinished workout(s)`);
        }
      } catch (error) {
        console.error("❌ Failed to load active sessions:", error);
      }
    };

    loadActiveSessions();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      console.log("🌐 Back online");
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log("📴 Offline mode");
    };

    // Set initial state
    updateOnlineStatus();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load from cache if offline
  useEffect(() => {
    if (!isOnline) {
      const loadCachedWorkouts = async () => {
        try {
          const cached = await getAllWorkoutsFromCache();
          if (cached.length > 0) {
            setWorkouts(cached);
            console.log("📦 Loaded workouts from cache");
          }
        } catch (error) {
          console.error("❌ Failed to load cached workouts:", error);
        }
      };

      loadCachedWorkouts();
    }
  }, [isOnline]);

  // navigate to a workout (used elsewhere when starting a routine)
  // removed unused local references to satisfy linting

  const resumeSession = (sessionId: string) => {
    router.push(`/workout/resume/${sessionId}`);
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await deleteActiveSession(sessionId);
      setActiveSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      console.log(`🗑️ Deleted active session ${sessionId}`);
    } catch (err) {
      console.error('Failed to delete active session', err);
    }
  };

  const startBlankWorkout = () => {
    setSelectedWorkout(undefined);
    setIsModalOpen(true);
  };

  const handleStartConfirm = (w: Workout | null) => {
    // navigate to workout page to start a fresh session
    if (!w) {
      // close modal and fall back to opening a blank editor (no dedicated new workout route)
      setStartModalOpen(false);
      setStartWorkout(null);
      setSelectedWorkout(undefined);
      setIsModalOpen(true);
      return;
    }
    // close modal then navigate
    setStartModalOpen(false);
    setStartWorkout(null);
    router.push(`/workout/${w.id}`);
  };

  const handleSavedWorkout = (w: Workout) => {
    setWorkouts((prev) => {
      const found = prev.find((p) => p.id === w.id);
      if (found) {
        return prev.map((p) => (p.id === w.id ? w : p));
      }
      return [w, ...prev];
    });
  };

  return (
    <div className="min-h-screen">
      <header className="w-full border-b bg-card/30 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <Menu className="h-6 w-6" />
          </Button>

          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
            <User className="h-6 w-6" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-24 max-w-4xl mx-auto">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4 flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold">You&apos;re offline</p>
              <p className="text-sm">Changes will sync when you reconnect</p>
            </div>
          </div>
        )}

        {/* Caching Status */}
        {isCaching && (
          <div className="bg-blue-100 border border-blue-400 text-blue-800 px-4 py-3 rounded mb-4">
            <p className="text-sm">📦 Caching workouts for offline use...</p>
          </div>
        )}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Workouts</h1>
          <p className="text-muted-foreground text-sm">Choose a routine or start a free workout</p>
        </div>

        {/* Unfinished Workouts */}
        {activeSessions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-orange-600 mb-3 flex items-center gap-2">
              <span>⚡</span>
              Resume Workout
            </h2>
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <ResumeSessionCard key={session.sessionId} session={session} onResume={resumeSession} onDelete={deleteSession} />
              ))}
            </div>
          </div>
        )}

        {/* Routine Cards */}
        <div className="grid gap-4 mb-6">
          {workouts.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg shadow">
              <p className="text-card-foreground text-lg mb-2">No workouts yet</p>
              <p className="text-muted-foreground">Create your first workout to get started!</p>
            </div>
          ) : (
            workouts.map((routine) => (
              <Card
                key={routine.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleWorkoutClick(routine)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">{routine.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>{routine.workoutExercises.length} exercises</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">-</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditorFor(routine);
                        }}
                        aria-label="Edit routine"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Last performed: -</div>
                </CardContent>
              </Card>
            ))
          )}

          {/* Create New Routine Card */}
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-dashed border-2"
            onClick={startBlankWorkout}
          >
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Plus className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-muted-foreground font-medium">Create New Routine</span>
            </CardContent>
          </Card>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/30 backdrop-blur-sm border-t">
        <Button className="w-full h-12 text-base font-semibold" size="lg" onClick={startBlankWorkout}>
          <Dumbbell className="h-5 w-5 mr-2" />
          Start Empty Workout
        </Button>
      </div>

      {isModalOpen && (
        <RoutineEditor
          isOpen={isModalOpen}
          onClose={closeModal}
          initial={selectedWorkout}
          onSaved={(w) => handleSavedWorkout(w)}
          onDeleted={(id: string) => setWorkouts((prev) => prev.filter((p) => p.id !== id))}
        />
      )}
      {startModalOpen && startWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setStartModalOpen(false); setStartWorkout(null); }} />
          <div className="bg-card text-card-foreground rounded-lg p-4 w-full max-w-md z-10 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Start Workout</h3>
              <div>
                <Button variant="ghost" onClick={() => { setStartModalOpen(false); setStartWorkout(null); }}>Cancel</Button>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-lg font-semibold">{startWorkout.name}</div>
              <div className="text-sm text-muted-foreground">{startWorkout.workoutExercises.length} exercises</div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setStartModalOpen(false); setStartWorkout(null); }}>Cancel</Button>
              <Button onClick={() => handleStartConfirm(startWorkout)}>Start</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}