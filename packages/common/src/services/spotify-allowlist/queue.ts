import { db } from "@sonaraem/db";
import { userSpotifyLibraryStats } from "@sonaraem/db/schema/spotify";
import {
	spotifyAllowlistQueueRequest,
	spotifyAllowlistSlot,
} from "@sonaraem/db/schema/spotify-allowlist";
import { logger } from "@sonaraem/logger";
import {
	and,
	asc,
	eq,
	inArray,
	isNull,
	lt,
	notInArray,
	or,
	sql,
} from "drizzle-orm";

import {
	DEFAULT_COOLDOWN_MS,
	DEFAULT_OCCUPIED_TIMEOUT_MS,
} from "../../constants/spotify-allowlist";

// Each queue-request row is one acquisition episode (waiting -> active -> done/failed) — sync and export get separate ones, sequenced.
const CRON_STALE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

const LIVE_QUEUE_STATUSES = ["waiting", "active"] as const;

export type AllowlistPriority = "manual" | "cron";

export type AllowlistIdentity =
	| { userId: string; waitlistSignupId?: undefined }
	| { userId?: undefined; waitlistSignupId: number };

export type EnqueueResult = {
	requestId: number;
	alreadyQueued: boolean;
};

function isUniqueConstraintConflict(err: unknown, constraint: string): boolean {
	if (typeof err !== "object" || err === null) return false;
	if (!("code" in err) || !("constraint" in err)) return false;
	return err.code === "23505" && err.constraint === constraint;
}

// Idempotent per identity — returns the existing live request instead of erroring on a conflict.
export async function enqueue(
	identity: AllowlistIdentity,
	priority: AllowlistPriority,
): Promise<EnqueueResult> {
	const constraint =
		identity.userId !== undefined
			? "spotify_allowlist_queue_request_one_live_per_user"
			: "spotify_allowlist_queue_request_one_live_per_waitlist_signup";

	try {
		const [inserted] = await db
			.insert(spotifyAllowlistQueueRequest)
			.values({
				userId: identity.userId ?? null,
				waitlistSignupId: identity.waitlistSignupId ?? null,
				priority,
			})
			.returning({ id: spotifyAllowlistQueueRequest.id });

		if (!inserted) throw new Error("Failed to create allowlist queue request");
		return { requestId: inserted.id, alreadyQueued: false };
	} catch (err) {
		if (!isUniqueConstraintConflict(err, constraint)) throw err;

		const identityFilter =
			identity.userId !== undefined
				? eq(spotifyAllowlistQueueRequest.userId, identity.userId)
				: eq(
						spotifyAllowlistQueueRequest.waitlistSignupId,
						identity.waitlistSignupId,
					);

		const [existing] = await db
			.select({ id: spotifyAllowlistQueueRequest.id })
			.from(spotifyAllowlistQueueRequest)
			.where(
				and(
					identityFilter,
					inArray(spotifyAllowlistQueueRequest.status, LIVE_QUEUE_STATUSES),
				),
			);

		if (!existing) {
			// Lost race with a request that completed/failed before we could look it up.
			throw new Error(
				"Allowlist queue insert conflicted but no live request was found",
			);
		}
		return { requestId: existing.id, alreadyQueued: true };
	}
}

export type AcquireSlotResult =
	| { acquired: true; slotId: number }
	| { acquired: false; reason: "not-your-turn" | "no-slot-available" };

// Only succeeds if this request is both front-of-queue and a slot is free — that single check is the whole priority guarantee.
export async function tryAcquireSlot(
	requestId: number,
): Promise<AcquireSlotResult> {
	return await db.transaction(async (tx) => {
		const [request] = await tx
			.select({
				id: spotifyAllowlistQueueRequest.id,
				userId: spotifyAllowlistQueueRequest.userId,
				status: spotifyAllowlistQueueRequest.status,
			})
			.from(spotifyAllowlistQueueRequest)
			.where(eq(spotifyAllowlistQueueRequest.id, requestId));

		if (request?.status !== "waiting") {
			return { acquired: false, reason: "not-your-turn" as const };
		}

		const [front] = await tx
			.select({ id: spotifyAllowlistQueueRequest.id })
			.from(spotifyAllowlistQueueRequest)
			.where(eq(spotifyAllowlistQueueRequest.status, "waiting"))
			.orderBy(
				sql`(${spotifyAllowlistQueueRequest.priority} = 'manual') desc`,
				asc(spotifyAllowlistQueueRequest.requestedAt),
			)
			.limit(1);

		if (front?.id !== requestId) {
			return { acquired: false, reason: "not-your-turn" as const };
		}

		const [slot] = await tx
			.select({ id: spotifyAllowlistSlot.id })
			.from(spotifyAllowlistSlot)
			.where(eq(spotifyAllowlistSlot.status, "available"))
			.orderBy(asc(spotifyAllowlistSlot.id))
			.limit(1)
			.for("update", { skipLocked: true });

		if (!slot) {
			return { acquired: false, reason: "no-slot-available" as const };
		}

		await tx
			.update(spotifyAllowlistSlot)
			.set({
				status: "occupied",
				userId: request.userId,
				occupiedAt: new Date(),
			})
			.where(eq(spotifyAllowlistSlot.id, slot.id));

		await tx
			.update(spotifyAllowlistQueueRequest)
			.set({ status: "active", slotId: slot.id, activatedAt: new Date() })
			.where(eq(spotifyAllowlistQueueRequest.id, requestId));

		return { acquired: true, slotId: slot.id };
	});
}

