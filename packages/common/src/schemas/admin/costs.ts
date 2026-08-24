import { z } from "zod";

export const adminCostProviderEnum = z.enum(["groq", "openai"]);
export type AdminCostProvider = z.infer<typeof adminCostProviderEnum>;

export const adminCostsListInput = z.object({
	page: z.number().int().min(1).default(1),
	pageSize: z.number().int().min(1).max(100).default(25),
	q: z.string().optional(),
	provider: adminCostProviderEnum.optional(),
});
export type AdminCostsListInput = z.infer<typeof adminCostsListInput>;

export const adminCostsRunItemSchema = z.object({
	runId: z.number().int(),
	userId: z.string(),
	userEmail: z.string().nullable(),
	userName: z.string().nullable(),
	triggeredBy: z.enum(["user", "cron"]).nullable(),
	status: z.string(),
	startedAt: z.date().nullable(),
	completedAt: z.date().nullable(),
	groqCostUsd: z.number(),
	openaiCostUsd: z.number(),
	totalCostUsd: z.number(),
});
export type AdminCostsRunItem = z.infer<typeof adminCostsRunItemSchema>;

export const adminCostsListOutputSchema = z.object({
	items: z.array(adminCostsRunItemSchema),
	total: z.number().int().min(0),
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1),
	pageCount: z.number().int().min(0),
});
export type AdminCostsListOutput = z.infer<typeof adminCostsListOutputSchema>;
