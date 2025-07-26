
import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at").default(sql`now()`),
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

export const workoutSet = pgTable("workout_set", {
  id: uuid("id").defaultRandom().primaryKey(),
  reps: integer("reps").notNull(),
  weight: integer("weight").notNull(),
  notes: text("notes"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  exerciseId: uuid("exercise_id").references(() => exercises.id),
  workoutSessionId: uuid("workout_session_id").references(
    () => workoutSessions.id
  ),
});
