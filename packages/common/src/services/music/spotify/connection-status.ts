import { db } from "@harmonia/db";
import { userSpotifyLibraryStats } from "@harmonia/db/schema/spotify";
import { eq } from "drizzle-orm";

export async function markSpotifyNeedsReauth(userId: string): Promise<void> {
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
