import { env } from "@harmonia/env/server";
import { ORPCError } from "@orpc/server";

import { rateLimitMiddleware } from "./middleware/rate-limit";
import { o } from "./os";
import { assertUserApproved } from "./utils/approval-gate";

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

const requireApproved = o.middleware(async ({ context, next }) => {
	const userId = context.session?.user?.id;
	if (!userId) {
		throw new ORPCError("UNAUTHORIZED");
	}

	await assertUserApproved(userId);
	return next();
});

export const approvedProcedure = protectedProcedure.use(requireApproved);

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

const requireAdminAuth = o.middleware(async ({ context, next }) => {
	const adminUser = context.adminSession?.user;
	if (!adminUser) {
		throw new ORPCError("UNAUTHORIZED");
	}
	if (!("role" in adminUser) || adminUser.role !== "admin") {
		throw new ORPCError("FORBIDDEN");
	}
	return next({
		context: {
			adminSession: context.adminSession,
		},
	});
});

export const adminProcedure = publicProcedure.use(requireAdminAuth);
