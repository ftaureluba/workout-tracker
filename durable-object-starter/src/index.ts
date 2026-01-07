/**
 * Cloudflare Durable Object: Scheduler for Push Notifications
 * 
 * Responsibilities:
 * - Accept schedule requests with jobId and fireAt
 * - Set alarms for when to fire notifications
 * - On alarm: call Next.js endpoint with jobId
 * 
 * Does NOT: send push, encrypt, sign, know about subscriptions
 */

export interface ScheduleRequest {
  jobId: string;
  fireAt: number; // Unix timestamp in milliseconds
}

interface ScheduledJob {
  jobId: string;
  fireAt: number;
  status: 'scheduled' | 'fired';
}

const router = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route to appropriate handler
    if (path === '/schedule' && request.method === 'POST') {
      return handleSchedule(request, env);
    } else if (path === '/status' && request.method === 'GET') {
      return handleStatus(request, env);
    } else if (path === '/list' && request.method === 'GET') {
      return handleList(request, env);
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};

export default router;

/**
 * Scheduler Durable Object class
 * Manages alarm scheduling and job state
 */
import { DurableObject } from "cloudflare:workers";

export class Scheduler extends DurableObject<Env> {
  private jobs: Map<string, ScheduledJob> = new Map();

  constructor(ctx: DurableObjectState<Env>, env: Env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
  }

  async initialize() {
    // Load persisted jobs from storage on startup
    const stored = await this.ctx.storage.get('jobs');
    if (stored) {
      this.jobs = new Map(JSON.parse(stored as string));
    }

    // Set up alarm handler
    this.ctx.blockConcurrencyWhile(async () => {
      const alarmTime = await this.ctx.storage.getAlarm();
      if (alarmTime) {
        // If there's a pending alarm, process it
        await this.processNextAlarm();
      }
    });
  }

  /**
   * Schedule a new job to be fired at a specific time
   */
  async schedule(request: ScheduleRequest): Promise<{ ok: boolean; jobId: string; error?: string }> {
    const { jobId, fireAt } = request;

    if (!jobId || !fireAt) {
      return { ok: false, jobId, error: 'Missing jobId or fireAt' };
    }

    // Check if job already scheduled
    if (this.jobs.has(jobId)) {
      const existing = this.jobs.get(jobId)!;
      if (existing.status === 'scheduled') {
        // Ensure idempotency doesn't mask status updates if needed, but for now ok
        return { ok: true, jobId };
      }
    }

    // Store job
    const job: ScheduledJob = {
      jobId,
      fireAt,
      status: 'scheduled',
    };

    this.jobs.set(jobId, job);
    await this.persistJobs();

    // Set alarm for this job
    await this.updateNextAlarm();

    return { ok: true, jobId };
  }

  /**
   * Update the alarm to the next scheduled job's fire time
   */
  private async updateNextAlarm() {
    const pendingJobs = Array.from(this.jobs.values())
      .filter((job) => job.status === 'scheduled')
      .sort((a, b) => a.fireAt - b.fireAt);

    if (pendingJobs.length === 0) {
      // No pending jobs, clear alarm
      await this.ctx.storage.deleteAlarm();
      return;
    }

    const nextJob = pendingJobs[0];
    const now = Date.now();
    const delayMs = Math.max(1000, nextJob.fireAt - now);

    // Cloudflare Durable Objects can only have one alarm at a time
    // Set it to fire at the next job's time
    await this.ctx.storage.setAlarm(new Date(Date.now() + delayMs));
  }

  // ... (processNextAlarm and fireJob are unchanged by state logic) ...

  /**
   * Process the next batch of jobs that should fire
   */
  async processNextAlarm() {
    const now = Date.now();
    console.log('[Scheduler] processNextAlarm: checking', this.jobs.size, 'jobs at', new Date(now).toISOString());

    const jobsToFire = Array.from(this.jobs.values()).filter(
      (job) => job.status === 'scheduled' && job.fireAt <= now
    );

    console.log('[Scheduler] Found', jobsToFire.length, 'jobs to fire');

    for (const job of jobsToFire) {
      console.log('[Scheduler] Firing job:', job.jobId);
      await this.fireJob(job.jobId);
    }

    // Update alarm for remaining jobs
    await this.updateNextAlarm();
  }

  /**
   * Fire a specific job by calling the Next.js fire endpoint
   */
  private async fireJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.log('[Scheduler] fireJob: job not found:', jobId);
      return;
    }

    const nextjsUrl = this.env.NEXT_JS_URL || 'http://localhost:3000';
    console.log('[Scheduler] fireJob: calling', nextjsUrl, '/api/push/fire for', jobId);

    try {
      const response = await fetch(`${nextjsUrl}/api/push/fire`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.CRON_SECRET}`
        },
        body: JSON.stringify({ jobId }),
      });

      console.log('[Scheduler] fireJob response:', response.status, response.statusText);

      if (response.ok) {
        // Mark job as fired
        job.status = 'fired';
        this.jobs.set(jobId, job);
        await this.persistJobs();
        console.log('[Scheduler] Job marked as fired:', jobId);
      } else {
        const text = await response.text().catch(() => '');
        console.error(`[Scheduler] Failed to fire job ${jobId}:`, response.status, response.statusText, text);
      }
    } catch (err) {
      console.error(`[Scheduler] Error firing job ${jobId}:`, err);
    }
  }

  /**
   * Get the status of a job
   */
  getStatus(jobId: string): ScheduledJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Persist jobs to storage
   */
  private async persistJobs() {
    const jobsArray = Array.from(this.jobs.entries());
    await this.ctx.storage.put('jobs', JSON.stringify(jobsArray));
  }


  /**
   * Handle alarm - called automatically by Cloudflare
   */
  async alarm() {
    console.log('[Scheduler] alarm() fired');

    // CRITICAL: Reload jobs from storage in case the DO hibernated
    // and the in-memory Map is empty
    const stored = await this.ctx.storage.get('jobs');
    if (stored) {
      this.jobs = new Map(JSON.parse(stored as string));
      console.log('[Scheduler] Reloaded', this.jobs.size, 'jobs from storage');
    } else {
      console.log('[Scheduler] No jobs in storage');
    }

    await this.processNextAlarm();
  }
}

/**
 * Handle POST /schedule requests
 */
async function handleSchedule(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as ScheduleRequest;
    const { jobId, fireAt } = body;

    if (!jobId || !fireAt) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing jobId or fireAt' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the Durable Object instance
    const id = env.SCHEDULER.idFromName('default');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = env.SCHEDULER.get(id) as any;

    // Call the schedule method
    const result = await obj.schedule({ jobId, fireAt });

    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle GET /status?jobId=... requests
 */
async function handleStatus(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Missing jobId parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const id = env.SCHEDULER.idFromName('default');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = env.SCHEDULER.get(id) as any;
    const status = await obj.getStatus(jobId);

    return new Response(JSON.stringify({ jobId, status }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle GET /list requests
 */
async function handleList(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const filter = url.searchParams.get('filter') as 'scheduled' | 'fired' | null;

    const id = env.SCHEDULER.idFromName('default');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = env.SCHEDULER.get(id) as any;
    let jobs = await obj.getAllJobs() as ScheduledJob[];

    if (filter) {
      jobs = jobs.filter((job: ScheduledJob) => job.status === filter);
    }

    return new Response(JSON.stringify({ jobs }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Type definitions for Cloudflare environment
 */
interface Env {
  SCHEDULER: DurableObjectNamespace<Scheduler>;
  NEXT_JS_URL?: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY?: string;
  CRON_SECRET: string;
}

