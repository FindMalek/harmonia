import { z } from "zod";

export const todoCreateInput = z.object({
	text: z.string().min(1),
});
export type TodoCreateInput = z.infer<typeof todoCreateInput>;

export const todoToggleInput = z.object({
	id: z.number(),
	completed: z.boolean(),
});
export type TodoToggleInput = z.infer<typeof todoToggleInput>;

export const todoDeleteInput = z.object({
	id: z.number(),
});
export type TodoDeleteInput = z.infer<typeof todoDeleteInput>;
