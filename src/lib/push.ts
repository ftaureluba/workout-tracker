// Client-side utilities for Push subscription and notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  const perm = await Notification.requestPermission();
  return perm;
}

export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  console.debug('subscribeToPush: start', { hasSW: 'serviceWorker' in navigator, hasPush: 'PushManager' in window });
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.debug('subscribeToPush: not supported in this browser');
    return null;
  }

  try {
    // Quick check: avoid attempting to register a service worker if the file isn't present.
    // In dev builds or misconfigured deployments `/sw.js` may 404 which triggers
    // workbox precache errors like `bad-precaching-response`. Fetching first lets us
    // bail early and keep the subscribe flow controllable.
    try {
      const resp = await fetch('/sw.js', { method: 'GET', cache: 'no-store' });
      if (!resp.ok) {
        console.debug('subscribeToPush: /sw.js not found (status ' + resp.status + '), skipping registration');
        // If there's already an active registration, we can still try to use it.
        const existing = await navigator.serviceWorker.getRegistration();
        if (!existing) return null;
      }
    } catch (fetchErr) {
      console.debug('subscribeToPush: fetch /sw.js failed', fetchErr);
      // Don't proceed to register if we can't fetch the file; try to use any existing registration
      const existing = await navigator.serviceWorker.getRegistration();
      if (!existing) return null;
    }

    // Attempt manual registration only when there's no controller and the file exists.
    if (!navigator.serviceWorker.controller) {
      console.debug('subscribeToPush: no controller, attempting to register /sw.js manually');
      try {
        await navigator.serviceWorker.register('/sw.js');
        console.debug('subscribeToPush: manual registration succeeded');
      } catch (regErr) {
        console.warn('subscribeToPush: manual SW registration failed', regErr);
        // continue - we'll try to locate an existing registration below
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
      console.debug('subscribeToPush: ready timed out or not available, trying getRegistration()');
      reg = (await navigator.serviceWorker.getRegistration('/sw.js')) || (await navigator.serviceWorker.getRegistration()) || null;
    }

    if (!reg) {
      console.debug('subscribeToPush: no service worker registration available to subscribe');
      return null;
    }

    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      console.debug('subscribeToPush: subscription successful', sub);
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
  console.debug('getExistingSubscription: checking existing subscription');
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.debug('getExistingSubscription: not supported');
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    console.debug('getExistingSubscription: result', sub);
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
