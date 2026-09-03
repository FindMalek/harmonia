import { logger } from "@sonaraem/logger";
import { schedules } from "@trigger.dev/sdk";

import {
	reclaimExpiredCooldowns,
	timeoutReclaim,
} from "../../../services/spotify-allowlist";
import { sendAllowlistAutomationFailedEmailTask } from "../emails/send-allowlist-automation-failed";
import { manageAllowlistEntryTask } from "./manage-allowlist-entry";

// A slot force-reclaimed by timeoutReclaim means its worker crashed between
// adding the email and removing it - the DB is freed, but the real dashboard
// still has that entry. Best-effort clean it up here; alert either way isn't
// needed on success since nothing failed, only on a failed removal attempt.
async function removeStrandedEntry(email: string): Promise<void> {
	try {
		await manageAllowlistEntryTask
			.triggerAndWait({ email, action: "remove" })
			.unwrap();
	} catch (err) {
		logger.error(
			{ email, err },
			"Failed to remove a stranded Spotify allowlist entry during reclaim",
		);
		await sendAllowlistAutomationFailedEmailTask
			.trigger({
				targetEmail: email,
				action: "remove",
				errorMessage: err instanceof Error ? err.message : String(err),
			})
			.catch((alertErr) => {
				logger.error(
					{ alertErr },
					"Failed to enqueue Spotify allowlist failure alert during reclaim",
				);
			});
	}
}

export const reclaimAllowlistSlotsTask = schedules.task({
	id: "spotify-allowlist-reclaim-slots",
	cron: "*/5 * * * *",
	run: async () => {
		const stuck = await timeoutReclaim();
		for (const { email } of stuck) {
			if (email) await removeStrandedEntry(email);
		}

		const cooledDown = await reclaimExpiredCooldowns();

		const summary = { stuckReclaimed: stuck.length, cooledDown };
		logger.info(summary, "Completed Spotify allowlist slot reclaim sweep");
		return summary;
	},
});
