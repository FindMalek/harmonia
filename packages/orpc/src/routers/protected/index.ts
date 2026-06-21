import { db } from "@harmonia/db";
import { user, account } from "@harmonia/db/schema/auth";
import { waitlistSignup } from "@harmonia/db/schema/waitlist-signup";
import { createHash } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../procedures";
import { clustersRouter } from "./clusters";
import { emailPreferencesRouter } from "./email-preferences";
import { insightsRouter } from "./insights";
import { pipelineRouter } from "./pipeline";
import { playlistsRouter } from "./playlists";
import { spotifyRouter } from "./spotify";
import { tracksRouter } from "./tracks";

export const protectedRouter = {
	privateData: protectedProcedure.handler(({ context }) => {
		return {
			message: "This is private",
			user: context.session?.user,
		};
	}),
	hasSpotifyLinked: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;
		const rows = await db
			.select({ userId: account.userId })
			.from(account)
			.where(and(eq(account.userId, userId), eq(account.providerId, "spotify")))
			.limit(1);
		return { hasSpotify: rows.length > 0 };
	}),
	redeemInvite: protectedProcedure
		.input(z.object({ token: z.string().regex(/^[0-9a-f]{64}$/) }))
		.output(z.object({ success: z.boolean() }))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const hash = createHash("sha256").update(input.token).digest("hex");

			const [row] = await db
				.select({
					id: waitlistSignup.id,
					inviteTokenExpiresAt: waitlistSignup.inviteTokenExpiresAt,
					inviteRedeemedAt: waitlistSignup.inviteRedeemedAt,
				})
				.from(waitlistSignup)
				.where(eq(waitlistSignup.inviteToken, hash))
				.limit(1);

			if (
				!row ||
				row.inviteRedeemedAt ||
				!row.inviteTokenExpiresAt ||
				row.inviteTokenExpiresAt < new Date()
			) {
				return { success: false };
			}

			const success = await db.transaction(async (tx) => {
				// Atomic: only stamp if still unredeemed (race condition guard)
				const [redeemed] = await tx
					.update(waitlistSignup)
					.set({ inviteRedeemedAt: new Date(), inviteRedeemedByUserId: userId })
					.where(
						and(
							eq(waitlistSignup.id, row.id),
							isNull(waitlistSignup.inviteRedeemedAt),
						),
					)
					.returning({ id: waitlistSignup.id });

				if (!redeemed) return false;

				await tx
					.update(user)
					.set({ isApproved: true })
					.where(eq(user.id, userId));

				return true;
			});

			return { success };
		}),
	tracks: tracksRouter,
	clusters: clustersRouter,
	playlists: playlistsRouter,
	pipeline: pipelineRouter,
	spotify: spotifyRouter,
	emailPreferences: emailPreferencesRouter,
	insights: insightsRouter,
};

export type ProtectedRouter = typeof protectedRouter;
