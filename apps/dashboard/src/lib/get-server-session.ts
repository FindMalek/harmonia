import { env } from "@/lib/env";
import { headers } from "next/headers";

export type Session = {
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
	};
	session: {
		id: string;
		userId: string;
		expiresAt: Date;
		token: string;
	};
};

/**
 * Fetch session from API server with forwarded cookies.
 * Dashboard app is standalone and delegates auth to the API.
 */
export async function getServerSession(): Promise<Session | null> {
	const headersList = await headers();
	const cookie = headersList.get("cookie");

	const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/auth/get-session`, {
		headers: cookie ? { cookie } : undefined,
		credentials: "include",
		cache: "no-store",
	});

	if (!res.ok) {
		return null;
	}

	const data = (await res.json()) as { data?: Session } | Session | null;
	// better-auth returns { data: session } or session directly
	if (data && typeof data === "object" && "data" in data && data.data) {
		return data.data as Session;
	}
	return data as Session | null;
}
