"use client";

import React, { useEffect, useRef, useState } from 'react';
import { requestNotificationPermission, subscribeToPush, getExistingSubscription } from '@/lib/push';

interface Props {
  defaultSeconds?: number;
  label?: string;
}

export default function RestTimer({ defaultSeconds = 60, label = 'Rest' }: Props) {
  const [seconds, setSeconds] = useState<number>(defaultSeconds);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState<number>(defaultSeconds);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (running) {
      timerRef.current = window.setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            window.clearInterval(timerRef.current ?? undefined);
            timerRef.current = null;
            setRunning(false);
            onTimerEnd();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const start = async () => {
    // Request permission proactively so we can show notifications later
    try {
      await requestNotificationPermission();
    } catch (e) {
      console.debug('Notification permission request failed', e);
    }

    // Try to obtain a PushSubscription so we can schedule a server push while backgrounded.
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string | undefined;
      let subscription = await getExistingSubscription();
      if (!subscription && vapidKey) {
        subscription = await subscribeToPush(vapidKey);
      }

      if (subscription) {
        // Ask server to schedule a push for `seconds` from now. Server will use delayMs to schedule.
        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription, title: `${label} finished`, body: 'Your rest period is over', delayMs: seconds * 1000 }),
        }).catch((e) => console.debug('Failed to schedule server push', e));
      }
    } catch (err) {
      console.debug('Failed to prepare push subscription', err);
    }

    setRunning(true);
  };

  const pause = () => {
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    setRemaining(seconds);
  };

  const onTimerEnd = async () => {
    // Try local Notification first
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${label} finished`, { body: 'Time is up', icon: '/icons/icon-192x192.png' });
      }
    } catch (e) {
      console.debug('Local notification failed', e);
    }

    // If service worker push subscription exists, ask server to send a push as a fallback (immediate)
    try {
  const sub = await getExistingSubscription();
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string | undefined;
      // If subscription is missing but browser supports Push, try to subscribe (best-effort)
      let subscription = sub;
      if (!subscription && vapidKey) {
        subscription = await subscribeToPush(vapidKey);
      }

      if (subscription) {
        // POST to server to trigger a push notification now
        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription, title: `${label} finished`, body: 'Your rest period is over' }),
        });
      }
    } catch (err) {
      console.debug('Failed to request server push', err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">{label}:</label>
        <input
          type="number"
          min={1}
          className="w-20 px-2 py-1 rounded border text-center"
          value={seconds}
          onChange={(e) => setSeconds(Math.max(1, Number(e.target.value || 0)))}
        />
        <div className="text-sm">{new Date(remaining * 1000).toISOString().substr(14, 5)}</div>
      </div>
      {!running ? (
        <button onClick={start} className="px-2 py-1 rounded bg-blue-600 text-white">Start</button>
      ) : (
        <button onClick={pause} className="px-2 py-1 rounded bg-yellow-500 text-white">Pause</button>
      )}
      <button onClick={reset} className="px-2 py-1 rounded bg-gray-200">Reset</button>
    </div>
  );
}
