import { auth } from "@harmonia/core";

export type Context = {
	session: Awaited<ReturnType<typeof auth.api.getSession>>;
	headers: Headers;
};

export async function createContext(headers: Headers): Promise<Context> {
	const session = await auth.api.getSession({
		headers,
	});

	return {
		session,
		headers,
	};
}
