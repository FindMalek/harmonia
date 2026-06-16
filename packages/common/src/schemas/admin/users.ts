import { z } from "zod";

export const adminUserListInput = z.object({
	page: z.number().int().min(1).default(1),
	pageSize: z.number().int().min(1).max(100).default(25),
	q: z.string().optional(),
});
export type AdminUserListInput = z.infer<typeof adminUserListInput>;

export const adminUserItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	emailVerified: z.boolean(),
	role: z.string().nullable(),
	createdAt: z.date(),
});
export type AdminUserItem = z.infer<typeof adminUserItemSchema>;

export const adminUserListOutputSchema = z.object({
	items: z.array(adminUserItemSchema),
	total: z.number(),
	page: z.number(),
	pageSize: z.number(),
	pageCount: z.number(),
});
export type AdminUserListOutput = z.infer<typeof adminUserListOutputSchema>;
