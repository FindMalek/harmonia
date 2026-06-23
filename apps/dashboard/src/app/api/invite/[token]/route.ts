import { rateLimiters } from "@harmonia/orpc/utils/rate-limiter";
import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";

const TOKEN_REGEX = /^[0-9a-f]{64}$/;
// 1 hour: just needs to survive the OAuth round-trip
const COOKIE_MAX_AGE = 60 * 60;

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ token: string }> },
) {
	const { success } = rateLimiters.veryStrict.check(
		rateLimiters.veryStrict.getIdentifier(req.headers),
	);
	if (!success) {
		redirect("/waiting?reason=invalid_invite" as Route);
	}

	const { token } = await params;

	if (!TOKEN_REGEX.test(token)) {
		redirect("/waiting?reason=invalid_invite" as Route);
	}

	const cookieStore = await cookies();
	cookieStore.set("harmonia_invite", token, {
		httpOnly: true,
		secure: env.NEXT_PUBLIC_HARMONIA_NODE_ENV === "production",
		sameSite: "lax", // lax: cookie sent on top-level nav (final OAuth redirect back to dashboard)
		maxAge: COOKIE_MAX_AGE,
		path: "/",
	});

	redirect("/login");
}
