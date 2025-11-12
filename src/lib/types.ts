
export interface Exercise {
  id: string;
  name: string;
  description?: string | null;
  notes?: string | null;
  userId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  order: number;
  plannedSets?: number | null;
  plannedReps?: number | null;
  plannedWeight?: number | null;
  restTimeSeconds?: number | null;
  notes?: string | null;
  isSuperset?: boolean;
  supersetGroup?: number | null;
  exercise: Exercise;
}

export interface Workout {
  id: string;
  name: string;
  description?: string | null;
  notes?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  userId: string;
  workoutExercises: WorkoutExercise[];
}

export interface WorkoutSet {
  reps: number;
  weight: number;
  completed: boolean;
  notes?: string;
}

export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: WorkoutSet[];
}

export interface ActiveSession {
  sessionId: string;
  workoutId: string | null;
  workoutName: string;
  startedAt: string;
  lastSaved: string;
  exercises: SessionExercise[];
}

