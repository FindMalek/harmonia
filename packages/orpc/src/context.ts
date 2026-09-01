import { adminAuth, dashboardAuth } from "@sonaraem/core";

export type DashboardSession = Awaited<
	ReturnType<typeof dashboardAuth.api.getSession>
>;
export type AdminSession = Awaited<ReturnType<typeof adminAuth.api.getSession>>;

export type Context = {
	session: DashboardSession;
	adminSession: AdminSession;
	headers: Headers;
};

export async function createContext(headers: Headers): Promise<Context> {
	const [session, adminSession] = await Promise.all([
		dashboardAuth.api.getSession({ headers }),
		adminAuth.api.getSession({ headers }),
	]);

	return {
		session,
		adminSession,
		headers,
	};
}
