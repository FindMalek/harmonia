import { db } from "@harmonia/db";
import { todo } from "@harmonia/db/schema/todo";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../procedures";

export const todoRouter = {
	getAll: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;
		return await db.select().from(todo).where(eq(todo.userId, userId));
	}),

	create: protectedProcedure
		.input(z.object({ text: z.string().min(1) }))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			return await db.insert(todo).values({
				userId,
				text: input.text,
			});
		}),

	toggle: protectedProcedure
		.input(z.object({ id: z.number(), completed: z.boolean() }))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			return await db
				.update(todo)
				.set({ completed: input.completed })
				.where(and(eq(todo.id, input.id), eq(todo.userId, userId)));
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			return await db
				.delete(todo)
				.where(and(eq(todo.id, input.id), eq(todo.userId, userId)));
		}),
};
