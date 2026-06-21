import { env } from "@/lib/env";
import { headers } from "next/headers";
import { z } from "zod";

const sessionSchema = z.object({
	user: z.object({
		id: z.string(),
		name: z.string(),
		email: z.string(),
		image: z.string().nullable().optional(),
		hasCompletedOnboarding: z.boolean(),
		isApproved: z.boolean(),
	}),
	session: z.object({
		id: z.string(),
		userId: z.string(),
		expiresAt: z.coerce.date(),
		token: z.string(),
	}),
});

const apiResponseSchema = z.union([
	z.object({ data: sessionSchema }),
	sessionSchema,
	z.null(),
]);

export type Session = z.infer<typeof sessionSchema>;

// Takes a raw cookie header instead of calling next/headers' headers() so it
// can be reused from Middleware (Edge runtime), where headers() isn't available.
export async function getSessionFromCookie(
	cookie: string | null,
): Promise<Session | null> {
	try {
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

export async function getServerSession(): Promise<Session | null> {
	const headersList = await headers();
	return getSessionFromCookie(headersList.get("cookie"));
}
