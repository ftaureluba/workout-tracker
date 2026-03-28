import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { ActiveSession, Workout } from "./types";

// ── Schema definition ────────────────────────────────────────────────
export interface PendingSync {
  id?: number;
  data: ActiveSession;
  timestamp: string;
}

interface WorkoutTrackerDB extends DBSchema {
  workouts: {
    key: string;
    value: Workout;
  };
  active_sessions: {
    key: string;
    value: ActiveSession;
    indexes: { startedAt: string };
  };
  pending_syncs: {
    key: number;
    value: PendingSync;
  };
}

const DB_NAME = "workout-tracker";
const DB_VERSION = 1;

// ── Single cached connection ─────────────────────────────────────────
let dbPromise: Promise<IDBPDatabase<WorkoutTrackerDB>> | null = null;

function getDB(): Promise<IDBPDatabase<WorkoutTrackerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<WorkoutTrackerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("workouts")) {
          db.createObjectStore("workouts", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("active_sessions")) {
          const sessionStore = db.createObjectStore("active_sessions", {
            keyPath: "sessionId",
          });
          sessionStore.createIndex("startedAt", "startedAt");
        }
        if (!db.objectStoreNames.contains("pending_syncs")) {
          db.createObjectStore("pending_syncs", { autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

// ── Workouts ─────────────────────────────────────────────────────────
export async function saveWorkoutsToCache(workouts: Workout[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("workouts", "readwrite");
  await Promise.all([
    ...workouts.map((w) => tx.store.put(w)),
    tx.done,
  ]);
}

export async function getWorkoutFromCache(
  workoutId: string
): Promise<Workout | undefined> {
  if (!workoutId) return undefined;
  const db = await getDB();
  return db.get("workouts", workoutId);
}

export async function getAllWorkoutsFromCache(): Promise<Workout[]> {
  const db = await getDB();
  return db.getAll("workouts");
}

export async function clearWorkoutCache(): Promise<void> {
  const db = await getDB();
  await db.clear("workouts");
}

// ── Active Sessions ──────────────────────────────────────────────────
export async function saveActiveSession(
  session: ActiveSession
): Promise<void> {
  const db = await getDB();
  const sessionWithTimestamp: ActiveSession = {
    ...session,
    lastSaved: new Date().toISOString(),
  };
  await db.put("active_sessions", sessionWithTimestamp);
}

export async function getActiveSession(
  sessionId: string
): Promise<ActiveSession | undefined> {
  if (!sessionId) return undefined;
  const db = await getDB();
  return db.get("active_sessions", sessionId);
}

export async function deleteActiveSession(
  sessionId: string
): Promise<void> {
  const db = await getDB();
  await db.delete("active_sessions", sessionId);
}

export async function getAllActiveSessions(): Promise<ActiveSession[]> {
  const db = await getDB();
  return db.getAll("active_sessions");
}

// ── Pending Syncs ────────────────────────────────────────────────────
export async function queueSync(data: ActiveSession): Promise<void> {
  const db = await getDB();
  const syncItem: Omit<PendingSync, "id"> = {
    data,
    timestamp: new Date().toISOString(),
  };
  await db.add("pending_syncs", syncItem as PendingSync);
}

export async function getPendingSyncs(): Promise<PendingSync[]> {
  const db = await getDB();
  return db.getAll("pending_syncs");
}

export async function clearPendingSync(key: number): Promise<void> {
  const db = await getDB();
  await db.delete("pending_syncs", key);
}

export async function clearAllPendingSyncs(): Promise<void> {
  const db = await getDB();
  await db.clear("pending_syncs");
}

// ── Bulk Clear ───────────────────────────────────────────────────────
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ["workouts", "active_sessions", "pending_syncs"],
    "readwrite"
  );
  await Promise.all([
    tx.objectStore("workouts").clear(),
    tx.objectStore("active_sessions").clear(),
    tx.objectStore("pending_syncs").clear(),
    tx.done,
  ]);
}