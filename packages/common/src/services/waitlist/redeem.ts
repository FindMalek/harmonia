import { db } from "@harmonia/db";
import { user } from "@harmonia/db/schema/auth";
import { waitlistSignup } from "@harmonia/db/schema/waitlist-signup";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Atomically marks a waitlist row redeemed by userId and approves that user.
 * False if the row was already redeemed (race lost) or doesn't exist.
 */
export async function redeemWaitlistRow(
	waitlistRowId: number,
	userId: string,
): Promise<boolean> {
	return await db.transaction(async (tx) => {
		const [redeemed] = await tx
			.update(waitlistSignup)
			.set({ inviteRedeemedAt: new Date(), inviteRedeemedByUserId: userId })
			.where(
				and(
					eq(waitlistSignup.id, waitlistRowId),
					isNull(waitlistSignup.inviteRedeemedAt),
				),
			)
			.returning({ id: waitlistSignup.id });

		if (!redeemed) return false;

		await tx.update(user).set({ isApproved: true }).where(eq(user.id, userId));
		return true;
	});
}

/**
 * Auto-approves a user (by id) if their own account email matches an
 * approved, unredeemed waitlist entry — closes the gap where someone never
 * clicked their approval email but was already approved. Safe to call on
 * every Spotify sign-in: the email comes from the user's own row, which
 * Better Auth populates from Spotify's verified OAuth profile, not from
 * anything the caller supplies directly.
 */
export async function tryAutoApproveByEmail(userId: string): Promise<boolean> {
	const [userRow] = await db
		.select({ email: user.email })
		.from(user)
		.where(eq(user.id, userId));

	if (!userRow?.email) return false;

	const normalizedEmail = userRow.email.trim().toLowerCase();
	const [row] = await db
		.select({ id: waitlistSignup.id })
		.from(waitlistSignup)
		.where(
			and(
				eq(waitlistSignup.email, normalizedEmail),
				eq(waitlistSignup.status, "approved"),
				isNull(waitlistSignup.inviteRedeemedAt),
			),
		)
		.limit(1);

	if (!row) return false;

	return redeemWaitlistRow(row.id, userId);
}
