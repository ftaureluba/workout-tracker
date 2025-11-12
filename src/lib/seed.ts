import { db } from './db'; // Your drizzle db instance
import { users, workouts, exercises, workoutExercises, workoutSessions, sessionExercises, workoutSet } from './db/schema';
import * as bcrypt from 'bcrypt'; // or your preferred hashing library

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data (optional - be careful in production!)
    console.log('Clearing existing data...');
    await db.delete(workoutSet);
    await db.delete(sessionExercises);
    await db.delete(workoutSessions);
    await db.delete(workoutExercises);
    await db.delete(exercises);
    await db.delete(workouts);
    await db.delete(users);

    // Create users
    console.log('Creating users...');
    const [user1, user2] = await db.insert(users).values([
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: await bcrypt.hash('password123', 10),
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: await bcrypt.hash('password123', 10),
      },
    ]).returning();

    // Create system-wide exercises (userId can be null for shared exercises)
    console.log('Creating exercises...');
    const exerciseData = await db.insert(exercises).values([
      {
        name: 'Bench Press',
        description: 'Compound chest exercise',
        notes: 'Keep your feet flat on the ground',
        userId: null, // System exercise
      },
      {
        name: 'Squat',
        description: 'Compound leg exercise',
        notes: 'Keep your back straight',
        userId: null,
      },
      {
        name: 'Deadlift',
        description: 'Full body compound exercise',
        notes: 'Maintain neutral spine',
        userId: null,
      },
      {
        name: 'Overhead Press',
        description: 'Shoulder compound exercise',
        userId: null,
      },
      {
        name: 'Barbell Row',
        description: 'Back compound exercise',
        userId: null,
      },
      {
        name: 'Pull-ups',
        description: 'Bodyweight back exercise',
        userId: null,
      },
      {
        name: 'Dips',
        description: 'Bodyweight chest/tricep exercise',
        userId: null,
      },
      {
        name: 'Bicep Curls',
        description: 'Isolation arm exercise',
        userId: null,
      },
      {
        name: 'Tricep Extensions',
        description: 'Isolation arm exercise',
        userId: null,
      },
      {
        name: 'Leg Press',
        description: 'Machine leg exercise',
        userId: null,
      },
      // User-specific custom exercise
      {
        name: 'John\'s Special Shoulder Combo',
        description: 'Custom exercise created by user',
        notes: 'Lateral raises into front raises',
        userId: user1.id,
      },
    ]).returning();

    // Create workouts for user1
    console.log('Creating workouts...');
    const [pushWorkout, pullWorkout, legWorkout] = await db.insert(workouts).values([
      {
        name: 'Push Day',
        description: 'Chest, shoulders, and triceps',
        notes: 'Focus on progressive overload',
        userId: user1.id,
      },
      {
        name: 'Pull Day',
        description: 'Back and biceps',
        notes: 'Focus on form',
        userId: user1.id,
      },
      {
        name: 'Leg Day',
        description: 'Lower body workout',
        notes: 'Don\'t skip leg day!',
        userId: user1.id,
      },
    ]).returning();

    // Create workout exercises for Push Day
    console.log('Creating workout exercises...');
    await db.insert(workoutExercises).values([
      {
        workoutId: pushWorkout.id,
        exerciseId: exerciseData.find(e => e.name === 'Bench Press')!.id,
        order: 1,
        plannedSets: 4,
        plannedReps: 8,
        plannedWeight: 185,
        restTimeSeconds: 180,
        isSuperset: false,
      },
      {
        workoutId: pushWorkout.id,
        exerciseId: exerciseData.find(e => e.name === 'Overhead Press')!.id,
        order: 2,
        plannedSets: 3,
        plannedReps: 10,
        plannedWeight: 95,
        restTimeSeconds: 120,
        isSuperset: false,
      },
      {
        workoutId: pushWorkout.id,
        exerciseId: exerciseData.find(e => e.name === 'Dips')!.id,
        order: 3,
        plannedSets: 3,
        plannedReps: 12,
        restTimeSeconds: 90,
        isSuperset: true,
        supersetGroup: 1,
      },
      {
        workoutId: pushWorkout.id,
        exerciseId: exerciseData.find(e => e.name === 'Tricep Extensions')!.id,
        order: 4,
        plannedSets: 3,
        plannedReps: 12,
        plannedWeight: 30,
        restTimeSeconds: 90,
        isSuperset: true,
        supersetGroup: 1,
      },
    ]);

    // Create workout exercises for Pull Day
    await db.insert(workoutExercises).values([
      {
        workoutId: pullWorkout.id,
        exerciseId: exerciseData.find(e => e.name === 'Deadlift')!.id,
        order: 1,
        plannedSets: 3,
        plannedReps: 5,
        plannedWeight: 275,
        restTimeSeconds: 240,
        isSuperset: false,
      },
      {
        workoutId: pullWorkout.id,
        exerciseId: exerciseData.find(e => e.name === 'Barbell Row')!.id,
        order: 2,
        plannedSets: 4,
        plannedReps: 8,
        plannedWeight: 135,
        restTimeSeconds: 120,
        isSuperset: false,
      },
      {
        workoutId: pullWorkout.id,
        exerciseId: exerciseData.find(e => e.name === 'Pull-ups')!.id,
        order: 3,
        plannedSets: 3,
        plannedReps: 10,
        restTimeSeconds: 120,
        isSuperset: false,
      },
      {
        workoutId: pullWorkout.id,
        exerciseId: exerciseData.find(e => e.name === 'Bicep Curls')!.id,
        order: 4,
        plannedSets: 3,
        plannedReps: 12,
        plannedWeight: 30,
        restTimeSeconds: 60,
        isSuperset: false,
      },
    ]);

    // Create workout exercises for Leg Day
    await db.insert(workoutExercises).values([
      {
        workoutId: legWorkout.id,
        exerciseId: exerciseData.find(e => e.name === 'Squat')!.id,
        order: 1,
        plannedSets: 4,
        plannedReps: 6,
        plannedWeight: 225,
        restTimeSeconds: 180,
        isSuperset: false,
      },
      {
        workoutId: legWorkout.id,
        exerciseId: exerciseData.find(e => e.name === 'Leg Press')!.id,
        order: 2,
        plannedSets: 3,
        plannedReps: 12,
        plannedWeight: 360,
        restTimeSeconds: 120,
        isSuperset: false,
      },
    ]);

    // Create a workout session (user actually did a workout)
    console.log('Creating workout session...');
    const [session] = await db.insert(workoutSessions).values({
      userId: user1.id,
      workoutId: pushWorkout.id,
      notes: 'Felt strong today, increased weight on bench',
    }).returning();

    // Create session exercises (what they actually did)
    console.log('Creating session exercises...');
    const [sessionEx1, sessionEx2, sessionEx3] = await db.insert(sessionExercises).values([
      {
        workoutSessionId: session.id,
        exerciseId: exerciseData.find(e => e.name === 'Bench Press')!.id,
        order: 1,
        isSuperset: false,
      },
      {
        workoutSessionId: session.id,
        exerciseId: exerciseData.find(e => e.name === 'Overhead Press')!.id,
        order: 2,
        isSuperset: false,
      },
      {
        workoutSessionId: session.id,
        exerciseId: exerciseData.find(e => e.name === 'Dips')!.id,
        order: 3,
        isSuperset: true,
        supersetGroup: 1,
      },
    ]).returning();

    // Create actual sets performed
    console.log('Creating workout sets...');
    await db.insert(workoutSet).values([
      // Bench Press sets
      {
        sessionExerciseId: sessionEx1.id,
        exerciseId: exerciseData.find(e => e.name === 'Bench Press')!.id,
        workoutSessionId: session.id,
        reps: 8,
        weight: 185,
        completed: true,
      },
      {
        sessionExerciseId: sessionEx1.id,
        exerciseId: exerciseData.find(e => e.name === 'Bench Press')!.id,
        workoutSessionId: session.id,
        reps: 8,
        weight: 185,
        completed: true,
      },
      {
        sessionExerciseId: sessionEx1.id,
        exerciseId: exerciseData.find(e => e.name === 'Bench Press')!.id,
        workoutSessionId: session.id,
        reps: 7,
        weight: 185,
        completed: true,
        notes: 'Struggled on last rep',
      },
      {
        sessionExerciseId: sessionEx1.id,
        exerciseId: exerciseData.find(e => e.name === 'Bench Press')!.id,
        workoutSessionId: session.id,
        reps: 6,
        weight: 185,
        completed: true,
      },
      // Overhead Press sets
      {
        sessionExerciseId: sessionEx2.id,
        exerciseId: exerciseData.find(e => e.name === 'Overhead Press')!.id,
        workoutSessionId: session.id,
        reps: 10,
        weight: 95,
        completed: true,
      },
      {
        sessionExerciseId: sessionEx2.id,
        exerciseId: exerciseData.find(e => e.name === 'Overhead Press')!.id,
        workoutSessionId: session.id,
        reps: 10,
        weight: 95,
        completed: true,
      },
      {
        sessionExerciseId: sessionEx2.id,
        exerciseId: exerciseData.find(e => e.name === 'Overhead Press')!.id,
        workoutSessionId: session.id,
        reps: 9,
        weight: 95,
        completed: true,
      },
      // Dips sets
      {
        sessionExerciseId: sessionEx3.id,
        exerciseId: exerciseData.find(e => e.name === 'Dips')!.id,
        workoutSessionId: session.id,
        reps: 12,
        weight: 0, // bodyweight
        completed: true,
      },
      {
        sessionExerciseId: sessionEx3.id,
        exerciseId: exerciseData.find(e => e.name === 'Dips')!.id,
        workoutSessionId: session.id,
        reps: 10,
        weight: 0,
        completed: true,
      },
      {
        sessionExerciseId: sessionEx3.id,
        exerciseId: exerciseData.find(e => e.name === 'Dips')!.id,
        workoutSessionId: session.id,
        reps: 8,
        weight: 0,
        completed: true,
        notes: 'Getting tired',
      },
    ]);

    console.log('✅ Database seeded successfully!');
    console.log(`Created ${exerciseData.length} exercises`);
    console.log(`Created 3 workouts for user: ${user1.name}`);
    console.log(`Created 1 workout session with actual sets`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seed function
seed()
  .then(() => {
    console.log('🎉 Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });