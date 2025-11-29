import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { pushSchedules } from '@/lib/db/schema';
import webpush from 'web-push';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:admin@example.com', VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, sendAt, delayMs = 0, title = 'Timer', body: message = 'Time is up', userId } = body;
    if (!subscription) return NextResponse.json({ error: 'Missing subscription' }, { status: 400 });

    const now = Date.now();
    const sendTimestamp = sendAt ? new Date(sendAt).getTime() : now + (Number(delayMs) || 0);

    // Persist schedule to Postgres
    await db.insert(pushSchedules).values({
      userId: userId || null,
      subscription: JSON.stringify(subscription),
      fireAt: new Date(sendTimestamp),
      sent: false,
    });

    // If immediate (or past), try to send now (best-effort)
    if (sendTimestamp <= now) {
      try {
        const payload = JSON.stringify({ title, body: message });
        const result = await webpush.sendNotification(subscription, payload);
        return NextResponse.json({ ok: true, sent: true, result });
      } catch (err) {
        console.error('Immediate scheduled push failed', err);
        return NextResponse.json({ ok: true, scheduled: true, warning: String(err) });
      }
    }

    return NextResponse.json({ ok: true, scheduled: true });
  } catch (err) {
    console.error('/api/push/schedule error', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
