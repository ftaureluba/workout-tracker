import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { scheduleNotificationDurable } from '@/lib/durable-push';

/**
 * POST /api/push/schedule
 * 
 * Schedule a push notification using the Durable Objects backend.
 * This is an event-driven approach that replaces the old polling method.
 * 
 * Request body:
 * {
 *   subscription: PushSubscription,
 *   sendAt?: string | Date,
 *   delayMs?: number,
 *   title?: string,
 *   body?: string,
 *   userId?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, sendAt, delayMs = 0, title = 'Timer', body: message = 'Time is up', userId } = body;
    
    if (!subscription) {
      return NextResponse.json({ error: 'Missing subscription' }, { status: 400 });
    }

    const now = Date.now();
    const sendTimestamp = sendAt ? new Date(sendAt).getTime() : now + (Number(delayMs) || 0);

    // Get the Durable Objects URL from environment or use default
    const durableObjectUrl = process.env.NEXT_PUBLIC_DURABLE_OBJECTS_URL 
      ? `https://${process.env.NEXT_PUBLIC_DURABLE_OBJECTS_URL}`
      : 'http://localhost:8787';

    // Schedule via Durable Objects
    const result = await scheduleNotificationDurable(
      {
        subscription,
        fireAt: sendTimestamp,
        title,
        body: message,
        userId,
      },
      durableObjectUrl
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Failed to schedule' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, scheduled: true, id: result.id });
  } catch (err) {
    console.error('/api/push/schedule error', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
