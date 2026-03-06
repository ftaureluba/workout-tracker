"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/app/ui/button";
import { ArrowLeft, Clock, Dumbbell, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/ui/card";
import Link from "next/link";

type SetData = {
    id: string;
    reps: number;
    weight: number;
    completed: boolean;
};

type SessionExercise = {
    id: string;
    exerciseId: string | null;
    order: number | null;
    name: string | null;
    exercise: { name: string } | null;
    sets: SetData[];
};

type SessionData = {
    id: string;
    notes: string | null;
    createdAt: string | null;
    startedAt: string | null;
    endedAt: string | null;
    workout: { name: string } | null;
    sessionExercises: SessionExercise[];
};

interface SessionViewClientProps {
    sessionId: string;
}

export default function SessionViewClient({ sessionId }: SessionViewClientProps) {
    const [session, setSession] = useState<SessionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSession() {
            try {
                const res = await fetch(`/api/sessions/${sessionId}`);
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    setError(data.error || "Failed to load workout session.");
                    return;
                }
                const data = await res.json();
                setSession(data);
            } catch {
                setError("Failed to load workout session.");
            } finally {
                setLoading(false);
            }
        }
        fetchSession();
    }, [sessionId]);

    const formatDate = (iso?: string | null) => {
        if (!iso) return "-";
        try {
            return new Date(iso).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
            });
        } catch {
            return iso;
        }
    };

    const getDuration = () => {
        if (!session?.startedAt || !session?.endedAt) return null;
        const ms = new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime();
        const mins = Math.round(ms / 60_000);
        if (mins < 1) return "< 1 min";
        if (mins < 60) return `${mins} min`;
        const hours = Math.floor(mins / 60);
        const remaining = mins % 60;
        return `${hours}h ${remaining}m`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading session…</div>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
                <p className="text-red-500">{error || "Session not found."}</p>
                <Link href="/historial">
                    <Button variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to History
                    </Button>
                </Link>
            </div>
        );
    }

    const workoutName = session.workout?.name ?? "Ad-hoc workout";
    const duration = getDuration();
    const completedSetsTotal = session.sessionExercises.reduce(
        (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
        0
    );
    const totalVolume = session.sessionExercises.reduce(
        (acc, ex) =>
            acc +
            ex.sets
                .filter((s) => s.completed)
                .reduce((sum, s) => sum + s.weight * s.reps, 0),
        0
    );

    return (
        <div className="min-h-screen pb-24">
            <header className="w-full border-b bg-card/30 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-3 p-4">
                    <Link href="/historial">
                        <Button variant="ghost" size="icon" className="h-10 w-10">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-lg font-semibold">{workoutName}</h1>
                        <p className="text-xs text-muted-foreground">
                            {formatDate(session.createdAt)}
                        </p>
                    </div>
                </div>
            </header>

            <main className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                    {duration && (
                        <Card>
                            <CardContent className="py-3 px-4 flex flex-col items-center gap-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-semibold">{duration}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    Duration
                                </span>
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardContent className="py-3 px-4 flex flex-col items-center gap-1">
                            <Dumbbell className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">{completedSetsTotal}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                Sets
                            </span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="py-3 px-4 flex flex-col items-center gap-1">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">
                                {totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString()} kg` : "-"}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                Volume
                            </span>
                        </CardContent>
                    </Card>
                </div>

                {/* Exercises */}
                <div className="space-y-4">
                    {session.sessionExercises.map((ex) => {
                        const exerciseName = ex.exercise?.name ?? ex.name ?? "Unknown exercise";
                        const completedSets = ex.sets.filter((s) => s.completed);

                        return (
                            <Card key={ex.id}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base text-primary">{exerciseName}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {completedSets.length === 0 ? (
                                        <p className="text-sm text-muted-foreground italic">No completed sets</p>
                                    ) : (
                                        <div className="space-y-1">
                                            <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider pb-1 border-b border-border/50">
                                                <span>Set</span>
                                                <span>Weight</span>
                                                <span>Reps</span>
                                            </div>
                                            {completedSets.map((set, sIdx) => (
                                                <div
                                                    key={set.id}
                                                    className="grid grid-cols-[2rem_1fr_1fr] gap-2 text-sm py-1"
                                                >
                                                    <span className="text-muted-foreground">{sIdx + 1}</span>
                                                    <span className="font-medium">{set.weight} kg</span>
                                                    <span className="font-medium">{set.reps} reps</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {session.sessionExercises.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                        No exercises recorded in this session.
                    </div>
                )}
            </main>
        </div>
    );
}
