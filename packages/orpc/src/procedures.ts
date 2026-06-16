import { env } from "@harmonia/env/server";
import { os, ORPCError } from "@orpc/server";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED");
	}
	return next({
		context: {
			session: context.session,
		},
	});
});

export const protectedProcedure = publicProcedure.use(requireAuth);

const requireCronOrAuth = o.middleware(async ({ context, next }) => {
	const cronSecret =
		context.headers?.get("X-Organize-Secret") ??
		context.headers?.get("Authorization")?.replace(/^Bearer\s+/i, "");
	const isCron =
		env.HARMONIA_CRON_SECRET && cronSecret === env.HARMONIA_CRON_SECRET;
	const isAuth = !!context.session?.user;

	if (!isCron && !isAuth) {
		throw new ORPCError("UNAUTHORIZED");
	}

	return next({
		context: {
			...context,
			caller: (isCron ? "cron" : "user") as "cron" | "user",
			userId: isAuth ? context.session?.user.id : undefined,
		},
	});
});

export const cronOrAuthProcedure = publicProcedure.use(requireCronOrAuth);

const requireAdmin = o.middleware(async ({ context, next }) => {
	const user = context.session?.user;
	if (!user) {
		throw new ORPCError("UNAUTHORIZED");
	}
	const userWithRole = user as typeof user & { role?: string | null };
	if (userWithRole.role !== "admin") {
		throw new ORPCError("FORBIDDEN");
	}
	return next({ context: { session: context.session } });
});

export const adminProcedure = protectedProcedure.use(requireAdmin);
