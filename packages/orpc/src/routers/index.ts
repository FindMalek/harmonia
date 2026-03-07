import type { RouterClient } from "@orpc/server";
import { protectedRouter } from "./protected";
import { createPublicRouter } from "./public";

export function createAppRouter() {
	const publicR = createPublicRouter();
	return {
		...publicR,
		...protectedRouter,
	};
}

export const publicRouter = createPublicRouter();
export { protectedRouter };
export const appRouter = createAppRouter();

export type AppRouter = typeof appRouter;
export type PublicRouter = typeof publicRouter;
export type ProtectedRouter = typeof protectedRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
export type PublicRouterClient = RouterClient<typeof publicRouter>;
