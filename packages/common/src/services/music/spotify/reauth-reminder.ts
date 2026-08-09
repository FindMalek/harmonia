const DAY_MS = 24 * 60 * 60 * 1000;
export const REMINDER_14D_WINDOW_MS = 14 * DAY_MS;
export const REMINDER_3D_WINDOW_MS = 3 * DAY_MS;

export type ReauthReminderStage = "14d" | "3d";

/**
 * Which reminder stage (if any) should fire for a token expiring at
 * `refreshTokenExpiresAt`, given the stage already sent this cycle. The
 * 3-day window takes priority over 14-day so a missed cron run catches up
 * to the more urgent stage instead of getting stuck trying to send "14 days"
 * after that window has already passed.
 */
export function determineReauthReminderStage(
	refreshTokenExpiresAt: Date,
	currentStage: ReauthReminderStage | null,
	now: Date = new Date(),
): ReauthReminderStage | null {
	if (currentStage === "3d") return null;

	const msUntilExpiry = refreshTokenExpiresAt.getTime() - now.getTime();

	if (msUntilExpiry <= REMINDER_3D_WINDOW_MS) return "3d";
	if (msUntilExpiry <= REMINDER_14D_WINDOW_MS && currentStage === null) {
		return "14d";
	}
	return null;
}
