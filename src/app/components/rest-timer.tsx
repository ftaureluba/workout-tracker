"use client";

import React, { useEffect, useRef, useState } from 'react';
import { requestNotificationPermission, subscribeToPush, getExistingSubscription } from '@/lib/push';
import { toast } from '@/app/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/app/ui/dialog';

interface Props {
  defaultSeconds?: number;
  label?: string;
}

export default function RestTimer({ defaultSeconds = 60, label = 'Rest' }: Props) {
  const [seconds, setSeconds] = useState<number>(defaultSeconds);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState<number>(defaultSeconds);
  const [open, setOpen] = useState(false);
  const [modalSeconds, setModalSeconds] = useState<number>(defaultSeconds);
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

  const startWith = async (secs: number) => {
    setSeconds(Math.max(1, Math.floor(secs)));
    setModalSeconds(Math.max(1, Math.floor(secs)));

    // Request permission proactively so we can show notifications later
    await requestNotificationPermission().catch(() => {});

    // Try to obtain a PushSubscription so we can schedule a server push while backgrounded.
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string | undefined;
      let subscription = await getExistingSubscription();
      if (!subscription && vapidKey) {
        subscription = await subscribeToPush(vapidKey);
        if (subscription) {
          toast({ title: 'Push subscribed', description: 'Subscription obtained' });
        }
      }

      if (subscription) {
        // Ask server to schedule a push for `secs` from now. Server will persist the schedule.
        await fetch('/api/push/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription, title: `${label} finished`, body: 'Your rest period is over', delayMs: secs * 1000 }),
        }).catch(() => {});
      }
    } catch (err) {
      toast({ title: 'Push prep failed', description: String(err) });
    }

    setOpen(false);
    setRunning(true);
    toast({ title: 'Timer started', description: `Running for ${Math.max(1, Math.floor(secs))} seconds` });
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
    } catch {
      // Ignore local notification errors
    }

    // If service worker push subscription exists, ask server to send a push as a fallback (immediate)
    try {
      const sub = await getExistingSubscription();
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string | undefined;
      let subscription = sub;
      if (!subscription && vapidKey) {
        subscription = await subscribeToPush(vapidKey);
      }

      if (subscription) {
        // POST to server to trigger a push notification now
        const res = await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription, title: `${label} finished`, body: 'Your rest period is over' }),
        });
        if (res.ok) {
          toast({ title: 'Timer finished', description: 'Notification delivered' });
        } else {
          const text = await res.text().catch(() => 'no body');
          toast({ title: 'Timer finished', description: `Server push failed: ${text}` });
        }
      } else {
        toast({ title: 'Timer finished', description: 'Shown locally' });
      }
    } catch (err) {
      toast({ title: 'Push request error', description: String(err) });
    }

    // Ensure UI reflects stopped state
    setRunning(false);
  };

    return (
    <div className={"flex items-center gap-2 " + (running ? 'ring-2 ring-green-400 rounded-md p-1' : '')}>
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">{label}:</label>
        <div className="text-sm">{new Date(remaining * 1000).toISOString().substr(14, 5)}</div>
      </div>

      {!running ? (
        <>
          <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
            <DialogTrigger asChild>
              <button className={"px-2 py-1 rounded text-white " + (running ? 'bg-green-600' : 'bg-blue-600')}>Start</button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start timer</DialogTitle>
                <DialogDescription>Choose how long the timer should run (seconds)</DialogDescription>
              </DialogHeader>

              <div className="grid gap-2">
                <div className="flex gap-2">
                  {[30, 60, 90, 120].map((p) => (
                    <button key={p} onClick={() => setModalSeconds(p)} className={"px-3 py-1 rounded " + (modalSeconds === p ? 'bg-indigo-600 text-white' : 'bg-gray-200')}>
                      {p}s
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input type="number" min={1} className="w-24 px-2 py-1 rounded border text-center" value={modalSeconds} onChange={(e) => setModalSeconds(Math.max(1, Number(e.target.value || 0)))} />
                  <span className="text-sm">seconds</span>
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <button className="px-3 py-1 rounded bg-gray-200">Cancel</button>
                </DialogClose>
                <button onClick={() => startWith(modalSeconds)} className="px-3 py-1 rounded bg-blue-600 text-white">Start</button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <button onClick={pause} className="px-2 py-1 rounded bg-green-600 text-white">Running — Pause</button>
          <button onClick={reset} className="px-2 py-1 rounded bg-gray-200">Reset</button>
        </div>
      )}
    </div>
  );
}
