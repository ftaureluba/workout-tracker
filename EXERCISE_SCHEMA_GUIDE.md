# Exercise Schema Redesign Guide

## Overview

The exercises table has been enhanced with comprehensive categorization and performance tracking fields to support filtering, searching, and progressive overload tracking.

## New Schema Fields

### Categorization Fields

- **bodyParts** (text, JSON array): Muscle groups targeted by the exercise
  - Example: `["Chest", "Triceps"]`
  - Use the `BODY_PARTS` enum from `src/lib/exercise-types.ts`

- **equipment** (text, JSON array): Equipment required for the exercise
  - Example: `["Barbell", "Bench"]`
  - Use the `EQUIPMENT` enum from `src/lib/exercise-types.ts`

- **movementType** (text): Whether the exercise is "compound" or "isolation"
  - Compound: Multiple joints and muscle groups
  - Isolation: Single joint, targets one muscle group

- **movementPattern** (text): The type of movement pattern
  - Options: "push", "pull", "squat", "hinge", "carry", "locomotion", "rotation"

### Performance Tracking Fields

- **lastPerformedAt** (timestamp): When the exercise was last performed
- **bestWeight** (integer): Highest single weight lifted (lbs/kg)
- **bestVolume** (integer): Highest volume (reps × weight) in a single set
- **best1RM** (integer): Estimated 1-rep max using Epley formula

## Helper Functions

### From `src/lib/exercise-types.ts`

```typescript
// Get enums for UI
BODY_PARTS     // ["Chest", "Back", "Legs", ...]
EQUIPMENT      // ["Barbell", "Dumbbell", ...]
MOVEMENT_TYPES // ["compound", "isolation"]
MOVEMENT_PATTERNS // ["push", "pull", "squat", ...]

// Parse JSON from database
parseBodyParts(jsonString) // Safely parse body parts JSON
parseEquipment(jsonString) // Safely parse equipment JSON

// Stringify for database
stringifyBodyParts(array)  // JSON.stringify with safety
stringifyEquipment(array)  // JSON.stringify with safety

// Calculate 1RM
estimate1RM(weight, reps) // Uses Epley formula
```

### From `src/lib/exercise-metrics.ts`

```typescript
// Update exercise metrics after a workout session
await updateExerciseMetrics(exerciseId)
// Recalculates: bestWeight, bestVolume, best1RM, lastPerformedAt

// Parse exercise data from database
parseExerciseData(exercise) // Returns parsed bodyParts and equipment arrays

// Format exercise data for database
formatExerciseData({
  name: "Bench Press",
  bodyParts: ["Chest", "Triceps"],
  equipment: ["Barbell"],
  movementType: "compound",
  movementPattern: "push",
}) // Returns JSON stringified object
```

## Usage Examples

### Creating an Exercise

```typescript
import { formatExerciseData } from "@/lib/exercise-metrics";
import { db } from "@/lib/db";
import { exercises } from "@/lib/db/schema";

const newExercise = await db.insert(exercises).values(
  formatExerciseData({
    name: "Bench Press",
    description: "Classic barbell chest press",
    bodyParts: ["Chest", "Triceps", "Shoulders"],
    equipment: ["Barbell", "Bench"],
    movementType: "compound",
    movementPattern: "push",
    notes: "Keep elbows at 45 degrees",
  })
);
```

### Updating Metrics After Workout

```typescript
import { updateExerciseMetrics } from "@/lib/exercise-metrics";

// After a user completes a workout set:
await updateExerciseMetrics(exerciseId);
// This automatically recalculates all performance metrics
```

### Filtering Exercises

```typescript
import { parseBodyParts, parseEquipment } from "@/lib/exercise-types";

const exercises = await db.select().from(exercises);

// Filter by body part
const chestExercises = exercises.filter((ex) => {
  const bodyParts = parseBodyParts(ex.bodyParts);
  return bodyParts.includes("Chest");
});

// Filter by movement type
const compounds = exercises.filter((ex) => ex.movementType === "compound");

// Filter by equipment
const barbellExercises = exercises.filter((ex) => {
  const equipment = parseEquipment(ex.equipment);
  return equipment.includes("Barbell");
});
```

### Displaying Metrics

```typescript
import { formatMetrics } from "@/lib/exercise-types";

const metrics = formatMetrics({
  lastPerformedAt: exercise.lastPerformedAt,
  bestWeight: exercise.bestWeight,
  bestVolume: exercise.bestVolume,
  best1RM: exercise.best1RM,
});

console.log(`Best 1RM: ${metrics.best1RM}`); // "225 lbs"
console.log(`Last performed: ${metrics.lastPerformed}`); // "12/6/2025"
```

## Database Migration

You'll need to run a Drizzle migration to update the exercises table:

```bash
npm run db:generate
npm run db:migrate
```

## Notes on Performance Metrics

- **Metrics are denormalized** for performance - they're stored on the exercises table rather than computed on-demand
- **Metrics are automatically updated** by `updateExerciseMetrics()` whenever a workout set is completed
- **The Epley formula** is used for 1RM estimates: `1RM = weight × (1 + reps/30)`
- Metrics are most accurate for rep ranges of 1-10 reps

## Component Updates

The `ExercisePicker` component has been updated to:
- Display body parts, equipment, and movement type inline
- Filter by all categorization fields
- Show best 1RM and last performed date
- Extract filter options dynamically from the database
