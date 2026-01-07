import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { pushJobs } from '@/lib/db/schema';

/**
 * POST /api/push/schedule
 * 
 * Schedule a push notification using the Durable Objects backend.
 * 
 * Flow:
 * 1. Create Job in DB with status: 'scheduled'
 * 2. Call Worker with jobId and fireAt
 * 3. Worker sets alarm and calls /api/push/fire when it fires
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
  console.log('[/api/push/schedule] Received request');
  try {
    const body = await req.json();
    const { subscription, sendAt, delayMs = 1000, title = 'Timer', body: message = 'Time is up', userId } = body;

    console.log('[/api/push/schedule] Parsed body:', {
      hasSubscription: !!subscription,
      subscriptionEndpoint: subscription?.endpoint?.substring(0, 50) + '...',
      sendAt,
      delayMs,
      title,
      userId: userId || 'none'
    });

    if (!subscription) {
      console.log('[/api/push/schedule] Missing subscription, returning 400');
      return NextResponse.json({ error: 'Missing subscription' }, { status: 400 });
    }

    const now = Date.now();
    const fireAtTime = sendAt ? new Date(sendAt).getTime() : now + (Number(delayMs) || 0);

    // Step 1: Create Job in database
    const jobPayload = {
      title,
      body: message,
      subscription,
    };

    const insertResult = await db
      .insert(pushJobs)
      .values({
        userId: userId || null,
        fireAt: new Date(fireAtTime),
        payload: JSON.stringify(jobPayload),
        status: 'scheduled',
      })
      .returning({ id: pushJobs.id });

    if (!insertResult.length) {
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    const jobId = insertResult[0].id;

    // Step 2: Schedule the job with the Durable Object Worker
    const workerUrl = process.env.NEXT_PUBLIC_DURABLE_OBJECTS_URL
      ? `https://${process.env.NEXT_PUBLIC_DURABLE_OBJECTS_URL}`
      : 'http://localhost:8787';

    try {
      const workerResponse = await fetch(`${workerUrl}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          fireAt: fireAtTime,
        }),
      });

      if (!workerResponse.ok) {
        const error = await workerResponse.json().catch(() => ({ error: workerResponse.statusText }));
        // Job is created but not scheduled - Worker is unreachable
        console.error('Worker scheduling failed:', error);
        return NextResponse.json(
          {
            ok: false,
            error: error.error || 'Failed to schedule with Worker',
            jobId,
            note: 'Job was created but Worker is unreachable'
          },
          { status: 503 }
        );
      }

      return NextResponse.json({ ok: true, scheduled: true, id: jobId });
    } catch (workerErr) {
      console.error('Worker communication error:', workerErr);
      return NextResponse.json(
        {
          ok: false,
          error: 'Worker unreachable',
          jobId,
          note: 'Job was created but could not be scheduled with Worker',
        },
        { status: 503 }
      );
    }
  } catch (err) {
    console.error('/api/push/schedule error', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
