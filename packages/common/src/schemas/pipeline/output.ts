import { z } from "zod";

export const pipelineStatusEventSchema = z.discriminatedUnion("event", [
	z.object({
		event: z.literal("progress"),
		runId: z.number(),
		status: z.string(),
		currentStage: z.string().nullable(),
		progress: z.unknown(),
		startedAt: z.date().nullable(),
	}),
	z.object({
		event: z.literal("completed"),
		runId: z.number(),
		progress: z.unknown(),
		completedAt: z.date().nullable(),
	}),
	z.object({
		event: z.literal("failed"),
		runId: z.number(),
		progress: z.unknown(),
		error: z.string().nullable(),
		completedAt: z.date().nullable(),
	}),
	z.object({
		event: z.literal("error"),
		message: z.string(),
	}),
]);
export type PipelineStatusEvent = z.infer<typeof pipelineStatusEventSchema>;
