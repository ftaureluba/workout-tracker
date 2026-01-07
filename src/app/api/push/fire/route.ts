import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { pushJobs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import webpush from 'web-push';

/**
 * POST /api/push/fire
 * 
 * Called by the Cloudflare Worker when a scheduled alarm fires.
 * 
 * Responsibilities:
 * 1. Load the job by ID
 * 2. Check idempotency (job.status)
 * 3. Send the push notification using web-push
 * 4. Mark job as sent or failed
 * 
 * Request body:
 * {
 *   jobId: string
 * }
 */
export async function POST(req: NextRequest) {
  console.log('[/api/push/fire] Received request');
  try {
    const requestBody = await req.json();
    const { jobId } = requestBody;
    console.log('[/api/push/fire] jobId:', jobId);

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    // Security check: Validate CRON_SECRET
    const authHeader = req.headers.get('Authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    console.log('[/api/push/fire] Auth check - header present:', !!authHeader, 'matches:', authHeader === expectedAuth);

    if (authHeader !== expectedAuth) {
      console.log('[/api/push/fire] Unauthorized - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load the job from database
    const jobs = await db
      .select()
      .from(pushJobs)
      .where(eq(pushJobs.id, jobId));

    if (jobs.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobs[0];

    // Idempotency check: if already sent or failed, return success
    if (job.status === 'sent') {
      return NextResponse.json({ ok: true, status: 'already_sent', jobId });
    }

    if (job.status === 'failed') {
      // Optionally retry failed jobs or return error
      return NextResponse.json({ ok: false, status: 'previously_failed', jobId }, { status: 400 });
    }

    // Parse the payload (contains title, body, subscription)
    interface NotificationPayload {
      title?: string;
      body?: string;
      subscription?: unknown;
    }
    let payload: NotificationPayload;
    try {
      payload = JSON.parse(job.payload) as NotificationPayload;
    } catch {
      // Mark job as failed
      await db
        .update(pushJobs)
        .set({
          status: 'failed',
          errorMessage: 'Invalid JSON payload',
          sentAt: new Date(),
        })
        .where(eq(pushJobs.id, jobId));

      return NextResponse.json({ ok: false, error: 'Invalid payload JSON', jobId }, { status: 400 });
    }

    const { title = 'Notification', body: messageBody = '', subscription } = payload;

    if (!subscription) {
      // Mark job as failed
      await db
        .update(pushJobs)
        .set({
          status: 'failed',
          errorMessage: 'Missing subscription in payload',
          sentAt: new Date(),
        })
        .where(eq(pushJobs.id, jobId));

      return NextResponse.json({ ok: false, error: 'Missing subscription', jobId }, { status: 400 });
    }

    // Configure web-push
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

    if (!vapidPrivateKey) {
      return NextResponse.json(
        { ok: false, error: 'VAPID_PRIVATE_KEY not configured' },
        { status: 500 }
      );
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:support@example.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Send the push notification
    try {
      const options = {
        TTL: 24 * 60 * 60, // 24 hours
      };

      const notificationPayload = JSON.stringify({
        title,
        body: messageBody,
        timestamp: Date.now(),
      });

      await webpush.sendNotification(subscription, notificationPayload, options);

      // Mark job as sent
      await db
        .update(pushJobs)
        .set({
          status: 'sent',
          sentAt: new Date(),
        })
        .where(eq(pushJobs.id, jobId));

      return NextResponse.json({
        ok: true,
        status: 'sent',
        jobId,
        message: 'Push notification sent successfully',
      });
    } catch (pushErr) {
      // Mark job as failed
      const error = pushErr as Error;
      const errorMessage = error.message || String(pushErr);
      await db
        .update(pushJobs)
        .set({
          status: 'failed',
          errorMessage,
          sentAt: new Date(),
        })
        .where(eq(pushJobs.id, jobId));

      console.error(`Failed to send push for job ${jobId}:`, pushErr);

      return NextResponse.json(
        {
          ok: false,
          status: 'send_failed',
          jobId,
          error: errorMessage,
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('/api/push/fire error', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
