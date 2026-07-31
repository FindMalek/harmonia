/**
 * In-memory fixed-window rate limiter.
 * ponytail: single-process Map, fine for current traffic; swap for Redis before
 * running multiple API instances — limits are not shared across processes.
 */

interface RateLimitConfig {
	max: number;
	windowMs: number;
	keyPrefix?: string;
}

interface RateLimitResult {
	success: boolean;
	remaining: number;
	reset: number;
	retryAfter?: number;
}

class MemoryStore {
	private store = new Map<string, { count: number; resetTime: number }>();

	get(key: string) {
		const entry = this.store.get(key);
		if (!entry) return null;
		if (Date.now() > entry.resetTime) {
			this.store.delete(key);
			return null;
		}
		return entry;
	}

	set(key: string, value: { count: number; resetTime: number }) {
		this.store.set(key, value);
	}

	cleanup() {
		const now = Date.now();
		for (const [key, entry] of this.store.entries()) {
			if (now > entry.resetTime) this.store.delete(key);
		}
	}
}

const memoryStore = new MemoryStore();

if (typeof setInterval !== "undefined") {
	setInterval(() => memoryStore.cleanup(), 60 * 1000);
}

export class RateLimiter {
	private config: Required<RateLimitConfig>;

	constructor(config: RateLimitConfig) {
		this.config = { keyPrefix: "ratelimit", ...config };
	}

	check(identifier: string): RateLimitResult {
		const key = `${this.config.keyPrefix}:${identifier}`;
		const now = Date.now();
		const entry = memoryStore.get(key);

		if (!entry || now > entry.resetTime) {
			const resetTime = now + this.config.windowMs;
			memoryStore.set(key, { count: 1, resetTime });
			return {
				success: true,
				remaining: this.config.max - 1,
				reset: resetTime,
			};
		}

		const count = entry.count + 1;
		memoryStore.set(key, { count, resetTime: entry.resetTime });

		if (count > this.config.max) {
			return {
				success: false,
				remaining: 0,
				reset: entry.resetTime,
				retryAfter: Math.ceil((entry.resetTime - now) / 1000),
			};
		}

		return {
			success: true,
			remaining: this.config.max - count,
			reset: entry.resetTime,
		};
	}

	getIdentifier(headers: Headers, userId?: string): string {
		if (userId) return `user:${userId}`;

		const vercelIp = headers.get("x-vercel-forwarded-for");
		const forwardedFor = headers.get("x-forwarded-for");
		const cfConnectingIp = headers.get("cf-connecting-ip");
		const realIp = headers.get("x-real-ip");

		const ip =
			vercelIp?.split(",")[0]?.trim() ??
			forwardedFor?.split(",")[0]?.trim() ??
			cfConnectingIp ??
			realIp;

		return ip ? `ip:${ip}` : "anonymous";
	}
}

export const rateLimiters = {
	/** Unauthenticated default — 10 requests/min */
	strict: new RateLimiter({
		max: 10,
		windowMs: 60 * 1000,
		keyPrefix: "ratelimit:strict",
	}),
	/**
	 * Authenticated default — 300 requests/min. This is one shared bucket
	 * per user across every oRPC call (see getIdentifier), not per-endpoint,
	 * so normal dashboard usage — several parallel queries per page load,
	 * live-progress polling, navigating around — adds up fast. 30/min (then
	 * 120/min) both still tripped during completely normal interactive use,
	 * not abuse. This is generous on purpose: a real per-endpoint policy is
	 * tracked in #34; this just needs to stop getting in the way meanwhile.
	 */
	standard: new RateLimiter({
		max: 300,
		windowMs: 60 * 1000,
		keyPrefix: "ratelimit:standard",
	}),
	/** Sensitive one-shot flows (invite redemption) — 5 requests / 15 min */
	veryStrict: new RateLimiter({
		max: 5,
		windowMs: 15 * 60 * 1000,
		keyPrefix: "ratelimit:verystrict",
	}),
};
