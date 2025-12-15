import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { listNotifications } from '@/lib/durable-push';

const CRON_SECRET = process.env.PUSH_CRON_SECRET || '';

/**
 * POST /api/push/run
 * 
 * This endpoint is now a health check for the Durable Objects system.
 * The old polling approach has been replaced with event-driven scheduling.
 * 
 * This can still be called periodically to verify the system is operational,
 * and it provides statistics about pending and sent notifications.
 */
export async function POST(req: NextRequest) {
  // Optional secret check: if PUSH_CRON_SECRET is set, require header
  if (CRON_SECRET) {
    const header = req.headers.get('x-push-cron-secret') || req.headers.get('x-vercel-cron-secret');
    if (!header || header !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Get the Durable Objects URL from environment
    const durableObjectUrl = process.env.DURABLE_OBJECTS_URL || 'http://localhost:8787';

    // List pending notifications for monitoring
    const { notifications, error } = await listNotifications('pending', durableObjectUrl);

    if (error) {
      console.warn('Failed to list pending notifications:', error);
      return NextResponse.json(
        {
          ok: false,
          status: 'durable-objects-unreachable',
          error,
          note: 'The Durable Objects scheduler is not responding. Ensure DURABLE_OBJECTS_URL is configured correctly.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: 'healthy',
      system: 'durable-objects-event-driven',
      pendingNotifications: notifications.length,
      note: 'Push notifications are now event-driven. No polling needed. This endpoint is for monitoring only.',
    });
  } catch (err) {
    console.error('/api/push/run error', err);
    return NextResponse.json(
      { ok: false, error: String(err), status: 'error' },
      { status: 500 }
    );
  }
}