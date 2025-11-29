import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, userId } = body;
    console.info('Received subscription via /api/push/subscribe', subscription ? { endpoint: subscription.endpoint } : null);
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    try {
      const existing = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, subscription.endpoint));
      if (!existing.length) {
        await db.insert(pushSubscriptions).values({ endpoint: subscription.endpoint, subscription: JSON.stringify(subscription), userId: userId || null });
      }
    } catch (e) {
      console.error('Failed to persist subscription to DB', e);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('/api/push/subscribe error', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
