import { task } from "@trigger.dev/sdk";

import { sendSpotifyReauthNotification } from "../../../services/email";

export const sendSpotifyReauthEmailTask = task({
	id: "email-send-spotify-reauth",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({
		userId,
		stage,
		refreshTokenExpiresAt,
	}: {
		userId: string;
		stage: "14d" | "3d" | "0d";
		refreshTokenExpiresAt: string;
	}) => {
		return await sendSpotifyReauthNotification({
			userId,
			stage,
			refreshTokenExpiresAt: new Date(refreshTokenExpiresAt),
		});
	},
});
