/**
 * Strength calculation utilities used by the Plans feature.
 *
 * e1RM = Estimated 1-Rep Maximum
 */

/**
 * Epley formula: 1RM ≈ weight × (1 + reps / 30)
 * Accurate for sets of 1–10 reps.
 * Returns 0 for invalid inputs.
 */
export function epleyE1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/**
 * Rounds a weight to the nearest multiple of `step` (default 2.5 kg).
 * e.g. 81.3 → 82.5, 79.2 → 80.0
 */
export function roundToPlate(kg: number, step = 2.5): number {
  return Math.round(kg / step) * step;
}

/**
 * Resolves a plan's prescribed weight target to an absolute kg value.
 *
 * - If `prescribedWeightAbs` is set, returns it directly (rounded to plate).
 * - If `prescribedWeightPct` is set, multiplies by `e1rm` and rounds.
 * - Returns null if neither is set (bodyweight / unloaded exercise).
 */
export function resolveTargetWeight(opts: {
  prescribedWeightPct?: number | null;
  prescribedWeightAbs?: number | null;
  e1rm?: number | null;
}): number | null {
  const { prescribedWeightPct, prescribedWeightAbs, e1rm } = opts;

  if (prescribedWeightAbs != null && prescribedWeightAbs > 0) {
    return roundToPlate(prescribedWeightAbs);
  }

  if (prescribedWeightPct != null && prescribedWeightPct > 0 && e1rm != null && e1rm > 0) {
    return roundToPlate(prescribedWeightPct * e1rm);
  }

  return null;
}
