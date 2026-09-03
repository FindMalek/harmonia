import { db } from "@sonaraem/db";
import { user } from "@sonaraem/db/schema/auth";
import { pipelineRun } from "@sonaraem/db/schema/pipeline-run";
import { logger } from "@sonaraem/logger";
import { wait } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";

import {
	enqueue,
	releaseSlot,
	tryAcquireSlot,
} from "../../services/spotify-allowlist";
import { manageAllowlistEntryTask } from "../tasks/spotify-allowlist/manage-allowlist-entry";

const POLL_INTERVAL_SECONDS = 10;
// Comfortably under queue.ts's 30-min DEFAULT_OCCUPIED_TIMEOUT_MS so a waiting stage never races timeoutReclaim.
const MAX_WAIT_SECONDS = 20 * 60;

export class AllowlistSlotTimeoutError extends Error {
	constructor() {
		super("Timed out waiting for a free Spotify allowlist slot");
		this.name = "AllowlistSlotTimeoutError";
	}
}

async function priorityForRun(runId: number): Promise<"manual" | "cron"> {
	const [run] = await db
		.select({ triggeredBy: pipelineRun.triggeredBy })
		.from(pipelineRun)
		.where(eq(pipelineRun.id, runId));
	return run?.triggeredBy === "cron" ? "cron" : "manual";
}

async function getUserEmail(userId: string): Promise<string> {
	const [row] = await db
		.select({ email: user.email })
		.from(user)
		.where(eq(user.id, userId));
	if (!row) {
		throw new Error(
			`User ${userId} not found while acquiring an allowlist slot`,
		);
	}
	return row.email;
}

// Holds a Spotify allowlist slot for `work` — a busy pool is a wait state, not a failure, so this durably polls until one frees up.
export async function withAllowlistSlot<T>(
	userId: string,
	runId: number,
	work: () => Promise<T>,
): Promise<T> {
	const priority = await priorityForRun(runId);
	const { requestId } = await enqueue({ userId }, priority);
	const email = await getUserEmail(userId);

	let slotId: number | null = null;
	const deadline = Date.now() + MAX_WAIT_SECONDS * 1000;

	while (Date.now() < deadline) {
		const result = await tryAcquireSlot(requestId, email);
		if (result.acquired) {
			slotId = result.slotId;
			break;
		}
		await wait.for({ seconds: POLL_INTERVAL_SECONDS });
	}

	if (slotId === null) {
		logger.warn(
			{ userId, runId },
			"Timed out waiting for a Spotify allowlist slot",
		);
		throw new AllowlistSlotTimeoutError();
	}

	try {
		await manageAllowlistEntryTask
			.triggerAndWait({ email, action: "add" })
			.unwrap();
	} catch (err) {
		// Never actually landed on the real dashboard — give the slot straight
		// back rather than holding it occupied for timeoutReclaim to notice.
		await releaseSlot(slotId);
		throw err;
	}

	let result: T;
	try {
		result = await work();
	} catch (workErr) {
		try {
			await manageAllowlistEntryTask
				.triggerAndWait({ email, action: "remove" })
				.unwrap();
		} catch (removeErr) {
			// Don't mask the real failure (`work` itself) with a cleanup failure —
			// manageAllowlistEntryTask already alerts on this independently.
			logger.error(
				{ userId, email, removeErr },
				"Failed to remove Spotify allowlist entry after a failed stage",
			);
		} finally {
			await releaseSlot(slotId);
		}
		throw workErr;
	}

	try {
		await manageAllowlistEntryTask
			.triggerAndWait({ email, action: "remove" })
			.unwrap();
	} finally {
		await releaseSlot(slotId);
	}

	return result;
}
