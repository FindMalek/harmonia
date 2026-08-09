import { db } from "@harmonia/db";
import { account } from "@harmonia/db/schema/auth";
import { userSpotifyLibraryStats } from "@harmonia/db/schema/spotify";
import { and, eq } from "drizzle-orm";

/**
 * `attemptedRefreshToken` is the token value the failed refresh call used.
 * If the user reconnected (Better Auth wrote a fresh token) while that
 * request was in flight, `account.refreshToken` will have moved on — skip
 * the mark rather than flag a now-valid connection as dead. Narrows, but
 * doesn't fully close, the race (there's still a small gap between this
 * check and the upsert below); a fully atomic fix needs a token-cycle
 * version column, which isn't worth the extra schema for how rare this is.
 */
export async function markSpotifyNeedsReauth(
	userId: string,
	attemptedRefreshToken: string,
): Promise<void> {
	const [current] = await db
		.select({ refreshToken: account.refreshToken })
		.from(account)
		.where(and(eq(account.userId, userId), eq(account.providerId, "spotify")))
		.limit(1);

	if (current?.refreshToken !== attemptedRefreshToken) return;

	await db
		.insert(userSpotifyLibraryStats)
		.values({ userId, needsReauth: true })
		.onConflictDoUpdate({
			target: userSpotifyLibraryStats.userId,
			set: { needsReauth: true },
		});
}

/** Reconnecting resets the 6-month clock, so the reminder stage resets too. */
export async function clearSpotifyNeedsReauth(userId: string): Promise<void> {
	await db
		.insert(userSpotifyLibraryStats)
		.values({ userId, needsReauth: false })
		.onConflictDoUpdate({
			target: userSpotifyLibraryStats.userId,
			set: { needsReauth: false, reauthReminderStage: null },
		});
}

export async function getSpotifyConnectionStatus(userId: string): Promise<{
	needsReauth: boolean;
}> {
	const [row] = await db
		.select({ needsReauth: userSpotifyLibraryStats.needsReauth })
		.from(userSpotifyLibraryStats)
		.where(eq(userSpotifyLibraryStats.userId, userId))
		.limit(1);

	return { needsReauth: row?.needsReauth ?? false };
}
