"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  plans,
  planWeeks,
  planSessions,
  planSessionExercises,
  userPlanEnrollments,
  enrollmentExerciseMaxes,
  userPlanSessionLogs,
  planWorkoutLinks,
  workouts,
  workoutExercises,
} from "@/lib/db/schema";
import { eq, and, inArray, asc, sql } from "drizzle-orm";
import { resolveTargetWeight } from "@/lib/strength-calc";
import type { ActiveEnrollmentSummary, PlanDetail } from "@/lib/types";

// ─── Read helpers ─────────────────────────────────────────────────────────────

/** Returns all public plans + user's own plans, ordered by name. */
export async function getPlans() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const rows = await db
    .select()
    .from(plans)
    .orderBy(asc(plans.name));

  // Return public plans + the user's own private plans
  return rows.filter((p) => p.isPublic || (userId && p.userId === userId));
}

/** Full plan detail: plan → weeks → sessions → exercises (with exercise name). */
export async function getPlanDetail(planId: string): Promise<PlanDetail | null> {
  // Fetch plan
  const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
  if (!plan) return null;

  // Fetch weeks
  const weeks = await db
    .select()
    .from(planWeeks)
    .where(eq(planWeeks.planId, planId))
    .orderBy(asc(planWeeks.weekNumber));

  if (weeks.length === 0) {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description ?? undefined,
      durationWeeks: plan.durationWeeks,
      sessionsPerWeek: plan.sessionsPerWeek,
      isPublic: plan.isPublic,
      userId: plan.userId ?? undefined,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      weeks: [],
    };
  }

  const weekIds = weeks.map((w) => w.id);

  // Fetch sessions
  const sessions = await db
    .select()
    .from(planSessions)
    .where(inArray(planSessions.planWeekId, weekIds))
    .orderBy(asc(planSessions.order));

  const sessionIds = sessions.map((s) => s.id);

  // Fetch exercises (with joined exercise name)
  const exercises = sessionIds.length > 0
    ? await db.query.planSessionExercises.findMany({
        where: inArray(planSessionExercises.planSessionId, sessionIds),
        orderBy: asc(planSessionExercises.order),
        with: { exercise: true },
      })
    : [];

  // Build nested structure
  const exBySession = new Map<string, typeof exercises>();
  for (const ex of exercises) {
    const arr = exBySession.get(ex.planSessionId) ?? [];
    arr.push(ex);
    exBySession.set(ex.planSessionId, arr);
  }

  const sessionByWeek = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const arr = sessionByWeek.get(s.planWeekId) ?? [];
    arr.push(s);
    sessionByWeek.set(s.planWeekId, arr);
  }

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description ?? undefined,
    durationWeeks: plan.durationWeeks,
    sessionsPerWeek: plan.sessionsPerWeek,
    isPublic: plan.isPublic,
    userId: plan.userId ?? undefined,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    weeks: weeks.map((w) => ({
      id: w.id,
      planId: w.planId,
      weekNumber: w.weekNumber,
      sessions: (sessionByWeek.get(w.id) ?? []).map((s) => ({
        id: s.id,
        planWeekId: s.planWeekId,
        sessionLabel: s.sessionLabel,
        dayOfWeek: s.dayOfWeek,
        order: s.order,
        exercises: (exBySession.get(s.id) ?? []).map((e) => ({
          id: e.id,
          planSessionId: e.planSessionId,
          exerciseId: e.exerciseId,
          order: e.order,
          prescribedSets: e.prescribedSets,
          prescribedReps: e.prescribedReps,
          prescribedWeightPct: e.prescribedWeightPct,
          prescribedWeightAbs: e.prescribedWeightAbs,
          restTimeSeconds: e.restTimeSeconds,
          notes: e.notes,
          exercise: e.exercise
            ? {
                id: e.exercise.id,
                name: e.exercise.name,
                description: e.exercise.description,
                notes: e.exercise.notes,
                userId: e.exercise.userId,
                createdAt: e.exercise.createdAt?.toISOString() ?? null,
                updatedAt: e.exercise.updatedAt?.toISOString() ?? null,
              }
            : undefined,
        })),
      })),
    })),
  };
}

