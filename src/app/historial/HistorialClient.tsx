"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/app/ui/button";
import { Menu, Calendar, TrendingUp } from "lucide-react";
import { useSidebar } from "@/lib/sidebar";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/ui/tabs";
import { FrequencyData, ExerciseOption, getExerciseHistory, ExerciseHistoryPoint } from "@/app/actions/history";
import { FrequencyChart } from "@/components/history/FrequencyChart";
import { ExerciseSelector } from "@/components/history/ExerciseSelector";
import { ProgressChart } from "@/components/history/ProgressChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/ui/card";

type SessionItem = {
  id: string;
  workoutName?: string | null;
  createdAt?: string | null;
  exercisesCount?: number;
  durationMinutes?: number | null;
};

interface HistorialClientProps {
  sessions: SessionItem[];
  frequencyData: FrequencyData[];
  exercises: ExerciseOption[];
}

export default function HistorialClient({ sessions, frequencyData, exercises }: HistorialClientProps) {
  const { toggle } = useSidebar();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | undefined>();
  const [historyData, setHistoryData] = useState<ExerciseHistoryPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [metric, setMetric] = useState<"oneRM" | "volume" | "weight">("oneRM");

  const formatDate = (iso?: string | null) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  useEffect(() => {
    if (exercises.length > 0 && !selectedExerciseId) {
      // Don't auto-select to avoid unnecessary fetching on load if user stays on 'Log' tab,
      // but if we are on Analytics tab it might be nice. 
      // Let's leave it manual for now.
    }
  }, [exercises, selectedExerciseId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedExerciseId) {
        setHistoryData([]);
        return;
      }

      setLoadingHistory(true);
      try {
        const data = await getExerciseHistory(selectedExerciseId);
        setHistoryData(data);
      } catch (error) {
        console.error("Failed to fetch exercise history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchData();
  }, [selectedExerciseId]);

  const selectedExerciseName = exercises.find((e) => e.id === selectedExerciseId)?.name;

  return (
    <div className="min-h-screen pb-24">
      <header className="w-full border-b bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => toggle()}
              aria-label="Toggle sidebar"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="hidden sm:block text-lg font-semibold">Track Progress</div>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-5xl mx-auto">
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="analytics" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-2">
              <Calendar className="h-4 w-4" />
              Workout Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            {/* Consistency Chart */}
            <section>
              <FrequencyChart data={frequencyData} />
            </section>

            {/* Exercise Progress */}
            <section>
              <Card>
                <CardHeader>
                  <CardTitle>Exercise Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="w-full md:w-[300px]">
                      <ExerciseSelector
                        exercises={exercises}
                        selectedExerciseId={selectedExerciseId}
                        onSelect={setSelectedExerciseId}
                      />
                    </div>

                    <Tabs value={metric} onValueChange={(v) => setMetric(v as any)} className="w-full md:w-auto">
                      <TabsList className="grid grid-cols-3 w-full md:w-[300px]">
                        <TabsTrigger value="oneRM">1RM</TabsTrigger>
                        <TabsTrigger value="volume">Vol</TabsTrigger>
                        <TabsTrigger value="weight">Wgt</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="mt-4">
                    {loadingHistory ? (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground animate-pulse">
                        Loading data...
                      </div>
                    ) : selectedExerciseId ? (
                      <ProgressChart
                        data={historyData}
                        metric={metric}
                        title={selectedExerciseName || "Exercise History"}
                        description={`Tracking ${metric === "oneRM" ? "Estimated 1 Rep Max" : metric === "volume" ? "Volume" : "Max Weight"} over time`}
                      />
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground border rounded-md bg-muted/20 border-dashed">
                        Select an exercise above to view your progress
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          <TabsContent value="log">
            {sessions.length === 0 ? (
              <div className="p-12 text-center bg-card rounded-lg border border-dashed">
                <p className="text-muted-foreground mb-4">No past workouts recorded yet.</p>
                <Link href="/dashboard">
                  <Button>Start First Workout</Button>
                </Link>
              </div>
            ) : (
              <ul className="space-y-4">
                {sessions.map((s) => (
                  <li key={s.id} className="bg-card p-4 rounded-lg border hover:shadow-sm transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-lg text-primary">{s.workoutName ?? "Ad-hoc workout"}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span>{formatDate(s.createdAt)}</span>
                          <span>•</span>
                          <span>{s.exercisesCount ?? 0} exercises</span>
                          {s.durationMinutes != null && s.durationMinutes > 0 && (
                            <>
                              <span>•</span>
                              <span>{s.durationMinutes} min</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/workout/${s.id}?mode=view`}>View</Link>
                        </Button>
                        {/* Resume might not be appropriate for completed sessions, maybe 'Repeat'? 
                            Existing code had 'Resume' link to /workout/resume/id 
                            I'll leave 'Repeat' logic for now or just generic View 
                        */}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