// Cooldown, not straight to available — spaces out add/remove actions so they don't look scripted to Spotify.
export async function releaseSlot(
	slotId: number,
	opts: { cooldownMs?: number } = {},
): Promise<void> {
	const cooldownMs = opts.cooldownMs ?? DEFAULT_COOLDOWN_MS;
	const now = new Date();

	await db.transaction(async (tx) => {
		await tx
			.update(spotifyAllowlistSlot)
			.set({
				status: "cooldown",
				userId: null,
				releasedAt: now,
				cooldownUntil: new Date(now.getTime() + cooldownMs),
			})
			.where(eq(spotifyAllowlistSlot.id, slotId));

		await tx
			.update(spotifyAllowlistQueueRequest)
			.set({ status: "done", completedAt: now })
			.where(
				and(
					eq(spotifyAllowlistQueueRequest.slotId, slotId),
					eq(spotifyAllowlistQueueRequest.status, "active"),
				),
			);
	});
}

/** Scheduled sweep: cooldown -> available once cooldownUntil has passed. */
export async function reclaimExpiredCooldowns(): Promise<number> {
	const updated = await db
		.update(spotifyAllowlistSlot)
		.set({ status: "available", cooldownUntil: null })
		.where(
			and(
				eq(spotifyAllowlistSlot.status, "cooldown"),
				lt(spotifyAllowlistSlot.cooldownUntil, new Date()),
			),
		)
		.returning({ id: spotifyAllowlistSlot.id });

	return updated.length;
}

// Sweeps slots stuck `occupied` past a timeout (worker crashed) — forces cooldown and fails the owning request.
export async function timeoutReclaim(
	timeoutMs: number = DEFAULT_OCCUPIED_TIMEOUT_MS,
): Promise<number> {
	const cutoff = new Date(Date.now() - timeoutMs);

	const stuckSlots = await db
		.select({ id: spotifyAllowlistSlot.id })
		.from(spotifyAllowlistSlot)
		.where(
			and(
				eq(spotifyAllowlistSlot.status, "occupied"),
				lt(spotifyAllowlistSlot.occupiedAt, cutoff),
			),
		);

	if (stuckSlots.length === 0) return 0;
	const now = new Date();

	await db.transaction(async (tx) => {
		for (const { id: slotId } of stuckSlots) {
			await tx
				.update(spotifyAllowlistSlot)
				.set({
					status: "cooldown",
					userId: null,
					releasedAt: now,
					cooldownUntil: new Date(now.getTime() + DEFAULT_COOLDOWN_MS),
				})
				.where(eq(spotifyAllowlistSlot.id, slotId));

			await tx
				.update(spotifyAllowlistQueueRequest)
				.set({
					status: "failed",
					completedAt: now,
					error: "Slot held past timeout — worker likely crashed mid-run",
				})
				.where(
					and(
						eq(spotifyAllowlistQueueRequest.slotId, slotId),
						eq(spotifyAllowlistQueueRequest.status, "active"),
					),
				);
		}
	});

	logger.warn(
		{ slotIds: stuckSlots.map((s) => s.id), timeoutMs },
		"Force-reclaimed Spotify allowlist slots stuck past their occupied timeout",
	);

	return stuckSlots.length;
}

// Stale or never-synced, not needing reauth, not already queued.
export async function nextEligibleForCron(
	batchSize: number,
): Promise<string[]> {
	const staleCutoff = new Date(Date.now() - CRON_STALE_WINDOW_MS);

	const liveUserIds = db
		.select({ userId: spotifyAllowlistQueueRequest.userId })
		.from(spotifyAllowlistQueueRequest)
		.where(
			and(
				inArray(spotifyAllowlistQueueRequest.status, LIVE_QUEUE_STATUSES),
				sql`${spotifyAllowlistQueueRequest.userId} is not null`,
			),
		);

	const rows = await db
		.select({ userId: userSpotifyLibraryStats.userId })
		.from(userSpotifyLibraryStats)
		.where(
			and(
				or(
					isNull(userSpotifyLibraryStats.lastFullSyncAt),
					lt(userSpotifyLibraryStats.lastFullSyncAt, staleCutoff),
				),
				eq(userSpotifyLibraryStats.needsReauth, false),
				notInArray(userSpotifyLibraryStats.userId, liveUserIds),
			),
		)
		.limit(batchSize);

	return rows.map((r) => r.userId);
}

/** True if a higher-priority (manual) request is waiting right now. */
export async function yieldCheck(): Promise<boolean> {
	const [waiting] = await db
		.select({ id: spotifyAllowlistQueueRequest.id })
		.from(spotifyAllowlistQueueRequest)
		.where(
			and(
				eq(spotifyAllowlistQueueRequest.status, "waiting"),
				eq(spotifyAllowlistQueueRequest.priority, "manual"),
			),
		)
		.limit(1);

	return !!waiting;
}
