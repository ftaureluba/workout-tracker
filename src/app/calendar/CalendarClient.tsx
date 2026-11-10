"use client";

import { useMemo, useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { CalendarDays, Menu, Trophy } from "lucide-react";
import Link from "next/link";
import { Button } from "@/app/ui/button";
import { Calendar as MonthCalendar, CalendarDayButton } from "@/app/ui/calendar";
import { useSidebar } from "@/lib/sidebar";

type CompletedWorkout = {
  id: string;
  name: string;
  completedAt: string;
  hasPR: boolean;
};

export default function CalendarClient({
  workouts,
}: {
  workouts: CompletedWorkout[];
}) {
  const { toggle } = useSidebar();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const workoutDates = useMemo(
    () => workouts.map((workout) => parseISO(workout.completedAt)),
    [workouts]
  );
  const prDates = useMemo(
    () =>
      workouts
        .filter((workout) => workout.hasPR)
        .map((workout) => parseISO(workout.completedAt)),
    [workouts]
  );
  const selectedWorkouts = selectedDate
    ? workouts.filter((workout) =>
        isSameDay(parseISO(workout.completedAt), selectedDate)
      )
    : [];

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 w-full border-b bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={toggle}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Workout Calendar</h1>
            <p className="text-sm text-muted-foreground">Completed sessions</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <section className="rounded-lg border bg-card p-3 sm:p-5">
          <MonthCalendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{ workout: workoutDates, personalRecord: prDates }}
            components={{
              DayButton: (dayProps) => {
                const dateKey = format(dayProps.day.date, "yyyy-MM-dd");
                const hasWorkout = workouts.some(
                  (workout) =>
                    format(parseISO(workout.completedAt), "yyyy-MM-dd") === dateKey
                );
                const hasPR = workouts.some(
                  (workout) =>
                    workout.hasPR &&
                    format(parseISO(workout.completedAt), "yyyy-MM-dd") === dateKey
                );

                return (
                  <CalendarDayButton {...dayProps} className={`${dayProps.className ?? ""} relative`}>
                    {dayProps.children}
                    {hasWorkout && (
                      <span className="absolute bottom-1 flex items-center gap-0.5">
                        <span
                          className={`size-1.5 rounded-full ${hasPR ? "bg-amber-400" : "bg-primary"}`}
                        />
                        {hasPR && <Trophy className="size-2.5 text-amber-400" aria-hidden="true" />}
                        <span className="sr-only">
                          {hasPR ? "Workout with personal record" : "Completed workout"}
                        </span>
                      </span>
                    )}
                  </CalendarDayButton>
                );
              },
            }}
            className="mx-auto w-full max-w-xl"
            classNames={{ months: "w-full", month: "w-full", table: "w-full" }}
          />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t pt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" /> Workout
            </span>
            <span className="inline-flex items-center gap-2">
              <Trophy className="size-3.5 text-amber-400" /> Personal record
            </span>
          </div>
        </section>

        <section className="min-w-0 border-t pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-1">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <h2 className="font-semibold">
              {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a day"}
            </h2>
          </div>
          {selectedWorkouts.length ? (
            <ul className="divide-y divide-border">
              {selectedWorkouts.map((workout) => (
                <li key={workout.id} className="py-3 first:pt-0">
                  <Link
                    href={`/historial/${workout.id}`}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-sm py-1 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="truncate font-medium">{workout.name}</span>
                    {workout.hasPR && (
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-amber-500">
                        <Trophy className="size-3.5" /> PR
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">
              No completed workouts on this day.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}