/** Returns active enrollments with plan info and progress for the current user. */
export async function getActiveEnrollments(): Promise<ActiveEnrollmentSummary[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const enrollments = await db.query.userPlanEnrollments.findMany({
    where: and(
      eq(userPlanEnrollments.userId, session.user.id),
      eq(userPlanEnrollments.status, "active")
    ),
    with: { plan: true },
  });

  const results: ActiveEnrollmentSummary[] = [];

  for (const enrollment of enrollments) {
    if (!enrollment.plan) continue;

    // Count total sessions in plan
    const weekRows = await db
      .select({ id: planWeeks.id })
      .from(planWeeks)
      .where(eq(planWeeks.planId, enrollment.planId));

    const weekIds = weekRows.map((w) => w.id);
    let totalSessions = 0;
    if (weekIds.length > 0) {
      const [countRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(planSessions)
        .where(inArray(planSessions.planWeekId, weekIds));
      totalSessions = countRow?.count ?? 0;
    }

    // Count completed sessions
    const [completedRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userPlanSessionLogs)
      .where(eq(userPlanSessionLogs.enrollmentId, enrollment.id));
    const completedSessions = completedRow?.count ?? 0;

    // Find next plan session
    const currentWeekRows = await db
      .select({ id: planWeeks.id })
      .from(planWeeks)
      .where(
        and(
          eq(planWeeks.planId, enrollment.planId),
          eq(planWeeks.weekNumber, enrollment.currentWeek)
        )
      );

    let nextSession = null;
    if (currentWeekRows.length > 0) {
      const currentWeekId = currentWeekRows[0].id;
      const sessions = await db
        .select()
        .from(planSessions)
        .where(eq(planSessions.planWeekId, currentWeekId))
        .orderBy(asc(planSessions.order));

      const sessionAtOrder = sessions[enrollment.currentSessionOrder] ?? sessions[0];

      if (sessionAtOrder) {
        const exRows = await db.query.planSessionExercises.findMany({
          where: eq(planSessionExercises.planSessionId, sessionAtOrder.id),
          orderBy: asc(planSessionExercises.order),
          with: { exercise: true },
        });

        nextSession = {
          id: sessionAtOrder.id,
          planWeekId: sessionAtOrder.planWeekId,
          sessionLabel: sessionAtOrder.sessionLabel,
          dayOfWeek: sessionAtOrder.dayOfWeek,
          order: sessionAtOrder.order,
          exercises: exRows.map((e) => ({
            id: e.id,
            planSessionId: e.planSessionId,
            exerciseId: e.exerciseId,
            order: e.order,
            prescribedSets: e.prescribedSets,
            prescribedReps: e.prescribedReps,
            prescribedWeightPct: e.prescribedWeightPct,
            prescribedWeightAbs: e.prescribedWeightAbs,
            restTimeSeconds: e.restTimeSeconds,
            notes: e.notes,
            exercise: e.exercise
              ? {
                  id: e.exercise.id,
                  name: e.exercise.name,
                  description: e.exercise.description,
                  notes: e.exercise.notes,
                  userId: e.exercise.userId,
                  createdAt: e.exercise.createdAt?.toISOString() ?? null,
                  updatedAt: e.exercise.updatedAt?.toISOString() ?? null,
                }
              : undefined,
          })),
        };
      }
    }

    results.push({
      enrollment: {
        id: enrollment.id,
        userId: enrollment.userId,
        planId: enrollment.planId,
        startedAt: enrollment.startedAt.toISOString(),
        completedAt: enrollment.completedAt?.toISOString() ?? null,
        currentWeek: enrollment.currentWeek,
        currentSessionOrder: enrollment.currentSessionOrder,
        status: enrollment.status as "active",
        createdAt: enrollment.createdAt.toISOString(),
      },
      plan: {
        id: enrollment.plan.id,
        name: enrollment.plan.name,
        description: enrollment.plan.description ?? undefined,
        durationWeeks: enrollment.plan.durationWeeks,
        sessionsPerWeek: enrollment.plan.sessionsPerWeek,
        isPublic: enrollment.plan.isPublic,
        userId: enrollment.plan.userId ?? undefined,
        createdAt: enrollment.plan.createdAt.toISOString(),
        updatedAt: enrollment.plan.updatedAt.toISOString(),
      },
      nextSession,
      totalSessions,
      completedSessions,
    });
  }

  return results;
}

/**
 * Checks whether a given workoutId was generated by a plan enrollment.
 * Returns the link row (with planSessionId + enrollmentId) or null.
 */
export async function getPlanLinkForWorkout(workoutId: string) {
  const [link] = await db
    .select()
    .from(planWorkoutLinks)
    .where(eq(planWorkoutLinks.workoutId, workoutId));
  return link ?? null;
}

// ─── Write helpers ─────────────────────────────────────────────────────────────

/**
 * Enrolls the current user in a plan.
 *
 * Steps:
 * 1. Insert enrollment row.
 * 2. Save the e1RM maxes provided by the wizard.
 * 3. Generate one Workout row per plan session, with workout_exercises pre-filled
 *    with the resolved kg targets (using %1RM * e1rm, rounded to 2.5 kg).
 * 4. Insert planWorkoutLinks rows.
 *
 * Returns the new enrollment ID.
 */
export async function enrollInPlan(input: {
  planId: string;
  exerciseMaxes: { exerciseId: string; weightKg: number; reps: number; e1rm: number }[];
}): Promise<{ enrollmentId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const userId = session.user.id;

  // 1. Insert enrollment
  const [enrollment] = await db
    .insert(userPlanEnrollments)
    .values({
      userId,
      planId: input.planId,
      currentWeek: 1,
      currentSessionOrder: 0,
      status: "active",
    })
    .returning();

  // 2. Save exercise maxes
  if (input.exerciseMaxes.length > 0) {
    await db.insert(enrollmentExerciseMaxes).values(
      input.exerciseMaxes.map((m) => ({
        enrollmentId: enrollment.id,
        exerciseId: m.exerciseId,
        e1rm: m.e1rm,
      }))
    );
  }

  // Build e1RM lookup
  const e1rmMap = new Map<string, number>(
    input.exerciseMaxes.map((m) => [m.exerciseId, m.e1rm])
  );

  // 3. Fetch all plan sessions with exercises
  const planDetail = await getPlanDetail(input.planId);
  if (!planDetail) throw new Error("Plan not found");

  // 4. Generate Workout rows (one per plan session)
  for (const week of planDetail.weeks) {
    for (const ps of week.sessions) {
      const workoutName = `📋 ${planDetail.name} – ${ps.sessionLabel}`;

      const [newWorkout] = await db
        .insert(workouts)
        .values({
          name: workoutName,
          userId,
          description: `Auto-generated from plan: ${planDetail.name}`,
        })
        .returning();

      // Insert workout_exercises for each prescribed exercise
      for (const pse of ps.exercises) {
        const e1rm = e1rmMap.get(pse.exerciseId) ?? null;
        const resolvedWeight = resolveTargetWeight({
          prescribedWeightPct: pse.prescribedWeightPct,
          prescribedWeightAbs: pse.prescribedWeightAbs,
          e1rm,
        });

        await db.insert(workoutExercises).values({
          workoutId: newWorkout.id,
          exerciseId: pse.exerciseId,
          order: pse.order,
          plannedSets: pse.prescribedSets,
          plannedReps: pse.prescribedReps,
          plannedWeight: resolvedWeight ?? undefined,
          restTimeSeconds: pse.restTimeSeconds ?? undefined,
          notes: pse.notes ?? undefined,
        });
      }

      // Insert planWorkoutLink
      await db.insert(planWorkoutLinks).values({
        workoutId: newWorkout.id,
        planSessionId: ps.id,
        enrollmentId: enrollment.id,
      });
    }
  }

  return { enrollmentId: enrollment.id };
}

/**
 * Advances the enrollment pointer after a plan session is completed.
 * Also creates a session log row.
 */
export async function advancePlanEnrollment(opts: {
  enrollmentId: string;
  planSessionId: string;
  workoutSessionId?: string;
}): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const [enrollment] = await db
    .select()
    .from(userPlanEnrollments)
    .where(
      and(
        eq(userPlanEnrollments.id, opts.enrollmentId),
        eq(userPlanEnrollments.userId, session.user.id)
      )
    );
  if (!enrollment) throw new Error("Enrollment not found");

  // Log the completed session
  await db.insert(userPlanSessionLogs).values({
    enrollmentId: opts.enrollmentId,
    planSessionId: opts.planSessionId,
    workoutSessionId: opts.workoutSessionId ?? null,
  });

  // Figure out how many sessions are in the current week
  const [weekRow] = await db
    .select({ id: planWeeks.id })
    .from(planWeeks)
    .where(
      and(
        eq(planWeeks.planId, enrollment.planId),
        eq(planWeeks.weekNumber, enrollment.currentWeek)
      )
    );

  let nextWeek = enrollment.currentWeek;
  let nextOrder = enrollment.currentSessionOrder + 1;
  let newStatus = enrollment.status;

  if (weekRow) {
    const sessionsInWeek = await db
      .select({ id: planSessions.id })
      .from(planSessions)
      .where(eq(planSessions.planWeekId, weekRow.id));

    if (nextOrder >= sessionsInWeek.length) {
      // Move to next week
      nextWeek += 1;
      nextOrder = 0;
    }
  }

  // Check if plan is completed
  const planRow = await db
    .select({ durationWeeks: plans.durationWeeks })
    .from(plans)
    .where(eq(plans.id, enrollment.planId));

  const durationWeeks = planRow[0]?.durationWeeks ?? 1;
  if (nextWeek > durationWeeks) {
    newStatus = "completed";
    await db
      .update(userPlanEnrollments)
      .set({
        currentWeek: nextWeek,
        currentSessionOrder: nextOrder,
        status: newStatus,
        completedAt: new Date(),
      })
      .where(eq(userPlanEnrollments.id, opts.enrollmentId));
    return;
  }

  await db
    .update(userPlanEnrollments)
    .set({
      currentWeek: nextWeek,
      currentSessionOrder: nextOrder,
      status: newStatus,
    })
    .where(eq(userPlanEnrollments.id, opts.enrollmentId));
}

/** Pause / abandon / resume an enrollment. */
export async function updateEnrollmentStatus(
  enrollmentId: string,
  status: "active" | "paused" | "abandoned"
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await db
    .update(userPlanEnrollments)
    .set({ status })
    .where(
      and(
        eq(userPlanEnrollments.id, enrollmentId),
        eq(userPlanEnrollments.userId, session.user.id)
      )
    );
}
