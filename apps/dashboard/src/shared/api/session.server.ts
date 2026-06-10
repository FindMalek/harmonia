import { headers } from "next/headers";
import { env } from "@/lib/env";

export type Session = {
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
		hasCompletedOnboarding: boolean;
	};
	session: {
		id: string;
		userId: string;
		expiresAt: Date;
		token: string;
	};
};

export async function getServerSession(): Promise<Session | null> {
	const headersList = await headers();
	const cookie = headersList.get("cookie");

	const res = await fetch(
		`${env.NEXT_PUBLIC_HARMONIA_API_URL}/api/auth/get-session`,
		{
			headers: cookie ? { cookie } : undefined,
			credentials: "include",
			cache: "no-store",
		},
	);

	if (!res.ok) {
		return null;
	}

	const data = (await res.json()) as { data?: Session } | Session | null;
	if (data && typeof data === "object" && "data" in data && data.data) {
		return data.data as Session;
	}
	return data as Session | null;
}
