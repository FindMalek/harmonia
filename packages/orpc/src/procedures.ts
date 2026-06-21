import { env } from "@harmonia/env/server";
import { ORPCError } from "@orpc/server";

import { rateLimitMiddleware } from "./middleware/rate-limit";
import { o } from "./os";

export { o };

export const publicProcedure = o.use(rateLimitMiddleware);

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
	// better-auth's admin plugin adds `role` at runtime; its type isn't
	// threaded through auth.api.getSession()'s inferred return type.
	if (!("role" in user) || user.role !== "admin") {
		throw new ORPCError("FORBIDDEN");
	}
	return next();
});

export const adminProcedure = protectedProcedure.use(requireAdmin);
