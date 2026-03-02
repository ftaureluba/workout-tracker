import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import RestTimer from "@/app/components/rest-timer";
import type { LastPerformance } from "@/app/actions/last-performance";

interface SortableExerciseProps {
    id: string;
    exercise: any;
    idx: number;
    removeExercise: (idx: number) => void;
    performed: any[][];
    updatePerformed: (exIndex: number, setIndex: number, field: "reps" | "weight", value: string) => void;
    removeSet: (exIndex: number, setIndex: number) => void;
    addSet: (exIndex: number) => void;
    lastPerformance?: LastPerformance;
    restTimeSeconds?: number;
}

export function SortableExercise({
    id,
    exercise,
    idx,
    removeExercise,
    performed,
    updatePerformed,
    removeSet,
    addSet,
    lastPerformance,
    restTimeSeconds,
}: SortableExerciseProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 0,
        position: "relative" as const,
    };

    const lastDateLabel = (() => {
        if (!lastPerformance?.date) return null;
        const date = new Date(lastPerformance.date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        return `${Math.floor(diffDays / 30)}mo ago`;
    })();

    return (
        <section ref={setNodeRef} style={style} className={`bg-muted/50 rounded-xl p-4 ${isDragging ? "opacity-50 ring-2 ring-primary" : ""}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-black/10 rounded">
                        <GripVertical className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                        <div className="font-semibold">{exercise.name}</div>
                        {lastDateLabel && <div className="text-xs text-muted-foreground">Last: {lastDateLabel}</div>}
                    </div>
                </div>
                <button onClick={() => removeExercise(idx)} className="text-sm text-red-500 ml-2">Remove Exercise</button>
            </div>
            <div className="space-y-2">
                {exercise.sets && exercise.sets.length > 0 ? (
                    exercise.sets.map((set: any, setIdx: number) => {
                        const lastSet = lastPerformance?.sets?.[setIdx];
                        const repsPlaceholder = lastSet?.reps != null ? String(lastSet.reps) : (typeof set.reps === "number" ? String(set.reps) : "");
                        const weightPlaceholder = lastSet?.weight != null ? String(lastSet.weight) : (typeof set.weight === "number" ? String(set.weight) : "");

                        return (
                            <div key={setIdx} className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-muted-foreground">Set {setIdx + 1}</span>
                                    <button onClick={() => removeSet(idx, setIdx)} className="text-sm text-red-500">–</button>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="number"
                                        className="w-14 px-2 py-1 rounded border text-center text-base"
                                        value={performed?.[idx]?.[setIdx]?.reps ?? ""}
                                        onChange={(e) => updatePerformed(idx, setIdx, "reps", e.target.value)}
                                        min={0}
                                        aria-label="Reps"
                                        placeholder={repsPlaceholder}
                                    />
                                    <span className="text-sm text-muted-foreground">reps</span>

                                    <input
                                        type="number"
                                        className="w-16 px-2 py-1 rounded border text-center text-base"
                                        value={performed?.[idx]?.[setIdx]?.weight ?? ""}
                                        onChange={(e) => updatePerformed(idx, setIdx, "weight", e.target.value)}
                                        min={0}
                                        step={0.5}
                                        aria-label="Weight"
                                        placeholder={weightPlaceholder}
                                    />
                                    <span className="text-sm text-muted-foreground">kg</span>
                                </div>
                                <div className="ml-4">
                                    <RestTimer defaultSeconds={restTimeSeconds ?? 60} label={`Rest ${setIdx + 1}`} />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="p-3 bg-background rounded-lg border text-sm text-muted-foreground">No sets available</div>
                )}
                <div className="mt-2">
                    <button onClick={() => addSet(idx)} className="text-sm text-blue-600">+ Add set</button>
                </div>
            </div>
        </section>
    );
}
