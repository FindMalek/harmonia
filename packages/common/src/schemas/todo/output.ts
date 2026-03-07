import { z } from "zod";

export const todoListItemSchema = z.object({
	id: z.number(),
	userId: z.string(),
	text: z.string(),
	completed: z.boolean(),
});
export type TodoListItem = z.infer<typeof todoListItemSchema>;

export const todoCreateOutputSchema = z.array(
	z.object({
		id: z.number(),
		userId: z.string(),
		text: z.string(),
		completed: z.boolean(),
	}),
);
export type TodoCreateOutput = z.infer<typeof todoCreateOutputSchema>;

export const todoToggleOutputSchema = z.array(
	z.object({
		id: z.number(),
		userId: z.string(),
		text: z.string(),
		completed: z.boolean(),
	}),
);
export type TodoToggleOutput = z.infer<typeof todoToggleOutputSchema>;

export const todoDeleteOutputSchema = z.array(
	z.object({
		id: z.number(),
		userId: z.string(),
		text: z.string(),
		completed: z.boolean(),
	}),
);
export type TodoDeleteOutput = z.infer<typeof todoDeleteOutputSchema>;
