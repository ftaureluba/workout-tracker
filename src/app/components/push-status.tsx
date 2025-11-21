"use client"

import React, { useEffect, useState } from 'react';
import { getExistingSubscription } from '@/lib/push';

export default function PushStatus() {
  const [supported, setSupported] = useState({ serviceWorker: false, pushManager: false, notifications: false });
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscriptionJson, setSubscriptionJson] = useState<string | null>(null);

  useEffect(() => {
    const sw = 'serviceWorker' in navigator;
    const pm = 'PushManager' in window;
    const notif = 'Notification' in window;
    setSupported({ serviceWorker: sw, pushManager: pm, notifications: notif });
    setPermission(notif ? Notification.permission : null);

    (async () => {
      if (sw && pm) {
        try {
          const sub = await getExistingSubscription();
          setSubscriptionJson(sub ? JSON.stringify(sub) : null);
        } catch (e) {
          setSubscriptionJson(`error: ${String(e)}`);
        }
      }
    })();
  }, []);

  return (
    <div className="text-sm text-muted-foreground">
      <div className="mb-1">Push capability:</div>
      <ul className="list-disc ml-5">
        <li>Service Worker: {supported.serviceWorker ? 'yes' : 'no'}</li>
        <li>PushManager: {supported.pushManager ? 'yes' : 'no'}</li>
        <li>Notifications API: {supported.notifications ? 'yes' : 'no'}</li>
        <li>Notification permission: {permission ?? 'n/a'}</li>
      </ul>
      <div className="mt-2">
        <div className="font-medium">Subscription:</div>
        {subscriptionJson ? (
          <pre className="text-xs max-h-40 overflow-auto bg-gray-50 p-2 rounded border">{subscriptionJson}</pre>
        ) : (
          <div className="text-xs text-muted-foreground">No subscription found</div>
        )}
      </div>
    </div>
  );
}
