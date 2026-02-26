import { db } from './db';
import { exercises } from './db/schema';
import { eq } from 'drizzle-orm';

// Mapping of exercise names to their filter data
const exerciseFilterData: Record<string, {
  bodyParts: string[];
  equipment: string[];
  movementType: string;
  movementPattern: string;
}> = {
  'Bench Press': { bodyParts: ['Chest', 'Triceps'], equipment: ['Barbell'], movementType: 'compound', movementPattern: 'push' },
  'Squat': { bodyParts: ['Quads', 'Glutes', 'Hamstrings'], equipment: ['Barbell'], movementType: 'compound', movementPattern: 'squat' },
  'Deadlift': { bodyParts: ['Back', 'Glutes', 'Hamstrings', 'Quads'], equipment: ['Barbell'], movementType: 'compound', movementPattern: 'hinge' },
  'Overhead Press': { bodyParts: ['Shoulders', 'Triceps'], equipment: ['Barbell'], movementType: 'compound', movementPattern: 'push' },
  'Barbell Row': { bodyParts: ['Back', 'Biceps'], equipment: ['Barbell'], movementType: 'compound', movementPattern: 'pull' },
  'Pull-ups': { bodyParts: ['Back', 'Biceps'], equipment: ['Bodyweight'], movementType: 'compound', movementPattern: 'pull' },
  'Dips': { bodyParts: ['Chest', 'Triceps', 'Shoulders'], equipment: ['Bodyweight'], movementType: 'compound', movementPattern: 'push' },
  'Bicep Curls': { bodyParts: ['Biceps'], equipment: ['Dumbbell'], movementType: 'isolation', movementPattern: 'pull' },
  'Tricep Extensions': { bodyParts: ['Triceps'], equipment: ['Dumbbell'], movementType: 'isolation', movementPattern: 'push' },
  'Leg Press': { bodyParts: ['Quads', 'Glutes', 'Hamstrings'], equipment: ['Machine'], movementType: 'compound', movementPattern: 'squat' },
  'Push-ups': { bodyParts: ['Chest', 'Triceps', 'Shoulders'], equipment: ['Bodyweight'], movementType: 'compound', movementPattern: 'push' },
  'Lunges': { bodyParts: ['Quads', 'Glutes', 'Hamstrings'], equipment: ['Bodyweight'], movementType: 'compound', movementPattern: 'squat' },
  'Plank': { bodyParts: ['Abs', 'Core'], equipment: ['Bodyweight'], movementType: 'isolation', movementPattern: 'carry' },
  'Dumbbell Bench Press': { bodyParts: ['Chest', 'Triceps', 'Shoulders'], equipment: ['Dumbbell'], movementType: 'compound', movementPattern: 'push' },
  'Incline Bench Press': { bodyParts: ['Chest', 'Shoulders', 'Triceps'], equipment: ['Barbell'], movementType: 'compound', movementPattern: 'push' },
  'Lat Pulldown': { bodyParts: ['Back', 'Biceps'], equipment: ['Machine'], movementType: 'compound', movementPattern: 'pull' },
  'Seated Cable Row': { bodyParts: ['Back', 'Biceps'], equipment: ['Cable'], movementType: 'compound', movementPattern: 'pull' },
  'Face Pull': { bodyParts: ['Shoulders', 'Back'], equipment: ['Cable'], movementType: 'isolation', movementPattern: 'pull' },
  'Lateral Raise': { bodyParts: ['Shoulders'], equipment: ['Dumbbell'], movementType: 'isolation', movementPattern: 'raise' },
  'Front Raise': { bodyParts: ['Shoulders'], equipment: ['Dumbbell'], movementType: 'isolation', movementPattern: 'raise' },
  'Hammer Curls': { bodyParts: ['Biceps', 'Forearms'], equipment: ['Dumbbell'], movementType: 'isolation', movementPattern: 'pull' },
  'Skullcrushers': { bodyParts: ['Triceps'], equipment: ['Dumbbell'], movementType: 'isolation', movementPattern: 'push' },
  'Leg Extension': { bodyParts: ['Quads'], equipment: ['Machine'], movementType: 'isolation', movementPattern: 'squat' },
  'Leg Curl': { bodyParts: ['Hamstrings'], equipment: ['Machine'], movementType: 'isolation', movementPattern: 'hinge' },
  'Calf Raises': { bodyParts: ['Calves'], equipment: ['Bodyweight'], movementType: 'isolation', movementPattern: 'carry' },
  'Romanian Deadlift': { bodyParts: ['Hamstrings', 'Glutes', 'Back'], equipment: ['Barbell'], movementType: 'compound', movementPattern: 'hinge' },
  'Bulgarian Split Squat': { bodyParts: ['Quads', 'Glutes', 'Hamstrings'], equipment: ['Dumbbell'], movementType: 'compound', movementPattern: 'squat' },
  'Arnold Press': { bodyParts: ['Shoulders', 'Triceps'], equipment: ['Dumbbell'], movementType: 'compound', movementPattern: 'push' },
  'Shrugs': { bodyParts: ['Traps'], equipment: ['Barbell'], movementType: 'isolation', movementPattern: 'carry' },
  'Russian Twists': { bodyParts: ['Abs', 'Obliques'], equipment: ['Bodyweight'], movementType: 'isolation', movementPattern: 'rotation' },
  'Leg Raises': { bodyParts: ['Abs'], equipment: ['Bodyweight'], movementType: 'isolation', movementPattern: 'carry' },
  'Mountain Climbers': { bodyParts: ['Core', 'Cardio'], equipment: ['Bodyweight'], movementType: 'compound', movementPattern: 'locomotion' },
  'Burpees': { bodyParts: ['Chest', 'Legs', 'Core'], equipment: ['Bodyweight'], movementType: 'compound', movementPattern: 'locomotion' },
  'Jump Squats': { bodyParts: ['Quads', 'Glutes'], equipment: ['Bodyweight'], movementType: 'compound', movementPattern: 'squat' },
  'Box Jumps': { bodyParts: ['Quads', 'Glutes'], equipment: ['Bodyweight'], movementType: 'compound', movementPattern: 'squat' },
  'Kettlebell Swings': { bodyParts: ['Glutes', 'Hamstrings', 'Back'], equipment: ['Kettlebell'], movementType: 'compound', movementPattern: 'hinge' },
  'Hip Thrust': { bodyParts: ['Glutes'], equipment: ['Barbell'], movementType: 'isolation', movementPattern: 'push' },
  'Glute Bridge': { bodyParts: ['Glutes'], equipment: ['Bodyweight'], movementType: 'isolation', movementPattern: 'push' },
  'Standing Military Press': { bodyParts: ['Shoulders', 'Triceps'], equipment: ['Barbell'], movementType: 'compound', movementPattern: 'push' },
  'Close-Grip Bench Press': { bodyParts: ['Triceps', 'Chest'], equipment: ['Barbell'], movementType: 'compound', movementPattern: 'push' },
  'John\'s Special Shoulder Combo': { bodyParts: ['Shoulders'], equipment: ['Dumbbell'], movementType: 'compound', movementPattern: 'push' },
};

async function migrateExerciseFilters() {
  console.log('🔄 Starting exercise filter migration...');

  try {
    // Get all exercises
    const allExercises = await db.query.exercises.findMany();
    
    let updated = 0;
    let skipped = 0;

    for (const exercise of allExercises) {
      const filterData = exerciseFilterData[exercise.name];

      if (filterData) {
        // Check if already has data
        if ((!exercise.bodyParts || exercise.bodyParts.length === 0) && exercise.movementType === 'unknown') {
          await db.update(exercises)
            .set({
              bodyParts: filterData.bodyParts,
              equipment: filterData.equipment,
              movementType: filterData.movementType,
              movementPattern: filterData.movementPattern,
              updatedAt: new Date(),
            })
            .where(eq(exercises.id, exercise.id));

          console.log(`✅ Updated: ${exercise.name}`);
          updated++;
        } else {
          console.log(`⏭️  Skipped (already has data): ${exercise.name}`);
          skipped++;
        }
      } else {
        console.log(`⚠️  No mapping found for: ${exercise.name}`);
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`Updated: ${updated} exercises`);
    console.log(`Skipped: ${skipped} exercises`);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

// Run the migration
migrateExerciseFilters()
  .then(() => {
    console.log('🎉 Exercise filter migration finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
