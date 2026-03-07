import { z } from "zod";

export const pipelineGetByIdInput = z.object({
	id: z.number(),
});
export type PipelineGetByIdInput = z.infer<typeof pipelineGetByIdInput>;

export const pipelineStreamStatusInput = z.object({
	id: z.number(),
});
export type PipelineStreamStatusInput = z.infer<
	typeof pipelineStreamStatusInput
>;
