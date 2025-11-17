'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/ui/button';
import { Input } from '@/app/ui/input';
import { Textarea } from '@/app/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import type { Exercise } from '@/lib/types';

type NewExercise = {
  id: string;
  name: string;
  plannedSets?: number | string;
  plannedReps?: number | string;
  plannedWeight?: number | string;
};

export default function NewWorkoutPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<NewExercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    // Fetch all exercises to populate the dropdown
    const fetchExercises = async () => {
      try {
        // This endpoint does not exist yet, I will need to create it.
        const response = await fetch('/api/exercises');
        if (!response.ok) {
          throw new Error('Failed to fetch exercises');
        }
        const data = await response.json();
        setAllExercises(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchExercises();
  }, []);

  const handleAddExercise = () => {
  setExercises([...exercises, { id: '', name: '', plannedSets: '', plannedReps: '', plannedWeight: '' }]);
  };

  const handleExerciseChange = (index: number, field: keyof NewExercise, value: string | number) => {
    const newExercises = [...exercises];
    if (field === 'id') {
      newExercises[index].id = String(value);
    } else if (field === 'name') {
      newExercises[index].name = String(value);
    } else if (field === 'plannedSets' || field === 'plannedReps' || field === 'plannedWeight') {
      newExercises[index][field] = value;
    }

    if (field === 'id') {
    const selectedExercise = allExercises.find(ex => ex.id === String(value));
        if (selectedExercise) {
            newExercises[index]['name'] = selectedExercise.name;
        }
    }

    setExercises(newExercises);
  };

  const handleRemoveExercise = (index: number) => {
    const newExercises = [...exercises];
    newExercises.splice(index, 1);
    setExercises(newExercises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description, exercises }),
      });

      if (!response.ok) {
        throw new Error('Failed to create workout');
      }

      router.push('/dashboard');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-4">
      <h1 className="text-2xl font-bold text-foreground mb-6">Create New Workout</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">Workout Name</label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Exercises</h2>
          <div className="space-y-4">
            {exercises.map((exercise, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                    <select
                        value={exercise.id}
                        onChange={(e) => handleExerciseChange(index, 'id', e.target.value)}
                        className="w-full bg-transparent border-b-2 border-muted-foreground pb-1"
                    >
                        <option value="">Select Exercise</option>
                        {allExercises.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.name}</option>
                        ))}
                    </select>
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveExercise(index)}>
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-muted-foreground">Sets</label>
                        <Input type="number" value={exercise.plannedSets} onChange={(e) => handleExerciseChange(index, 'plannedSets', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-sm text-muted-foreground">Reps</label>
                        <Input type="number" value={exercise.plannedReps} onChange={(e) => handleExerciseChange(index, 'plannedReps', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-sm text-muted-foreground">Weight (kg)</label>
                        <Input type="number" value={exercise.plannedWeight} onChange={(e) => handleExerciseChange(index, 'plannedWeight', e.target.value)} />
                    </div>
                </div>
              </div>
            ))}
          </div>
          <Button type="button" onClick={handleAddExercise} className="mt-4">
            <Plus className="h-5 w-5 mr-2" />
            Add Exercise
          </Button>
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit">Create Workout</Button>
        </div>
      </form>
    </div>
  );
}