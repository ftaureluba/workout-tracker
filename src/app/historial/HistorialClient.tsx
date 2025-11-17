"use client";

import React from "react";
import { Button } from "@/app/ui/button";
import { Menu } from "lucide-react";
import { useSidebar } from "@/lib/sidebar";
import Link from "next/link";

type SessionItem = {
  id: string;
  workoutName?: string | null;
  createdAt?: string | null;
  exercisesCount?: number;
};

export default function HistorialClient({ sessions }: { sessions: SessionItem[] }) {
  const { toggle } = useSidebar();

  const formatDate = (iso?: string | null) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen">
      <header className="w-full border-b bg-card/30 backdrop-blur-sm">
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
            <div className="hidden sm:block text-lg font-semibold">Historial</div>
          </div>

          <div />
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        {sessions.length === 0 ? (
          <div className="p-6 bg-card rounded">No past workouts found.</div>
        ) : (
          <ul className="space-y-4">
            {sessions.map((s) => (
              <li key={s.id} className="bg-card p-4 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">{s.workoutName ?? "Ad-hoc workout"}</div>
                    <div className="text-sm text-muted-foreground">{formatDate(s.createdAt)}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{s.exercisesCount ?? 0} exercises</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link href={`/workout/resume/${s.id}`}>
                    <span className="px-3 py-1 bg-primary text-white rounded">Resume</span>
                  </Link>
                  <Link href={`/dashboard`}>
                    <span className="px-3 py-1 border rounded text-sm">View details</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 text-center">
          <button className="px-4 py-2 bg-muted/40 rounded">Load more</button>
        </div>
      </main>
    </div>
  );
}
