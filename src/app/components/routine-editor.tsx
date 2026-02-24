"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/app/ui/button";
import { Input } from "@/app/ui/input";
import { Textarea } from "@/app/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import ExercisePicker from "@/app/components/exercise-picker";
import type { Workout, WorkoutExercise } from "@/lib/types";

type EditorExercise = {
  id: string;
  name: string;
  plannedSets?: number | null;
  plannedReps?: number | null;
  plannedWeight?: number | null;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initial?: Workout | null;
  onSaved?: (w: Workout) => void;
  onDeleted?: (id: string) => void;
}

export default function RoutineEditor({ isOpen, onClose, initial, onSaved, onDeleted }: Props) {
  const [name, setName] = useState( initial?.name ?? "" );
  const [description, setDescription] = useState( initial?.description ?? "" );
  const [exercises, setExercises] = useState<EditorExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    const initialExercises = (initial?.workoutExercises ?? []).map((we: WorkoutExercise) => ({
      id: we.exercise?.id ?? we.exerciseId ?? "",
      name: we.exercise?.name ?? "",
      plannedSets: we.plannedSets ?? null,
      plannedReps: we.plannedReps ?? null,
      plannedWeight: we.plannedWeight ?? null,
    }));
    setExercises(initialExercises);
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const handleAddExercise = (ex: { id: string; name: string }) => {
    setExercises((s) => [...s, { id: ex.id, name: ex.name, plannedSets: 3, plannedReps: null, plannedWeight: null }]);
    setPickerOpen(false);
  };

  const handleRemove = (index: number) => {
    setExercises((s) => s.filter((_, i) => i !== index));
  };

  const updateExerciseField = (index: number, field: keyof EditorExercise, value: string | number | null) => {
    setExercises((prev) => {
      const copy = [...prev];
      // convert empty to null
      if (value === "") value = null;
      if (field === "plannedSets" || field === "plannedReps" || field === "plannedWeight") {
        copy[index][field] = value === null ? null : Number(value);
      } else {
        // name/id fields
        if (field === 'id') {
          copy[index].id = value === null ? '' : String(value);
        } else if (field === 'name') {
          copy[index].name = value === null ? '' : String(value);
        }
      }
      return copy;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("Please provide a name for the workout");
    if (exercises.length === 0) return alert("Add at least one exercise");

    setSaving(true);
    try {
      const payload = {
        id: initial?.id,
        name,
        description,
        exercises: exercises.map((ex, i) => ({
          id: ex.id,
          order: i,
          plannedSets: ex.plannedSets ?? null,
          plannedReps: ex.plannedReps ?? null,
          plannedWeight: ex.plannedWeight ?? null,
        })),
      };

      const method = initial?.id ? "PUT" : "POST";
      const res = await fetch("/api/dashboard", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Save failed (${res.status})`);
      }

      const data = await res.json();
      onSaved?.(data);
      onClose();
    } catch (e) {
      console.error("Failed to save workout", e);
      alert("Failed to save workout");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial?.id) return;
    if (!confirm("Are you sure you want to delete this workout? This cannot be undone.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initial.id }),
      });

      if (!res.ok) throw new Error("Delete failed");

      onDeleted?.(initial.id);
      onClose();
    } catch (e) {
      console.error("Failed to delete workout", e);
      alert("Failed to delete workout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="bg-card text-card-foreground rounded-lg p-4 w-full max-w-3xl z-10 shadow-lg max-h-[90vh] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent flex flex-col">
        <div className="sticky top-0 bg-card flex items-center justify-between mb-3 pb-3 border-b z-10">
          <h3 className="text-lg font-semibold">{initial ? "Edit Routine" : "Create Routine"}</h3>
          <div className="flex gap-2">
            {initial?.id && (
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                Delete
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">Description</label>
            <Textarea value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Exercises</h4>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setPickerOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Exercise
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {exercises.map((ex, idx) => (
                <div key={ex.id + idx} className="p-3 bg-muted/40 rounded-lg flex items-start justify-between">
                  <div className="w-full">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{ex.name}</div>
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(idx)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Sets</label>
                        <Input type="number" value={ex.plannedSets ?? ""} onChange={(e) => updateExerciseField(idx, 'plannedSets', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Reps</label>
                        <Input type="number" value={ex.plannedReps ?? ""} onChange={(e) => updateExerciseField(idx, 'plannedReps', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Weight</label>
                        <Input type="number" value={ex.plannedWeight ?? ""} onChange={(e) => updateExerciseField(idx, 'plannedWeight', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {exercises.length === 0 && <div className="text-sm text-muted-foreground">No exercises yet. Add one.</div>}
            </div>
          </div>
        </div>

        <ExercisePicker isOpen={pickerOpen} onClose={() => setPickerOpen(false)} onAddExercise={handleAddExercise} />
      </div>
    </div>
  );
}
