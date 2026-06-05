import { task } from "@trigger.dev/sdk";

import { sendMarketingFeatureUpdate } from "../../../services/email";

export const sendMarketingFeatureUpdateEmailTask = task({
	id: "email-send-marketing-feature-update",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({
		userId,
		featureTitle,
		featureSummary,
		highlights,
		badgeText,
		campaignKey,
	}: {
		userId: string;
		featureTitle: string;
		featureSummary: string;
		highlights?: Array<{ title: string; description: string }> | null;
		badgeText?: string | null;
		campaignKey: string;
	}) => {
		return await sendMarketingFeatureUpdate({
			userId,
			featureTitle,
			featureSummary,
			highlights,
			badgeText,
			campaignKey,
		});
	},
});
