import { db } from "@sonaraem/db";
import { pipelineRun } from "@sonaraem/db/schema/pipeline-run";
import { logger } from "@sonaraem/logger";
import { wait } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";

import {
	enqueue,
	releaseSlot,
	tryAcquireSlot,
} from "../../services/spotify-allowlist";

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

// Holds a Spotify allowlist slot for `work` — a busy pool is a wait state, not a failure, so this durably polls until one frees up.
export async function withAllowlistSlot<T>(
	userId: string,
	runId: number,
	work: () => Promise<T>,
): Promise<T> {
	const priority = await priorityForRun(runId);
	const { requestId } = await enqueue({ userId }, priority);

	let slotId: number | null = null;
	const deadline = Date.now() + MAX_WAIT_SECONDS * 1000;

	while (Date.now() < deadline) {
		const result = await tryAcquireSlot(requestId);
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
		return await work();
	} finally {
		await releaseSlot(slotId);
	}
}
