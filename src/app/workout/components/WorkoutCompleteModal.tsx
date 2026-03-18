"use client";

import React, { useEffect, useState } from "react";
import { Trophy, CheckCircle2, X } from "lucide-react";
import type { PRResult } from "@/lib/exercise-metrics";

interface WorkoutCompleteModalProps {
    prs: PRResult[];
    onClose: () => void;
}

export function WorkoutCompleteModal({ prs, onClose }: WorkoutCompleteModalProps) {
    const [visible, setVisible] = useState(false);

    // Mount animation
    useEffect(() => {
        const t = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(t);
    }, []);

    const hasPRs = prs.length > 0;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{
                background: visible
                    ? "rgba(0,0,0,0.75)"
                    : "rgba(0,0,0,0)",
                transition: "background 0.3s ease",
                backdropFilter: "blur(4px)",
            }}
        >
            <div
                style={{
                    transform: visible ? "translateY(0) scale(1)" : "translateY(40px) scale(0.97)",
                    opacity: visible ? 1 : 0,
                    transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
                    background: "oklch(0.13 0 0)",
                    border: "1px solid oklch(0.28 0 0)",
                    borderRadius: "1.25rem",
                    width: "100%",
                    maxWidth: "26rem",
                    overflow: "hidden",
                }}
            >
                {/* Top accent bar */}
                <div style={{ height: "4px", background: "linear-gradient(90deg, #a50808, #1C6E8C)" }} />

                <div className="p-6 pb-5">
                    {/* Headline */}
                    <div className="flex items-start gap-3 mb-5">
                        <CheckCircle2
                            className="flex-shrink-0 mt-0.5"
                            style={{ color: "#1C6E8C", width: 28, height: 28 }}
                        />
                        <div>
                            <h2 className="text-xl font-bold text-white leading-tight">
                                Nice work! 💪
                            </h2>
                            <p className="text-sm mt-0.5" style={{ color: "#c5b8b8" }}>
                                Workout saved successfully.
                            </p>
                        </div>
                    </div>

                    {/* PR section */}
                    {hasPRs && (
                        <div className="space-y-3 mb-5">
                            <p
                                className="text-xs font-semibold uppercase tracking-widest"
                                style={{ color: "#c5b8b8" }}
                            >
                                Personal Records
                            </p>
                            {prs.map((pr) => (
                                <div
                                    key={pr.exerciseId}
                                    style={{
                                        background: "oklch(0.17 0 0)",
                                        border: "1px solid rgba(255,198,80,0.2)",
                                        borderRadius: "0.75rem",
                                        padding: "0.875rem 1rem",
                                    }}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Trophy
                                            style={{ color: "#FFC650", width: 16, height: 16, flexShrink: 0 }}
                                        />
                                        <span className="text-sm font-semibold text-white">
                                            {pr.exerciseName}
                                        </span>
                                    </div>
                                    <div className="space-y-1 pl-6">
                                        {pr.newBestWeight != null && (
                                            <PRLine
                                                label="Best weight"
                                                oldVal={pr.oldBestWeight ?? 0}
                                                newVal={pr.newBestWeight}
                                                unit="kg"
                                            />
                                        )}
                                        {pr.newBestVolume != null && (
                                            <PRLine
                                                label="Best set volume"
                                                oldVal={pr.oldBestVolume ?? 0}
                                                newVal={pr.newBestVolume}
                                                unit="kg·reps"
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl font-semibold text-white text-sm"
                        style={{ background: "#1C6E8C" }}
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}

function PRLine({
    label,
    oldVal,
    newVal,
    unit,
}: {
    label: string;
    oldVal: number;
    newVal: number;
    unit: string;
}) {
    const formatted = (v: number) =>
        Number.isInteger(v) ? String(v) : v.toFixed(1);

    return (
        <div className="flex items-center justify-between text-xs">
            <span style={{ color: "#c5b8b8" }}>{label}</span>
            <span style={{ color: "#FFC650", fontWeight: 600 }}>
                {oldVal > 0 ? `${formatted(oldVal)} → ` : ""}
                {formatted(newVal)} {unit}
            </span>
        </div>
    );
}
