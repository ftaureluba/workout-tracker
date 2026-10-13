/**
 * Seed script for built-in strength training plans.
 *
 * Run with:
 *   npx tsx src/lib/seed-plans.ts
 *
 * Safe to run multiple times — skips plans that already exist by name.
 */

import "dotenv/config";
import { db } from "./db";
import { exercises, plans, planWeeks, planSessions, planSessionExercises } from "./db/schema";
import { eq, and, isNull } from "drizzle-orm";

// ─── Exercise name → DB id lookup ─────────────────────────────────────────────

async function getExerciseId(name: string): Promise<string> {
  const rows = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.name, name), isNull(exercises.userId)));
  if (rows[0]) return rows[0].id;

  const [exercise] = await db
    .insert(exercises)
    .values({ name, userId: null })
    .returning({ id: exercises.id });
  return exercise.id;
}

// ─── Plan seeding helper ───────────────────────────────────────────────────────

interface ExerciseDef {
  exerciseName: string;
  sets: number;
  reps: number;
  /** Fraction of e1RM, e.g. 0.8 = 80%. Omit for absolute or bodyweight. */
  pct?: number;
  /** Absolute kg override. */
  absKg?: number;
  restSeconds?: number;
  notes?: string;
}

interface SessionDef {
  label: string;
  dayOfWeek?: number;
  exercises: ExerciseDef[];
}

interface WeekDef {
  weekNumber: number;
  sessions: SessionDef[];
}

interface PlanDef {
  name: string;
  description: string;
  durationWeeks: number;
  sessionsPerWeek: number;
  weeks: WeekDef[];
}

async function seedPlan(def: PlanDef) {
  const existingRows = await db
    .select({ id: plans.id })
    .from(plans)
    .where(and(eq(plans.name, def.name), isNull(plans.userId)));

  let planId: string;
  if (existingRows[0]) {
    planId = existingRows[0].id;
  } else {
    const [plan] = await db
      .insert(plans)
      .values({
        name: def.name,
        description: def.description,
        durationWeeks: def.durationWeeks,
        sessionsPerWeek: def.sessionsPerWeek,
        isPublic: true,
        userId: null,
      })
      .returning({ id: plans.id });
    planId = plan.id;
  }

  const existingWeeks = await db
    .select()
    .from(planWeeks)
    .where(eq(planWeeks.planId, planId));

  for (const week of def.weeks) {
    let planWeek = existingWeeks.find((row) => row.weekNumber === week.weekNumber);
    if (!planWeek) {
      [planWeek] = await db
        .insert(planWeeks)
        .values({ planId, weekNumber: week.weekNumber })
        .returning();
    }

    const existingSessions = await db
      .select()
      .from(planSessions)
      .where(eq(planSessions.planWeekId, planWeek.id));

    for (let sIdx = 0; sIdx < week.sessions.length; sIdx++) {
      const s = week.sessions[sIdx];
      let planSession = existingSessions.find((row) => row.order === sIdx);
      if (!planSession) {
        [planSession] = await db
          .insert(planSessions)
          .values({
            planWeekId: planWeek.id,
            sessionLabel: s.label,
            dayOfWeek: s.dayOfWeek ?? null,
            order: sIdx,
          })
          .returning();
      }

      const existingExercises = await db
        .select({ order: planSessionExercises.order, exerciseId: planSessionExercises.exerciseId })
        .from(planSessionExercises)
        .where(eq(planSessionExercises.planSessionId, planSession.id));

      for (let eIdx = 0; eIdx < s.exercises.length; eIdx++) {
        const ex = s.exercises[eIdx];
        const exerciseId = await getExerciseId(ex.exerciseName);
        if (existingExercises.some((row) => row.order === eIdx && row.exerciseId === exerciseId)) continue;

        await db.insert(planSessionExercises).values({
          planSessionId: planSession.id,
          exerciseId,
          order: eIdx,
          prescribedSets: ex.sets,
          prescribedReps: ex.reps,
          prescribedWeightPct: ex.pct ?? null,
          prescribedWeightAbs: ex.absKg ?? null,
          restTimeSeconds: ex.restSeconds ?? null,
          notes: ex.notes ?? null,
        });
      }
    }
  }

  console.log(`  ✅ "${def.name}" available (${def.durationWeeks} weeks, ${def.sessionsPerWeek}×/week).`);
}

