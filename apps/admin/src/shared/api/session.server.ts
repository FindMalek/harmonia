import { headers } from "next/headers";
import { z } from "zod";

import { env } from "@/lib/env";

const adminSessionSchema = z.object({
	user: z.object({
		id: z.string(),
		name: z.string(),
		email: z.string(),
		image: z.string().nullable().optional(),
		role: z.string().nullable().optional(),
	}),
	session: z.object({
		id: z.string(),
		userId: z.string(),
		expiresAt: z.coerce.date(),
		token: z.string(),
	}),
});

const apiResponseSchema = z.union([
	z.object({ data: adminSessionSchema }),
	adminSessionSchema,
	z.null(),
]);

export type AdminSession = z.infer<typeof adminSessionSchema>;

export async function getAdminServerSession(): Promise<AdminSession | null> {
	try {
		const headersList = await headers();
		const cookie = headersList.get("cookie");

		const res = await fetch(
			`${env.NEXT_PUBLIC_HARMONIA_API_URL}/api/admin-auth/get-session`,
			{
				headers: cookie ? { cookie } : undefined,
				credentials: "include",
				cache: "no-store",
			},
		);

		if (!res.ok) {
			return null;
		}

		const parsed = apiResponseSchema.safeParse(await res.json());
		if (!parsed.success) {
			return null;
		}

		const data = parsed.data;
		if (data && "data" in data) {
			return data.data;
		}
		return data;
	} catch {
		return null;
	}
}
