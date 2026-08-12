import { z } from "zod";

import { feedbackSourceEnum } from "../feedback/enum";

export const feedbackAdminListInput = z.object({
	page: z.number().int().min(1).default(1),
	pageSize: z.number().int().min(1).max(100).default(25),
	q: z.string().optional(),
});
export type FeedbackAdminListInput = z.infer<typeof feedbackAdminListInput>;

export const feedbackAdminItemSchema = z.object({
	id: z.number().int(),
	message: z.string(),
	rating: z.number().int().nullable(),
	source: feedbackSourceEnum,
	campaignKey: z.string().nullable(),
	createdAt: z.date(),
	userEmail: z.string().nullable(),
	userName: z.string().nullable(),
});
export type FeedbackAdminItem = z.infer<typeof feedbackAdminItemSchema>;

export const feedbackAdminListOutputSchema = z.object({
	items: z.array(feedbackAdminItemSchema),
	total: z.number().int().min(0),
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1),
	pageCount: z.number().int().min(0),
});
export type FeedbackAdminListOutput = z.infer<
	typeof feedbackAdminListOutputSchema
>;