// ─── Programme definitions ─────────────────────────────────────────────────────

/**
 * Russian Squat Programme (RSP) — 6-week squat specialisation.
 * Sessions alternate between heavy (target %) and volume (higher reps, lower %).
 * 3 sessions per week.
 *
 * Week structure (% of 1RM × sets × reps):
 *   Week 1: 80%×6×2,  75%×6×5,  80%×6×2
 *   Week 2: 80%×6×3,  75%×6×5,  80%×6×3
 *   Week 3: 80%×6×4,  80%×6×3,  80%×6×4
 *   Week 4: 85%×5×2,  80%×6×4,  85%×5×2
 *   Week 5: 85%×5×3,  80%×6×4,  85%×5×3
 *   Week 6: 85%×5×4,  80%×6×4,  80%×6×2
 */
function buildRSP(): PlanDef {
  type Week = [number, number, number, number, number, number]; // [pctA, setsA, repsA, pctB, setsB, repsB]
  const schedule: Week[] = [
    [0.80, 2, 6, 0.75, 5, 6],
    [0.80, 3, 6, 0.75, 5, 6],
    [0.80, 4, 6, 0.80, 3, 6],
    [0.85, 2, 5, 0.80, 4, 6],
    [0.85, 3, 5, 0.80, 4, 6],
    [0.85, 4, 5, 0.80, 2, 6],
  ];

  const weeks: WeekDef[] = schedule.map(([pctA, setsA, repsA, pctB, setsB, repsB], i) => ({
    weekNumber: i + 1,
    sessions: [
      {
        label: `Week ${i + 1} – Day 1 (${Math.round(pctA * 100)}%×${setsA}×${repsA})`,
        dayOfWeek: 0,
        exercises: [{ exerciseName: "Squat", sets: setsA, reps: repsA, pct: pctA, restSeconds: 180 }],
      },
      {
        label: `Week ${i + 1} – Day 2 (volume ${Math.round(pctB * 100)}%×${setsB}×${repsB})`,
        dayOfWeek: 2,
        exercises: [{ exerciseName: "Squat", sets: setsB, reps: repsB, pct: pctB, restSeconds: 180 }],
      },
      {
        label: `Week ${i + 1} – Day 3 (${Math.round(pctA * 100)}%×${setsA}×${repsA})`,
        dayOfWeek: 4,
        exercises: [{ exerciseName: "Squat", sets: setsA, reps: repsA, pct: pctA, restSeconds: 180 }],
      },
    ],
  }));

  return {
    name: "Russian Squat Programme",
    description:
      "A classic 6-week squat specialisation programme. Three sessions per week alternating between heavy (85%) and volume (80%) days. Designed to rapidly increase squat strength via high frequency.\n\nAdd posterior chain work (Romanian deadlifts, leg curls) to complement the programme.",
    durationWeeks: 6,
    sessionsPerWeek: 3,
    weeks,
  };
}

/**
 * 5/3/1 (Wendler) — 4-week repeating cycle covering the big four lifts.
 * Week 1: 65%×5, 75%×5, 85%×5+
 * Week 2: 70%×3, 80%×3, 90%×3+
 * Week 3: 75%×5, 85%×3, 95%×1+
 * Week 4: Deload — 40%×5, 50%×5, 60%×5
 *
 * 4 sessions/week (one per lift per week).
 */
