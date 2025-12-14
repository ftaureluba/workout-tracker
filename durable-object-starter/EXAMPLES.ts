/**
 * Examples: Using Durable Objects for Push Notifications
 * 
 * This file shows how to integrate the event-driven push system
 * into your existing components and services.
 */

/**
 * EXAMPLE 1: In Your Rest Timer Component
 * (Instead of rest-timer.tsx or similar)
 */
async function scheduleRestNotification(restTimeMs: number, userId: string) {
  try {
    // Get the user's push subscription (already stored from earlier)
    const subscription = await getExistingSubscription();
    
    if (!subscription) {
      console.log('User not subscribed to push notifications');
      return;
    }

    // Schedule the notification to fire when rest period ends
    const response = await fetch('/api/push/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        delayMs: restTimeMs,  // Will be converted to fireAt timestamp
        title: '✨ Rest Period Complete',
        body: 'Ready to start your next set?',
        userId,  // Track which user this is for
      }),
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log(`Notification scheduled with ID: ${result.id}`);
      // Optionally store the ID for tracking/cancellation later
      return result.id;
    } else {
      console.error('Failed to schedule notification:', result.error);
    }
  } catch (err) {
    console.error('Error scheduling notification:', err);
  }
}

/**
 * EXAMPLE 2: Using the Client Library Directly
 */
import { scheduleNotificationDurable, getNotificationStatus } from '@/lib/durable-push';

async function scheduleWithRetry(
  subscription: PushSubscription,
  fireAt: number,
  title: string,
  body: string
) {
  let retries = 3;
  
  while (retries > 0) {
    try {
      const result = await scheduleNotificationDurable({
        subscription,
        fireAt,
        title,
        body,
      });

      if (result.ok) {
        return result.id;
      }
      
      console.warn(`Schedule failed: ${result.error}, retrying...`);
      retries--;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
    } catch (err) {
      console.error('Scheduling error:', err);
      retries--;
    }
  }
  
  throw new Error('Failed to schedule notification after retries');
}

/**
 * EXAMPLE 3: Schedule Multiple Notifications (e.g., for a workout routine)
 */
async function scheduleWorkoutNotifications(
  workoutExercises: Array<{
    name: string;
    restTimeMs: number;
  }>,
  subscription: PushSubscription,
  userId: string
) {
  const startTime = Date.now();
  let currentTime = startTime;
  
  try {
    for (const exercise of workoutExercises) {
      currentTime += exercise.restTimeMs;
      
      await scheduleNotificationDurable({
        subscription,
        fireAt: currentTime,
        title: `${exercise.name} Rest Complete`,
        body: 'Ready for your next set!',
        userId,
      });
      
      console.log(`Scheduled notification for ${exercise.name} at ${new Date(currentTime)}`);
    }
  } catch (err) {
    console.error('Failed to schedule workout notifications:', err);
  }
}

/**
 * EXAMPLE 4: Check Notification Status (for UI feedback)
 */
async function checkNotificationProgress(notificationId: string) {
  try {
    const { notification } = await getNotificationStatus(notificationId);
    
    if (!notification) {
      return { status: 'not-found' };
    }
    
    if (notification.sent) {
      return { status: 'sent', sentAt: new Date(notification.sentAt) };
    }
    
    const timeUntilFire = notification.fireAt - Date.now();
    return {
      status: 'pending',
      timeRemaining: timeUntilFire,
      fireAt: new Date(notification.fireAt),
    };
  } catch (err) {
    console.error('Failed to check status:', err);
    return { status: 'error', error: String(err) };
  }
}

/**
 * EXAMPLE 5: Service Worker Integration (receiving notifications)
 */
// In your service worker (public/sw.js or src/service-worker.js)

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const { title = 'Notification', body = '' } = data;

  const options = {
    body,
    badge: '/icons/badge-192x192.png',
    icon: '/icons/icon-192x192.png',
    tag: 'workout-notification',
    requireInteraction: true,  // Keep notification visible
    data: {
      url: '/workout',  // Where to navigate on click
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Navigate to the workout page
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Focus existing window if already open
      for (const client of windowClients) {
        if (client.url === '/workout') {
          return client.focus();
        }
      }
      // Open new window if not already open
      return clients.openWindow('/workout');
    })
  );
});

/**
 * EXAMPLE 6: React Hook for Notification Scheduling
 */
import { useEffect, useState } from 'react';

