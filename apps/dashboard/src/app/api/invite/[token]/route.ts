import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

const TOKEN_REGEX = /^[0-9a-f]{64}$/;
// 1 hour: just needs to survive the OAuth round-trip
const COOKIE_MAX_AGE = 60 * 60;

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ token: string }> },
) {
	const { token } = await params;

	if (!TOKEN_REGEX.test(token)) {
		redirect("/invite-expired");
	}

	const cookieStore = await cookies();
	cookieStore.set("harmonia_invite", token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax", // lax: cookie sent on top-level nav (final OAuth redirect back to dashboard)
		maxAge: COOKIE_MAX_AGE,
		path: "/",
	});

	redirect("/login");
}
