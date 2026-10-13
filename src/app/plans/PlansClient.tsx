"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, Dumbbell } from "lucide-react";
import { Badge } from "@/app/ui/badge";
import { Button } from "@/app/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/ui/card";
import type { ActiveEnrollmentSummary, Plan } from "@/lib/types";
import PlansNavigation from "./PlansNavigation";

interface PlansClientProps {
  plans: Plan[];
  activeEnrollments: ActiveEnrollmentSummary[];
}

function formatProgress(enrollment: ActiveEnrollmentSummary) {
  const total = Math.max(enrollment.totalSessions, 1);
  const completed = Math.min(enrollment.completedSessions, total);
  const percent = Math.round((completed / total) * 100);
  return { completed, total, percent };
}

export default function PlansClient({ plans, activeEnrollments }: PlansClientProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <PlansNavigation />
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Strength Plans
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Training plans</h1>
        </div>
        <Button asChild>
          <Link href="#plan-library">Browse plan library</Link>
        </Button>
      </header>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="text-xl font-semibold">Active enrollments</h2>
        </div>

        {activeEnrollments.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-sm text-muted-foreground">
                You are not enrolled in any training plans yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeEnrollments.map(({ enrollment, plan, nextSession, totalSessions, completedSessions }) => {
              const { percent } = formatProgress({ enrollment, plan, nextSession, totalSessions, completedSessions });

              return (
                <Card key={enrollment.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {plan.name}
                        </p>
                        <CardTitle className="mt-1 text-lg">Week {enrollment.currentWeek}</CardTitle>
                      </div>
                      <Badge variant="secondary">{percent}% complete</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Progress</span>
                        <span>
                          {completedSessions}/{totalSessions} sessions
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock3 className="h-4 w-4 text-primary" />
                        <span>Next session</span>
                      </div>
                      <p className="mt-2 text-sm text-foreground">
                        {nextSession?.sessionLabel ?? "Plan updated"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{plan.durationWeeks} week plan</span>
                      </div>
                      <Button asChild size="sm">
                        <Link href={`/plans/${plan.id}`}>Open</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section id="plan-library" className="scroll-mt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" />
          <h2 className="text-xl font-semibold">Browse plans</h2>
        </div>

        {plans.length === 0 ? (
          <Card>
            <CardContent className="space-y-2 py-6">
              <p className="font-medium">No plans in the library yet</p>
              <p className="text-sm text-muted-foreground">
                Add the bundled plans to your configured database with <code>npm run db:seed:plans</code>.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className="flex h-full flex-col justify-between">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {plan.isPublic ? <Badge>Public</Badge> : <Badge variant="secondary">Private</Badge>}
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {plan.description ?? "Structured strength plan with weekly progressions and individualized targets."}
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-1">{plan.durationWeeks} weeks</span>
                    <span className="rounded-full bg-muted px-2 py-1">{plan.sessionsPerWeek} sessions/week</span>
                  </div>

                  <Button asChild className="w-full">
                    <Link href={`/plans/${plan.id}`}>View plan</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
