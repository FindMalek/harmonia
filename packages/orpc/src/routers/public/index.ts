import { publicProcedure } from "../../procedures";
import { organizeRouter } from "./organize";

export function createPublicRouter() {
	return {
		health: publicProcedure.handler(() => {
			return "OK";
		}),
		organize: organizeRouter,
	};
}

export const publicRouter = createPublicRouter();
export type PublicRouter = typeof publicRouter;
