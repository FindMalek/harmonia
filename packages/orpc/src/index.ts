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

export { createContext } from "./context";
export type { Context } from "./context";
export { createORPCClientUtils } from "./client";
export type { PublicRouterClient, AppRouterClient } from "./client";

export {
	publicRouter,
	protectedRouter,
	appRouter,
	createAppRouter,
} from "./routers/index";
export type { AppRouter, PublicRouter, ProtectedRouter } from "./routers/index";
