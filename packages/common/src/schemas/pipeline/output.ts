import { z } from "zod";

export const pipelineRunListItemSchema = z.object({
	id: z.number(),
	userId: z.string(),
	status: z.string(),
	currentStage: z.string().nullable(),
	progress: z.record(z.string(), z.unknown()).nullable(),
	error: z.string().nullable(),
	startedAt: z.date().nullable(),
	completedAt: z.date().nullable(),
	createdAt: z.date(),
});
export type PipelineRunListItem = z.infer<typeof pipelineRunListItemSchema>;

export const pipelineGetByIdOutputSchema = pipelineRunListItemSchema;
export type PipelineGetByIdOutput = z.infer<typeof pipelineGetByIdOutputSchema>;

export const pipelineStatsOutputSchema = z.object({
	tracks: z.object({
		total: z.number(),
		withLyrics: z.number(),
		classified: z.number(),
		embedded: z.number(),
		lyricsPending: z.number(),
	}),
	clusters: z.number(),
});
export type PipelineStatsOutput = z.infer<typeof pipelineStatsOutputSchema>;

export const pipelineClearAnalysisOutputSchema = z.object({
	cleared: z.boolean(),
	tracksUpdated: z.number(),
});
export type PipelineClearAnalysisOutput = z.infer<
	typeof pipelineClearAnalysisOutputSchema
>;

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
