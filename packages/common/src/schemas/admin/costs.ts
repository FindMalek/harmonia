import { z } from "zod";

export const adminCostProviderEnum = z.enum(["groq", "openai", "concentrate"]);
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
	concentrateCostUsd: z.number(),
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

export const adminCostsDetailInput = z.object({
	runId: z.number().int(),
});
export type AdminCostsDetailInput = z.infer<typeof adminCostsDetailInput>;

export const adminCostsCallSchema = z.object({
	id: z.number().int(),
	provider: z.string(),
	endpoint: z.string(),
	method: z.string(),
	httpStatus: z.number().int().nullable(),
	statusCategory: z.string(),
	durationMs: z.number().int().nullable(),
	retryAttempt: z.number().int(),
	costUsd: z.number().nullable(),
	inputTokens: z.number().int().nullable(),
	outputTokens: z.number().int().nullable(),
	errorMessage: z.string().nullable(),
	createdAt: z.date(),
});
export type AdminCostsCall = z.infer<typeof adminCostsCallSchema>;

export const adminCostsStageSchema = z.object({
	stage: z.string(),
	startedAt: z.date(),
	completedAt: z.date(),
	trackCount: z.number().int().nullable(),
	calls: z.array(adminCostsCallSchema),
});
export type AdminCostsStage = z.infer<typeof adminCostsStageSchema>;

export const adminCostsDetailOutputSchema = z.object({
	runId: z.number().int(),
	userEmail: z.string().nullable(),
	userName: z.string().nullable(),
	status: z.string(),
	triggeredBy: z.enum(["user", "cron"]).nullable(),
	startedAt: z.date().nullable(),
	completedAt: z.date().nullable(),
	error: z.string().nullable(),
	totalCostUsd: z.number(),
	stages: z.array(adminCostsStageSchema),
	ungroupedCalls: z.array(adminCostsCallSchema),
});
export type AdminCostsDetailOutput = z.infer<
	typeof adminCostsDetailOutputSchema
>;
