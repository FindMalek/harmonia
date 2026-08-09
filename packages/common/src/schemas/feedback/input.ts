import { z } from "zod";

import { feedbackSourceEnum } from "./enum";

export const submitFeedbackInput = z.object({
	message: z.string().trim().min(1).max(2000),
	rating: z.number().int().min(1).max(5).optional(),
	source: feedbackSourceEnum,
	campaignKey: z.string().optional(),
});
export type SubmitFeedbackInput = z.infer<typeof submitFeedbackInput>;
