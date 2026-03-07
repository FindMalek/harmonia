import { z } from "zod";

// TODO : move to db schema and import from there
export const pipelineStatusEnum = z.enum(["running", "completed", "failed"]);
export type PipelineStatus = z.infer<typeof pipelineStatusEnum>;
