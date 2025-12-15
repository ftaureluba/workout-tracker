import { DurableObject } from "cloudflare:workers";

interface PushSubscription {
	endpoint: string;
	keys: {
		p256dh: string;
		auth: string;
	};
}

interface ScheduledNotification {
	id: string;
	subscription: PushSubscription;
	fireAt: number;
	title: string;
	body: string;
	userId?: string;
	sent: boolean;
	sentAt?: number;
}

export class Scheduler extends DurableObject<Env> {
	state: DurableObjectState;
	env: Env;

	constructor(state: DurableObjectState, env: Env) {
		super(state, env);
		this.state = state;
		this.env = env;
	}

	/**
	 * Schedule a push notification to be sent at a specific time.
	 * Prevents duplicates based on subscription endpoint + fireAt time.
	 */
	async scheduleNotification(request: {
		subscription: PushSubscription;
		fireAt: number;
		title?: string;
		body?: string;
		userId?: string;
	}): Promise<{ ok: boolean; id: string; scheduled: boolean; error?: string }> {
		const { subscription, fireAt, title = "Timer", body = "Time is up", userId } = request;

		if (!subscription?.endpoint) {
			return { ok: false, id: "", scheduled: false, error: "Missing subscription endpoint" };
		}

		if (fireAt <= Date.now()) {
			// Fire immediately
			return this.sendNotificationNow(subscription, title, body, userId);
		}

		// Create unique ID based on subscription endpoint and fire time (idempotency)
		const idempotencyKey = `${subscription.endpoint}-${fireAt}`;
		const notificationId = this.hashString(idempotencyKey);

		// Check if notification already scheduled (idempotency)
		const stored = await this.state.storage.get<ScheduledNotification>(notificationId);
		if (stored) {
			return { ok: true, id: notificationId, scheduled: true }; // Already scheduled
		}

		const notification: ScheduledNotification = {
			id: notificationId,
			subscription,
			fireAt,
			title,
			body,
			userId,
			sent: false,
		};

		try {
			// Store the notification
			await this.state.storage.put(notificationId, notification);

			// Set an alarm to fire at the scheduled time
			const delayMs = fireAt - Date.now();
			await this.state.storage.setAlarm(fireAt);

			return { ok: true, id: notificationId, scheduled: true };
		} catch (err) {
			return { ok: false, id: notificationId, scheduled: false, error: String(err) };
		}
	}

	/**
	 * Handle the alarm trigger - called when the scheduled time arrives.
	 * Sends all notifications that are due.
	 */
	async alarm(): Promise<void> {
		const now = Date.now();
		const allKeys = await this.state.storage.list<ScheduledNotification>();

		for (const [key, notification] of allKeys) {
			if (notification.fireAt <= now && !notification.sent) {
				try {
					await this.sendNotification(notification.subscription, notification.title, notification.body);
					notification.sent = true;
					notification.sentAt = now;
					await this.state.storage.put(key, notification);
				} catch (err) {
					console.error(`Failed to send notification ${key}:`, err);
				}
			}
		}

		// Schedule next alarm if there are pending notifications
		const nextNotification = Array.from(allKeys.values())
			.filter((n) => !n.sent && n.fireAt > now)
			.sort((a, b) => a.fireAt - b.fireAt)[0];

		if (nextNotification) {
			await this.state.storage.setAlarm(nextNotification.fireAt);
		}
	}

	/**
	 * Send a push notification immediately using web-push protocol
	 */
	private async sendNotificationNow(
		subscription: PushSubscription,
		title: string,
		body: string,
		userId?: string
	): Promise<{ ok: boolean; id: string; scheduled: boolean; error?: string }> {
		try {
			await this.sendNotification(subscription, title, body);
			return {
				ok: true,
				id: `${subscription.endpoint}-${Date.now()}`,
				scheduled: true,
			};
		} catch (err) {
			return {
				ok: false,
				id: "",
				scheduled: false,
				error: String(err),
			};
		}
	}

	/**
	 * Send push notification via Web Push Protocol
	 */
	private async sendNotification(
		subscription: PushSubscription,
		title: string,
		body: string
	): Promise<void> {
		const endpoint = subscription.endpoint;
		const p256dh = subscription.keys.p256dh;
		const auth = subscription.keys.auth;

		const payload = JSON.stringify({ title, body });

		// Use the web-push endpoint directly with the subscription keys
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Encoding': 'aes128gcm',
			},
			body: payload,
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`Push send failed: ${response.status} ${text}`);
		}

		console.log(`✅ Push sent to ${endpoint}: ${title}`);
	}

	/**
	 * Simple string hash for idempotency keys
	 */
	private hashString(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(36);
	}

	/**
	 * Get notification status
	 */
	async getNotificationStatus(notificationId: string): Promise<ScheduledNotification | null> {
		const notification = await this.state.storage.get<ScheduledNotification>(notificationId);
		return notification ?? null;
	}

	/**
	 * List all pending notifications for debugging/monitoring
	 */
	async listNotifications(
		filter?: "pending" | "sent"
	): Promise<Array<{ id: string; notification: ScheduledNotification }>> {
		const allKeys = await this.state.storage.list<ScheduledNotification>();
		const result = Array.from(allKeys.entries()).map(([id, notification]) => ({
			id,
			notification,
		}));

		if (filter === "pending") {
			return result.filter(({ notification }) => !notification.sent);
		} else if (filter === "sent") {
			return result.filter(({ notification }) => notification.sent);
		}

		return result;
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			const url = new URL(request.url);
			const pathname = url.pathname;

			// Route to specific endpoint
			if (pathname === "/schedule" && request.method === "POST") {
				return await handleSchedule(request, env);
			} else if (pathname === "/status" && request.method === "GET") {
				return await handleStatus(request, env);
			} else if (pathname === "/list" && request.method === "GET") {
				return await handleList(request, env);
			}

			return new Response("Not Found", { status: 404 });
		} catch (err) {
			return new Response(JSON.stringify({ error: String(err) }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			});
		}
	},
} satisfies ExportedHandler<Env>;

/**
 * Handle POST /schedule - Schedule a new notification
 */
async function handleSchedule(request: Request, env: Env): Promise<Response> {
	const body = await request.json<{
		subscription: PushSubscription;
		fireAt: number;
		title?: string;
		body?: string;
		userId?: string;
	}>();

	const stub = env.SCHEDULER.getByName("default");
	const result = await stub.scheduleNotification(body);

	return new Response(JSON.stringify(result), {
		headers: { "Content-Type": "application/json" },
		status: result.ok ? 200 : 400,
	});
}

/**
 * Handle GET /status?id=notificationId - Get status of a specific notification
 */
async function handleStatus(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const id = url.searchParams.get("id");

	if (!id) {
		return new Response(JSON.stringify({ error: "Missing id parameter" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const stub = env.SCHEDULER.getByName("default");
	const notification = await stub.getNotificationStatus(id);

	return new Response(JSON.stringify({ notification }), {
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * Handle GET /list?filter=pending|sent - List all notifications
 */
async function handleList(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const filter = url.searchParams.get("filter") as "pending" | "sent" | null;

	const stub = env.SCHEDULER.getByName("default");
	const notifications = await stub.listNotifications(filter ?? undefined);

	return new Response(JSON.stringify({ notifications }), {
		headers: { "Content-Type": "application/json" },
	});
}
