import { z } from "zod";

import { waitlistStatusEnum } from "../waitlist/enum";

export const waitlistAdminListInput = z.object({
	page: z.number().int().min(1).default(1),
	pageSize: z.number().int().min(1).max(100).default(25),
	status: waitlistStatusEnum.optional(),
	q: z.string().optional(),
});
export type WaitlistAdminListInput = z.infer<typeof waitlistAdminListInput>;

export const waitlistAdminItemSchema = z.object({
	id: z.number(),
	email: z.string(),
	status: waitlistStatusEnum,
	note: z.string().nullable(),
	confirmationEmailSentAt: z.date().nullable(),
	approvedAt: z.date().nullable(),
	approvalEmailSentAt: z.date().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
});
export type WaitlistAdminItem = z.infer<typeof waitlistAdminItemSchema>;

export const waitlistAdminListOutputSchema = z.object({
	items: z.array(waitlistAdminItemSchema),
	total: z.number(),
	page: z.number(),
	pageSize: z.number(),
	pageCount: z.number(),
});
export type WaitlistAdminListOutput = z.infer<
	typeof waitlistAdminListOutputSchema
>;

export const waitlistAdminUpdateStatusInput = z.object({
	id: z.number(),
	status: waitlistStatusEnum,
	note: z.string().optional(),
});
export type WaitlistAdminUpdateStatusInput = z.infer<
	typeof waitlistAdminUpdateStatusInput
>;

export const waitlistAdminBulkApproveInput = z.object({
	ids: z.array(z.number()).min(1),
});
export type WaitlistAdminBulkApproveInput = z.infer<
	typeof waitlistAdminBulkApproveInput
>;
