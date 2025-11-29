import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { pushSchedules } from '@/lib/db/schema';
import webpush from 'web-push';
import { eq } from 'drizzle-orm';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const CRON_SECRET = process.env.PUSH_CRON_SECRET || '';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:admin@example.com', VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function POST(req: NextRequest) {
  // Optional secret check: if PUSH_CRON_SECRET is set, require header
  if (CRON_SECRET) {
    const header = req.headers.get('x-push-cron-secret') || req.headers.get('x-vercel-cron-secret');
    if (!header || header !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Select unsent schedules
    const rows = await db.select().from(pushSchedules).where(eq(pushSchedules.sent, false));
    const now = Date.now();
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const r of rows) {
      const fireAt = new Date(r.fireAt).getTime();
      if (fireAt <= now) {
        const subscription = JSON.parse(r.subscription);
        try {
          const payload = JSON.stringify({ title: 'Timer', body: 'Your rest period is over' });
          await webpush.sendNotification(subscription, payload);
          await db.update(pushSchedules).set({ sent: true, sentAt: new Date() }).where(eq(pushSchedules.id, r.id));
          results.push({ id: r.id.toString(), ok: true });
        } catch (err: any) {
          console.error('Failed to send push for schedule', r.id, err);
          results.push({ id: r.id.toString(), ok: false, error: String(err) });
        }
      }
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (err) {
    console.error('/api/push/run error', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
