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
  setOrder: integer("set_order").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  sessionExerciseId: uuid("session_exercise_id").notNull().references(
    () => sessionExercises.id, { onDelete: "cascade" }
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

// ─────────────────────────────────────────────────────────────────────────────
// PLANS FEATURE
// ─────────────────────────────────────────────────────────────────────────────

/** Top-level programme template (system-seeded or user-created). */
export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  durationWeeks: integer("duration_weeks").notNull(),
  sessionsPerWeek: integer("sessions_per_week").notNull().default(3),
  isPublic: boolean("is_public").default(false).notNull(),
  /** null for system/seeded templates */
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

/** One row per week of a plan. */
export const planWeeks = pgTable("plan_weeks", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(), // 1-indexed
});

/** One scheduled training session within a week. */
export const planSessions = pgTable("plan_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  planWeekId: uuid("plan_week_id")
    .notNull()
    .references(() => planWeeks.id, { onDelete: "cascade" }),
  sessionLabel: text("session_label").notNull(), // e.g. "Week 1 – Day 1 (80%)"
  /** Cosmetic hint: 0 = Mon … 6 = Sun */
  dayOfWeek: integer("day_of_week"),
  order: integer("order").notNull().default(0),
});

/** Prescribed exercises (with targets) for each plan session. */
export const planSessionExercises = pgTable("plan_session_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  planSessionId: uuid("plan_session_id")
    .notNull()
    .references(() => planSessions.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  prescribedSets: integer("prescribed_sets").notNull(),
  prescribedReps: integer("prescribed_reps").notNull(),
  /** % of e1RM — primary for periodised plans (e.g. 0.80 = 80%). Mutually exclusive with abs. */
  prescribedWeightPct: real("prescribed_weight_pct"),
  /** Absolute kg — for fixed-weight or bodyweight plans. */
  prescribedWeightAbs: real("prescribed_weight_abs"),
  restTimeSeconds: integer("rest_time_seconds"),
  notes: text("notes"),
});

/** Tracks a user's enrollment in a plan (multiple active allowed). */
export const userPlanEnrollments = pgTable("user_plan_enrollments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").default(sql`now()`).notNull(),
  completedAt: timestamp("completed_at"),
  currentWeek: integer("current_week").notNull().default(1),
  currentSessionOrder: integer("current_session_order").notNull().default(0),
  /** 'active' | 'paused' | 'completed' | 'abandoned' */
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

/** e1RM captured per exercise at enrollment time, used to resolve %1RM targets. */
export const enrollmentExerciseMaxes = pgTable("enrollment_exercise_maxes", {
  id: uuid("id").defaultRandom().primaryKey(),
  enrollmentId: uuid("enrollment_id")
    .notNull()
    .references(() => userPlanEnrollments.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "cascade" }),
  /** Estimated 1-rep max in kg (Epley formula from enrollment wizard). */
  e1rm: real("e1rm").notNull(),
});

/**
 * Ties a completed workout_session back to the plan session it fulfilled,
 * and records the advancement of the enrollment pointer.
 */
export const userPlanSessionLogs = pgTable("user_plan_session_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  enrollmentId: uuid("enrollment_id")
    .notNull()
    .references(() => userPlanEnrollments.id, { onDelete: "cascade" }),
  planSessionId: uuid("plan_session_id")
    .notNull()
    .references(() => planSessions.id, { onDelete: "cascade" }),
  workoutSessionId: uuid("workout_session_id").references(
    () => workoutSessions.id,
    { onDelete: "set null" }
  ),
  completedAt: timestamp("completed_at").default(sql`now()`).notNull(),
});

/**
 * Join table that links a generated Workout row back to the plan session
 * it was created from. This is the bridge between the plan world and the
 * existing workout infrastructure.
 */
export const planWorkoutLinks = pgTable(
  "plan_workout_links",
  {
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    planSessionId: uuid("plan_session_id")
      .notNull()
      .references(() => planSessions.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => userPlanEnrollments.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.workoutId] }),
  })
);

// ── Plans Relations ────────────────────────────────────────────────────────────

export const plansRelations = relations(plans, ({ one, many }) => ({
  user: one(users, { fields: [plans.userId], references: [users.id] }),
  weeks: many(planWeeks),
  enrollments: many(userPlanEnrollments),
}));

export const planWeeksRelations = relations(planWeeks, ({ one, many }) => ({
  plan: one(plans, { fields: [planWeeks.planId], references: [plans.id] }),
  sessions: many(planSessions),
}));

export const planSessionsRelations = relations(planSessions, ({ one, many }) => ({
  week: one(planWeeks, {
    fields: [planSessions.planWeekId],
    references: [planWeeks.id],
  }),
  exercises: many(planSessionExercises),
  workoutLinks: many(planWorkoutLinks),
  logs: many(userPlanSessionLogs),
}));

export const planSessionExercisesRelations = relations(planSessionExercises, ({ one }) => ({
  planSession: one(planSessions, {
    fields: [planSessionExercises.planSessionId],
    references: [planSessions.id],
  }),
  exercise: one(exercises, {
    fields: [planSessionExercises.exerciseId],
    references: [exercises.id],
  }),
}));

export const userPlanEnrollmentsRelations = relations(userPlanEnrollments, ({ one, many }) => ({
  user: one(users, {
    fields: [userPlanEnrollments.userId],
    references: [users.id],
  }),
  plan: one(plans, {
    fields: [userPlanEnrollments.planId],
    references: [plans.id],
  }),
  exerciseMaxes: many(enrollmentExerciseMaxes),
  sessionLogs: many(userPlanSessionLogs),
  workoutLinks: many(planWorkoutLinks),
}));

export const enrollmentExerciseMaxesRelations = relations(enrollmentExerciseMaxes, ({ one }) => ({
  enrollment: one(userPlanEnrollments, {
    fields: [enrollmentExerciseMaxes.enrollmentId],
    references: [userPlanEnrollments.id],
  }),
  exercise: one(exercises, {
    fields: [enrollmentExerciseMaxes.exerciseId],
    references: [exercises.id],
  }),
}));

export const userPlanSessionLogsRelations = relations(userPlanSessionLogs, ({ one }) => ({
  enrollment: one(userPlanEnrollments, {
    fields: [userPlanSessionLogs.enrollmentId],
    references: [userPlanEnrollments.id],
  }),
  planSession: one(planSessions, {
    fields: [userPlanSessionLogs.planSessionId],
    references: [planSessions.id],
  }),
  workoutSession: one(workoutSessions, {
    fields: [userPlanSessionLogs.workoutSessionId],
    references: [workoutSessions.id],
  }),
}));

export const planWorkoutLinksRelations = relations(planWorkoutLinks, ({ one }) => ({
  workout: one(workouts, {
    fields: [planWorkoutLinks.workoutId],
    references: [workouts.id],
  }),
  planSession: one(planSessions, {
    fields: [planWorkoutLinks.planSessionId],
    references: [planSessions.id],
  }),
  enrollment: one(userPlanEnrollments, {
    fields: [planWorkoutLinks.enrollmentId],
    references: [userPlanEnrollments.id],
  }),
}));
