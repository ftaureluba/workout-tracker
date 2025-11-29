import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SUB_FILE = path.join(DATA_DIR, 'push-subscriptions.json');
const SCHEDULE_FILE = path.join(DATA_DIR, 'push-schedules.json');

type SubscriptionRecord = {
  endpoint: string;
  subscription: any;
  createdAt: string;
};

type ScheduleRecord = {
  id: string;
  subscriptionEndpoint: string;
  subscription: any;
  title?: string;
  body?: string;
  sendAt: string; // ISO
  createdAt: string;
};

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

async function readJson(file: string) {
  try {
    const txt = await fs.readFile(file, 'utf8');
    return JSON.parse(txt);
  } catch (err) {
    return [];
  }
}

async function writeJson(file: string, data: any) {
  await ensureDataDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

export async function listSubscriptions(): Promise<SubscriptionRecord[]> {
  return (await readJson(SUB_FILE)) as SubscriptionRecord[];
}

export async function saveSubscription(subscription: any) {
  if (!subscription || !subscription.endpoint) return;
  const subs = await listSubscriptions();
  const exists = subs.find((s: any) => s.endpoint === subscription.endpoint);
  if (exists) return;
  const rec: SubscriptionRecord = {
    endpoint: subscription.endpoint,
    subscription,
    createdAt: new Date().toISOString(),
  };
  subs.push(rec);
  await writeJson(SUB_FILE, subs);
}

export async function listSchedules(): Promise<ScheduleRecord[]> {
  return (await readJson(SCHEDULE_FILE)) as ScheduleRecord[];
}

export async function saveSchedule(schedule: Omit<ScheduleRecord, 'createdAt'>) {
  const schedules = await listSchedules();
  const rec: ScheduleRecord = {
    ...schedule,
    createdAt: new Date().toISOString(),
  } as ScheduleRecord;
  schedules.push(rec);
  await writeJson(SCHEDULE_FILE, schedules);
}

export async function removeSchedule(id: string) {
  const schedules = await listSchedules();
  const filtered = schedules.filter((s: any) => s.id !== id);
  await writeJson(SCHEDULE_FILE, filtered);
}

export default { listSubscriptions, saveSubscription, listSchedules, saveSchedule, removeSchedule };
