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
export class Scheduler {
  private state: DurableObjectState;
  private env: Env;
  private jobs: Map<string, ScheduledJob> = new Map();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async initialize() {
    // Load persisted jobs from storage on startup
    const stored = await this.state.storage.get('jobs');
    if (stored) {
      this.jobs = new Map(JSON.parse(stored as string));
    }

    // Set up alarm handler
    this.state.blockConcurrencyWhile(async () => {
      const alarmTime = await this.state.storage.getAlarm();
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
        return { ok: true, jobId }; // Idempotent
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

    // Set or update the alarm - Durable Objects can only have one alarm at a time
    // We'll set it to the earliest fire time and check all jobs when it fires
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
      await this.state.storage.deleteAlarm();
      return;
    }

    const nextJob = pendingJobs[0];
    const now = Date.now();
    const delayMs = Math.max(0, nextJob.fireAt - now);

    // Cloudflare Durable Objects can only have one alarm at a time
    // Set it to fire at the next job's time
    await this.state.storage.setAlarm(new Date(Date.now() + delayMs));
  }

  /**
   * Process the next batch of jobs that should fire
   */
  async processNextAlarm() {
    const now = Date.now();
    const jobsToFire = Array.from(this.jobs.values()).filter(
      (job) => job.status === 'scheduled' && job.fireAt <= now
    );

    for (const job of jobsToFire) {
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
      return;
    }

    const nextjsUrl = this.env.NEXT_JS_URL || 'http://localhost:3000';

    try {
      const response = await fetch(`${nextjsUrl}/api/push/fire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      if (response.ok) {
        // Mark job as fired
        job.status = 'fired';
        this.jobs.set(jobId, job);
        await this.persistJobs();
      } else {
        console.error(`Failed to fire job ${jobId}:`, response.status, response.statusText);
      }
    } catch (err) {
      console.error(`Error firing job ${jobId}:`, err);
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
    await this.state.storage.put('jobs', JSON.stringify(jobsArray));
  }

  /**
   * Handle alarm - called automatically by Cloudflare
   */
  async alarm() {
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
  SCHEDULER: DurableObjectNamespace;
  NEXT_JS_URL?: string;
}
