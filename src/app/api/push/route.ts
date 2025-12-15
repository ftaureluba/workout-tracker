import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { scheduleNotificationDurable } from '@/lib/durable-push';

/**
 * POST /api/push
 * 
 * Immediate or delayed push notification via Durable Objects.
 * This endpoint now delegates to the event-driven Durable Objects system.
 * 
 * Request body:
 * {
 *   subscription: PushSubscription,
 *   title?: string,
 *   body?: string,
 *   delayMs?: number,
 *   userId?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, title = 'Timer', body: message = 'Time is up', delayMs = 0, userId } = body;

    if (!subscription) {
      return NextResponse.json({ error: 'Missing subscription' }, { status: 400 });
    }

    const now = Date.now();
    const fireAt = now + (Number(delayMs) || 0);

    // Get the Durable Objects URL from environment
    const durableObjectUrl = process.env.DURABLE_OBJECTS_URL || 'http://localhost:8787';

    // Use Durable Objects for scheduling (even immediate sends)
    const result = await scheduleNotificationDurable(
      {
        subscription,
        fireAt,
        title,
        body: message,
        userId,
      },
      durableObjectUrl
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error || 'Failed to schedule' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      scheduled: delayMs > 0,
      result: { id: result.id },
    });
  } catch (err) {
    console.error('Push API error', err);
    return NextResponse.json({ error: 'Internal error', ok: false }, { status: 500 });
  }
}
