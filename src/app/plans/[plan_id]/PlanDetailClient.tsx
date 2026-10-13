"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarRange, CheckCircle2, Play } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/app/ui/badge";
import { Button } from "@/app/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/ui/card";
import type { PlanDetail } from "@/lib/types";
import PlansNavigation from "../PlansNavigation";

interface PlanDetailClientProps {
  plan: PlanDetail;
  alreadyEnrolled: boolean;
}

export default function PlanDetailClient({ plan, alreadyEnrolled }: PlanDetailClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEnroll = async () => {
    setIsSubmitting(true);
    try {
      const defaults = new Map<string, number>();
      for (const week of plan.weeks) {
        for (const session of week.sessions) {
          for (const exercise of session.exercises) {
            const fallback = exercise.prescribedWeightAbs ?? 100;
            defaults.set(exercise.exerciseId, fallback);
          }
        }
      }

      const exerciseMaxes = Array.from(defaults.entries()).map(([exerciseId, e1rm]) => ({
        exerciseId,
        weightKg: e1rm,
        reps: 1,
        e1rm,
      }));

      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, exerciseMaxes }),
      });

      if (!response.ok) {
        throw new Error("Unable to enroll in this plan.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Enrollment failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <PlansNavigation />
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" className="px-0">
          <Link href="/plans" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to plans
          </Link>
        </Button>

        {alreadyEnrolled ? (
          <Badge className="gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Enrolled
          </Badge>
        ) : (
          <Button onClick={handleEnroll} disabled={isSubmitting}>
            <Play className="h-4 w-4" />
            {isSubmitting ? "Enrolling..." : "Enroll in plan"}
          </Button>
        )}
      </div>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{plan.durationWeeks} weeks</Badge>
          <Badge variant="secondary">{plan.sessionsPerWeek} sessions/week</Badge>
          {plan.isPublic ? <Badge>Public</Badge> : <Badge variant="outline">Private</Badge>}
        </div>

        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Strength programme
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{plan.name}</h1>
        </div>

        <p className="max-w-2xl text-sm text-muted-foreground">
          {plan.description ?? "A structured periodized strength foundation with clear weekly progressions and exercise targets."}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plan.weeks.map((week) => (
          <Card key={week.id} className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">Week {week.weekNumber}</CardTitle>
                <CalendarRange className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {week.sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions defined for this week.</p>
              ) : (
                week.sessions.map((session) => (
                  <div key={session.id} className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-sm font-medium">{session.sessionLabel}</p>

                    <div className="mt-3 space-y-2">
                      {session.exercises.map((exercise) => (
                        <div key={exercise.id} className="rounded-md bg-background/80 p-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{exercise.exercise?.name ?? "Exercise"}</span>
                            <span className="text-muted-foreground">
                              {exercise.prescribedSets}×{exercise.prescribedReps}
                            </span>
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            {exercise.prescribedWeightPct != null
                              ? `📋 ${exercise.prescribedWeightPct * 100}% e1RM`
                              : exercise.prescribedWeightAbs != null
                                ? `📋 ${exercise.prescribedWeightAbs} kg`
                                : "📋 Target not specified"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