function build531(): PlanDef {
  const lifts = [
    { name: "Overhead Press", day: 0 },
    { name: "Deadlift", day: 1 },
    { name: "Bench Press", day: 3 },
    { name: "Squat", day: 4 },
  ];

  const weekConfigs = [
    { label: "5s", sets: [[0.65, 5], [0.75, 5], [0.85, 5]] as [number, number][] },
    { label: "3s", sets: [[0.70, 3], [0.80, 3], [0.90, 3]] as [number, number][] },
    { label: "1s", sets: [[0.75, 5], [0.85, 3], [0.95, 1]] as [number, number][] },
    { label: "Deload", sets: [[0.40, 5], [0.50, 5], [0.60, 5]] as [number, number][] },
  ];

  const weeks: WeekDef[] = weekConfigs.map((wk, wIdx) => ({
    weekNumber: wIdx + 1,
    sessions: lifts.map((lift) => ({
      label: `Week ${wIdx + 1} (${wk.label}) – ${lift.name}`,
      dayOfWeek: lift.day,
      exercises: wk.sets.map(([pct, reps], sIdx) => ({
        exerciseName: lift.name,
        sets: 1,
        reps,
        pct,
        restSeconds: 180,
        notes: sIdx === 2 && wIdx < 3 ? "AMRAP — do as many reps as possible" : undefined,
      })),
    })),
  }));

  return {
    name: "5/3/1 (Wendler)",
    description:
      "Jim Wendler's famous 5/3/1 programme. Four sessions per week, each focused on one of the big four lifts (squat, bench, deadlift, overhead press). Uses a 4-week wave: 5s → 3s → 1s → Deload.\n\nRecommend adding 2–3 assistance exercises (e.g. pull-ups, dips, rows) after each main lift.",
    durationWeeks: 4,
    sessionsPerWeek: 4,
    weeks,
  };
}

/**
 * GZCLP — beginner linear progression programme by Cody Lefever.
 * 3 sessions per week (A/B/A alternating), 3 tiers per session.
 * Progression: T1 adds 2.5 kg/session, T2 adds 5 kg/session.
 * Represented here as a 4-week block (two A/B cycles).
 *
 * Session A: T1=Squat, T2=Bench Press, T3=Pull-ups
 * Session B: T1=Overhead Press, T2=Deadlift, T3=Barbell Row
 */
function buildGZCLP(): PlanDef {
  const sessionA = (weekNum: number, sessionNum: number): SessionDef => ({
    label: `Week ${weekNum} – Session A (Squat / Bench)`,
    exercises: [
      { exerciseName: "Squat", sets: 5, reps: 3, notes: "T1: add 2.5 kg each session", restSeconds: 180 },
      { exerciseName: "Bench Press", sets: 4, reps: 6, notes: "T2: add 5 kg each session", restSeconds: 120 },
      { exerciseName: "Pull-ups", sets: 3, reps: 10, notes: "T3: bodyweight, add reps as able", restSeconds: 60 },
    ],
  });

  const sessionB = (weekNum: number): SessionDef => ({
    label: `Week ${weekNum} – Session B (OHP / Deadlift)`,
    exercises: [
      { exerciseName: "Overhead Press", sets: 5, reps: 3, notes: "T1: add 2.5 kg each session", restSeconds: 180 },
      { exerciseName: "Deadlift", sets: 4, reps: 6, notes: "T2: add 5 kg each session", restSeconds: 180 },
      { exerciseName: "Barbell Row", sets: 3, reps: 10, notes: "T3: add reps or weight as able", restSeconds: 60 },
    ],
  });

  // 4 weeks, 3 sessions/week: A B A | B A B | A B A | B A B
  const pattern = ["A", "B", "A", "B", "A", "B", "A", "B", "A", "B", "A", "B"];

  const weeks: WeekDef[] = [];
  for (let w = 1; w <= 4; w++) {
    const sessionOffset = (w - 1) * 3;
    const wkSessions: SessionDef[] = [];
    for (let s = 0; s < 3; s++) {
      const type = pattern[sessionOffset + s];
      wkSessions.push(type === "A" ? sessionA(w, s) : sessionB(w));
    }
    weeks.push({ weekNumber: w, sessions: wkSessions });
  }

  return {
    name: "GZCLP",
    description:
      "A beginner/intermediate linear progression programme by Cody Lefever. Three sessions per week alternating between Session A (Squat, Bench, Pull-ups) and Session B (OHP, Deadlift, Row). Uses a three-tier system: T1 is heavy compound work, T2 is secondary compound, T3 is assistance.\n\nAdd 2.5 kg to T1 and 5 kg to T2 after each session you complete all reps.",
    durationWeeks: 4,
    sessionsPerWeek: 3,
    weeks,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🏋️  Seeding strength training plans…\n");

  await seedPlan(buildRSP());
  await seedPlan(build531());
  await seedPlan(buildGZCLP());

  console.log("\n✅ Plan seeding complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
