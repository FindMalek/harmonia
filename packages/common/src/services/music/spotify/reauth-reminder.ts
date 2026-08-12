const DAY_MS = 24 * 60 * 60 * 1000;
export const REMINDER_14D_WINDOW_MS = 14 * DAY_MS;
export const REMINDER_3D_WINDOW_MS = 3 * DAY_MS;
// Daily cron, so a 1-day window is enough to catch "the day of" exactly once.
export const REMINDER_0D_WINDOW_MS = 1 * DAY_MS;

export type ReauthReminderStage = "14d" | "3d" | "0d";

/**
 * Which reminder stage (if any) should fire for a token expiring at
 * `refreshTokenExpiresAt`, given the stage already sent this cycle. Checked
 * most-urgent-first (0d, then 3d, then 14d) so a missed cron run catches up
 * to the more urgent stage instead of getting stuck trying to send "14 days"
 * after that window has already passed.
 */
export function determineReauthReminderStage(
	refreshTokenExpiresAt: Date,
	currentStage: ReauthReminderStage | null,
	now: Date = new Date(),
): ReauthReminderStage | null {
	if (currentStage === "0d") return null;

	const msUntilExpiry = refreshTokenExpiresAt.getTime() - now.getTime();

	if (msUntilExpiry <= REMINDER_0D_WINDOW_MS) return "0d";
	if (currentStage === "3d") return null;
	if (msUntilExpiry <= REMINDER_3D_WINDOW_MS) return "3d";
	if (msUntilExpiry <= REMINDER_14D_WINDOW_MS && currentStage === null) {
		return "14d";
	}
	return null;
}
