import type { NextRequest } from "next/server";

import { auth } from "@harmonia/auth";

export type Context = {
	session: Awaited<ReturnType<typeof auth.api.getSession>>;
	headers: Headers;
};

export async function createContext(req: NextRequest): Promise<Context> {
	const session = await auth.api.getSession({
		headers: req.headers,
	});

	return {
		session,
		headers: req.headers,
	};
}
