# PWA Push / Timer — Developer notes

This project includes a demo implementation for per-set rest timers and push notifications. This document explains how it works and how to test locally.

Key pieces

- `src/service-worker.js` — custom service worker source used by `next-pwa` (injectManifest). It precaches assets and handles `push` and `notificationclick` events.
- `src/app/components/rest-timer.tsx` — client-side RestTimer component. When started it requests Notification permission, attempts to subscribe to PushManager (using `NEXT_PUBLIC_VAPID_PUBLIC_KEY`), and asks the server `/api/push` to schedule a push for the timer end (best-effort scheduling).
- `src/app/api/push/route.ts` — simple server endpoint that uses `web-push` to send notifications. It accepts POST JSON `{ subscription, title?, body?, delayMs? }`.
- `src/lib/push.ts` — client helpers for requesting permission and managing PushSubscription.

Why a server is required for background notifications

Browsers only deliver push messages to a service worker when an external push is sent to the browser's push service. A page or its service worker cannot reliably schedule work while the browser is closed or the service worker is idle. For that reason, server-sent Web Push messages are the correct approach to notify users while they are away from the tab.

Limitations and production notes

- The demo server scheduling in `/api/push` uses `setTimeout` to delay sending a push. This is unreliable on serverless platforms (Vercel, Netlify) because functions may terminate. For reliable scheduling, run a persistent worker (cron job or queue) that sends pushes at the right time.
- Keep your VAPID private key secret. Set the following environment variables in production:
  - `VAPID_PUBLIC_KEY` — server-side public key
  - `VAPID_PRIVATE_KEY` — server-side private key
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — client-side public key (prefix with NEXT_PUBLIC_ so it is exposed to client builds)
- Browser support: Chrome/Edge/Firefox on desktop and Android support Push + SW. iOS Safari historically lacks full Push support — check current compatibility before relying on it for iOS users.

How to generate VAPID keys (Node)

Run a small Node script or use the `web-push` package:

```js
// one-time
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log(keys);
```

Save the output to your environment (private key server-side only).

How to test locally

1. Install deps:
   ```bash
   npm install
   ```
2. Build & run in production mode (service worker registration is disabled in dev config):
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```
3. Visit a workout page, click `Enable push` (sets up subscription) and `Test timer` or start a `RestTimer`.

Notes for improvement

- Persist subscriptions server-side (POST to a dedicated /api/subscribe) and keep them associated with a user to schedule pushes reliably.
- Replace the demo `setTimeout` scheduling with a queue/worker (Redis queue, cron, or background process).
- Improve UX: show subscription status in settings, allow selecting default rest durations per workout, and show countdown in the site's UI overlay.
