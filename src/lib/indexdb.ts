const DB_NAME ="workout-tracker"
const DB_VERSION = 1;
import { ActiveSession,Workout } from "./types";

export interface PendingSync {
  id?: number;
  data: ActiveSession;
  timestamp: string;
}

const STORES = {
    WORKOUTS:"workouts",
    ACTIVE_SESSIONS: "active_sessions",
    PENDING_SYNCS: "pending_syncs"
}

export function initDB(): Promise<IDBDatabase>{
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = () => {
            const db = (event?.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORES.WORKOUTS)){ db.createObjectStore(STORES.WORKOUTS, {keyPath: "id"})}

            if (!db.objectStoreNames.contains(STORES.ACTIVE_SESSIONS)){
                const sessionStore = db.createObjectStore(STORES.ACTIVE_SESSIONS, {keyPath: "sessionId"})
                sessionStore.createIndex("startedAt", "startedAt")}
            
            if (!db.objectStoreNames.contains(STORES.PENDING_SYNCS)){db.createObjectStore(STORES.PENDING_SYNCS, {autoIncrement: true})}
        }
    })
}

export async function saveWorkoutsToCache(workouts: Workout[]): Promise<void>{
    const db = await initDB();
    const tx = db.transaction(STORES.WORKOUTS, "readwrite")
    const store = tx.objectStore(STORES.WORKOUTS)

    for (const workout of workouts){
        store.put(workout);
    }

    return new Promise<void>((resolve,reject)=>{
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error)
    })
}

export async function getWorkoutFromCache(workoutId: string): Promise<Workout | undefined> {
  if (!workoutId) return undefined;
  
  const db = await initDB();
  const tx = db.transaction(STORES.WORKOUTS, "readonly");
  const store = tx.objectStore(STORES.WORKOUTS);

  return new Promise((resolve, reject) => {
    const request = store.get(workoutId);
    request.onsuccess = () => resolve(request.result as Workout | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllWorkoutsFromCache(): Promise<Workout[]> {
  const db = await initDB();
  const tx = db.transaction(STORES.WORKOUTS, "readonly");
  const store = tx.objectStore(STORES.WORKOUTS);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as Workout[]);
    request.onerror = () => reject(request.error);
  });
}

export async function clearWorkoutCache(): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(STORES.WORKOUTS, "readwrite");
  const store = tx.objectStore(STORES.WORKOUTS);

  return new Promise<void>((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveActiveSession(session: ActiveSession): Promise<void> {
    const db = await initDB();
  const tx = db.transaction(STORES.ACTIVE_SESSIONS, "readwrite");
  const store = tx.objectStore(STORES.ACTIVE_SESSIONS);

  const sessionWithTimestamp: ActiveSession = {
    ...session,
    lastSaved: new Date().toISOString(),
  };

  store.put(sessionWithTimestamp);

  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getActiveSession(sessionId: string): Promise<ActiveSession | undefined> {
  if (!sessionId) return undefined;
  
  const db = await initDB();
  const tx = db.transaction(STORES.ACTIVE_SESSIONS, "readonly");
  const store = tx.objectStore(STORES.ACTIVE_SESSIONS);

  return new Promise((resolve, reject) => {
    const request = store.get(sessionId);
    request.onsuccess = () => resolve(request.result as ActiveSession | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteActiveSession(sessionId: string): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(STORES.ACTIVE_SESSIONS, "readwrite");
  const store = tx.objectStore(STORES.ACTIVE_SESSIONS);

  store.delete(sessionId);

  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllActiveSessions(): Promise<ActiveSession[]> {
  const db = await initDB();
  const tx = db.transaction(STORES.ACTIVE_SESSIONS, "readonly");
  const store = tx.objectStore(STORES.ACTIVE_SESSIONS);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as ActiveSession[]);
    request.onerror = () => reject(request.error);
  });
}


export async function queueSync(data: ActiveSession): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(STORES.PENDING_SYNCS, "readwrite");
  const store = tx.objectStore(STORES.PENDING_SYNCS);

  const syncItem: Omit<PendingSync, 'id'> = {
    data,
    timestamp: new Date().toISOString(),
  };

  store.add(syncItem);

  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingSyncs(): Promise<PendingSync[]> {
  const db = await initDB();
  const tx = db.transaction(STORES.PENDING_SYNCS, "readonly");
  const store = tx.objectStore(STORES.PENDING_SYNCS);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as PendingSync[]);
    request.onerror = () => reject(request.error);
  });
}

export async function clearPendingSync(key: number): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(STORES.PENDING_SYNCS, "readwrite");
  const store = tx.objectStore(STORES.PENDING_SYNCS);

  store.delete(key);

  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllPendingSyncs(): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(STORES.PENDING_SYNCS, "readwrite");
  const store = tx.objectStore(STORES.PENDING_SYNCS);

  return new Promise<void>((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}