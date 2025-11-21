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
    // Ensure a service worker is registered and ready. Some setups rely on auto-registration but
    // calling register explicitly helps surface errors and ensures controller is present.
    if (!navigator.serviceWorker.controller) {
      console.debug('subscribeToPush: no controller, attempting to register /sw.js manually');
      try {
        await navigator.serviceWorker.register('/sw.js');
        console.debug('subscribeToPush: manual registration succeeded');
      } catch (regErr) {
        console.warn('subscribeToPush: manual SW registration failed', regErr);
        // continue to navigator.serviceWorker.ready which may still resolve
      }
    }

    const reg = await navigator.serviceWorker.ready;
    console.debug('subscribeToPush: service worker ready', reg);

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    console.debug('subscribeToPush: subscription successful', sub);
    return sub;
  } catch (err) {
    console.error('subscribeToPush: Failed to subscribe to push', err);
    throw err;
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
