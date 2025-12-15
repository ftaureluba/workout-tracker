/**
 * Client library for interacting with the Cloudflare Durable Objects push notification system.
 * This replaces the old polling-based approach with event-driven scheduling.
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
 * Schedule a push notification using the Durable Objects backend.
 * This is an event-driven approach that avoids constant polling.
 *
 * @param request - The notification scheduling request
 * @param durableObjectUrl - The base URL of the Durable Objects Worker
 * @returns Promise with scheduling result
 */
export async function scheduleNotificationDurable(
  request: ScheduleNotificationRequest,
  durableObjectUrl: string = process.env.NEXT_PUBLIC_DURABLE_OBJECTS_URL || 'http://localhost:8787'
): Promise<ScheduleNotificationResponse> {
  try {
    const response = await fetch(`${durableObjectUrl}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      return {
        ok: false,
        id: '',
        scheduled: false,
        error: error.error || `HTTP ${response.status}`,
      };
    }

    return response.json();
  } catch (err) {
    return {
      ok: false,
      id: '',
      scheduled: false,
      error: String(err),
    };
  }
}

/**
 * Get the status of a scheduled notification
 */
export async function getNotificationStatus(
  notificationId: string,
  durableObjectUrl: string = process.env.NEXT_PUBLIC_DURABLE_OBJECTS_URL || 'http://localhost:8787'
) {
  try {
    const response = await fetch(`${durableObjectUrl}/status?id=${encodeURIComponent(notificationId)}`, {
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
    const params = filter ? `?filter=${filter}` : '';
    const response = await fetch(`${durableObjectUrl}/list${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return { notifications: [], error: `HTTP ${response.status}` };
    }

    return response.json();
  } catch (err) {
    return { notifications: [], error: String(err) };
  }
}
