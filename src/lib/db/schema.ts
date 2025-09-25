import { text, pgTable, timestamp, primaryKey, integer, boolean, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const workouts = pgTable("workouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  userId: uuid("user_id").references(() => users.id),
});

export const exercises = pgTable("exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  userId: uuid("user_id").references(() => users.id),
});

export const workoutExercises = pgTable(
  "workout_exercises",
  {
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id),
    order: integer("order").notNull(),
    plannedSets: integer("planned_sets"),
    plannedReps: integer("planned_reps"),
    plannedWeight: integer("planned_weight"), 
    restTimeSeconds: integer("rest_time_seconds"),
    notes: text("notes"), 
    isSuperset: boolean("is_superset").default(false),
    supersetGroup: integer("superset_group"), 
  },
  (t) => ({
    pk: primaryKey({ columns: [t.workoutId, t.exerciseId] }),
  })
);

export const workoutSessions = pgTable("workout_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  userId: uuid("user_id").references(() => users.id),
  workoutId: uuid("workout_id").references(() => workouts.id),
});

export const sessionExercises = pgTable("session_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  workoutSessionId: uuid("workout_session_id").notNull().references(() => workoutSessions.id),
  exerciseId: uuid("exercise_id").references(() => exercises.id), 
  order: integer("order"),
  isSuperset: boolean("is_superset").default(false),
  supersetGroup: integer("superset_group"),
});

export const workoutSet = pgTable("workout_set", {
  id: uuid("id").defaultRandom().primaryKey(),
  reps: integer("reps").notNull(),
  weight: integer("weight").notNull(),
  notes: text("notes"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id),
  sessionExerciseId: uuid("session_exercise_id").notNull().references(
    () => sessionExercises.id
  ),
  workoutSessionId: uuid("workout_session_id").notNull().references(
    () => workoutSessions.id
  ),
});

