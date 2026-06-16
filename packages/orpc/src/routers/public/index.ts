import { publicProcedure } from "../../procedures";
import { organizeRouter } from "./organize";
import { waitlistRouter } from "./waitlist";

export function createPublicRouter() {
	return {
		health: publicProcedure.handler(() => {
			return "OK";
		}),
		organize: organizeRouter,
		waitlist: waitlistRouter,
	};
}

export const publicRouter = createPublicRouter();
export type PublicRouter = typeof publicRouter;