function useNotificationScheduler() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported) {
      loadSubscription();
    }
  }, []);

  async function loadSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscription(sub);
    } catch (err) {
      console.error('Failed to load subscription:', err);
    }
  }

  async function scheduleNotification(
    delayMs: number,
    title: string,
    body: string
  ) {
    if (!subscription) {
      throw new Error('User not subscribed to push notifications');
    }

    const response = await fetch('/api/push/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        delayMs,
        title,
        body,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to schedule notification');
    }

    return response.json();
  }

  return { isSupported, subscription, scheduleNotification };
}

/**
 * EXAMPLE 7: Usage in a Component
 */
function RestTimer({ restTimeMs }: { restTimeMs: number }) {
  const { isSupported, subscription, scheduleNotification } = useNotificationScheduler();
  const [isScheduled, setIsScheduled] = useState(false);

  async function handleStartRest() {
    if (!isSupported || !subscription) {
      console.warn('Notifications not supported');
      return;
    }

    try {
      await scheduleNotification(
        restTimeMs,
        'Rest Period Over',
        'Time to start your next set!'
      );
      setIsScheduled(true);
    } catch (err) {
      console.error('Failed to schedule notification:', err);
    }
  }

  return (
    <div>
      <h2>Rest Timer</h2>
      <p>{(restTimeMs / 1000).toFixed(1)} seconds</p>
      <button onClick={handleStartRest} disabled={isScheduled}>
        {isScheduled ? 'Notification Scheduled ✓' : 'Start Rest'}
      </button>
    </div>
  );
}

/**
 * EXAMPLE 8: Error Handling & Fallbacks
 */
async function scheduleNotificationWithFallback(
  subscription: PushSubscription,
  delayMs: number,
  title: string,
  body: string
) {
  try {
    // Try Durable Objects first (event-driven)
    const result = await fetch('/api/push/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        delayMs,
        title,
        body,
      }),
    });

    if (result.ok) {
      return { success: true, method: 'durable-objects' };
    }

    // Fallback: Use immediate push (not ideal, but works)
    console.warn('Durable Objects failed, using fallback');
    
    // Schedule via setTimeout (less reliable but better than nothing)
    setTimeout(async () => {
      try {
        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription,
            title,
            body: `${body} (sent at ${new Date().toLocaleTimeString()})`,
          }),
        });
      } catch (err) {
        console.error('Fallback push failed:', err);
      }
    }, delayMs);

    return { success: true, method: 'fallback-timeout' };
  } catch (err) {
    console.error('Failed to schedule notification:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * EXAMPLE 9: Monitoring Dashboard (for admin/debug)
 */
async function getNotificationStats() {
  try {
    // List all pending notifications
    const response = await fetch(
      `${process.env.REACT_APP_DURABLE_OBJECTS_URL}/list?filter=pending`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    const { notifications } = await response.json();
    
    const stats = {
      total: notifications.length,
      imminent: notifications.filter(
        (n: any) => n.notification.fireAt - Date.now() < 60000
      ).length,
      nextFire: notifications.length > 0
        ? new Date(Math.min(...notifications.map((n: any) => n.notification.fireAt)))
        : null,
    };

    return stats;
  } catch (err) {
    console.error('Failed to get stats:', err);
    return { total: 0, imminent: 0, nextFire: null, error: String(err) };
  }
}

/**
 * EXAMPLE 10: Batch Scheduling for a Complete Workout
 */
interface WorkoutSet {
  exerciseName: string;
  restTimeSeconds: number;
}

async function scheduleCompleteWorkout(
  sets: WorkoutSet[],
  subscription: PushSubscription,
  userId: string
) {
  const scheduledIds: string[] = [];
  let currentTime = Date.now();

  try {
    for (const set of sets) {
      currentTime += set.restTimeSeconds * 1000;
      
      const result = await scheduleNotificationDurable({
        subscription,
        fireAt: currentTime,
        title: `Rest Over - ${set.exerciseName}`,
        body: `${set.restTimeSeconds} second rest complete. Ready for next set!`,
        userId,
      });

      if (result.ok) {
        scheduledIds.push(result.id);
        console.log(`Scheduled: ${set.exerciseName} at ${new Date(currentTime).toLocaleTimeString()}`);
      } else {
        console.error(`Failed to schedule ${set.exerciseName}`);
      }
    }

    return {
      success: true,
      totalScheduled: scheduledIds.length,
      ids: scheduledIds,
    };
  } catch (err) {
    return {
      success: false,
      totalScheduled: scheduledIds.length,
      ids: scheduledIds,
      error: String(err),
    };
  }
}

export {
  scheduleRestNotification,
  scheduleWorkoutNotifications,
  checkNotificationProgress,
  useNotificationScheduler,
  scheduleNotificationWithFallback,
  getNotificationStats,
  scheduleCompleteWorkout,
};
