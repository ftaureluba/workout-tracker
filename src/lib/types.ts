
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
  endedAt?: string;
  lastSaved: string;
  exercises: SessionExercise[];
}

// ── Plans Feature ─────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  description?: string | null;
  durationWeeks: number;
  sessionsPerWeek: number;
  isPublic: boolean;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanWeek {
  id: string;
  planId: string;
  weekNumber: number;
}

export interface PlanSession {
  id: string;
  planWeekId: string;
  sessionLabel: string;
  dayOfWeek?: number | null;
  order: number;
}

export interface PlanSessionExercise {
  id: string;
  planSessionId: string;
  exerciseId: string;
  order: number;
  prescribedSets: number;
  prescribedReps: number;
  /** Fraction of e1RM, e.g. 0.80 = 80% */
  prescribedWeightPct?: number | null;
  /** Absolute kg — for fixed-weight plans */
  prescribedWeightAbs?: number | null;
  restTimeSeconds?: number | null;
  notes?: string | null;
  exercise?: Exercise;
}

export type EnrollmentStatus = "active" | "paused" | "completed" | "abandoned";

export interface UserPlanEnrollment {
  id: string;
  userId: string;
  planId: string;
  startedAt: string;
  completedAt?: string | null;
  currentWeek: number;
  currentSessionOrder: number;
  status: EnrollmentStatus;
  createdAt: string;
  plan?: Plan;
}

export interface EnrollmentExerciseMax {
  id: string;
  enrollmentId: string;
  exerciseId: string;
  /** Estimated 1RM in kg */
  e1rm: number;
}

export interface PlanWorkoutLink {
  workoutId: string;
  planSessionId: string;
  enrollmentId: string;
}

/** Full plan detail with nested structure */
export interface PlanDetail extends Plan {
  weeks: (PlanWeek & {
    sessions: (PlanSession & {
      exercises: PlanSessionExercise[];
    })[];
  })[];
}

/** Shape returned by GET /api/enrollments/active */
export interface ActiveEnrollmentSummary {
  enrollment: UserPlanEnrollment;
  plan: Plan;
  nextSession: (PlanSession & { exercises: PlanSessionExercise[] }) | null;
  totalSessions: number;
  completedSessions: number;
}

