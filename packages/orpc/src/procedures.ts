import { isPro } from "@harmonia/common";
import { env } from "@harmonia/env/server";
import { ORPCError, os } from "@orpc/server";

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

/**
 * Middleware that requires the authenticated user to have an active Pro plan.
 * Verifies the session and plan expiration. Throws FORBIDDEN if the user
 * is not a Pro subscriber.
 */
const requirePlan = o.middleware(async ({ context, next }) => {
	const user = context.session?.user;
	if (!user) {
		throw new ORPCError("UNAUTHORIZED");
	}

	interface SubscriptionUser {
		plan?: string;
		planExpiresAt?: string | number | Date | null;
	}

	const subUser = user as SubscriptionUser;
	const plan = subUser.plan ?? "free";
	const planExpiresAt = subUser.planExpiresAt
		? new Date(subUser.planExpiresAt)
		: null;

	if (!isPro({ plan, planExpiresAt })) {
		throw new ORPCError("FORBIDDEN", {
			message: "Upgrade to Pro to access this feature.",
		});
	}

	return next({
		context: {
			session: context.session,
		},
	});
});

/**
 * An ORPC procedure that requires both authentication and an active Pro plan.
 * Use this for premium-only API routes.
 */
export const planProcedure = protectedProcedure.use(requirePlan);

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
