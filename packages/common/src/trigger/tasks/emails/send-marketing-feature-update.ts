import { task } from "@trigger.dev/sdk/v3";

import { sendMarketingFeatureUpdate } from "../../../services/email";

export const sendMarketingFeatureUpdateEmailTask = task({
	id: "email-send-marketing-feature-update",
	retry: { maxAttempts: 2, minTimeoutInMs: 2000, factor: 2 },
	run: async ({
		userId,
		featureTitle,
		featureSummary,
		campaignKey,
	}: {
		userId: string;
		featureTitle: string;
		featureSummary: string;
		campaignKey: string;
	}) => {
		return await sendMarketingFeatureUpdate({
			userId,
			featureTitle,
			featureSummary,
			campaignKey,
		});
	},
});
