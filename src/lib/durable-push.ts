/**
 * Client library for interacting with the Cloudflare Durable Objects push notification system.
 * This is now Job-based: Next.js creates a Job, then tells the Worker about it.
 */

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface ScheduleNotificationRequest {
  subscription: PushSubscription;
  fireAt: number; // Unix timestamp in milliseconds
  title?: string;
  body?: string;
  userId?: string;
}

export interface ScheduleNotificationResponse {
  ok: boolean;
  id: string;
  scheduled: boolean;
  error?: string;
}

/**
 * Get the status of a scheduled notification
 */
export async function getNotificationStatus(
  notificationId: string,
  durableObjectUrl: string = process.env.NEXT_PUBLIC_DURABLE_OBJECTS_URL || 'http://localhost:8787'
) {
  try {
    const response = await fetch(`${durableObjectUrl}/status?jobId=${encodeURIComponent(notificationId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return { notification: null, error: `HTTP ${response.status}` };
    }

    return response.json();
  } catch (err) {
    return { notification: null, error: String(err) };
  }
}

/**
 * List all notifications (for debugging/monitoring)
 */
export async function listNotifications(
  filter?: 'pending' | 'sent',
  durableObjectUrl: string = process.env.NEXT_PUBLIC_DURABLE_OBJECTS_URL || 'http://localhost:8787'
) {
  try {
    const params = filter ? `?filter=${filter === 'pending' ? 'scheduled' : 'fired'}` : '';
    const response = await fetch(`${durableObjectUrl}/list${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return { notifications: [], error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { notifications: data.jobs || [], error: null };
  } catch (err) {
    return { notifications: [], error: String(err) };
  }
}
