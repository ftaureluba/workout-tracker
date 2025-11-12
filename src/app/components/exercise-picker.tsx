"use client";

import React, { useEffect, useState } from "react";

type Exercise = { id: string; name: string };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ex: Exercise) => void;
}

export default function ExercisePicker({ isOpen, onClose, onSelect }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/exercises");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setExercises(data || []);
      } catch (e) {
        console.debug("Failed to load exercises", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="bg-popover text-popover-foreground rounded-lg p-4 w-full max-w-xl z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Add exercise</h3>
          <button onClick={onClose} className="text-sm text-muted-foreground">Close</button>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises..."
          className="w-full mb-3 px-3 py-2 rounded border bg-transparent"
        />

        <div className="max-h-64 overflow-auto space-y-1">
          {filtered.map((ex) => (
            <div key={ex.id} className="flex items-center justify-between p-2 rounded hover:bg-muted">
              <div>{ex.name}</div>
              <button
                onClick={() => {
                  onSelect(ex);
                }}
                className="text-blue-600 text-sm"
              >
                Add
              </button>
            </div>
          ))}

          {filtered.length === 0 && <div className="text-sm text-muted-foreground p-2">No exercises found</div>}
        </div>
      </div>
    </div>
  );
}
