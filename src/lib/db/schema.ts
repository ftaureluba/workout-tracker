import { text, pgTable, timestamp, primaryKey, integer, real, boolean, uuid, unique } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
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
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
});

export const exercises = pgTable("exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  notes: text("notes"),

  // Categorization fields
  bodyParts: text("body_parts").array().default(sql`'{}'::text[]`), // Array of body parts
  equipment: text("equipment").array().default(sql`'{}'::text[]`), // Array of equipment
  movementType: text("movement_type").default("unknown"), // "compound" | "isolation"
  movementPattern: text("movement_pattern").default("unknown"), // "push", "pull", "squat", "hinge", "carry", "locomotion", "rotation"

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
});

export const workoutExercises = pgTable(
  "workout_exercises",
  {
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    plannedSets: integer("planned_sets"),
    plannedReps: integer("planned_reps"),
    plannedWeight: real("planned_weight"),
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
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  workoutId: uuid("workout_id").references(() => workouts.id, { onDelete: "cascade" }),
});

export const sessionExercises = pgTable("session_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  workoutSessionId: uuid("workout_session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id").references(() => exercises.id, { onDelete: "cascade" }),
  order: integer("order"),
  isSuperset: boolean("is_superset").default(false),
  supersetGroup: integer("superset_group"),
  name: text("exercise_name"),
});

export const workoutSet = pgTable("workout_set", {
  id: uuid("id").defaultRandom().primaryKey(),
  reps: integer("reps").notNull(),
  weight: real("weight").notNull(),
  notes: text("notes"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  sessionExerciseId: uuid("session_exercise_id").notNull().references(
    () => sessionExercises.id
  ),
  workoutSessionId: uuid("workout_session_id").notNull().references(
    () => workoutSessions.id
  ),
});

export const usersRelations = relations(users, ({ many }) => ({
  workouts: many(workouts),
  exercises: many(exercises),
  workoutSessions: many(workoutSessions),
}));

export const workoutsRelations = relations(workouts, ({ many, one }) => ({
  workoutExercises: many(workoutExercises),
  sessions: many(workoutSessions),
  user: one(users, {
    fields: [workouts.userId],
    references: [users.id],
  }),
}));

export const exercisesRelations = relations(exercises, ({ many, one }) => ({
  workoutExercises: many(workoutExercises),
  sessionExercises: many(sessionExercises),
  user: one(users, {
    fields: [exercises.userId],
    references: [users.id],
  }),
}));

export const workoutExercisesRelations = relations(
  workoutExercises,
  ({ one }) => ({
    workout: one(workouts, {
      fields: [workoutExercises.workoutId],
      references: [workouts.id],
    }),
    exercise: one(exercises, {
      fields: [workoutExercises.exerciseId],
      references: [exercises.id],
    }),
  })
);

export const workoutSessionsRelations = relations(
  workoutSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [workoutSessions.userId],
      references: [users.id],
    }),
    workout: one(workouts, {
      fields: [workoutSessions.workoutId],
      references: [workouts.id],
    }),
    sessionExercises: many(sessionExercises),
    sets: many(workoutSet),
  })
);

export const sessionExercisesRelations = relations(
  sessionExercises,
  ({ one, many }) => ({
    workoutSession: one(workoutSessions, {
      fields: [sessionExercises.workoutSessionId],
      references: [workoutSessions.id],
    }),
    exercise: one(exercises, {
      fields: [sessionExercises.exerciseId],
      references: [exercises.id],
    }),
    sets: many(workoutSet),
  })
);

export const workoutSetRelations = relations(workoutSet, ({ one }) => ({
  sessionExercise: one(sessionExercises, {
    fields: [workoutSet.sessionExerciseId],
    references: [sessionExercises.id],
  }),
}));

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  endpoint: text('endpoint').notNull().unique(),
  subscription: text('subscription').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').default(sql`now()`).notNull(),
});

export const pushJobs = pgTable('push_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  fireAt: timestamp('fire_at').notNull(),
  payload: text('payload').notNull(), // JSON serialized payload: { title, body, subscription }
  status: text('status').default('scheduled').notNull(), // 'scheduled' | 'sent' | 'failed'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').default(sql`now()`).notNull(),
  sentAt: timestamp('sent_at'),
});

export const userExerciseMetrics = pgTable(
  "user_exercise_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),

    // Personal stats
    bestWeight: real("best_weight"),
    bestVolume: real("best_volume"),
    best1RM: real("best_1rm"),
    lastPerformedAt: timestamp("last_performed_at"),

    updatedAt: timestamp("updated_at").default(sql`now()`),
  },
  (t) => ({
    // Ensure one metric record per user per exercise
    unq: unique().on(t.userId, t.exerciseId),
  })
);

export const userExerciseMetricsRelations = relations(userExerciseMetrics, ({ one }) => ({
  user: one(users, {
    fields: [userExerciseMetrics.userId],
    references: [users.id],
  }),
  exercise: one(exercises, {
    fields: [userExerciseMetrics.exerciseId],
    references: [exercises.id],
  }),
}));

