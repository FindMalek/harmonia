import { isPro } from "@harmonia/common/utils/plan";
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

/**
 * Pro plan middleware that enriches the request/context with an `isPro` boolean
 * for downstream handlers (it does not enforce access itself).
 *
 * - Throws UNAUTHORIZED if there is no authenticated session.
 * - Enriches context with `isPro: false` if plan fields are missing or invalid
 *   (does not throw FORBIDDEN).
 * - Otherwise enriches context with `isPro: true` or `false` based on plan validation.
 */
const requirePlan = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED");
	}

	const session = context.session;
	const { user } = session;

	// Runtime check for plan fields (they might not be present if DB/Auth sync is lagging)
	if (!("plan" in user) || typeof user.plan !== "string") {
		return next({
			context: {
				...context,
				session,
				isPro: false,
			},
		});
	}

	return next({
		context: {
			...context,
			session,
			isPro: isPro(
				user as unknown as { plan: string; planExpiresAt: Date | null },
			),
		},
	});
});

/**
 * An ORPC procedure protected by both authentication and an active Pro plan.
 * Used to restrict access to premium-tier functions.
 */
export const planProcedure = protectedProcedure.use(requirePlan);
