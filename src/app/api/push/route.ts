import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { pushJobs } from '@/lib/db/schema';

/**
 * POST /api/push
 * 
 * Immediate or delayed push notification via Durable Objects.
 * This endpoint creates a Job and schedules it with the Worker.
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
    const fireAtTime = now + (Number(delayMs) || 0);

    // Create Job in database
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

    // Schedule the job with the Worker
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
        console.error('Worker scheduling failed:', workerResponse.status);
      }
    } catch (workerErr) {
      console.error('Worker communication error:', workerErr);
      // Job is created, so don't fail the request
    }

    return NextResponse.json({
      ok: true,
      scheduled: delayMs > 0,
      result: { id: jobId },
    });
  } catch (err) {
    console.error('Push API error', err);
    return NextResponse.json({ error: 'Internal error', ok: false }, { status: 500 });
  }
}
