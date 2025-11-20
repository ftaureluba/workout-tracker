import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import webpush from 'web-push';

// Server-side push sender. Expects JSON POST with shape:
// { subscription: PushSubscription, title?: string, body?: string, delayMs?: number }

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    'mailto:admin@example.com',
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, title = 'Timer', body: message = 'Time is up', delayMs = 0 } = body;

    if (!subscription) {
      return NextResponse.json({ error: 'Missing subscription' }, { status: 400 });
    }

    const payload = JSON.stringify({ title, body: message });

    const send = async () => {
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (err) {
        console.error('web-push send failed', err);
      }
    };

    if (delayMs && typeof delayMs === 'number' && delayMs > 0) {
      // Best-effort scheduling using setTimeout. Not reliable on serverless platforms.
      setTimeout(send, delayMs);
      return NextResponse.json({ ok: true, scheduled: true });
    }

    await send();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Push API error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
