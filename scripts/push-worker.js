/*
 This script used to send scheduled pushes from local JSON files.
 It's deprecated in favor of the DB-backed approach + Vercel Cron hitting
 the `/api/push/run` endpoint. Keep this file as documentation only.

 Recommended Flow (Next.js + Vercel Cron):
 - Client posts `{ userId, subscription, fireAt }` to `POST /api/push/schedule`
 - The route persists the schedule in Postgres (table `push_schedules`)
 - Configure a Vercel Cron job to `POST /api/push/run` every minute
 - Optionally set `PUSH_CRON_SECRET` in Vercel and add header `x-push-cron-secret` to the cron request

 Example curl to run once (development):
  PUSH_CRON_SECRET=... curl -X POST -H "x-push-cron-secret: $PUSH_CRON_SECRET" https://your-deployment.vercel.app/api/push/run

 If you still want a local worker, implement it using the Drizzle DB instead
 of reading/writing `data/*.json` and avoid CommonJS `require()` if your
 linter enforces ESM. This project now prefers the Vercel Cron + API approach.
 */
