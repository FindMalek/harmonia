import {
	emptyInput,
	todoCreateInput,
	todoCreateOutputSchema,
	todoDeleteInput,
	todoDeleteOutputSchema,
	todoListItemSchema,
	todoToggleInput,
	todoToggleOutputSchema,
} from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import { todo } from "@harmonia/db/schema/todo";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../procedures";

export const todoRouter = {
	getAll: protectedProcedure
		.input(emptyInput)
		.output(z.array(todoListItemSchema))
		.handler(async ({ context }) => {
			const userId = context.session.user.id;
			return await db.select().from(todo).where(eq(todo.userId, userId));
		}),

	create: protectedProcedure
		.input(todoCreateInput)
		.output(todoCreateOutputSchema)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			return await db
				.insert(todo)
				.values({
					userId,
					text: input.text,
				})
				.returning();
		}),

	toggle: protectedProcedure
		.input(todoToggleInput)
		.output(todoToggleOutputSchema)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			return await db
				.update(todo)
				.set({ completed: input.completed })
				.where(and(eq(todo.id, input.id), eq(todo.userId, userId)))
				.returning();
		}),

	delete: protectedProcedure
		.input(todoDeleteInput)
		.output(todoDeleteOutputSchema)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			return await db
				.delete(todo)
				.where(and(eq(todo.id, input.id), eq(todo.userId, userId)))
				.returning();
		}),
};
