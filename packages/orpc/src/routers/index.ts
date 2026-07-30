import type { RouterClient } from "@orpc/server";
import { adminRouter } from "./admin";
import { protectedRouter } from "./protected";
import { createPublicRouter } from "./public";

export function createAppRouter() {
	const publicR = createPublicRouter();
	return {
		...publicR,
		...protectedRouter,
		admin: adminRouter,
	};
}

export const publicRouter = createPublicRouter();
export { adminRouter, protectedRouter };
export const appRouter = createAppRouter();

export type AppRouter = typeof appRouter;
export type AdminRouter = typeof adminRouter;
export type PublicRouter = typeof publicRouter;
export type ProtectedRouter = typeof protectedRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
export type PublicRouterClient = RouterClient<typeof publicRouter>;
