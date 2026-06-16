import { headers } from "next/headers";

import { env } from "@/lib/env";

export type AdminSession = {
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
		role?: string | null;
	};
	session: {
		id: string;
		userId: string;
		expiresAt: Date;
		token: string;
	};
};

export async function getAdminServerSession(): Promise<AdminSession | null> {
	try {
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

		const data = (await res.json()) as
			| { data?: AdminSession }
			| AdminSession
			| null;

		if (data && typeof data === "object" && "data" in data && data.data) {
			return data.data as AdminSession;
		}
		return data as AdminSession | null;
	} catch {
		return null;
	}
}
