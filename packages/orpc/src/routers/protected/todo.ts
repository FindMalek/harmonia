import {
	todoCreateInput,
	todoDeleteInput,
	todoToggleInput,
} from "@harmonia/common/schemas";
import { db } from "@harmonia/db";
import { todo } from "@harmonia/db/schema/todo";
import { and, eq } from "drizzle-orm";

import { protectedProcedure } from "../../procedures";

export const todoRouter = {
	getAll: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;
		return await db.select().from(todo).where(eq(todo.userId, userId));
	}),

	create: protectedProcedure
		.input(todoCreateInput)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			return await db.insert(todo).values({
				userId,
				text: input.text,
			});
		}),

	toggle: protectedProcedure
		.input(todoToggleInput)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			return await db
				.update(todo)
				.set({ completed: input.completed })
				.where(and(eq(todo.id, input.id), eq(todo.userId, userId)));
		}),

	delete: protectedProcedure
		.input(todoDeleteInput)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			return await db
				.delete(todo)
				.where(and(eq(todo.id, input.id), eq(todo.userId, userId)));
		}),
};
