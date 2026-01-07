// Client-side utilities for Push subscription and notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  const perm = await Notification.requestPermission();
  return perm;
}

export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  try {
    // Quick check: avoid attempting to register a service worker if the file isn't present.
    // In dev builds or misconfigured deployments `/sw.js` may 404 which triggers
    // workbox precache errors like `bad-precaching-response`. Fetching first lets us
    // bail early and keep the subscribe flow controllable.
    // Detect localhost/dev to avoid registering a production SW that includes
    // a precache manifest (which will 404 in dev and throw `bad-precaching-response`).
    const isLocalhost = typeof location !== 'undefined' && (
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1' ||
      location.hostname.endsWith('.local')
    );

    let swExists = false;
    try {
      const resp = await fetch('/sw.js', { method: 'GET', cache: 'no-store' });
      swExists = resp.ok;
      if (!resp.ok) {
        const existing = await navigator.serviceWorker.getRegistration();
        if (!existing) return null;
      }
    } catch {
      const existing = await navigator.serviceWorker.getRegistration();
      if (!existing) return null;
    }

    // Attempt manual registration only when there's no controller, the file exists,
    // and we're not running on localhost/dev (to avoid precache 404s during dev).
    if (!navigator.serviceWorker.controller) {
      if (!swExists) {
        // nothing to do
      } else if (isLocalhost) {
        // skip manual registration on localhost
      } else {
        try {
          await navigator.serviceWorker.register('/sw.js');
        } catch (regErr) {
          console.warn('subscribeToPush: manual SW registration failed', regErr);
          // continue - we'll try to locate an existing registration below
        }
      }
    }

    // Wait for the SW to be ready but avoid hanging forever in environments where the SW
    // never reaches 'activated'. Use a sensible timeout and fall back to getRegistration.
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutMs = 5000;
    let reg: ServiceWorkerRegistration | null = null;
    try {
      reg = await Promise.race([
        readyPromise,
        new Promise<ServiceWorkerRegistration | null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
      ]);
    } catch (readyErr) {
      console.warn('subscribeToPush: navigator.serviceWorker.ready rejected', readyErr);
      reg = null;
    }

    if (!reg) {
      // fallback to any available registration
      reg = (await navigator.serviceWorker.getRegistration('/sw.js')) || (await navigator.serviceWorker.getRegistration()) || null;
    }

    if (!reg) {
      return null;
    }

    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      return sub;
    } catch (subscribeErr) {
      console.error('subscribeToPush: pushManager.subscribe failed', subscribeErr);
      return null;
    }
  } catch (err) {
    console.error('subscribeToPush: unexpected error', err);
    return null;
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub;
  } catch (err) {
    console.error('getExistingSubscription: error', err);
    return null;
  }
}

export async function unsubscribePush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return false;
    const ok = await sub.unsubscribe();
    return ok;
  } catch (err) {
    console.error('Failed to unsubscribe', err);
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Listen for forwarded push messages from the service worker. The SW
// now always shows the system notification, so we just log here for
// debugging or react to the event (play sound, update UI, etc.) without
// showing a duplicate notification.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg || msg.type !== 'push' || !msg.data) return;
      // The SW already shows the notification; just log for debugging.
      console.log('[push.ts] Received push message from SW:', msg.data);
    });
  } catch (e) {
    // ignore
  }
}
