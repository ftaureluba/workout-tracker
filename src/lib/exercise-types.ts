// Exercise categorization enums
export const BODY_PARTS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Legs",
  "Quadriceps",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Abs",
  "Obliques",
  "Lower Back",
] as const;

export const EQUIPMENT = [
  "Barbell",
  "Dumbbell",
  "Kettlebell",
  "Machine",
  "Cable",
  "Resistance Band",
  "Bodyweight",
  "Medicine Ball",
  "TRX",
  "EZ Bar",
  "Plate",
  "Smith Machine",
] as const;

export const MOVEMENT_TYPES = ["compound", "isolation"] as const;

export const MOVEMENT_PATTERNS = ["push", "pull", "squat", "hinge", "carry", "locomotion", "rotation"] as const;

export type BodyPart = (typeof BODY_PARTS)[number];
export type Equipment = (typeof EQUIPMENT)[number];
export type MovementType = (typeof MOVEMENT_TYPES)[number];
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

export interface ExerciseMetrics {
  lastPerformedAt: Date | null;
  bestWeight: number | null;
  bestVolume: number | null;
  best1RM: number | null;
}

/**
 * Estimate 1RM using Epley formula: 1RM = weight * (1 + reps/30)
 * Works best for reps between 1-10
 */
export function estimate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}
